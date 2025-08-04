const express = require('express');
const router = express.Router();
const { authenticateUser,authorizeRoles } = require('../middleware/authentication');
const { applyAsVendor, getMyVendorProfile , updateVendorProfile } = require('../controllers/vendorController');

router.post('/apply', authenticateUser, applyAsVendor);
router.get('/me', authenticateUser, getMyVendorProfile);
router.patch('/me', authenticateUser, authorizeRoles('vendor'), updateVendorProfile);

module.exports = router;
