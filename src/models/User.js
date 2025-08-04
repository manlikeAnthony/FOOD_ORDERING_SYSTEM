const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "must provide a value for name"],
    minlength: [3, "name cannot be less than 3 characters"],
    maxlength: [50, "name cannot be more than 50 characters"],
  },
  password: {
    type: String,
    required: [true, "password must be provided"],
    minlength: [
      6,
      "password  must not be less than 6 characters for security reasons",
    ],
  },
  email: {
    type: String,
    unique: true,
    required: [true, "must provide email"],
    validate: {
      validator: validator.isEmail,
      message: "please provide a valid email",
    },
  },
 role: {
    type: String,
    enum: ["admin", "user","vendor"],
    default: "user",
  },
  verificationToken: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verified : Date,
  passwordToken: {
    type: String,
  },
  passwordTokenExpirationDate: {
    type: Date,
  },
});

UserSchema.pre('save', async function(){
    if(!this.isModified('password')) return
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password , salt)
})

UserSchema.methods.comparePassword= async function(candidatePassword){
    const isMatch = await bcrypt.compare(candidatePassword,this.password)
    return isMatch
}

module.exports = mongoose.model('User' , UserSchema)