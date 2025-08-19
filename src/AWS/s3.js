const { S3Client } = require("@aws-sdk/client-s3");
const CONFIG = require("../config/index");

const bucketName = CONFIG.AWS.BUCKET_NAME;
const bucketRegion = CONFIG.AWS.BUCKET_REGION;
const accessKey = CONFIG.AWS.ACCESS_KEY;
const secretAccessKey = CONFIG.AWS.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
});

module.exports = s3