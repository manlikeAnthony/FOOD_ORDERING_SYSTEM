const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const geocoder = require("../utils/geocoder");

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
  geoAddress: {
    address: {
      type: String,
      required: false,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
      formattedAddress: String,
    },
  },
  role: {
    type: String,
    enum: ["user", "vendor", "delivery", "admin"],
    default: "user",
  },
  status: {
    //for delivery guys
    type: String,
    enum: ["available", "busy" , 'banned'],
    default: "available",
  },
  favorites: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Product",
    },
  ],
  verificationToken: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verified: Date,
  passwordToken: {
    type: String,
  },
  passwordTokenExpirationDate: {
    type: Date,
  },

});

UserSchema.index({ "geoAddress.location": "2dsphere" });

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

   if (this.geoAddress?.address) {
    const loc = await geocoder.geocode(this.geoAddress.address);

    if (loc && loc.length > 0) {
      this.geoAddress.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
      };
    } else {
      // Address not found → remove location entirely
      this.geoAddress.location = undefined;
    }
  } else {
    // No address provided → remove location entirely
    this.geoAddress.location = undefined;
  }

  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};
module.exports = mongoose.model("User", UserSchema);
