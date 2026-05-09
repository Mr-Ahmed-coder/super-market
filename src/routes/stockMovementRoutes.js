const express = require('express');
const {
  createStockMovement,
  getStockMovements,
  getProductStockMovements
} = require('../controllers/stockMovementController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canCreateStockMovement = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STOCK_KEEPER];
const canViewStockMovement = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STOCK_KEEPER, ROLES.ACCOUNTANT];

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(...canCreateStockMovement), createStockMovement)
  .get(authorizeRoles(...canViewStockMovement), getStockMovements);

router.get(
  '/product/:productId',
  authorizeRoles(...canViewStockMovement),
  getProductStockMovements
);

module.exports = router;
