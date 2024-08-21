const express=require("express")
const jwt=require("jsonwebtoken")
const cookieParser=require("cookie-parser")
require('dotenv').config();
const secret=process.env.secret


function authenticateToken(req,res,next){
    const token=req.cookies.token
    if(!token){
        req.isAuth=false
        return next()
    }
    try {
        
        const decoded = jwt.verify(token, secret);


        req.isAuth = true;
        req.user=decoded.username
        
    } catch (err) {
        req.isAuth = false;
    }

    next();
}


module.exports=authenticateToken
