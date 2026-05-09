const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.patch('/', authorizeRoles(ROLES.ADMIN), updateSettings);

module.exports = router;
