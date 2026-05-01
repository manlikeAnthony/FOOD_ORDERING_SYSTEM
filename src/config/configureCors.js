const cors = require("cors");

const configureCors = () => {
  return cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5000", //local dev
        "https://yourlocaldomain.com",
        "https://chop-life-six.vercel.app"
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true); // giving permission so req can be allowed
      } else {
        callback(new Error("not allowed by cors"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Version"],
    exposedHeaders: ["X-total-Count", "Content-Range"],
    credentials: true, // very important it enables support for cookies
    preflightContinue: false,
    maxAge: 600, // cache pre flight responses for 10 mins (600 secs) -> avoid sending option requests multiple times
    optionsSuccessStatus: 204,
  });
};


module.exports = {
    configureCors
}