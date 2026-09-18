const { randomUUID } = require('crypto');
const sharp = require('sharp');
const Asset = require('../models/Asset');

const validAssetId = value => /^[0-9a-f-]{36}$/i.test(value || '');

const saveImage = async file => {
  if (!file || !['image/png', 'image/jpeg'].includes(file.mimetype)) {
    throw new Error('Only PNG and JPEG images are allowed');
  }
  const metadata = await sharp(file.buffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) {
    throw new Error('Image dimensions must be between 1 and 4096 pixels');
  }
  const assetId = randomUUID();
  const data = await sharp(file.buffer).rotate().png().toBuffer();
  await Asset.create({ assetId, mimeType: 'image/png', data });
  return assetId;
};

const assertAssetReference = async asset => {
  if (!asset) return;
  if (!validAssetId(asset.assetId)) throw new Error('Invalid asset reference');
  if (!(await Asset.exists({ assetId: asset.assetId }))) {
    throw new Error('Referenced asset does not exist');
  }
};

const getAsset = assetId => {
  if (!validAssetId(assetId)) return null;
  return Asset.findOne({ assetId }).select('+data');
};

const deleteAssets = assetIds => Asset.deleteMany({ assetId: { $in: assetIds } });

module.exports = { saveImage, assertAssetReference, getAsset, deleteAssets };
