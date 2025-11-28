require('dotenv').config();
const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/scanngo';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || DEFAULT_URI;

  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set MONGO_URI in env.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || undefined,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
