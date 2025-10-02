// models/Location.js
const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  formattedAddress: String,
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
       // [lng, lat]
    },
  },
});

// ✅ One single geospatial index
LocationSchema.index({ location: "2dsphere" });

module.exports = LocationSchema;
