const mongoose = require('mongoose')

const connectDB = async () => {
  let retries = 5;

  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URL);
      console.log("Mongo connected");
      break;
    } catch (err) {
      console.log("Mongo connection failed, retrying...");
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports= connectDB