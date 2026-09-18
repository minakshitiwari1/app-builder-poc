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
module.exports = { uploadAsset };
