const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('resources/database.db');
const sha256 = require('js-sha256').sha256;

const app = express();

const formProcessor = require('express-formidable');
const cookieParser = require('cookie-parser')

app.use(formProcessor());
app.use(cookieParser())

app.use('/',
(req, res, next) => {
  console.log("Serving static content: " + req.path);
  next();
},
express.static('resources/client')
);

const port = 8080;

app.listen(port, function(){
  console.log('Server is running, port ', port);
});

const users = express.Router();
app.use('/users', (req, res, next) => {
  console.log("Users API: /users" + req.path);
  next();
}, users);

users.post('/register', function(req, res) {
  if (req.fields['firstname'] == null || req.fields['surname'] == null || req.fields['password'] == null || req.fields['adminKey'] != "createUsersKey123" || req.fields['username'] == null) {
    res.json({error: "One or more parameters are null"});
  } else {
    try {

      let allusernames = db.prepare("SELECT username FROM Users");
      let results = allusernames.all();
      let found = false;
      for (let username of results) {
        if (username.username == req.fields['username']) {
          found = true;
        }
      }

      if (found) {
        res.json({error: "This username is being used by another user"});
      } else {

        let regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
        if(!(req.fields['password'].match(regex))) {
          res.json({error: "Password is invalid"})
        } else {

          let password_salt = generateSalt();
          let hashedPassword = sha256(req.fields['password'] + password_salt);
          let cookie = generateSalt();
          let registerPS = db.prepare("INSERT INTO Users (firstname, surname, password, password_salt, username, cookie) VALUES (?, ?, ?, ?, ?, ?)");

          let result = registerPS.run(req.fields['firstname'], req.fields['surname'], hashedPassword, password_salt, req.fields['username'], cookie);

          if (result.changes === 1) {
            res.json({cookie: cookie});
          } else {
            throw 'Unable to create new user';
          }

        }

      }

    } catch (error) {
      res.json({error: "unable to create user"});
    }
  }
})
users.post('/login', function(req, res) {
  if (req.fields['username'] == null || req.fields['password'] == null) {
    res.json({error: "One or more parameters are null"});
  } else {
    try {

      let getPasswordDetails = db.prepare("SELECT password, password_salt FROM Users WHERE username = ?");
      let results = getPasswordDetails.all(req.fields['username']);

      if (isEmpty(results)) {
        res.json({error: "This username is not registered"});
      } else {
        let inputPassword = sha256(req.fields['password'] + results[0].password_salt);
        if (inputPassword != results[0].password) {
          res.json({error: "Password does not match the username"});
        } else {
          let setCookie = db.prepare("UPDATE Users SET Cookie = ? WHERE username = ?");
          let cookie = generateSalt();
          setCookie.run(cookie, req.fields['username']);
          res.json({cookie: cookie, wtf: "hello"});
        }
      }

    } catch (error) {
      res.json({error: "unable to login"});
    }
  }
});

const posts = express.Router();
app.use('/posts', (req, res, next) => {
  console.log("Posts API: /posts" + req.path);
  next();
}, posts);

posts.post('/create', function(req, res) {
  if (req.fields['content'] == null || req.fields['title'] == null) {
    res.json({error: "One or more parameters are null"});
  } else {
    try {

      let userID = getUserID(req.cookies.token);

      if (userID === null) {
        res.json({error: "invalid cookie"})
      } else {

        let datetime = new Date();
        let createPost = db.prepare("INSERT INTO Posts (author, content, title, datetime) VALUES (?, ?, ?, ?)");
        let results = createPost.run(userID, req.fields['content'], req.fields['title'], datetime.getTime());

        if (results.changes === 1) {
          res.json({status: "OK"});
        } else {
          throw 'Unable to create new user';
        }

      }
    } catch (error) {
      res.json({error: "unable to create post"});
    }
  }
});
posts.post('/delete', function(req, res) {
  if (req.fields['PostID'] == null) {
    res.json({error: "One or more parameters are null"});
  } else {
    try {

      let deletePost = db.prepare("DELETE FROM Posts WHERE PostID = ?");
      let results = deletePost.run(req.fields['PostID']);

      if (results.changes === 1) {
        res.json({status: "OK"});
      } else {
        throw 'Unable to delete post';
      }

    } catch (error) {
      res.json({error: "unable to delete post"});
    }
  }
})
posts.get('/getposts', function(req, res) {

  try {

    let getPosts = db.prepare("SELECT * FROM Posts");
    let results = getPosts.all();

    for (let post of results) {
      let getAuthor = db.prepare("SELECT username FROM Users WHERE UserID = ?");
      let author = getAuthor.get(post.author);
      post.author = author.username;
    }

    res.json(results);

  } catch (error) {
    res.json({error: "unable to read posts"});
  }

});
posts.get('/getpost/:postid', function(req, res) {

  try {
    let getPost = db.prepare("SELECT * FROM Posts WHERE PostID = ?");
    let results = getPost.get(req.params.postid);

    let getAuthor = db.prepare("SELECT username FROM Users WHERE UserID = ?");
    let author = getAuthor.get(results.author);
    results.author = author.username;

    res.json(results);

  } catch (error) {
    res.json({error: "unable to read post, it might not exist"});
  }

});
posts.get('/getallusers', function(req, res) {

  let getusers = db.prepare("SELECT * FROM Users");
  let results = getusers.all();
  res.json(results);

});

function getUserID(cookiePassed) {

  let getUserID = db.prepare("SELECT UserID FROM Users WHERE cookie = ?");
  let results = getUserID.get(cookiePassed);
  if (isEmpty(results)) {
    return null;
  } else {
    return results.UserID;
  }

}
function generateSalt() {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function isEmpty(obj) {
  for (let prop in obj) {
    if(obj.hasOwnProperty(prop)) {
      return false;
    }
  }
  return true;
}
