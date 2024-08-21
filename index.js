const express = require("express");
const handlebars = require("express-handlebars");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./Mongoose models/user");
const bodyParser = require("body-parser");
const bcrypt=require("bcrypt")
require('dotenv').config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json())
app.use(express.urlencoded({extended:false}))

app.engine("handlebars", handlebars.engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
    res.render("home");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/mainFeed", (req, res) => {
    res.render("mainFeed");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.post('/register', async (req, res) => {
  console.log(req.body)
    try {
        const hashedPass=await bcrypt.hash(req.body.password,10)
        req.body.password=hashedPass
        const newUser = await User.create(req.body);
        return res.status(200).send('User registered successfully');
    } catch (err) {
        console.error('Error creating user:', err);
        return res.status(500).send('Error creating user');
    }
});


const uri = process.env.URI;

mongoose.connect(uri)
.then(() => {
    console.log("Connected to MongoDB via Mongoose");
    app.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
})
.catch(err => {
    console.error("Mongoose connection error:", err);
    process.exit(1); 
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log("Mongoose connection closed due to application termination");
    process.exit(0);
});
