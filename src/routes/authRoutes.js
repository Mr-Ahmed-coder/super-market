const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// Example protected admin-only registration route for staff creation after bootstrap.
router.post('/admin/register', protect, authorizeRoles(ROLES.ADMIN), registerUser);

module.exports = router;
