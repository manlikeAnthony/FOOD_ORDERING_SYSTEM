const dotenv = require('dotenv')
dotenv.config()

const CONFIG = {
    PORT: process.env.PORT || 5000,
    MONGO_URL: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/food-ordering',
    JWT_CREDENTIAL: {
        secret: process.env.JWT_SECRET || 'default_secret',
        lifetime: process.env.JWT_LIFETIME || '30d'
    },
    STRIPE: {
        API_KEY: process.env.STRIPE_API_KEY || '',
        WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || ''
    },
    EMAIL: {
        USER: process.env.EMAIL_USER || '',
        PASS: process.env.EMAIL_PASS || ''
    }
};

module.exports = CONFIG;
