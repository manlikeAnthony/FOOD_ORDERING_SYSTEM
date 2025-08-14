const Joi = require("joi");

const validator = (schema) => (payload) => {
  return schema.validate(payload, { abortEarly: false });
};

const registerValidatorSchema = Joi.object({
  name: Joi.string().max(50).min(3).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
});

const loginValidatorSchema = Joi.object({
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
});

const addToCartSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

const reviewValidatorSchema = Joi.object({
  product : Joi.string().required(),
  rating : Joi.number().min(1).max(5).required(),
  title : Joi.string().min(3).required(),
  comment : Joi.string().min(3).required()
})

const vendorValidatorSchema = Joi.object({
  name : Joi.string().max(50).min(3).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?\d{10,15}$/).required(),
  address: Joi.string().min(5).max(255).required(),
  description: Joi.string().allow('').optional()
})

const productValidatorSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  category: Joi.string()
    .valid("main", "side", "drink", "dessert", "snack")
    .required()
});

exports.addToCartValidtor = validator(addToCartSchema);
exports.loginValidator = validator(loginValidatorSchema);
exports.reviewValidator = validator(reviewValidatorSchema);
exports.vendorValidator = validator(vendorValidatorSchema);
exports.productValidator = validator(productValidatorSchema);
exports.registerValidator = validator(registerValidatorSchema);