const mongoose = require("mongoose");
const geocoder = require("../utils/geocoder");
const LocationSchema = require("./Location");

const SingleOrderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: true,
  },
});


const OrderSchema = new mongoose.Schema(
  {
    tax: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    orderItems: {
      type: [SingleOrderItemSchema],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "Order must contain at least one item.",
      },
    },
    status: {
      type: String,
      enum: ["pending", "paid", "in-transit", "delivered", "cancelled"],
      default: "pending",
    },
    assignedDelivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default : null
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
    clientSecret: { type: String, required: false },
    paymentIntentId: { type: String },
    dropOffLocation: {
      type: LocationSchema,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.ObjectId,
      ref: "Vendor",
      required: true,
    },
  },
  { timestamps: true }
);


OrderSchema.pre("save", async function (next) {
  if (!this.isModified("dropOffLocation.address")) return next();

  const loc = await geocoder.geocode(this.dropOffLocation.address);

  if (!loc.length) {
    return next(new Error("Invalid drop-off address provided"));
  }

  this.dropOffLocation.location = {
    type: "Point",
    coordinates: [loc[0].longitude, loc[0].latitude],
    formattedAddress: loc[0].formattedAddress,
  };

  next();
});
module.exports = mongoose.model("Order", OrderSchema);
