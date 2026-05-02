const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { requireAuth } = require('../utils/auth.middleware');
const ctrl = require('../controllers/import.controller');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../temp'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok  = ['.csv', '.xlsx', '.xls'].includes(ext);
    cb(null, ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/', requireAuth, upload.single('file'), ctrl.importFile);

module.exports = router;