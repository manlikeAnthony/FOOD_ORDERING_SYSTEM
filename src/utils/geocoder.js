const NodeGeocoder = require("node-geocoder");
const CONFIG = require("../config/index");

const options = {
  provider: "mapquest",
  apiKey: CONFIG.MAP.MAPQUEST_KEY, // store your key in .env
  formatter: null,
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;
