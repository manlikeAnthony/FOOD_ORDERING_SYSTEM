module.exports = {
 host: 'smtp.gmail.com',
  port: 587,               // use 587 instead of 465
  secure: false,           // false for STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
