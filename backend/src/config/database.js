const mongoose = require('mongoose');

const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected (${mongoose.connection.name})`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
};

mongoose.connection.on('error', error => {
  console.error('MongoDB connection error:', error.message);
});

module.exports = connectDatabase;
