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
require("dotenv").config();

const uri = process.env.URI;
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
    app.listen(3000, () => {
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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  console.log(req.isAuth);

  return res.render("home", { isAuth: req.isAuth });
});
app.get("/test", (req, res) => {
  res.render("test");
});

app.get("/register", (req, res) => {
  if (req.isAuth) {
    return res.redirect("/");
  }
  res.render("register", { isAuth: req.isAuth });
});

app.get("/about", (req, res) => {
  res.render("about", { isAuth: req.isAuth });
});

app.get("/myAccount", (req, res) => {
  if (!req.isAuth) {
    return res.redirect("/");
  }
  console.log(req.user);
  res.render("myAccount", { isAuth: req.isAuth, user: req.user });
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
    const allImages = await Photo.find();

    res.render("mainFeed", { images: allImages, isAuth: req.isAuth });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/register", async (req, res) => {
  if (req.body.password !== req.body.rePass) {
    return res.render("register", { error: "Invalid password confirmation" });
  }
  try {
    const hashedPass = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPass;
    const newUser = await User.create(req.body);
    const token = jwt.sign({ username: req.body.username }, secret, {
      expiresIn: "3d",
    });
    return res.status(200).cookie("token", token).redirect("/");
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
    return res.status(200).render("home", { isAuth: true });
  } catch (error) {
    return res.render("/", { isAuth: req.isAuth, error: error });
  }
});

app.post("/upload", upload.single("image"), async (req, res) => {
  const newImage = new Photo({
    filename: req.file.filename,
    path: req.file.path,
    contentType: req.file.mimetype,
    originalName: req.file.originalname,
    description: req.body.description,
    title: req.body.title,
    creator: req.user,
  });

  try {
    await newImage.save();
    res.redirect("/mainFeed");
  } catch (err) {
    res.status(500).send("Error saving image");
  }
});
