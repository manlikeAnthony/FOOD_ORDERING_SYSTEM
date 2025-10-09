const CONFIG = require("../config/index");

module.exports = {
  host: "smtp.gmail.com",
  port: 587, // use 587 instead of 465
  secure: false, // false for STARTTLS
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: CONFIG.EMAIL.USER,
    pass: CONFIG.EMAIL.PASS,
  },
};
