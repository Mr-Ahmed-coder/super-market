const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Name, email, and password are required', 400));
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
    createdBy: req.user ? req.user.id : null
  });

  const token = generateToken(user);

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    data: {
      user
    }
  });
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (user.isDeleted) {
    return next(new AppError('This user account has been deleted', 403));
  }

  if (!user.isActive) {
    return next(new AppError('This user account is inactive', 403));
  }

  if (user.isLocked) {
    return next(new AppError('This user account is locked', 403));
  }

  const token = generateToken(user);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    data: {
      user
    }
  });
});

module.exports = {
  registerUser,
  loginUser
};
