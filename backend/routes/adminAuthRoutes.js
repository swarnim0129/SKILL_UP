const express = require('express');
const router = express.Router();
const { loginAdmin, getMe } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.get('/me', protectAdmin, getMe);

module.exports = router;
