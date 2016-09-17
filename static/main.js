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
                 <h1>Alterkation</h1>
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
                <div className="conversationSummary">{this.props.summary}</div>
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
            var summary = conversation.body.substring(0, 80) + "...";

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

    componentDidMount: function() {
        this.loadConversationsFromServer();
        setInterval(this.loadConversationsFromServer, this.props.pollInterval);
    },

    render: function () {
        var createPostButton = this.props.signedIn ? (<CreatePostButton onCreatePostClick={this.handleCreatePostClick} />) : null;
        return (
            <div className="conversationsContainer contentColumn">
                {createPostButton}
                <ConversationsList data={this.state.data} onItemSelect={this.handleItemSelect} />
            </div>
        );
    }
});

var Post = React.createClass({
    render: function () {
        var postData = this.props.data.hasOwnProperty("title") ? this.props.data : { title: "", tagLine: "", body: "" };
        var createMarkup = function () {
            return { __html: postData.body };
        }.bind(this);
        if (postData["title"].length > 0) {
            return (
                <div className="post">
                    <h1 className="postTitle">{postData.title}</h1>
                    <div className="postTagline">{postData.tagLine}</div>
                    <div className="postBody" dangerouslySetInnerHTML={createMarkup()}></div>
                </div>
            )
        }

        return null;
    }
});

var PostContainer = React.createClass({
    getInitialState: function () {
        return { postId: null, data: {} };
    },

    loadPostFromServer: function () {
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
        })
    },

    componentWillReceiveProps: function (nextProps) {
        this.setState({ postId: nextProps.postId }, function () {
            this.loadPostFromServer();
        });
    },

    render: function () {
        var postContainerStyle = {
            left: "50%"
        };

        return (
            <div className="postContainer contentColumn" style={postContainerStyle}>
                <Post data={this.state.data} />
            </div>
        )
    }
});

var CommentLevelContainer = React.createClass({
    render: function () {
        return (
            <div className="commentLevelContainer contentColumn">

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
        return { selectedConversation: null };
    },

    handleItemSelect: function (data) {
        this.setState({ selectedConversation: data["selected"] });
    },

    handleCreatePostClick: function () {
        this.props.onCreatePostClick();
    },

    render: function () {
        return (
            <div className="contentContainer">
                <ConversationsContainer pollInterval="5000" url="/api/posts/front_page"
                                        onItemSelect={this.handleItemSelect}
                                        onCreatePostClick={this.handleCreatePostClick}
                                        signedIn={this.props.signedIn} />
                <PostContainer postId={this.state.selectedConversation} url="/api/posts/" />
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
                    console.log(data);
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
            showSignInForm: false,
            showRegisterForm: false,
            signedInUser: null
        };
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

    handleSignIn: function () {
        this.checkOnlineStatus();
        this.setState({ showSignInForm: false, showRegisterForm: false });
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
        var createPostForm = this.state.showCreatePostForm ? (<CreatePostForm onCancelClick={this.handleCreatePostCancelClick} url="/api/posts" />) : null;

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
                           signedIn={signedIn} user={this.state.signedInUser} />
                <ContentContainer onCreatePostClick={this.handleCreatePostClick} signedIn={signedIn} />
                {signInForm}
                {registerForm}
                {createPostForm}
            </div>
        );
    }
});

ReactDOM.render(
    <AppContainer statusUrl="/api/signed_in" pollInterval="5000" />,
    document.getElementById("content")
);
