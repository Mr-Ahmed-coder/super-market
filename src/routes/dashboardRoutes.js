const express = require('express');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get(
  '/summary',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.STOCK_KEEPER, ROLES.ACCOUNTANT),
  getDashboardSummary
);

module.exports = router;
