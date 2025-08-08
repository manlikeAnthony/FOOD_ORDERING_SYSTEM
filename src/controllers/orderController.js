const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const CustomError = require("../errors");

const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { checkPermissions } = require("../utils");

const createOrder = async (req, res) => {
  const userId = req.user.userId;

  const cart = await Cart.findOne({ user: userId }).populate(
    "items.product",
    "name price"
  );

  if (!cart || cart.items.length === 0) {
    throw new CustomError.BadRequestError("Your cart is empty");
  }

  let orderItems = [];
  let subtotal = 0;

  cart.items.forEach((item) => {
    orderItems.push({
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      product: item.product._id,
    });
    subtotal += item.product.price * item.quantity;
  });

  const tax = subtotal * 0.1; // 10% example
  const shippingFee = 500; // $5 example
  const total = subtotal + tax + shippingFee;

  // Create order first (pending)
  const order = await Order.create({
    user: userId,
    orderItems,
    subtotal,
    tax,
    shippingFee,
    total,
    status: "pending",
  });

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    success_url: "http://localhost:5000/success",
    cancel_url: "http://localhost:5000/cancel",
    metadata: {
      userId: userId,
      orderId: order._id.toString(),
    },
  });

  // Store session ID for verification
  order.stripeSessionId = session.id;
  await order.save();

  res.status(StatusCodes.CREATED).json({
    msg: "Order created",
    checkoutUrl: session.url,
  });
};

// stripe listen --forward-to localhost:5000/api/v1/order/webhook
const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { orderId, userId } = session.metadata;

    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { status: "paid" });
      await Cart.findOneAndDelete({ user: userId }); // clear cart after payment
      console.log(`Order ${orderId} marked as paid`);
    }
  }
  res.json({ received: true });
};

const getAllOrders = async (req, res) => {
  const orders = await Order.find({}).populate("user", "name email"); // admin protected
  res.status(StatusCodes.OK).json({ count: orders.length, orders });
};

const getAllMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.userId });
  res.status(StatusCodes.OK).json({ count: orders.length, orders });
};

const getSingleOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const order = await Order.findOne({ _id: orderId }).populate(
    "orderItems.product"
  );
  if (!order) throw new CustomError.NotFoundError("Order not found");
  
  checkPermissions(req.user, order.user);
  res.status(StatusCodes.OK).json({ order });
};

const updateOrderStatus = async (req, res) => {
  const { id: orderId } = req.params;
  const order = await Order.findOne({ _id: orderId });
  if (!order) throw new CustomError.NotFoundError("Order not found");

  order.status = req.body.status || order.status;
  await order.save();

  res.status(StatusCodes.OK).json({ msg: "Order status updated", order });
};

const cancelOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const order = await Order.findOne({ _id: orderId });
  if (!order) throw new CustomError.NotFoundError("Order not found");

  checkPermissions(req.user, order.user);

  if (order.status === "paid") {
    throw new CustomError.BadRequestError("Cannot cancel a paid order");
  }

  await order.remove();
  res.status(StatusCodes.OK).json({ msg: "Order canceled" });
};

module.exports = {
  createOrder,
  webhook,
  getAllOrders,
  getAllMyOrders,
  getSingleOrder,
  updateOrderStatus,
  cancelOrder
};
