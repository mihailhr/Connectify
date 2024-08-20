const express=require("express")
const handlebars=require("express-handlebars")
const path=require("path")



const app=express()
app.use(express.static(path.join(__dirname,"public")))
app.engine("handlebars",handlebars.engine())
app.set("view engine","handlebars")
app.set("views",path.join(__dirname,"views"))



app.get("/",(req,res)=>{
    res.render("home")
})

app.get("/register",(req,res)=>{
    res.render("register")
})

app.get("/mainFeed",(req,res)=>{
    res.render("mainFeed")
})

app.get("/about",(req,res)=>{
    res.render("about")
})

app.listen(3000)
