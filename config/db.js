const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
