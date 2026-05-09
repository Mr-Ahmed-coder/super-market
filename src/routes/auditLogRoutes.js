const express = require('express');
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);
router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), getAuditLogs);

module.exports = router;
