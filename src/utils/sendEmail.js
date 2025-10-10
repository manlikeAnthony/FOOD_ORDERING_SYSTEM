const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend')
const CONFIG = require('../config/index')

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sendEmail = async ({ to, subject, html }) => {
  const sentFrom = new Sender(process.env.SENDER_EMAIL, "Anthony");
  const recipients = [new Recipient(to)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html);

  try {
    await mailerSend.email.send(emailParams);
    console.log("✅ Email sent successfully");
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
module.exports =  sendEmail;
// const nodemailer = require("nodemailer");
// const nodemailerConfig = require("./nodemailerConfig");

// const sendEmail = async ({ to, subject, html }) => {
//   const transporter = nodemailer.createTransport(nodemailerConfig);
  
//   const info = await transporter.sendMail({
//     from: '"Anthony" <anthonyC@gmail.com>', // sender address
//     to,
//     subject,
//     html,
//   });
// };

// module.exports = sendEmail;
