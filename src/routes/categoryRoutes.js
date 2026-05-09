const express = require('express');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  toggleCategoryStatus,
  softDeleteCategory
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), createCategory)
  .get(getCategories);

router
  .route('/:id')
  .get(getCategory)
  .put(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), updateCategory)
  .delete(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), softDeleteCategory);

router.patch(
  '/:id/toggle-status',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  toggleCategoryStatus
);

module.exports = router;
