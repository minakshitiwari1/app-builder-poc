const multer = require('multer');
const assetService = require('../services/assetService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadAsset = [upload.single('asset'), async (req, res) => {
  try {
    const assetId = await assetService.saveImage(req.file);
    res.status(201).json({ success: true, data: { assetId, assetUrl: `/assets/${assetId}.png` } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Invalid asset upload' });
  }
}];

const getAsset = async (req, res) => {
  try {
    const asset = await assetService.getAsset(req.params.assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.type(asset.mimeType);
    return res.send(asset.data);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load asset' });
  }
};

module.exports = { uploadAsset, getAsset };
