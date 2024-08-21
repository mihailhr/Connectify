const express = require("express");
const handlebars = require("express-handlebars");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./Mongoose models/user");
const bodyParser = require("body-parser");
const bcrypt=require("bcrypt")
const cookieParser=require("cookie-parser")
const jwt=require("jsonwebtoken");
const authenticateToken = require("./Middlewares/auth");
require('dotenv').config();

const uri = process.env.URI;
const secret=process.env.secret


const app = express();
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json())
app.use(express.urlencoded({extended:false}))
app.use(authenticateToken)


app.engine("handlebars", handlebars.engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

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


app.get("/", (req, res) => {
  console.log(req.isAuth)
  
  return res.render("home",{isAuth:req.isAuth})
    
});

app.get("/register", (req, res) => {
    if(req.isAuth){
      return res.redirect("home")
    }
    res.render("register",{isAuth:req.isAuth});
});

app.get("/mainFeed", (req, res) => {
    res.render("mainFeed",{isAuth:req.isAuth});
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/myAccount",(req,res)=>{
  if(!req.isAuth){
    return res.redirect("/")
  }
  res.render("myAccount",{isAuth:req.isAuth})
})

app.get("/logOut",(req,res)=>{
  if(!req.isAuth){
    return res.redirect("/")
  }
  res.render("logOut")
})

app.get("/logUserOut",(req,res)=>{
  if(!req.isAuth){
    return res.redirect("/")
  }
  res.clearCookie("token").redirect("/")
})


app.post('/register', async (req, res) => {
  

  if(req.body.password!==req.body.rePass){
    return res.render("register",{error:"Invalid password confirmation"})
  }
    try {
        const hashedPass=await bcrypt.hash(req.body.password,10)
        req.body.password=hashedPass
        const newUser = await User.create(req.body);
        const token=jwt.sign({username:req.body.username},secret,{expiresIn:"3d"})
        return res.status(200).cookie("token",token).redirect("/")
    } catch (err) {
        console.error('Error creating user:', err);
        return res.render("register",{error:err,isAuth:req.isAuth})
    }
});




