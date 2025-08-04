const sendEmail = require("./sendEmail");

const sendResetPasswordEmail = async ({ name, email, token, origin }) => {
  const resetURL = `${origin}/user/reset-password?token=${token}&email=${email}`;
  const message = `<p>please reset password by copying the token : ${token} <br> or <br> clicking on the following link <a href= "${resetURL}">reset Password</a></p>`;

  return sendEmail({
    to: email,
    subject:'Reset Password',
    html:`<h4>Hello, ${name} </h4>${message}`
  })
};

module.exports = sendResetPasswordEmail;
