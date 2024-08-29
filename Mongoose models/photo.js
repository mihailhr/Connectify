const mongoose=require("mongoose")


const PhotoSchema = new mongoose.Schema({
    filename: {
      type: String,
      required: true
    },
    data:{type:Buffer,required:true},
    contentType: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    title: {
      type: String,
      minlength: 2,
      maxlength: 20,
      required: true
    },
    description: {
      type: String,
      minlength: 10,
      maxlength: 100,
      required: true
    },
    creator:{type:String},
    likesList:{type:Array}
  });

const Photo=new mongoose.model("Photo",PhotoSchema)

module.exports=Photo