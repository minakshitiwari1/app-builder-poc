/*
 * One-time migration for images that were saved by older versions of the app.
 * Run this while MONGODB_URI points at the database you want to keep.
 */
require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const Asset = require('../src/models/Asset');

const assetsDirectory = path.join(__dirname, '../storage/assets');
const assetIdFromFile = fileName => fileName.match(/^([0-9a-f-]{36})\.png$/i)?.[1];

const migrate = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const files = await fs.readdir(assetsDirectory).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  let migrated = 0;
  for (const fileName of files) {
    const assetId = assetIdFromFile(fileName);
    if (!assetId) continue;

    const data = await fs.readFile(path.join(assetsDirectory, fileName));
    const result = await Asset.updateOne(
      { assetId },
      { $setOnInsert: { assetId, mimeType: 'image/png', data } },
      { upsert: true }
    );
    if (result.upsertedCount) migrated += 1;
  }

  console.log(`Migrated ${migrated} asset(s) to MongoDB.`);
  await mongoose.disconnect();
};

migrate().catch(async error => {
  console.error('Asset migration failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
