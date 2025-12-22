import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  username:{type:String,required:true,unique:true,trim:true},
  email:{type:String,required:true,unique:true,trim:true},
  password:{type:String,required:true},
  avatar:{type:String,default:'/uploads/default-avatar.png'},
  role:{type:String,default:'user'},
  followers:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  following:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  createdAt:{type:Date,default:Date.now}
});
UserSchema.set('toJSON',{virtuals:true});
UserSchema.virtual('id').get(function(){return this._id.toString();});
export default mongoose.model('User',UserSchema);