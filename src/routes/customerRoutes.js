const express = require('express');
const {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  toggleCustomerStatus,
  softDeleteCustomer
} = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canManageCustomers = [ROLES.ADMIN, ROLES.MANAGER];
const canViewCustomers = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.ACCOUNTANT];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canManageCustomers), createCustomer)
  .get(authorizeRoles(...canViewCustomers), getCustomers);

router
  .route('/:id')
  .get(authorizeRoles(...canViewCustomers), getCustomer)
  .put(authorizeRoles(...canManageCustomers), updateCustomer)
  .delete(authorizeRoles(...canManageCustomers), softDeleteCustomer);

router.patch('/:id/toggle-status', authorizeRoles(...canManageCustomers), toggleCustomerStatus);

module.exports = router;
