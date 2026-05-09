const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');
const { ROLE_VALUES } = require('../constants/roles');

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
});

const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, isActive, isLocked } = req.body;

  if (!name || !email || !password || !role) {
    return next(new AppError('Name, email, password, and role are required', 400));
  }

  if (!ROLE_VALUES.includes(role)) {
    return next(new AppError('Invalid role', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('A user with this email already exists', 409));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    isActive,
    isLocked,
    createdBy: req.user.id
  });

  await createAuditLog({
    req,
    action: 'CREATE_USER',
    module: 'User Management',
    description: `Created user ${user.email} with role ${user.role}`
  });

  return res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user
    }
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: {
      users
    }
  });
});

const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  return res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const allowedFields = ['name', 'email', 'role', 'isActive', 'isLocked'];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  if (req.body.password) {
    user.password = req.body.password;
  }

  await user.save();

  await createAuditLog({
    req,
    action: 'UPDATE_USER',
    module: 'User Management',
    description: `Updated user ${user.email}`
  });

  return res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      user
    }
  });
});

const setUserActiveStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isDeleted) {
    return next(new AppError('Deleted users cannot be activated or deactivated', 400));
  }

  if (typeof req.body.isActive !== 'boolean') {
    return next(new AppError('isActive must be true or false', 400));
  }

  user.isActive = req.body.isActive;
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    module: 'User Management',
    description: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.email}`
  });

  return res.status(200).json({
    success: true,
    message: user.isActive ? 'User activated successfully' : 'User deactivated successfully',
    data: {
      user
    }
  });
});

const setUserLockStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isDeleted) {
    return next(new AppError('Deleted users cannot be locked or unlocked', 400));
  }

  if (typeof req.body.isLocked !== 'boolean') {
    return next(new AppError('isLocked must be true or false', 400));
  }

  user.isLocked = req.body.isLocked;
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: user.isLocked ? 'LOCK_USER' : 'UNLOCK_USER',
    module: 'User Management',
    description: `${user.isLocked ? 'Locked' : 'Unlocked'} user ${user.email}`
  });

  return res.status(200).json({
    success: true,
    message: user.isLocked ? 'User locked successfully' : 'User unlocked successfully',
    data: {
      user
    }
  });
});

const softDeleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isDeleted) {
    return next(new AppError('User is already deleted', 400));
  }

  user.isDeleted = true;
  user.isActive = false;
  user.isLocked = true;
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: 'SOFT_DELETE_USER',
    module: 'User Management',
    description: `Soft deleted user ${user.email}`
  });

  return res.status(200).json({
    success: true,
    message: 'User deleted successfully',
    data: {
      user
    }
  });
});

module.exports = {
  getMe,
  createUser,
  getUsers,
  getUser,
  updateUser,
  setUserActiveStatus,
  setUserLockStatus,
  softDeleteUser
};
