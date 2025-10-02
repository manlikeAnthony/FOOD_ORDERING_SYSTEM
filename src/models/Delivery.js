const mongoose = require("mongoose");
const geocoder = require("../utils/geocoder");
const LocationSchema = require("./Location");

const DeliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedDelivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // initially no one is assigned
    },
    pickupLocation: {
      type: LocationSchema,
    },
    dropoffLocation: {
      type: LocationSchema,
    },
    status: {
      type: String,
      enum: ["pending", "in-transit", "delivered", "canceled"],
      default: "pending",
    },
    cancelReason: {
      type: String,
    },
  },
  { timestamps: true }
);

DeliverySchema.pre("save", async function (next) {
  if (this.isModified("pickupLocation.address")) {
    const geo = await geocoder.geocode(this.pickupLocation.address);
    if (geo.length) {
      this.pickupLocation.location = {
        type: "Point",
        coordinates: [geo[0].longitude, geo[0].latitude],
      };
      this.pickupLocation.formattedAddress = geo[0].formattedAddress;
    }
  }

  if (this.isModified("dropoffLocation.address")) {
    const geo = await geocoder.geocode(this.dropoffLocation.address);
    if (geo.length) {
      this.dropoffLocation.location = {
        type: "Point",
        coordinates: [geo[0].longitude, geo[0].latitude],
      };
      this.dropoffLocation.formattedAddress = geo[0].formattedAddress;
    }
  }

  next();
});

module.exports = mongoose.model("Delivery", DeliverySchema);
