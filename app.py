from datetime import datetime
from html.parser import HTMLParser
from passlib.apps import custom_app_context as pwd_context
import requests

from flask import Flask, render_template, request, url_for, jsonify, session, abort
from flask_sqlalchemy import SQLAlchemy
import sqlalchemy.orm
from cockroachdb.sqlalchemy import run_transaction

import custom_config
import functions

class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []
    def handle_data(self, d):
        self.fed.append(d)
    def get_data(self):
        return "".join(self.fed)

application = Flask(__name__)
application.config.from_pyfile("config.py")
db = SQLAlchemy(application)
session_maker = sqlalchemy.orm.sessionmaker(db.engine)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))

    def __init__(self, email, password):
        self.email = email
        self.password = pwd_context.encrypt(password)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    body = db.Column(db.Text)
    score = db.Column(db.Float)
    weight = db.Column(db.Float, nullable=True)

    created = db.Column(db.DateTime)

    # Foreign Keys

    parent_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=True)
    parent = db.relationship("Post", primaryjoin=("post.c.id==post.c.parent_id"), remote_side="Post.id", backref=db.backref("children"))

    root_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=True)
    root = db.relationship("Post", primaryjoin=("post.c.id==post.c.root_id"), remote_side="Post.id", backref=db.backref("deep_children"))

    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    owner = db.relationship("User", backref="posts")

    def __init__(self, title, body, parent, root, owner, score=None, weight=None, created=None):
        self.title = title
        self.body = body
        self.parent = None
        if parent is not None:
            self.parent = parent
            self.parent_id = parent.id
        if root is not None:
            self.root = root
            self.root_id = root.id
        self.owner = owner
        self.owner_id = owner.id

        if created is None:
            self.created = datetime.utcnow()
        else:
            self.created = created

        if score is None:
            # TODO: Some error handling if this goes wrong...

            s = MLStripper()
            s.feed(self.body)
            r = requests.get(
                "https://gateway-a.watsonplatform.net/calls/text/TextGetTextSentiment",
                params={
                    "apikey": custom_config.IBM_API_KEY,
                    "text": s.get_data(),
                    "outputMode": "json"
                }
            )
            print("---RAW---")
            print(r.content)
            rd = r.json()

            if "score" in rd["docSentiment"]:
                self.score = float(rd["docSentiment"]["score"])
            else:
                self.score = 0

        if parent is not None:
            self.score = self.parent.score * self.score

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "body": self.body,
            "score": self.score,
            "weight": self.weight,
            "parent_id": str(self.parent_id),
            "root_id": str(self.root_id),
            "owner_id": str(self.owner_id)
        }



@application.route("/", methods=["GET"])
def home():
    def callback(session):
        return render_template("home.html")
    return run_transaction(session_maker, callback)

@application.route("/api/register", methods=["POST"])
def register():
    json_data = request.json
    print(json_data)
    print(request.data)

    new_user = User(
        email=json_data["email"],
        password=json_data["password"]
    )

    try:
        db.session.add(new_user)
        db.session.commit()
        status = "success"
    except:
        status = "already_registered"

    functions.add_user(User.query.filter_by(email=json_data["email"]).first().id)

    return jsonify({'result': status})

@application.route("/api/sign_in", methods=["POST"])
def sign_in():
    json_data = request.json

    user = User.query.filter_by(email=json_data["email"]).first()

    if user and pwd_context.verify(json_data["password"], user.password):
        session["user_email"] = json_data["email"]
        status = True
    else:
        status = False

    return jsonify({ "result": status })

@application.route("/api/sign_out", methods=["GET"])
def sign_out():
    # TODO: This might be succeptible to a cookie attack
    session.clear()
    return jsonify({ "result": True })

@application.route("/api/signed_in", methods=["GET"])
def logged_in():
    r = None
    if session.get("user_email"):
        r = session["user_email"]
    return jsonify({ "user": r })

@application.route("/api/posts", methods=["GET", "POST"])
def post_handler():
    if request.method == "POST":
        if session["user_email"]:
            json_data = request.json

            # TODO: Create post
            s = MLStripper()
            s.feed(json_data["title"])
            title = s.get_data()

            body = json_data["body"] # TODO: Strip out script tags, similar
            parent_id = json_data["parent"]
            parent = None
            if parent_id is not None:
                parent = Post.query.filter_by(id=int(parent_id)).first()
                print(parent)
            root_id = json_data["root"]
            root = None
            if root_id is not None:
                root = Post.query.filter_by(id=int(root_id)).first()

            owner = User.query.filter_by(email=session["user_email"]).first()

            new_post = Post(
                title=title,
                body=body,
                parent=parent,
                root=root,
                owner=owner
            )

            try:
                db.session.add(new_post)
                db.session.commit()
                status = True
            except Exception as e:
                print(str(e))
                status = False

            if root is None:
                # Post
                functions.add_new_post(str(owner.id), str(new_post.id))
            else:
                functions.add_comment(str(owner.id), str(new_post.root_id), new_post.score)

            return jsonify({ "result": status })
        else:
            abort(403)
    else:
        objects = (list(Post.query.all()))
        object_dicts = []
        for o in objects:
            object_dicts.append(o.to_dict())
        return jsonify(data=object_dicts)


@application.route("/api/posts/front_page", methods=["GET"])
def front_page_post_data():
    # TODO: MAKE THIS ACTUALLY FILTER BY FRONT PAGE ALGORITHMS
    objects = (list(Post.query.filter_by(parent_id=None)))
    object_dicts = []
    for o in objects:
        object_dicts.append(o.to_dict())
        object_dicts[len(object_dicts) - 1]["weight"] = 0.0
        if session.get("user_email"):
            object_dicts[len(object_dicts) - 1]["weight"] = functions.sentiment(str(User.query.filter_by(email=session["user_email"]).first().id), str(o.id))

    object_dicts_sorted = sorted(object_dicts, key=lambda obj: obj["weight"])

    return jsonify(data=object_dicts_sorted)

@application.route("/api/posts/with_parent/<int:post_id>", methods=["GET"])
def posts_with_parent(post_id):
    # TODO: MAKE THIS ACTUALLY FILTER BY FRONT PAGE ALGORITHMS
    objects = (list(Post.query.filter_by(parent_id=post_id)))
    object_dicts = []
    for o in objects:
        object_dicts.append(o.to_dict())
    return jsonify(data=object_dicts)

@application.route("/api/posts/<int:post_id>", methods=["GET"])
def post_data(post_id):
    return jsonify(Post.query.filter_by(id=post_id).first().to_dict())

@application.route("/api/posts/<int:post_id>/depth", methods=["GET"])
def post_depth(post_id):
    post_dict = Post.query.filter_by(id=post_id).first().to_dict()
    parent_dict = {}
    post_depth = -1 # -1 Indicates a top level post. 0 indicates a first-level comment.
    while post_dict["parent_id"] != "None":
        print(post_dict["parent_id"])
        post_dict = Post.query.filter_by(id=int(post_dict["parent_id"])).first().to_dict()
        post_depth += 1

    return jsonify({ "depth": post_depth })

@application.route("/api/posts/<int:post_id>/comment_chain", methods=["GET"])
def post_comment_chain(post_id):
    post_dict = Post.query.filter_by(id=post_id).first().to_dict()
    comment_chain = []
    parent_dict = {}
    while post_dict["parent_id"] != "None":
        comment_chain.insert(0, post_dict["id"])
        post_dict = Post.query.filter_by(id=int(post_dict["parent_id"])).first().to_dict()

    return jsonify({ "chain": comment_chain })

@application.route("/api/posts/<int:post_id>/children", methods=["GET"])
def post_children_data(post_id):
    # TODO: Order
    objects = Post.query.filter_by(parent_id=post_id).all()
    object_dicts = []
    for o in objects:
        object_dicts.append(o.to_dict())
    return jsonify(object_dicts)

if __name__ == "__main__":
    application.run()
