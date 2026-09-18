const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['image/png'],
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
