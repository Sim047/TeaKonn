// FULL users.js with profile + follow routes
import express from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const uploadDir=path.join(__dirname,"..","..","uploads");
fs.mkdirSync(uploadDir,{recursive:true});

const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>{
    const ext=path.extname(file.originalname)||".jpg";
    cb(null,Date.now()+"-"+Math.round(Math.random()*1e9)+ext);
  }
});
const upload=multer({storage});
const router=express.Router();

router.post("/avatar",auth,upload.single("avatar"),async(req,res)=>{
  try{
    if(!req.file)return res.status(400).json({success:false});
    const filePath=path.join(uploadDir,req.file.filename);
    const outPath=filePath+"-resized.jpg";
    await sharp(filePath).resize({width:800}).jpeg({quality:80}).toFile(outPath);
    try{fs.unlinkSync(filePath);}catch(e){}
    const finalName="/uploads/"+path.basename(outPath);
    const user=await User.findByIdAndUpdate(req.user.id,{avatar:finalName},{new:true}).select("-password");
    res.json({success:true,user});
  }catch(e){res.status(500).json({success:false});}
});

router.get("/search",auth,async(req,res)=>{
  try{
    const q=(req.query.q||"").trim();
    if(!q)return res.json([]);
    const regex=new RegExp(q.replace(/[.*+?^${}()|[\]\]/g,"\$&"),"i");
    const users=await User.find({$or:[{username:regex},{email:regex}]}).select("username email avatar").limit(30);
    res.json(users);
  }catch(e){res.json([]);}
});

router.get("/",auth,async(req,res)=>{
  try{
    const users=await User.find().select("username email avatar");
    res.json(users);
  }catch(e){res.json([]);}
});

router.get("/:id/profile",auth,async(req,res)=>{
  try{
    const user=await User.findById(req.params.id).select("username email avatar followers following");
    if(!user)return res.json({user:null});
    const isFollowing=user.followers.includes(req.user.id);
    res.json({user,counts:{followers:user.followers.length,following:user.following.length},isFollowing});
  }catch(e){res.json({user:null});}
});

router.post("/:id/follow",auth,async(req,res)=>{
  try{
    const target=await User.findById(req.params.id);
    const me=await User.findById(req.user.id);
    if(!target||!me)return res.status(404).json({});
    if(!target.followers.includes(me._id)){
      target.followers.push(me._id);
      me.following.push(target._id);
      await target.save();await me.save();
    }
    res.json({followersCount:target.followers.length});
  }catch(e){res.status(500).json({});}
});

router.post("/:id/unfollow",auth,async(req,res)=>{
  try{
    const target=await User.findById(req.params.id);
    const me=await User.findById(req.user.id);
    if(!target||!me)return res.status(404).json({});
    target.followers=target.followers.filter(id=>String(id)!==String(me._id));
    me.following=me.following.filter(id=>String(id)!==String(target._id));
    await target.save();await me.save();
    res.json({followersCount:target.followers.length});
  }catch(e){res.status(500).json({});}
});

export default router;
