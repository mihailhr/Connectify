const mongoose=require("mongoose")


const UserSchema=new mongoose.Schema({
    username:{type:String,minlength:5,required:true},
    email:{type:String,minlength:5,required:true},
    password:{type:String,minlength:8,required:true},
    followedUsers:{type:Array}
})

const User=new mongoose.model("User",UserSchema)

module.exports=User

