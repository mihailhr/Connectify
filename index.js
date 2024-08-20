const express=require("express")
const handlebars=require("express-handlebars")
const path=require("path")
const mongoose=require("mongoose")
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

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


const uri = process.env.URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.listen(3000)

