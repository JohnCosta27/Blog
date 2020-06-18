//This script is what makes the website run.

let seconds = 1000;
let minutes = 60000;
let hours = 3600000;
let days = 86400000;
let weeks = 604800000;
let months = 2721600000;
let years = 31536000000;

function loadPosts() {

  fetch("/posts/getposts", {method: 'get'})
  .then(response => response.json())
  .then(posts => {

    console.log(posts);

    posts.sort(function(a, b) {
      return b.datetime - a.datetime;
    });

    let mainDiv = document.getElementById("mainDiv");

    let datenow = new Date().getTime();

    for (let post of posts) {

      let displayDate = timeDifference(datenow, post.datetime);

      mainDiv.innerHTML += `<a href="viewpost.html?post=${post.PostID}"><div class="mainPostWrapper">
      <div class="mainPostTitle">
      <p class="postTitleText">${post.title}</p>
      <p class="postTitleAuthorText">Posted by: </p>
      <p class="postTitleAuthorName">${post.author}</p>
      <p class="postTitleAuthorText">${displayDate}</p>
      </div>
      <div class="mainPostContent"><p class="postContentText">${post.content}</p></div></a>`

      if (posts.length > 3) {
        document.getElementById("mainDiv").style.height = (posts.length * 310) + "px";
      }

    }

  });

  fetch("/posts/getallusers", {method: 'get'})
  .then(response => response.json())
  .then(posts => {
    console.log(posts);
  });

}

function submitPost() {

  let title = document.getElementById("createPostTitle").value;
  let content = document.getElementById("createPostContent").value;

  let formData = getFormData({title: title, content: content});

  fetch("/posts/create", {method: 'post', body: formData})
  .then(response => response.json())
  .then(response => {
    location.replace("index.html");
  });

}

function getPost() {

  const queryString = window.location.search.substring(1);
  let query = queryString.split('=')[0];
  let id = queryString.split('=')[1];

  if (!(query == "post")) {
    alert("Invalid query command, stop touching URL ;)");
    location.replace("index.html");
  } else {

    fetch("/posts/getpost/" + id, {method: 'get'})
    .then(response => response.json())
    .then(post => {

      let displayDate = timeDifference(new Date().getTime(), post.datetime);

      document.getElementById("mainDiv").innerHTML += `<div class="mainPostTitle">
      <p class="postTitleText">${post.title}</p>
      <p class="postTitleAuthorText">Posted by: </p>
      <p class="postTitleAuthorName">${post.author}</p>
      <p class="postTitleAuthorText">${displayDate}</p>
      </div>
      <div class="mainPostContent"><p class="postContentText">${post.content}</p>`

    });

  }

}

function login() {

  let username = document.getElementById("loginUsername").value;
  let password = document.getElementById("loginPassword").value;

  let formData = getFormData({username: username, password: password});

  fetch("/users/login", {method: 'post', body: formData})
  .then(response => response.json())
  .then(cookie => {
    document.cookie = "token=" + cookie.cookie;
    location.replace("index.html");
  });

}

function getFormData(object) {
  const formData = new FormData();
  Object.keys(object).forEach(key => formData.append(key, object[key]));
  return formData;
}

function timeDifference(currentDate, postDate) {

  let dif = currentDate - postDate;

  if (dif < minutes) {
    return Math.floor(dif / seconds) + " seconds ago";
  } else if (dif < hours) {
    return Math.floor(dif / minutes) + " minutes ago";
  } else if (dif < days) {
    return Math.floor(dif / hours) + " hours ago";
  } else if (dif < weeks) {
    return Math.floor(dif / days) + " days ago";
  } else if (dif < months) {
    return Math.floor(dif / weeks) + " weeks ago";
  } else if (dif < years) {
    return Math.floor(dif / months) + " months ago";
  } else {
    return Math.floor(dif / years) + " years ago";
  }

}
