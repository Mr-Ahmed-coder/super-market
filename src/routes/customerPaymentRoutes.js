const express = require('express');
const {
  createCustomerPayment,
  getCustomerPayments,
  getCustomerPaymentsByCustomer
} = require('../controllers/customerPaymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canCreatePayments = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER];
const canViewPayments = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.ACCOUNTANT];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canCreatePayments), createCustomerPayment)
  .get(authorizeRoles(...canViewPayments), getCustomerPayments);

router.get('/customer/:customerId', authorizeRoles(...canViewPayments), getCustomerPaymentsByCustomer);

module.exports = router;
