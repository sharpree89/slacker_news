angular.module("slackerNews", ["ui.router"])

// <------------------ Client-Side Routes ------------------>

.config([
  "$stateProvider",
  "$urlRouterProvider",
  function($stateProvider, $urlRouterProvider) {

    $stateProvider
      .state("home", {
        url: "/home",
        templateUrl: "/home.html",
        controller: "mainCont",
        resolve: {
          postPromise: ['postsFact', function(postsFact) {
            return postsFact.getAll();
          }]
        }
      })

      .state("posts", {
        url: "/posts/{id}",
        templateUrl: "/posts.html",
        controller: "postsCont",
        resolve: {
          post: ['$stateParams', 'postsFact', function($stateParams, postsFact) {
            return postsFact.get($stateParams.id);
          }]
        }
      })

      .state("login", {
        url: '/login',
        templateUrl: "/login.html",
        controller: "authCont",
        onEnter: ["$state", "auth", function($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go("home");
          }
        }]
      })

      .state("register", {
        url: '/register',
        templateUrl: "/register.html",
        controller: "authCont",
        onEnter: ["$state", "auth", function($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go("home");
          }
        }]
      })

      $urlRouterProvider.otherwise("home");
  }])

// <------------------ Factories ------------------>

.factory("auth", ["$http", "$window", function($http, $window) {

  var auth = {};

  auth.saveToken = function(token) {
    $window.localStorage["slackernewstoken"] = token;
  };

  auth.getToken = function() {
    return $window.localStorage["slackernewstoken"];
  };

  auth.isLoggedIn = function() {
    var token = auth.getToken();
    if (token) {
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  };

  auth.currentUser = function() {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      var username = payload.username;
      return payload.username;
    }
  };

  auth.register = function(user) {
    return $http.post('/register', user).success(function(data) {
      auth.saveToken(data.token);
    });
  };

  auth.login = function(user) {
    return $http.post('/login', user).success(function(data) {
      auth.saveToken(data.token);
    });
  };

  auth.logOut = function(user) {
    $window.localStorage.removeItem("slackernewstoken");
  };

  return auth;
}])

.factory("postsFact", ["$http", "auth", function($http, auth) {

  var obj = {
    posts: []
  };

  obj.getAll = function() {
    return $http.get('/posts').success(function(data) {
      angular.copy(data, obj.posts);
    });
  };

  obj.get = function(id) {
    return $http.get('/posts/' + id).then(function(res) {
      return res.data;
    });
  };

  obj.createPost = function(post) {
    return $http.post('/post', post, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      obj.posts.push(data);
    })
  };

  obj.delete = function(post) {
    return $http.delete('/posts/' + post._id + '/delete', post).success(function(data){
      console.log('LINE 139 POSTS FACTORY');
      console.log(data);
    });
  }

  obj.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      post.score += 1;
    })
  };

  obj.downvote = function(post) {
    return $http.put('/posts/' + post._id + '/downvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      post.score -= 1;
    })
  };

  obj.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    });
  };

  obj.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      comment.score += 1;
    })
  };

  obj.downvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/downvote', {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).success(function(data) {
      comment.score -= 1;
    })
  };

  obj.deleteComment = function(post, comment) {
    console.log('LINE 183 POSTS FACTORY');
    console.log('Post ID: ' + post._id); //this prints
    console.log('Comment ID: ' + comment._id); //this does not print
    return $http.delete('/posts/' + post._id + '/comments/' + comment._id + '/delete', comment).success(function(data){
      console.log('LINE 185 POSTS FACTORY');
      console.log(data);
    });
  }

  return obj;
}])

// <------------------ Controllers ------------------>

.controller("mainCont", [
  "$scope",
  "postsFact",
  "auth",
  "$window",
  function($scope, postsFact, auth, $window) {

    $scope.posts = postsFact.posts;
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addPost = function() {
      if($scope.title) {
        postsFact.createPost({
          author: auth.currentUser,
          title: $scope.title,
          link: $scope.link,
          body: $scope.body
        });
        $scope.title = "";
        $scope.link = "";
        $scope.body = "";
      }
      else{
        return;
      }
    }

    $scope.upvote = function(post) {
      if(!post.hadUpVoted) {
        postsFact.upvote(post);
        post.hadUpVoted = true;
      }
    }

    $scope.downvote = function(post) {
      if (!post.hadDownVoted) {
        postsFact.downvote(post);
        post.hadDownVoted = true;
      }
    }

    $scope.delete = function(post) {
      console.log('LINE 239 MAIN CONTROLLER');
      console.log('Post ID: ' + post._id); //this prints
      postsFact.delete(post);
      $window.location.reload();
    }

  }])

  .controller("postsCont", [
    "$scope",
    "$stateParams",
    "postsFact",
    "post",
    "auth",
    "$window",
    function($scope, $stateParams, postsFact, post, auth, $window) {
      $scope.post = post;
      $scope.isLoggedIn = auth.isLoggedIn;

      $scope.addComment = function() {
        if($scope.body) {
          postsFact.addComment(post._id, {
            author: auth.currentUser,
            body: $scope.body,
          }).success(function(comment) {
            $scope.post.comments.push(comment);
          });
          $scope.body = "";
        }
        else{
          return;
        }
      }

      $scope.upvote = function(comment) {
        if (!comment.hadUpVoted) {
          postsFact.upvoteComment(post, comment);
          comment.hadUpVoted = true;
        }
      }

      $scope.downvote = function(comment) {
        if (!comment.hadDownVoted) {
          postsFact.downvoteComment(post, comment);
          comment.hadDownVoted = true;
        }
      }

      $scope.delete = function(comment) {
        console.log('HITTING POSTS CONTROLLER');
        postsFact.deleteComment(post, comment);
        $window.location.reload();
      }

    }])

  .controller("authCont", [
    "$scope",
    "auth",
    "$state",
    function($scope, auth, $state) {
      $scope.user = {};

      $scope.register = function() {
        auth.register($scope.user).error(function(error) {
          $scope.error = error;
        }).then(function() {
          $state.go('home');
        });
      };

      $scope.login = function() {
        auth.login($scope.user).error(function(error) {
          $scope.error = error;
        }).then(function() {
          $state.go('home');
        });
      };
    }])

  .controller("navCont", [
    "$scope",
    "auth",
    function($scope, auth) {
      $scope.isLoggedIn = auth.isLoggedIn;
      $scope.currentUser = auth.currentUser;
      $scope.logOut = auth.logOut;
    }])
