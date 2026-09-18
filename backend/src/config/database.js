const mongoose = require('mongoose');
const Build = require('../models/Build');

const migrateAppIdentityIndexes = async () => {
  const indexes = await Build.collection.indexes();
  for (const index of indexes) {
    const isPackageIndex =
      index.name === 'config.androidPackageName_1' || index.name === 'config.iosBundleId_1';
    if (isPackageIndex && index.unique) {
      await Build.collection.dropIndex(index.name);
    }
  }
  await Build.collection.createIndex({ 'config.androidPackageName': 1 });
  await Build.collection.createIndex({ 'config.iosBundleId': 1 });
};

const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    await migrateAppIdentityIndexes();
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
