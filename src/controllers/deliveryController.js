const User = require("../models/User");
const Order = require("../models/Order");
const CustomError = require("../errors");
const Delivery = require("../models/Delivery");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");
const { StatusCodes } = require("http-status-codes");
const sendEmail = require("../utils/sendEmail");

// Apply as delivery guy
const applyAsDeliveryGuy = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new CustomError.NotFoundError("User not found");
    }

    if (user.role === "delivery") {
      throw new CustomError.BadRequestError(
        "You are already registered as a delivery guy"
      );
    }

    // ✅ Only allow users with role 'user' to apply
    if (user.role !== "user") {
      throw new CustomError.BadRequestError(
        "Only regular users can apply to become delivery guys"
      );
    }

    user.role = "delivery";
    user.status = "available"; // default status
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(
        response({ msg: "Successfully applied as a delivery guy", data: user })
      );
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAllDeliveryGuys = async (req, res) => {
  try {
    const deliveryGuys = await User.find({ role: "delivery" }).select(
      "name email status geoAddress"
    );

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "all delivery guys fetched", data: deliveryGuys }));
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const toggleDeliveryStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      throw new CustomError.NotFoundError("User not found");
    }

    if (user.role !== "delivery") {
      throw new CustomError.UnauthorizedError(
        "Only delivery guys can update their status"
      );
    }

    // Toggle status between available and busy
    user.status = user.status === "available" ? "busy" : "available";
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "status updated successfully ", data: user }));
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAvailableDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ assignedDelivery: null })
      .populate("order")
      .populate("vendor")
      .populate("customer");

    res.status(StatusCodes.OK).json(
      response({
        msg: "Available deliveries fetched successfully",
        data: deliveries,
      })
    );
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const claimDelivery = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user || user.role !== "delivery") {
      throw new CustomError.UnauthorizedError(
        "Only delivery guys can claim deliveries"
      );
    }

    const { deliveryId } = req.params;
    const delivery = await Delivery.findById(deliveryId).populate("order");

    if (!delivery) {
      throw new CustomError.NotFoundError("Delivery not found");
    }

    if (delivery.assignedDelivery) {
      throw new CustomError.BadRequestError(
        "This delivery has already been assigned"
      );
    }

    // ✅ Assign delivery
    delivery.assignedDelivery = userId;
    await delivery.save();

    //  Update order
    if (delivery.order) {
      const order = await Order.findById(delivery.order._id);
      order.assignedDelivery = userId;
      await order.save();
    }

    // Mark user as busy
    user.status = "busy";
    await user.save();

    res.status(StatusCodes.OK).json(
      response({
        msg: "You have successfully claimed this delivery",
        data: delivery,
      })
    );
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const markOrderDelivered = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      throw new CustomError.NotFoundError("Delivery not found");
    }

    // Check if the logged-in user is the assigned delivery guy
    if (
      !delivery.assignedDelivery ||
      delivery.assignedDelivery.toString() !== userId
    ) {
      throw new CustomError.UnauthorizedError(
        "You are not assigned to this delivery"
      );
    }

    // Only allow marking as delivered
    if (delivery.status === "delivered") {
      throw new CustomError.BadRequestError("Order is already delivered");
    }

    const order = await Order.findById(delivery.order);

    const user = await User.findById(delivery.assignedDelivery);

    delivery.status = "delivered";
    order.status = "delivered";
    user.status = "available";

    await delivery.save();
    await order.save();
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Order marked as delivered", data: delivery }));
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getMyCurrentDelivery = async (req, res, next) => {
  try {
    const deliveryGuyId = req.user.userId;

    const currentDelivery = await Delivery.findOne({
      assignedDelivery: deliveryGuyId,
      status: { $in: ["pending", "in-transit"] },
    })
      .populate("order")
      .populate("customer", "name email")
      .populate("vendor", "name");

    if (!currentDelivery) {
      return res.status(404).json({ msg: "You have no active deliveries" });
    }

    res.status(200).json({ delivery: currentDelivery });
  } catch (err) {
    next(err);
  }
};

const getMyDeliveryHistory = async (req, res, next) => {
  try {
    const deliveryGuyId = req.user.userId;

    const deliveries = await Delivery.find({
      assignedDelivery: deliveryGuyId,
      status: "delivered",
    })
      .populate("order")
      .populate("customer", "name email")
      .populate("vendor", "name")
      .sort({ updatedAt: -1 }); // recent first

    if (!deliveries.length) {
      return res
        .status(404)
        .json({ msg: "You haven't handled any deliveries yet" });
    }

    res.status(200).json({ count: deliveries.length, deliveries });
  } catch (err) {
    next(err);
  }
};

const cancelDelivery = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { deliveryId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new CustomError.BadRequestError(
        "Please provide a reason for cancellation"
      );
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw new CustomError.NotFoundError("Delivery not found");
    }

    // Ensure user is assigned delivery guy
    if (
      !delivery.assignedDelivery ||
      delivery.assignedDelivery.toString() !== userId
    ) {
      throw new CustomError.UnauthorizedError(
        "You are not assigned to this delivery"
      );
    }

    // Prevent canceling already delivered or canceled
    if (["delivered", "canceled"].includes(delivery.status)) {
      throw new CustomError.BadRequestError(
        `Cannot cancel. Delivery is already ${delivery.status}`
      );
    }

    const order = await Order.findById(delivery.order);
    const deliveryGuy = await User.findById(userId);

    // Update statuses
    delivery.status = "canceled";
    delivery.cancelReason = reason;
    delivery.assignedDelivery = null;

    order.assignedDelivery = null;
    order.status = "pending"; // back to pending so cron/admin can reassign

    deliveryGuy.status = "available";

    await Promise.all([delivery.save(), order.save(), deliveryGuy.save()]);

    // (Optional) Notify user + admin
    if (order.user?.email) {
      await sendEmail({
        to: order.user.email,
        subject: "🚨 Delivery Canceled",
        html: `
          <h2>Your delivery was canceled</h2>
          <p>Reason: ${reason}</p>
          <p>Don’t worry, we’ll assign another rider soon.</p>
        `,
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "anthony@gmail.com";
    await sendEmail({
      to: adminEmail,
      subject: "⚠️ Delivery Canceled",
      html: `
        <h2>Delivery ${delivery._id} has been canceled</h2>
        <p><strong>Order:</strong> ${order._id}</p>
        <p><strong>Delivery Guy:</strong> ${deliveryGuy.name} (${deliveryGuy.email})</p>
        <p><strong>Reason:</strong> ${reason}</p>
      `,
    });

    res
      .status(StatusCodes.OK)
      .json(
        response({ msg: "Delivery canceled successfully", data: delivery })
      );
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

module.exports = {
  applyAsDeliveryGuy,
  getAllDeliveryGuys,
  toggleDeliveryStatus,
  markOrderDelivered,
  getAvailableDeliveries,
  claimDelivery,
  getMyCurrentDelivery,
  getMyDeliveryHistory,
  cancelDelivery,
};
