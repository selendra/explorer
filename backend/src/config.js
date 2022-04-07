const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Selendra provider
module.exports.PROVIDER = process.env.PROVIDER;

// Mongodb
module.exports.MONGOURI = process.env.MONGO_URI;
module.exports.DATABASE = process.env.DATABASE;