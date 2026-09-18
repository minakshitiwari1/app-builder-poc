const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const sharp = require('sharp');

const assetsDirectory = path.join(__dirname, '../../storage/assets');
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
  await fs.mkdir(assetsDirectory, { recursive: true });
  await sharp(file.buffer).rotate().png().toFile(path.join(assetsDirectory, `${assetId}.png`));
  return assetId;
};

const assertAssetReference = async asset => {
  if (!asset) return;
  if (!validAssetId(asset.assetId)) throw new Error('Invalid asset reference');
  await fs.access(path.join(assetsDirectory, `${asset.assetId}.png`));
};

module.exports = { assetsDirectory, saveImage, assertAssetReference };
