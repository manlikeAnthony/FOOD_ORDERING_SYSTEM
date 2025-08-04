const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One vendor per user
  },
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Vendor email is required'],
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  address: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  logo: {
    type: String, // URL to image (Cloudinary or local)
    default: '',
  },
  isApproved: {
    type: Boolean,
    default: false, // Admin must approve before vendor can add products
  },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);
