const User = require("../models/User");
const Vendor = require("../models/Vendor");
const CustomError = require("../errors");

const applyAsVendor = async (req, res) => {
  const existing = await Vendor.findOne({ user: req.user.userId });
  if (existing) throw new Error("You already applied or are a vendor");

  const { name, email, phone, address, description } = req.body;

  const vendor = await Vendor.create({
    user: req.user.userId,
    name,
    email,
    phone,
    address,
    description,
  });

  const user = await User.findById(req.user.userId);
  user.role = "vendor";
  await user.save();

  res.status(201).json({ msg: "Vendor application submitted", vendor });
};

const getMyVendorProfile = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.userId }).populate({path: "products" , select : "name description price category image"});
  if (!vendor) throw new CustomError.NotFoundError("No vendor profile found");
  res.status(200).json({ vendor });
};

const updateVendorProfile = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.userId });
  if (!vendor) throw new CustomError.NotFoundError("No vendor profile found");

  const updatedVendor = await Vendor.findOneAndUpdate(
    { user: req.user.userId },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({ msg: "Vendor profile updated", updatedVendor });
};

// const getVendorProducts = async (req, res) => {
//   const vendor = await Vendor.findOne({ user: req.user.userId });
//   if (!vendor || !vendor.isApproved)
//     throw new Error("Not authorized or not approved");

//   const products = await Product.find({ vendor: vendor._id });
//   res.status(200).json({ count: products.length, products });
// };

module.exports = { applyAsVendor, getMyVendorProfile , updateVendorProfile };
