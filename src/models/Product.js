const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Food name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Food description is required"],
    },
    price: {
      type: Number,
      required: [true, "Food price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Food category is required"],
      enum: ["main", "side", "drink", "dessert", "snack"], // customize as needed
    },
    ingredients: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true, // Set to false if out of stock or not being sold temporarily
    },
    image: {
      type: [String], // single image URL
      default: [],
    },
    preparationTime: {
      type: Number, // in minutes
      default: 0,
    },
    dietary: {
      type: [String], // e.g. ["vegan", "gluten-free"]
      default: [],
    },
    averageRating :{
        type: Number,
        min : [0 , 'average rating cannot be less than 0'],
        max : [5 , 'average rating cannot be more than 5'],
        default : 0,
    },
    numOfReview:{
        type:Number,
        default:0
    },
    flagged: {
      type: String,
      enum: {
        values: ["red", "orange", "green", "none"],
        message: "{VALUE} is not supported color",
      },
      default: "none",
    },
  },
  {timestamps:true , toJSON :{virtuals : true}, toObject:{virtuals: true}}
);
ProductSchema.virtual('reviews' , {
    ref:'Review',
    localField:'_id',
    foreignField: 'product',
    justOne : false,
})
module.exports = mongoose.model("Product", ProductSchema);
