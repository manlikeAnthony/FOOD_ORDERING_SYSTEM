require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();
const CONFIG = require('./config/index')

//pakages
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
// database
const connectDB = require("./database/connect");

//middleware
const errorHandlerMiddleware = require("./middleware/error-handler");
const notFoundMiddleware = require("./middleware/not-found");
const {webhook} = require("./controllers/orderController")

//routes
const authRouter = require("./routes/authRoutes");
const orderRouter = require("./routes/orderRoutes");
const vendorRouter = require("./routes/vendorRoutes")
const productRoutes = require('./routes/productRoutes')
const cartRouter = require('./routes/cartRoutes')
const reviewRouter = require('./routes/reviewRoutes')


app.post(
  "/api/v1/order/webhook",
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
app.use(cookieParser(CONFIG.JWT_CREDENTIAL.secret));

app.use(morgan("dev"));


app.use(express.static(path.join(__dirname, "public")));

app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "food-ordering-api-docs.html"));
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/vendor", vendorRouter);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/reviews", reviewRouter);

app.use(errorHandlerMiddleware);
app.use(notFoundMiddleware);

const start = async () => {
  try {
    await connectDB(CONFIG.MONGO_URL);
    app.listen(CONFIG.PORT, console.log(`app is listening on port ${CONFIG.PORT}...`));
  } catch (error) {
    console.log("Failed to connect to database", error);
  }
};

start();
