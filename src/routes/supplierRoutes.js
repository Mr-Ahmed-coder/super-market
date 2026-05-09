const express = require('express');
const {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  toggleSupplierStatus,
  softDeleteSupplier
} = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canManageSuppliers = [ROLES.ADMIN, ROLES.MANAGER];
const canViewSuppliers = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STOCK_KEEPER, ROLES.ACCOUNTANT];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canManageSuppliers), createSupplier)
  .get(authorizeRoles(...canViewSuppliers), getSuppliers);

router
  .route('/:id')
  .get(authorizeRoles(...canViewSuppliers), getSupplier)
  .put(authorizeRoles(...canManageSuppliers), updateSupplier)
  .delete(authorizeRoles(...canManageSuppliers), softDeleteSupplier);

router.patch('/:id/toggle-status', authorizeRoles(...canManageSuppliers), toggleSupplierStatus);

module.exports = router;
