const express = require('express');
const {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePurchase,
  softDeletePurchase
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canManagePurchases = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STOCK_KEEPER];
const canViewPurchases = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STOCK_KEEPER, ROLES.ACCOUNTANT];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canManagePurchases), createPurchase)
  .get(authorizeRoles(...canViewPurchases), getPurchases);

router
  .route('/:id')
  .get(authorizeRoles(...canViewPurchases), getPurchase)
  .put(authorizeRoles(...canManagePurchases), updatePurchase)
  .delete(authorizeRoles(...canManagePurchases), softDeletePurchase);

module.exports = router;
