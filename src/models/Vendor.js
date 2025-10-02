const mongoose = require("mongoose");
const geocoder = require("../utils/geocoder");

const VendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One vendor per user
    },
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Vendor email is required"],
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    geoAddress: {
    address: {
      type: String,
      required: true,
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
    description: {
      type: String,
      default: "",
    },
    logo: {
      type: String, // URL to image (Cloudinary or local)
      default: "",
    },
    isApproved: {
      type: Boolean,
      default: false, // Admin must approve before vendor can add products
    },
  },
  { timestamps: true }
);

VendorSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "vendor",
  justOne: false,
});

// VendorSchema.pre("save", async function (next) {
//   if (!this.geoAddress?.address) {
//     // Address is required, throw an error
//     return next(new Error("Vendor address is required."));
//   }

//   // Try geocoding
//   const loc = await geocoder.geocode(this.geoAddress.address);

//   if (loc && loc.length > 0) {
//     this.geoAddress.location = {
//       type: "Point",
//       coordinates: [loc[0].longitude, loc[0].latitude],
//       formattedAddress: loc[0].formattedAddress,
//     };
//   } else {
//     // Could not geocode address → throw error
//     return next(new Error("Could not geocode the provided address. Please enter a valid address."));
//   }

//   next();
// });

VendorSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    await this.model("Product").deleteMany({ vendor: this._id });
  }
);
module.exports = mongoose.model("Vendor", VendorSchema);
