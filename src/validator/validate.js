const Joi = require("joi");
const validator = (schema) => (payload) => {
  return schema.validate(payload, { abortEarly: false });
};

const taskValidatorSchema = Joi.object({
  email: Joi.string().email().required(),
  title: Joi.string().required().min(3).max(50),
  date: Joi.date().required(),
  user: Joi.string().required(),
});

const registerValidatorSchema = Joi.object({
  name: Joi.string().max(50).min(3).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
});

const loginValidatorSchema = Joi.object({
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
});



exports.taskValidator = validator(taskValidatorSchema);
exports.loginValidator = validator(loginValidatorSchema)
exports.registerValidator = validator(registerValidatorSchema)
