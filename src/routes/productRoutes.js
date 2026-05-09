const express = require('express');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  toggleProductStatus,
  softDeleteProduct,
  searchProducts
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const canManageProducts = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STOCK_KEEPER];
const canDeleteProducts = [ROLES.ADMIN, ROLES.MANAGER];

router.use(protect);

router.get('/search', searchProducts);

router
  .route('/')
  .post(authorizeRoles(...canManageProducts), createProduct)
  .get(getProducts);

router
  .route('/:id')
  .get(getProduct)
  .put(authorizeRoles(...canManageProducts), updateProduct)
  .delete(authorizeRoles(...canDeleteProducts), softDeleteProduct);

router.patch('/:id/toggle-status', authorizeRoles(...canManageProducts), toggleProductStatus);

module.exports = router;
