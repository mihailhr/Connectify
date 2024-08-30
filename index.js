const express = require("express");
const handlebars = require("express-handlebars");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./Mongoose models/user");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./Middlewares/auth");
const multer = require("multer");
const fs = require("fs");
const Photo = require("./Mongoose models/photo");
const { error } = require("console");



require("dotenv").config();

const uri = process.env.URI;
const PORT = process.env.PORT || 3000;
const secret = process.env.secret;

const app = express();
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(authenticateToken);

app.engine(
  "handlebars",
  handlebars.engine({
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB via Mongoose");
    app.listen(PORT, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((err) => {
    console.error("Mongoose connection error:", err);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to application termination");
  process.exit(0);
});

const storage = multer.memoryStorage();
const upload = multer({ storage });











app.get("/", (req, res) => {
  if (req.isAuth) {
    return res.redirect("/mainFeed");
  }
  return res.render("home", { isAuth: req.isAuth });
});
app.get("/test", (req, res) => {
  res.render("test");
});

app.get("/register", (req, res) => {
  if (req.isAuth) {
    return res.redirect("/mainFeed");
  }
  res.render("register", { isAuth: req.isAuth });
});

app.get("/about", (req, res) => {
  res.render("about", { isAuth: req.isAuth });
});

app.get("/myAccount", async (req, res) => {
  if (!req.isAuth) {
    return res.redirect("/");
  }
  const posts = await Photo.find({ creator: req.user });
  res.render("myAccount", { isAuth: req.isAuth, user: req.user, posts });
});

app.get("/logOut", (req, res) => {
  if (!req.isAuth) {
    return res.redirect("/");
  }
  res.render("logOut", { isAuth: req.isAuth });
});

app.get("/logUserOut", (req, res) => {
  if (!req.isAuth) {
    return res.redirect("/");
  }
  res.clearCookie("token").redirect("/");
});

app.get("/upload", (req, res) => {
  if (!req.isAuth) {
    return res.redirect("/");
  }
  res.render("upload", { isAuth: req.isAuth });
});

app.get("/mainFeed", async (req, res) => {
  try {
    let allImages = await Photo.find();
    allImages = allImages.reverse();
   console.log(allImages)
    for(let element of allImages){
      const buffer=Buffer.from(element.data, 'base64')
      const finalBuffer=buffer.toString("base64")
      element.img=finalBuffer
    }
    res.render("mainFeed", { images: allImages, isAuth: req.isAuth });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/users/:id", async (req, res) => {
  const userFound = await User.findOne({ username: req.params.id });

  if (!userFound) {
    return res.render("users", { isAuth: req.isAuth, error: "User not found" });
  }
  let isFollowing;
  const mainUser = await User.findOne({ username: req.user });
  let isUser=req.user==req.params.id
  if (
    req.isAuth &&
    mainUser.followedUsers.find((e) => e.username === req.params.id)
  ) {
    isFollowing = true;
  } else {
    isFollowing = false;
  }
  const posts = await Photo.find({ creator: req.params.id });
  for(let element of posts){
    const buffer=Buffer.from(element.data, 'base64')
      const finalBuffer=buffer.toString("base64")
      element.img=finalBuffer
  }
  res.render("users", {
    isAuth: req.isAuth,
    userInfo: userFound,
    posts,
    isFollowing,
    isUser
  });
});

app.get("/search", async (req, res) => {
  res.render("search", { isAuth: req.isAuth });
});

app.get("/images/:id", async (req, res) => {
  const searchedImage = req.params.id;
  const findingImage = await Photo.findOne({ title: searchedImage });
  const isAuthor = findingImage.creator == req.user;
  const hasLiked = findingImage.likesList.includes(req.user);
  const buffer=Buffer.from(findingImage.data, 'base64')
  if (!req.isAuth) {
    return res.render("imageView", {
      isAuth: req.isAuth,
      results: findingImage,
      buffer:buffer.toString("base64")
    });
  }
  res.render("imageView", {
    isAuth: req.isAuth,
    results: findingImage,
    isAuthor,
    hasLiked,
    buffer:buffer.toString("base64")
  });
});

app.post("/register", async (req, res) => {
  if (req.body.password !== req.body.rePass) {
    return res.render("register", { error: "Invalid password confirmation" });
  }

  try {
    const usernameTaken = await User.findOne({ username: req.body.username });
    const emailTaken = await User.findOne({ email: req.body.email });
    if (usernameTaken) {
      return res.render("register", {
        error: "This username is already being used.",
      });
    }
    if (emailTaken) {
      return res.render("register", {
        error: "This email is already being used.",
      });
    }
    const hashedPass = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPass;
    const newUser = await User.create(req.body);
    const token = jwt.sign({ username: req.body.username }, secret, {
      expiresIn: "3d",
    });
    return res.status(200).cookie("token", token).redirect("/mainFeed");
  } catch (err) {
    console.error("Error creating user:", err);
    return res.render("register", { error: err, isAuth: req.isAuth });
  }
});

app.post("/", async (req, res) => {
  try {
    const userExists = await User.findOne({ username: req.body.username });
    if (!userExists) {
      console.log(1);
      return res.render("home", {
        isAuth: req.isAuth,
        error: "Invalid username",
      });
    }
    const checkingPassword = await bcrypt.compare(
      req.body.password,
      userExists.password
    );
    if (!checkingPassword) {
      console.log(2);
      return res.render("home", {
        isAuth: req.isAuth,
        error: "Incorrect username or password",
      });
    }
    const token = jwt.sign({ username: req.body.username }, secret, {
      expiresIn: "3d",
    });
    res.cookie("token", token);

    console.log(3);
    return res.status(200).redirect("/mainFeed");
  } catch (error) {
    return res.render("/", { isAuth: req.isAuth, error: error });
  }
});

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  if(!req.isAuth){
    return res.redirect("/register")
  }

  const newImage = new Photo({
    filename: req.file.originalname, 
    contentType: req.file.mimetype,
    data: req.file.buffer,
    originalName: req.file.originalname,
    description: req.body.description,
    title: req.body.title,
    creator: req.user,
    likesList: []
  });

  try {
    await newImage.save();
    res.redirect('/mainFeed');
  } catch (err) {
    console.error('Error saving image:', err);
    res.status(500).send('Error saving image');
  }
});

app.post("/search", async (req, res) => {
  try {
    const searchedUserOrImage = req.body.keyword;
    const findingUser = await User.findOne({ username: searchedUserOrImage });
    let findingImage = await Photo.findOne({ title: searchedUserOrImage });
    if(findingImage){
      const buffer=Buffer.from(findingImage.data, 'base64')
      const finalBuffer=buffer.toString("base64")
      findingImage.img=finalBuffer
    }
    if (!findingImage && !findingUser) {
      console.log("case 1");
      return res.render("search", {
        isAuth: req.isAuth,
        error: `User ${searchedUserOrImage} doesn't exist and there aren't any photos with this title yet.`,
      });
    }
    if (!findingUser) {
      console.log("case 2");
      
      return res.render("search", {
        isAuth: req.isAuth,
        resultsImage: findingImage,
      });
    }
    if (!findingImage) {
      console.log("case 3");
      res.render("search", { isAuth: req.isAuth, resultsUser: findingUser });
    }
    
    res.render("search", {
      isAuth: req.isAuth,
      resultsUser: findingUser,
      resultsImage: findingImage,
    });
  } catch (error) {}
});

app.post("/images/:id", async (req, res) => {
  if (!req.isAuth) {
    return res.redirect("mainFeed");
  }
  try {
    const image = await Photo.findOne({ title: req.params.id });
    if (image.likesList.includes(req.user)) {
      const indexToDel = image.likesList.indexOf(req.user);
      image.likesList.splice(indexToDel, 1);
      await image.save();
    } else {
      image.likesList.push(req.user);
      console.log(image.likesList);
      await image.save();
    }

    res.redirect("/images/" + req.params.id);
  } catch (error) {
    console.log(error);
  }
});

app.post("/mainFeed", async (req, res) => {
  if (req.body.sort == "oldest") {
    try {
      let allImages = await Photo.find();
      for(let element of allImages){
        
          const buffer=Buffer.from(element.data, 'base64')
          const finalBuffer=buffer.toString("base64")
          element.img=finalBuffer
        
      }
      return res.render("mainFeed", { images: allImages, isAuth: req.isAuth });
    } catch (error) {
      return res.status(500).send(error);
    }
  }
  if (req.body.sort == "mostLiked") {
    try {
      let allImages = await Photo.find();
      allImages = allImages.sort(
        (a, b) => b.likesList.length - a.likesList.length
      );
      for(let element of allImages){
        
        const buffer=Buffer.from(element.data, 'base64')
        const finalBuffer=buffer.toString("base64")
        element.img=finalBuffer
      
    }
      return res.render("mainFeed", { images: allImages, isAuth: req.isAuth });
    } catch (error) {
      return res.status(500).send(error);
    }
  }
  if (req.body.sort == "newest") {
    try {
      let allImages = await Photo.find();
      allImages=allImages.reverse()
      for(let element of allImages){
        
        const buffer=Buffer.from(element.data, 'base64')
        const finalBuffer=buffer.toString("base64")
        element.img=finalBuffer
      
    }
      return res.render("mainFeed", { images: allImages, isAuth: req.isAuth });
    } catch (error) {
      return res.status(500).send(error);
    }
  }
  if (req.body.sort == "followers") {
    console.log("reached");
    try {
      const mainUser = await User.findOne({ username: req.user });
      const creators = mainUser.followedUsers;
      let allImages = [];
      for (let element of creators) {
        const foundImageByAuthor = await Photo.find({
          creator: element.username,
        });
        if (foundImageByAuthor) {
          for (let image of foundImageByAuthor) {
            allImages.push(image);
          }
        }
      }
      for(let element of allImages){
        
        const buffer=Buffer.from(element.data, 'base64')
        const finalBuffer=buffer.toString("base64")
        element.img=finalBuffer
      
    }
      console.log(allImages);

      return res.render("mainFeed", { images: allImages, isAuth: req.isAuth });
    } catch (error) {
      return res.status(500).send(error);
    }
  }
});

app.post("/users/:id", async (req, res) => {
  if (!req.isAuth) {
    return res.send("You need to be logged in to follow users");
  }
  if(req.user===req.params.id){
    return res.send("You cannot file yourself")
  }
  const mainUser = await User.findOne({ username: req.user });
  if (mainUser.followedUsers.find((e) => e.username == req.params.id)) {
    console.log("here");
    const indexToDel = mainUser.followedUsers.indexOf({
      username: req.params.id,
    });
    mainUser.followedUsers.splice(indexToDel, 1);
  } else {
    mainUser.followedUsers.push({ username: req.params.id });
    console.log({ username: req.params.id });
  }
  await mainUser.save();
  return res.redirect("/users/" + req.params.id);
});


