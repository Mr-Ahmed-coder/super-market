const express = require('express');
const {
  createSale,
  getSales,
  getSale,
  refundSale
} = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canCreateSales = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER];
const canViewSales = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.ACCOUNTANT];
const canRefundSales = [ROLES.ADMIN, ROLES.MANAGER];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canCreateSales), createSale)
  .get(authorizeRoles(...canViewSales), getSales);

router.get('/:id', authorizeRoles(...canViewSales), getSale);
router.post('/:id/refund', authorizeRoles(...canRefundSales), refundSale);

module.exports = router;
