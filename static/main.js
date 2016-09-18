var SignInLink = React.createClass({
    handleClick: function (e) {
        e.preventDefault();
        this.props.onSignInClick();
    },

    render: function () {
        return (
            <a href="" onClick={this.handleClick}>Sign In</a>
        );
    }
});

var SignOutLink = React.createClass({
    handleClick: function (e) {
        e.preventDefault();
        $.ajax({
            url: "/api/sign_out",
            contentType: "application/json; charset=UTF-8",
            dataType: "json",
            success: function (data) {
                console.log(data);
            }.bind(this),
            error: function (xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },

    render: function () {
        return (
            <a href="" onClick={this.handleClick}>Sign Out ({this.props.user})</a>
        );
    }
});

var RegisterLink = React.createClass({
    handleClick: function (e) {
        e.preventDefault();
        this.props.onRegisterClick();
    },

    render: function () {
        return (
            <a href="" onClick={this.handleClick}>Register</a>
        );
    }
});

var HeaderBar = React.createClass({
    handleSignInClick: function () {
        this.props.onSignInClick();
    },
    handleRegisterClick: function () {
        this.props.onRegisterClick();
    },

    handleBackClick: function () {
        this.props.onBackClick();
    },

    render: function () {
        var navLinks = (
            <ul>
                <li><SignInLink onSignInClick={this.handleSignInClick} /></li>
                <li className="highlight"><RegisterLink onRegisterClick={this.handleRegisterClick} /></li>
            </ul>
        );

        if (this.props.signedIn) {
            navLinks = (
                <ul>
                    <li><SignOutLink user={this.props.user} /></li>
                </ul>
            );
        }

        return (
            <header>
                <h1>backtack</h1>
                <nav>{navLinks}</nav>
            </header>
        );
    }
});

var ConversationListItem = React.createClass({
    getInitialState: function () {
        return { selected: false }
    },

    render: function () {
        var itemClasses = this.props.selected ? "conversationListItem selected": "conversationListItem";

        return (
            <li className={itemClasses} onClick={this.props.onItemClick}>
                <a className="conversationLink">{this.props.children}</a>
                <p className="conversationSummary">{this.props.summary}</p>
            </li>
        );
    }
})

var ConversationsList = React.createClass({
    getInitialState: function () {
        return {
            selected: this.props.selectedIndex || -1
        }
    },

    handleItemSelect: function (index) {
        this.setState({ selected: index });
        this.props.onItemSelect(index);
    },

    render: function () {
        var conversationNodes = this.props.data.map(function (conversation, i) {
            var conversionDiv = document.createElement("div");
            conversionDiv.innerHTML = conversation.body;

            var cleanedText = conversionDiv.textContent || conversionDiv.innerText || "";
            var summary = cleanedText.substring(0, 80) + "...";

            var boundItemSelect = this.handleItemSelect.bind(this, i);
            var itemIsSelected = this.state.selected == i;

            const itemSelected = i === this.state.selected;

            return (
                <ConversationListItem key={conversation.id} summary={summary} onItemClick={boundItemSelect}
                                      selected={itemSelected}>
                    {conversation.title}
                </ConversationListItem>
            );
        }.bind(this));
        return (
            <ul className="conversationList">
                {conversationNodes}
            </ul>
        );
    }
});

// TODO: Use local storage to save WIP content.
var CreatePostForm = React.createClass({
    getInitialState: function () {
        return { title: "", content: "" };
    },

    componentDidMount: function () {
        $('#post-content-area').trumbowyg({
            btns: ['strong', 'em', '|', 'horizontalRule'],
            autogrow: true
        });
    },

    handleTitleChange: function (e) {
        this.setState({ title: e.target.value });
    },

    handleSubmit: function (e) {
        e.preventDefault();

        var title = this.state.title.trim();
        var body = $("#post-content-area").trumbowyg("html").trim();

        var data = JSON.stringify({
            title: title,
            body: body,

            parent: null,
            root: null
        });

        // TODO: Minimum content length.
        if (body.length > 0 && title.length > 0) {
            $.ajax({
                url: this.props.url,
                contentType: "application/json; charset=UTF-8",
                dataType: "json",
                type: "POST",
                data: data,
                success: function (data) {
                    console.log(data);

                    // TODO: Select post as viewable, add it to the top of the list.
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });

            this.props.onCreatePost();
        } else {
            alert("All fields must be filled out.");
        }
    },

    handleCreatePostCancelClick: function () {
        this.props.onCancelClick();
    },

    render: function () {
        return (
            <div className="createPostFormContainer">
                <form className="createPostForm" onSubmit={this.handleSubmit}>
                    <label htmlFor="post-title">Title</label>
                    <input type="text" name="post-title" id="post-title" maxLength="255"
                           value={this.state.title} onChange={this.handleTitleChange} />
                    <label htmlFor="post-content-area">Content</label>
                    <div id="post-content-area"></div>
                    <hr />
                    <button type="submit">Post</button> <button type="button" className="secondary"
                            onClick={this.handleCreatePostCancelClick}>Cancel</button>
                </form>
            </div>
        );
    }
});

var CreatePostButton = React.createClass({
    handleClick: function () {
        this.props.onCreatePostClick();
    },

    render: function () {
        return (
            <button onClick={this.handleClick} className="createPostButton">Create a Post</button>
        );
    }
});


var CreateCommentForm = React.createClass({
    getInitialState: function () {
        return {
            title: "",
        }
    },

    componentDidMount: function () {
        $('#comment-content-area').trumbowyg({
            btns: ['strong', 'em', '|', 'horizontalRule'],
            autogrow: true
        });
    },

    handleTitleChange: function (e) {
        this.setState({ title: e.target.value });
    },

    handleCancelClick: function (e) {
        this.props.onCancelClick();
    },

    handleSubmit: function (e) {
        e.preventDefault();

        var title = this.state.title.trim();
        var body = $("#comment-content-area").trumbowyg("html").trim();

        var data = JSON.stringify({
            title: title,
            body: body,

            parent: this.props.parent,
            root: this.props.root
        });

        // TODO: Minimum content length.
        if (body.length > 0 && title.length > 0) {
            $.ajax({
                url: this.props.url,
                contentType: "application/json; charset=UTF-8",
                dataType: "json",
                type: "POST",
                data: data,
                success: function (data) {
                    console.log(data);
                    // TODO: Select post as viewable, add it to the top of the list.
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });

            this.props.onCreateComment();
        } else {
            alert("All fields must be filled out.");
        }
    },

    render: function () {
        return (
            <div className="createCommentFormContainer">
                <form className="createCommentForm" onSubmit={this.handleSubmit}>
                    <label htmlFor="comment-title">Title</label>
                    <input type="text" name="comment-title" id="comment-title" maxLength="255"
                        value={this.state.title} onChange={this.handleTitleChange} />
                    <label htmlFor="comment-content-area">Content</label>
                    <div id="comment-content-area"></div>
                    <hr />
                    <button type="submit">Post</button> <button type="button" className="secondary"
                            onClick={this.handleCancelClick}>Cancel</button>
                </form>
            </div>
        );
    }
});

var ConversationsContainer = React.createClass({
    loadConversationsFromServer: function () {
        $.ajax({
            url: this.props.url,
            dataType: "json",
            cache: false,
            success: function (data) {
                this.setState({ data: data["data"] });
            }.bind(this),
            error: function (xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },

    getInitialState: function () {
        return { data: [] };
    },

    handleItemSelect: function (index) {
        this.props.onItemSelect({ selected: this.state.data[index].id });
    },

    handleCreatePostClick: function () {
        this.props.onCreatePostClick();
    },

    handleClick: function () {
        this.props.onContainerClick();
    },

    componentDidMount: function() {
        this.loadConversationsFromServer();
        setInterval(this.loadConversationsFromServer, this.props.pollInterval);
    },

    render: function () {
        var createPostButton = this.props.signedIn ? (<CreatePostButton onCreatePostClick={this.handleCreatePostClick} />) : null;
        var containerClasses = this.props.showClickableEdge ? "conversationsContainer contentColumn clickableEdge" : "conversationsContainer contentColumn";
        return (
            <div className={containerClasses} onClick={this.handleClick}>
                {createPostButton}
                <ConversationsList data={this.state.data} onItemSelect={this.handleItemSelect} />
            </div>
        );
    }
});

var Post = React.createClass({
    getInitialState: function () {
        return {
            hasChildren: false
        }
    },

    handleDiscussClick: function () {
        this.props.onPostDiscussClick();
    },

    handleAddCommentClick: function () {
        this.props.onAddCommentClick({
            parent: this.props.data.id,
            root: this.props.data.id
        });
    },

    checkForChildren: function (props) {
        var newDataId = props.data.id
        if (newDataId) {
            $.ajax({
                url: "/api/posts/" + newDataId + "/children?aaa",
                contentType: "application/json; charset=UTF-8",
                dataType: "json",
                success: function (data) {
                    if (data.length > 0 && !this.state.hasChildren) {
                        this.setState({ hasChildren: true });
                    }
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });
        }
    },

    componentDidMount: function () {
        this.checkForChildren(this.props);
        setInterval(this.checkForChildren.bind(this, this.props), 500);
    },

    componentWillReceiveProps: function (nextProps) {
        this.checkForChildren(nextProps);
    },

    render: function () {
        var postData = this.props.data.hasOwnProperty("title") ? this.props.data : { title: "", tagLine: "", body: "" };
        var createMarkup = function () {
            return { __html: postData.body };
        }.bind(this);
        var itemClasses = this.props.selected ? "post selected": "post";

        var viewDiscussion = null;
        if (this.state.hasChildren) {
            viewDiscussion = (
                <button className="viewDiscussionButton" onClick={this.handleDiscussClick}>
                    View Discussion
                </button>
            );
        }

        if (postData["title"].length > 0) {
            return (
                <div className={itemClasses}>
                    <h1 className="postTitle">{postData.title}</h1>
                    <div className="postTagline">{postData.tagLine}</div>
                    <div className="postBody" dangerouslySetInnerHTML={createMarkup()}></div>
                    <div className="postControls">
                        {viewDiscussion}
                        <button className="addCommentButton" onClick={this.handleAddCommentClick}>
                            Add A Comment
                        </button>
                    </div>
                </div>
            )
        }

        return null;
    }
});

var PostContainer = React.createClass({
    getInitialState: function () {
        return { postId: null, data: {}, selectedPost: false };
    },

    loadPostFromServer: function () {
        if (this.state.postId != null) {
            $.ajax({
                url: this.props.url + this.state.postId.toString(),
                dataType: "json",
                cache: false,
                success: function (data) {
                    this.setState({ data: data });
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });
        }
    },

    componentWillReceiveProps: function (nextProps) {
        this.setState({ postId: nextProps.postId }, function () {
            this.loadPostFromServer();
        });
    },

    handlePostDiscussClick: function () {
        this.setState({ selectedPost: true });
        this.props.onPostDiscussClick();
    },

    handleAddCommentClick: function (properties) {
        this.props.onAddCommentClick(properties);
    },

    render: function () {
        var postContainerStyle = {
            left: "50%"
        };

        var itemClasses = this.props.selected ? "post selected": "post";

        return (
            <div className="postContainer contentColumn" style={postContainerStyle}>
                <Post data={this.state.data} selected={this.state.selectedPost}
                      onPostDiscussClick={this.handlePostDiscussClick} onAddCommentClick={this.handleAddCommentClick} />
            </div>
        )
    }
});

var Comment = React.createClass({
    getInitialState: function () {
        return {
            hasChildren: false,
        }
    },

    handleContinueThreadClick: function () {
        this.props.onContinueThreadClick();
    },

    handleAddCommentClick: function () {
        this.props.onAddCommentClick({
            parent: this.props.data.id,
            root: this.props.data.root_id
        });
    },

    checkForChildren: function (props) {
        if (props.data.id) {
            $.ajax({
                url: "/api/posts/" + props.data.id + "/children",
                contentType: "application/json; charset=UTF-8",
                dataType: "json",
                success: function (data) {
                    if (data.length > 0 && !this.state.hasChildren) {
                        this.setState({ hasChildren: true });
                    }
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(props.url, status, err.toString());
                }.bind(this)
            });
        }
    },

    componentDidMount: function () {
        this.checkForChildren(this.props);
        setInterval(this.checkForChildren.bind(this, this.props), 500);
    },

    componentWillReceiveProps: function (nextProps) {
        this.checkForChildren(nextProps);
    },

    render: function () {
        var commentData = this.props.data.hasOwnProperty("title") ? this.props.data : { title: "", tagLine: "", body: "" };
        var createMarkup = function () {
            return { __html: commentData.body };
        }.bind(this);

        var itemClasses = this.props.selected ? "comment selected": "comment";

        var continueThread = null;
        if (this.state.hasChildren) {
            continueThread = (<button className="viewThreadClick" onClick={this.handleContinueThreadClick}>
                Continue Thread
            </button>);
        }

        // TODO: Only continue thread if there's children
        return (
            <div className={itemClasses}>
                <h2 className="commentTitle">{commentData.title}</h2>
                <div className="commentTagline">{commentData.tagLine}</div>
                <div className="commentBody" dangerouslySetInnerHTML={createMarkup()}></div>
                <div className="commentControls">
                    {continueThread}
                    <button className="addCommentButton" onClick={this.handleAddCommentClick}>
                        Add A Comment
                    </button>
                </div>
            </div>
        );
    }
});

var CommentLevelContainer = React.createClass({
    getInitialState: function () {
        return ({
            comments: [],
            selectedComment: null
        });
    },

    loadCommentsFromServer: function (props) {
        if (props.parentId != null) {
            $.ajax({
                url: this.props.url + props.parentId.toString() + "/children",
                dataType: "json",
                cache: false,
                success: function (data) {
                    this.setState({ comments: data });
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });
        }
    },

    handleContinueThreadClick: function (index) {
        this.props.onContinueThreadClick(this.state.comments[index]);
        this.setState({ selectedComment: index });
    },

    handleAddCommentClick: function (properties) {
        this.props.onAddCommentClick(properties);
    },

    componentDidMount: function () {
        this.loadCommentsFromServer(this.props);
        setInterval(this.loadCommentsFromServer.bind(this, this.props), this.props.pollInterval);
    },

    componentWillReceiveProps: function (nextProps) {
        this.loadCommentsFromServer(nextProps);
    },

    render: function () {
        var commentLevelStyle = {
            left: (100 + parseInt(this.props.level) * 50).toString() + "%"
        };
        var comments = this.state.comments.map(function (comment, i) {
            var boundContinueThreadClick = this.handleContinueThreadClick.bind(this, i);
            var selected = i === this.state.selectedComment;
            return (
                <Comment key={i} data={comment}
                         onContinueThreadClick={boundContinueThreadClick}
                         onAddCommentClick={this.handleAddCommentClick}
                         selected={selected}></Comment>
            );
        }.bind(this));

        return (
            <div className="commentLevelContainer contentColumn" style={commentLevelStyle}>
                {comments}
            </div>
        );
    }
});

var CommentsContainer = React.createClass({
    render: function () {
        return (
            <div className="commentsContainer">

            </div>
        );
    }
});

var ContentContainer = React.createClass({
    getInitialState: function () {
        return {
            selectedConversation: null,
            scrollOffset: 0,
            commentChain: [],
            selectedComment: null,
            showClickableConversationsEdge: false
        };
    },

    handleBackClick: function () {
        this.setState({ scrollOffset: this.state.scrollOffset-1, showClickableConversationsEdge: true });

        if (this.state.selectedComment) {
            $.get("/api/posts/" + this.state.selectedComment, function (data) {
                console.log(data);
                this.setState({ selectedComment: data.parent_id });
            }.bind(this));
        }
    },

    handleItemSelect: function (data) {
        this.setState({ selectedConversation: data["selected"] });
    },

    handleCreatePostClick: function () {
        this.props.onCreatePostClick();
    },

    handlePostDiscussClick: function () {
        this.loadCommentChainFromServer();
        this.setState({ scrollOffset: 1, showClickableConversationsEdge: true });
        this.props.onDepthChange(this.state.scrollOffset);
    },

    handleContinueThreadClick: function (comment) {
        this.state.selectedComment = comment.id;
        this.loadCommentChainFromServer();
        // TODO: Add to selected comment chain
    },

    handleAddCommentClick: function (properties) {
        this.props.onAddCommentClick(properties);
    },

    handleClick: function () {
        if (this.state.showClickableConversationsEdge) {
            this.setState({ scrollOffset: 0, showClickableConversationsEdge: false });
        }
    },

    loadCommentChainFromServer: function () {
        if (this.state.selectedComment != null) {
            $.ajax({
                url: this.props.url + "/" + this.state.selectedComment.toString() + "/comment_chain",
                dataType: "json",
                cache: false,
                success: function (data) {
                    this.setState({ commentChain: data["chain"] });
                    this.setState({ scrollOffset: 1 + this.state.commentChain.length, showClickableConversationsEdge: true });
                    this.props.onDepthChange(this.state.scrollOffset);
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });
        } else {

        }
    },

    componentDidMount: function () {
        this.loadCommentChainFromServer();
        setInterval(this.loadCommentChainFromServer, this.props.pollInterval);
        this.props.onDepthChange(this.state.scrollOffset);
    },

    render: function () {
        $(".contentContainer").animate({
            scrollLeft: (this.state.scrollOffset / 2.0) * $(".contentContainer").width()
        });

        var commentLevels = this.state.commentChain.map(function (commentLevel, i) {
            var parentId = this.state.commentChain[i];
            var level = i + 1;

            return (
                <CommentLevelContainer key={i} level={level} parentId={parentId} onCommentClick={this.handleCommentClick}
                                       onAddCommentClick={this.handleAddCommentClick}
                                       onContinueThreadClick={this.handleContinueThreadClick}
                                       url="/api/posts/" pollInterval="1000"></CommentLevelContainer>
            );
        }.bind(this));

        var firstLevel = (<CommentLevelContainer parentId={this.state.selectedConversation}
                                                onAddCommentClick={this.handleAddCommentClick}
                                                onContinueThreadClick={this.handleContinueThreadClick}
                                                level="0" url="/api/posts/" pollInterval="1000" />);

        var backStyle = {
            opacity: "0"
        };

        if (this.state.scrollOffset >= 1) {
            backStyle.opacity = "1";
        }

        return (
            <div className="contentContainer">
                <button className="backButton" style={backStyle} onClick={this.handleBackClick}>⟨</button>
                <ConversationsContainer pollInterval="1000" url="/api/posts/front_page"
                                        showClickableEdge={this.state.showClickableConversationsEdge}
                                        onItemSelect={this.handleItemSelect}
                                        onCreatePostClick={this.handleCreatePostClick}
                                        onContainerClick={this.handleClick}
                                        signedIn={this.props.signedIn} />
                <PostContainer postId={this.state.selectedConversation} url="/api/posts/"
                               onPostDiscussClick={this.handlePostDiscussClick}
                               onAddCommentClick={this.handleAddCommentClick} />
                {firstLevel}
                {commentLevels}
            </div>
        );
    }
});

var SignInForm = React.createClass({
    getInitialState: function () {
        return {
            email: "",
            password: ""
        }
    },

    handleEmailChange: function (e) {
        this.setState({ email: e.target.value });
    },
    handlePasswordChange: function (e) {
        this.setState({ password: e.target.value });
    },

    handleSubmit: function (e) {
        e.preventDefault();
        var email = this.state.email.trim();
        var password = this.state.password.trim();

        var user = {
            email: email,
            password: password
        };

        if (user.email.length > 0 && user.password.length > 0) {
            $.ajax({
                url: this.props.url,
                dataType: "json",
                contentType: "application/json; charset=UTF-8",
                type: "POST",
                data: JSON.stringify(user),
                success: function (data) {
                    if (data["result"]) {
                        // TODO: Do something to indicate sign-in
                        this.props.onSignIn();
                    }
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error(this.props.url, status, err.toString());
                }.bind(this)
            });
            this.setState({
                email: "",
                password: "",
            });
        } else {
            // TODO: Better error handling
            alert("All fields must have a value.");
            return;
        }
    },

    handleCancelClick: function () {
        this.props.onCancelClick();
    },

    render: function () {
        return (
            <div className="signInFormContainer">
                <form className="signInForm" onSubmit={this.handleSubmit}>
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email"
                           value={this.state.email} onChange={this.handleEmailChange} />
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" name="password"
                           value={this.state.password} onChange={this.handlePasswordChange} />
                    <button type="submit">Sign In</button> <button type="button" className="secondary"
                            onClick={this.handleCancelClick}>Cancel</button>
                </form>
            </div>
        );
    }
});

var RegisterForm = React.createClass({
    getInitialState: function () {
        return {
            email: "",
            password: "",
            password_again: ""
        }
    },

    handleEmailChange: function (e) {
        this.setState({ email: e.target.value });
    },
    handlePasswordChange: function (e) {
        this.setState({ password: e.target.value });
    },
    handlePasswordAgainChange: function (e) {
        this.setState({ password_again: e.target.value });
    },

    handleSubmit: function (e) {
        e.preventDefault();
        var email = this.state.email.trim();
        var password = this.state.password.trim();
        var password_again = this.state.password_again.trim();

        if (password == password_again) {
            if (email.length > 0 && password.length > 0) {
                console.log({ "email": email, "password": password, "password_again": password_again });
                $.ajax({
                    url: this.props.url,
                    contentType: "application/json; charset=UTF-8",
                    dataType: "json",
                    type: "POST",
                    data: JSON.stringify({
                        "email": email, "password": password, "password_again": password_again
                    }),
                    success: function (data) {
                        console.log(data);
                        // TODO: Do something to indicate registration

                        $.ajax({
                            url: this.props.signInUrl,
                            contentType: "application/json; charset=UTF-8",
                            dataType: "json",
                            type: "POST",
                            data: JSON.stringify({ email: email, password: password }),
                            success: function (data) {
                                // TODO: Do something to indicate sign-in
                            }.bind(this),
                            error: function (xhr, status, err) {
                                console.error(this.props.url, status, err.toString());
                            }.bind(this)
                        });
                    }.bind(this),
                    error: function (xhr, status, err) {
                        console.error(this.props.url, status, err.toString());
                    }.bind(this)
                });
                this.setState({
                    email: "",
                    password: "",
                    password_again: ""
                });
            } else {
                // TODO: Better error handling
                alert("All fields must have a value.");
                return;
            }
        } else {
            // TODO: Better error handling
            alert("Passwords do not match.");
            return;
        }
    },

    handleCancelClick: function () {
        this.props.onCancelClick();
    },

    render: function () {
        return (
            <div className="registerFormContainer">
                <form className="registerForm" onSubmit={this.handleSubmit}>
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email"
                           value={this.state.email} onChange={this.handleEmailChange} />
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" name="password"
                           value={this.state.password} onChange={this.handlePasswordChange}  />
                    <label htmlFor="password">Password Again</label>
                    <input type="password" id="password_again" name="password_again"
                           value={this.state.password_again} onChange={this.handlePasswordAgainChange}  />
                    <button type="submit">Register</button> <button type="button" className="secondary"
                            onClick={this.handleCancelClick}>Cancel</button>
                </form>
            </div>
        );
    }
});

var AppContainer = React.createClass({
    getInitialState: function () {
        return {
            showCreatePostForm: false,
            showCreateCommentForm: false,
            commentParent: null,
            commentRoot: null,
            showSignInForm: false,
            showRegisterForm: false,
            signedInUser: null,
            depth: 0
        };
    },

    handleDepthChange: function (depth) {
        this.setState({ depth: depth });
    },

    handleSignInClick: function () {
        this.setState({ showSignInForm: true });
    },

    handleSignInCancelClick: function () {
        this.setState({ showSignInForm: false });
    },

    handleRegisterClick: function () {
        this.setState({ showRegisterForm: true });
    },

    handleRegisterCancelClick: function () {
        this.setState({ showRegisterForm: false });
    },

    handleCreatePostClick: function () {
        this.setState({ showCreatePostForm: true });
    },

    handleCreatePostCancelClick: function () {
        this.setState({ showCreatePostForm: false });
    },

    handleCreateCommentCancelClick: function () {
        this.setState({ showCreateCommentForm: false });
    },

    handleAddCommentClick: function (properties) {
        console.log(properties);
        this.setState({ showCreateCommentForm: true, commentParent: properties.parent, commentRoot: properties.root });
    },

    handleAddCommentCancelClick: function () {
        this.setState({ showCreateCommentForm: false, commentParent: null, commentRoot: null });
    },

    handleAddComment: function () {
        this.setState({ showCreateCommentForm: false, commentParent: null, commentRoot: null });
    },

    handleCreatePost: function () {
        this.setState({ showCreatePostForm: false });
    },

    handleSignIn: function () {
        this.setState({ showSignInForm: false, showRegisterForm: false }, function () {
            this.checkOnlineStatus();
        });
    },

    checkOnlineStatus: function () {
        $.ajax({
            url: this.props.statusUrl,
            dataType: "json",
            cache: false,
            success: function (data) {
                this.setState({ signedInUser: data["user"] });
            }.bind(this),
            error: function (xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },

    componentDidMount: function() {
        this.checkOnlineStatus();
        setInterval(this.checkOnlineStatus, this.props.pollInterval);
    },

    render: function () {
        var signInForm = this.state.showSignInForm ? (<SignInForm onCancelClick={this.handleSignInCancelClick} onSignIn={this.handleSignIn} url="/api/sign_in" />) : null;
        var registerForm = this.state.showRegisterForm ? (<RegisterForm onCancelClick={this.handleRegisterCancelClick} url="/api/register" signInUrl="/api/sign_in" />) : null;
        var createPostForm = this.state.showCreatePostForm ? (<CreatePostForm onCancelClick={this.handleCreatePostCancelClick} onCreatePost={this.handleCreatePost} url="/api/posts" />) : null;
        var createCommentForm = this.state.showCreateCommentForm ? (
            <CreateCommentForm onCancelClick={this.handleCreateCommentCancelClick}
                               onCreateComment={this.handleCreateComment}
                               onCancelClick={this.handleCreateCommentCancelClick}
                               url="/api/posts"
                               parent={this.state.commentParent} root={this.state.commentRoot} />
        ) : null;

        var signedIn = false;

        if (this.state.signedInUser) {
            // No need to show this information for a signed in user
            signInForm = null;
            registerForm = null;

            signedIn = true;
        } else {
            createPostForm = null;
        }

        return (
            <div className="appContainer">
                <HeaderBar onSignInClick={this.handleSignInClick} onRegisterClick={this.handleRegisterClick}
                           onBackClick={this.handleBackClick}
                           signedIn={signedIn} user={this.state.signedInUser} />
                <ContentContainer onCreatePostClick={this.handleCreatePostClick}
                                  onAddCommentClick={this.handleAddCommentClick}
                                  url="/api/posts"
                                  signedIn={signedIn} pollInterval="5000" onDepthChange={this.handleDepthChange} />
                {signInForm}
                {registerForm}
                {createPostForm}
                {createCommentForm}
            </div>
        );
    }
});

ReactDOM.render(
    <AppContainer statusUrl="/api/signed_in" pollInterval="5000" />,
    document.getElementById("content")
);
