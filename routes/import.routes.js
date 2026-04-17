const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../utils/auth.middleware');
const ctrl = require('../controllers/import.controller');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../temp'),
  filename: (req, file, cb) => {
    cb(null, `import_${Date.now()}.csv`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'text/csv' ||
                file.originalname.endsWith('.csv');
    cb(null, ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/', requireAuth, upload.single('file'), ctrl.importCSV);

module.exports = router;