const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const CustomError = require('../errors')

const stripe = require("stripe")(process.env.STRIPE_API_KEY);

const createCheckout = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Subscription Plan" },
          unit_amount: 1000,
        },
        quantity: 1,
      },
    ],
    metadata: { userId : req.user.userId },
    success_url: "http://localhost:5000/api/v1/payment/success",
    cancel_url: "http://localhost:5000/api/v1/payment/cancel",
  });
  
  res.status(StatusCodes.OK).json({ url: session.url });
  } catch (error) {
    console.log(error)
    throw new CustomError.BadRequestError("Stripe checkout failed");
  }
};

const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.log(error);
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send("Webhook verification failed");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        await User.findByIdAndUpdate(
          userId,
          { isPaid: true },
          {new: true,}
        );
        console.log(`user ${userId} marked as paid`);
      } catch (error) {
        console.log("error updating user", error);
      }
    } else {
      console.log("no user found in metadata");
    }
  }
  console.log(`Received event: ${event.type}`);

  res.status(200).send("Webhook received");
};

module.exports = {
  createCheckout,
  webhook,
};
