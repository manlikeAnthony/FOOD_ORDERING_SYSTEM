const sendEmail = require("./sendEmail");

const sendReceiptEmail = async ({ to, amount, reference }) => {
  const html = `
    <h2>Payment Successful 🎉</h2>
    <p>Thank you for your payment.</p>
    <p><strong>Amount:</strong> ₦${amount / 100}</p>
    <p><strong>Reference:</strong> ${reference}</p>
    <p>If you have any questions, please contact our support.</p>
  `;

  return sendEmail({
    to,
    subject: "Payment Receipt",
    html,
  });
};

module.exports = sendReceiptEmail;
