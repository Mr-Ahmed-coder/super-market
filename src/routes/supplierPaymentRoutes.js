const express = require('express');
const {
  createSupplierPayment,
  getSupplierPayments,
  getSupplierPaymentsBySupplier,
  getSupplierPaymentsByPurchase
} = require('../controllers/supplierPaymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canCreateSupplierPayments = [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT];
const canViewSupplierPayments = [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.STOCK_KEEPER];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canCreateSupplierPayments), createSupplierPayment)
  .get(authorizeRoles(...canViewSupplierPayments), getSupplierPayments);

router.get('/supplier/:supplierId', authorizeRoles(...canViewSupplierPayments), getSupplierPaymentsBySupplier);
router.get('/purchase/:purchaseId', authorizeRoles(...canViewSupplierPayments), getSupplierPaymentsByPurchase);

module.exports = router;
