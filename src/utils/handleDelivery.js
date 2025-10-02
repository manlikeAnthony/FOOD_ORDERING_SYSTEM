const cron = require("node-cron");
const User = require("../models/User");
const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const Delivery = require("../models/Delivery");
const sendEmail = require("./sendEmail");

cron.schedule("*/2 * * * *", async () => {
  console.log("Checking for unassigned orders...");

  try {
    const orders = await Order.find({
      status: { $in: ["pending", "in-transit"] },
      assignedDelivery: null,
    }).populate("user"); // ✅ to access user email directly

    for (const order of orders) {
      const vendor = await Vendor.findById(order.vendor);
      if (!vendor?.geoAddress?.location?.coordinates) continue;

      // Define search radii
      const searchRadii = [5000, 15000, 50000]; // 5km, 15km, 50km

      let deliveryGuy = null;

      for (const radius of searchRadii) {
        deliveryGuy = await User.findOne({
          role: "delivery",
          status: "available",
          "geoAddress.location": {
            $near: {
              $geometry: vendor.geoAddress.location,
              $maxDistance: radius,
            },
          },
        });

        if (deliveryGuy) {
          console.log(`Found delivery guy within ${radius / 1000}km`);
          break;
        }
      }

      if (!deliveryGuy) {
        console.log(`❌ No delivery guy found for order ${order._id}`);

        // ✅ Notify admin
        const adminEmail = process.env.ADMIN_EMAIL || "admin@yourapp.com";
        await sendEmail({
          to: adminEmail,
          subject: "⚠️ Unassigned Order Alert",
          html: `
            <h2>Order ${order._id} could not be assigned</h2>
            <p><strong>Vendor:</strong> ${vendor.name} - ${vendor.geoAddress.address}</p>
            <p><strong>Drop-off:</strong> ${order.dropOffLocation.address}</p>
            <p>Please take manual action.</p>
          `,
        });

        // ✅ Notify user
        if (order.user?.email) {
          await sendEmail({
            to: order.user.email,
            subject: "⏳ Order Delay Notification",
            html: `
              <h2>Your Order is Delayed</h2>
              <p>We’re sorry! A delivery partner could not be assigned immediately for your order <strong>${order._id}</strong>.</p>
              <p>Don’t worry, our team is working on it and your delivery will be on the way as soon as possible.</p>
              <p>Thank you for your patience 🙏</p>
            `,
          });
        }

        continue; // skip to next order
      }

      // Assign order + update delivery status
      order.assignedDelivery = deliveryGuy._id;
      order.status = "in-transit"; // <-- reset order to active
      await order.save();

      // Update the corresponding Delivery document
      const delivery = await Delivery.findOne({ order: order._id });
      if (delivery) {
        delivery.assignedDelivery = deliveryGuy._id;
        delivery.status = "in-transit"; // <-- reset delivery to active
        await delivery.save();
      }
      // Update delivery guy status
      deliveryGuy.status = "busy";
      await deliveryGuy.save();

      console.log(
        `✅ Assigned order ${order._id} to delivery ${deliveryGuy._id}`
      );

      // Notify delivery guy
      const html = `
        <h2>Order Successfully Allocated</h2>
        <p>Please pick up the order in time.</p>
        <p><strong>Pickup:</strong> ${vendor.geoAddress.address}</p>
        <p><strong>Drop-off:</strong> ${order.dropOffLocation.address}</p>
      `;

      await sendEmail({
        to: deliveryGuy.email,
        subject: "Order Allocation",
        html,
      });
    }
  } catch (err) {
    console.error("Error in cron job:", err.message);
  }
});
