var express = require('express');
var jwt = require('express-jwt');
var router = express.Router();
var auth = jwt({ secret: 'SECRET', userProperty: 'payload' });
var passport = require('passport');

var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

// <------------------ GET Routes ------------------>

// Index
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//Get All Posts
router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts) {
    if(err) {
      next(err);
    }
    res.json(posts);
  })
});

// Get A Specific Post
router.get('/posts/:post', function(req, res) {
  req.post.populate('comments', function(err, post) {
    res.json(post);
  })
});

// <------------------ POST Routes ------------------>

// Register New User
router.post('/register', function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'Please do not leave any fields blank.' });
  }
  if (req.body.username.length < 6 || req.body.username.length > 18) {
    return res.status(400).json({ message: 'Username must have between 6 and 18 characters.' });
  }
  if (req.body.password.length < 8) {
    return res.status(400).json({ message: 'Password must have at least 8 characters.' });
  }

  var user = new User();

  user.username = req.body.username;
  user.setPassword(req.body.password);
  user.save(function(err) {
    if (err){
      return next(err);
    }
    return res.json({ token: user.generateJWT() });
  })
});

// Login Existing User
router.post('/login', function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'Please do not leave any fields blank.' });
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (user) {
      return res.json({ token: user.generateJWT() });
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});

// Create New Post
router.post('/post', auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username;

  post.save(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

// Create New Comment
router.post('/posts/:post/comments', auth, function(req, res, next) {
  //creating a new mongoose object == to the request body
  var comment = new Comment(req.body);
  //setting the comment's associated post == to that specific post
  comment.post = req.post;
  comment.author = req.payload.username;
  //save the new comment into the db
  comment.save(function(err, comment) {
    if (err) {
      return next(err);
    }
    //push the new comment into the post's array of comments
    req.post.comments.push(comment);
    //save changes to the post
    req.post.save(function(err, post) {
      if (err) {
        return next(err);
      }
      res.json(comment);
    })
  })
});

// <------------------ PUT Routes (Voting) ------------------>

// Finding specific post and comment ids to use as route params
router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function(err, post) {
    if (err) {
      return next(err);
    }
    if (!post) {
      return next(new Error("Sorry, we couldn't find that post!"));
    }
    req.post = post;
    return next();
  })
});

router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function(err, comment) {
    if (err) {
      return next(err);
    }
    if (!comment) {
      return next(new Error("Sorry, we couldn't find that comment!"));
    }
    req.comment = comment;
    return next();
  })
});

// Upvoting Posts
router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

// Upvoting Comments
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if (err) {
      return next(err);
    }
    res.json(comment);
  })
});

// <------------------ DELETE Routes ------------------>

// Delete Posts
router.delete('/posts/:post/delete', function(req, res, next) {
  console.log('HITTING DELETE POST ROUTE');
  req.post.remove(function (err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  })
});

// Delete Comments
router.delete('/posts/:post/comments/:comment/delete', function(req, res, next) {
  console.log('HITTING DELETE COMMENT ROUTE');
  console.log(req.comment);
  req.comment.remove(function (err, comment) {
    if (err) {
      return next(err);
    }
    res.json(comment);
  })
});

module.exports = router;
