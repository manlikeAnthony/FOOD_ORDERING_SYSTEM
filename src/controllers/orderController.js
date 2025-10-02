const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/User");
const Cart = require("../models/Cart");
const CustomError = require("../errors");
const Order = require("../models/Order");
const CONFIG = require("../config/index");
const Product = require("../models/Product");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");
const { StatusCodes } = require("http-status-codes");
const Transaction = require("../models/Transaction");
const sendReceiptEmail = require("../utils/sendRecieptEmail");
const Vendor = require("../models/Vendor");
const geocoder = require("../utils/geocoder");
const Delivery = require("../models/Delivery");

const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { dropOffLocation } = req.body;

    const user = await User.findById(userId);

    // ✅ Determine the drop-off address
    const dropOffAddress = dropOffLocation || user.geoAddress.address;
    if (!dropOffAddress) {
      throw new CustomError.BadRequestError(
        "Please provide a drop-off address or set a default one in your profile"
      );
    }

    // ✅ Get cart
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "name price"
    );

    if (!cart || cart.items.length === 0) {
      throw new CustomError.BadRequestError("Your cart is empty");
    }

    if (!cart.vendor) {
      throw new CustomError.BadRequestError("Cart has no vendor");
    }

    // ✅ Build order items
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
    const shippingFee = 500; // NGN 500 example
    const total = subtotal + tax + shippingFee;

    // ✅ Create order
    const order = await Order.create({
      user: userId,
      vendor: cart.vendor._id,
      orderItems,
      subtotal,
      tax,
      shippingFee,
      total,
      status: "pending",
      dropOffLocation: {
        address: dropOffAddress,
      },
    });

    // ✅ Paystack initialize
    const paystackAmount = total * 100; // convert to kobo

    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: paystackAmount,
        metadata: {
          userId: userId,
          orderId: order._id.toString(),
        },
        callback_url: `${CONFIG.URL.BASE_URL}/api/v1/order/paystack/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.PAYSTACK.SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { authorization_url, reference } = paystackResponse.data.data;
    order.reference = reference;
    await order.save();

    return res.status(StatusCodes.OK).json(
      response({
        status: "success",
        data: { url: authorization_url, reference: reference, dropOffAddress },
      })
    );
  } catch (error) {
    console.error("CreateOrder error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      response({
        status: "error",
        message: error.response?.data || error.message,
      })
    );
  }
};

const paystackCallback = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference)
      throw new CustomError.BadRequestError("No reference supplied");

    // Verify payment
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${CONFIG.PAYSTACK.SECRET_KEY}`,
        },
      }
    );

    const paymentData = verifyRes.data.data;
    const order = await Order.findOne({ reference });

    if (!order) {
      throw new CustomError.NotFoundError("Order not found");
    }

    // Update order status
    if (paymentData.status === "success") {
      order.status = "paid";

      await order.save();

      return res.status(StatusCodes.OK).json(
        response({
          status: "success",
          message: "Payment verified and order marked as paid",
          data: paymentData,
        })
      );
    } else {
      order.status = "failed";

      await order.save();
      return res.status(StatusCodes.BAD_REQUEST).json(
        response({
          status: "error",
          message: "Payment failed",
        })
      );
    }
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      response({
        status: "error",
        message: error.response?.data?.message || error.message,
      })
    );
  }
};
//stripe listen --forward-to localhost:5000/api/v1/order/webhook

const webhook = async (req, res, next) => {
  try {
    //  Verify Paystack signature
    const secret = CONFIG.PAYSTACK.SECRET_KEY;
    const rawBody = req.body.toString("utf8");

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const data = event.data;

      //  Find order
      const order = await Order.findOne({ reference: data.reference }).populate(
        "user"
      );
      if (!order) {
        return res
          .status(404)
          .json({ status: "error", message: "Order not found" });
      }
      const vendor = await Vendor.findById(order.vendor._id);
      const user = await User.findById(order.user._id);
      // Create or update Transaction
      let transaction = await Transaction.findOne({
        reference: data.reference,
      });
      if (!transaction) {
        transaction = await Transaction.create({
          user: order.user._id,
          vendor: order.vendor._id,
          order: order._id,
          reference: data.reference,
          amount: data.amount / 100,
          currency: data.currency,
          status: "success",
          gatewayResponse: data.gateway_response,
          paidAt: data.paid_at,
          metadata: data.metadata,
        });
      } else {
        transaction.status = "success";
        transaction.gatewayResponse = data.gateway_response;
        transaction.paidAt = data.paid_at;
        await transaction.save();
      }

      //  Update order status
      order.status = "paid";
      await order.save();

      //  Delete user's cart
      await Cart.findOneAndDelete({ user: order.user._id });

      //  Send receipt email
      await sendReceiptEmail({
        to: order.user.email,
        amount: data.amount,
        reference: data.reference,
      });

      await Delivery.create({
        order: order._id,
        vendor: order.vendor._id,
        customer: order.user._id,
        pickupLocation: {
          address: vendor.geoAddress.address,
        },
        dropoffLocation: { address: order.dropOffLocation.address },
      });

      order.status = "in-transit"
      await order.save()
      
      return res
        .status(200)
        .json({ status: "success", message: "Webhook processed" });
    }

    res.status(200).json({ status: "ignored", message: "Event not relevant" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate("user", "name email");

    res
      .status(StatusCodes.OK)
      .json(response({ data: { count: orders.length, orders } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getAllMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.userId });
    res
      .status(StatusCodes.OK)
      .json(response({ data: { count: orders.length, orders } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getSingleOrder = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;

    const order = await Order.findOne({ _id: orderId }).populate(
      "orderItems.product"
    );

    if (!order) throw new CustomError.NotFoundError("Order not found");

    checkPermissions(req.user, order.user);
    res.status(StatusCodes.OK).json(response({ data: order }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findOne({ _id: orderId });

    if (!order) throw new CustomError.NotFoundError("Order not found");

    order.status = req.body.status || order.status;
    await order.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Order status updated", data: order }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findOne({ _id: orderId });

    if (!order) throw new CustomError.NotFoundError("Order not found");

    checkPermissions(req.user, order.user);

    if (order.status === "paid") {
      throw new CustomError.BadRequestError("Cannot cancel a paid order");
    }

    order.status = "cancelled";
    await order.save();
    res.status(StatusCodes.OK).json(response({ msg: "Order canceled" }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

module.exports = {
  createOrder,
  paystackCallback,
  webhook,
  getAllOrders,
  getAllMyOrders,
  getSingleOrder,
  updateOrderStatus,
  cancelOrder,
};
