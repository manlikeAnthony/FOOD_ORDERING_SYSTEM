require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
//pakages
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

// database
const connectDB = require("./database/connect");
//middleware
const errorHandlerMiddleware = require("./middleware/error-handler");
const notFoundMiddleware = require("./middleware/not-found");
const {webhook} = require("./controllers/OrderController")

//routes
const authRouter = require("./routes/authRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const vendorRouter = require("./routes/vendorRoutes")
const productRoutes = require('./routes/productRoutes')
const cartRoutes = require('./routes/cartRoutes')

app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  webhook
);

app.set('trust proxy', 1);
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
  })
);

app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.JWT_SECRET));

app.use(morgan("dev"));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/vendor", vendorRouter);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/cart", cartRoutes);

app.use(errorHandlerMiddleware);
app.use(notFoundMiddleware);
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(PORT, console.log(`app is listening on port ${PORT}...`));
  } catch (error) {
    console.log("Failed to connect to database", error);
  }
};

start();
