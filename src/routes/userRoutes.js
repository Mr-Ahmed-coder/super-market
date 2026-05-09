const express = require('express');
const {
  getMe,
  createUser,
  getUsers,
  getUser,
  updateUser,
  setUserActiveStatus,
  setUserLockStatus,
  softDeleteUser
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/me', getMe);

router.use(authorizeRoles(ROLES.ADMIN));

router.route('/').post(createUser).get(getUsers);
router.route('/:id').get(getUser).patch(updateUser).delete(softDeleteUser);
router.patch('/:id/active', setUserActiveStatus);
router.patch('/:id/lock', setUserLockStatus);

module.exports = router;
