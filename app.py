from datetime import datetime
from html.parser import HTMLParser
from passlib.apps import custom_app_context as pwd_context
import requests

from flask import Flask, render_template, request, url_for, jsonify, session, abort
from flask_sqlalchemy import SQLAlchemy
import sqlalchemy.orm
from cockroachdb.sqlalchemy import run_transaction

import custom_config

class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []
    def handle_data(self, d):
        self.fed.append(d)
    def get_data(self):
        return "".join(self.fed)

app = Flask(__name__)
app.config.from_pyfile("config.py")
db = SQLAlchemy(app)
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
    parent = db.relationship("Post", foreign_keys=[parent_id])

    root_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=True)
    root = db.relationship("Post", foreign_keys=[root_id])

    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    owner = db.relationship("User")

    def __init__(self, title, body, parent, root, owner, score=None, weight=None, created=None):
        self.title = title
        self.body = body
        if parent is not None:
            self.parent = parent
        if root is not None:
            self.root = root
        self.owner = owner

        if created is None:
            created = datetime.utcnow()

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
            self.score = 2.0 * float(rd["docSentiment"]["score"])

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



@app.route("/", methods=["GET"])
def home():
    def callback(session):
        return render_template("home.html")
    return run_transaction(session_maker, callback)

@app.route("/api/register", methods=["POST"])
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

    return jsonify({'result': status})

@app.route("/api/sign_in", methods=['POST'])
def sign_in():
    json_data = request.json

    user = User.query.filter_by(email=json_data["email"]).first()

    if user and pwd_context.verify(json_data["password"], user.password):
        session["user_email"] = json_data["email"]
        status = True
    else:
        status = False

    return jsonify({ "result": status })

@app.route("/api/signed_in", methods=["GET"])
def logged_in():
    r = None
    if session.get("user_email"):
        r = session["user_email"]
    return jsonify({ "user": r })

@app.route("/api/posts", methods=["GET", "POST"])
def post_handler():
    if request.method == "POST":
        if session["user_email"]:
            json_data = request.json

            # TODO: Create post
            s = MLStripper()
            s.feed(json_data["title"])
            title = s.get_data()

            body = json_data["body"] # TODO: Strip out script tags, similar
            parent = json_data["parent"]
            root = json_data["root"]

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

            return jsonify({ "result": status })
        else:
            abort(403)
    else:
        objects = (list(Post.query.all()))
        object_dicts = []
        for o in objects:
            object_dicts.append(o.to_dict())
        return jsonify(data=object_dicts)

@app.route("/api/posts/front_page", methods=["GET"])
def front_page_post_data():
    # TODO: MAKE THIS ACTUALLY FILTER BY FRONT PAGE ALGORITHMS
    objects = (list(Post.query.all()))
    object_dicts = []
    for o in objects:
        object_dicts.append(o.to_dict())
    return jsonify(data=object_dicts)

@app.route("/api/posts/<int:post_id>", methods=["GET"])
def post_data(post_id):
    return jsonify(Post.query.filter_by(id=post_id).first().to_dict())

@app.route("/api/posts/<int:post_id>/children", methods=["GET"])
def post_children_data(post_id):
    return jsonify(dict(Post.query.filter_by(parent_id=post_id).all()))

if __name__ == "__main__":
    app.run()
