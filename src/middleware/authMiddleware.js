const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user || user.isDeleted) {
    return next(new AppError('The user for this token no longer exists', 401));
  }

  if (!user.isActive) {
    return next(new AppError('This user account is inactive', 403));
  }

  if (user.isLocked) {
    return next(new AppError('This user account is locked', 403));
  }

  req.user = user;
  return next();
});

module.exports = {
  protect
};
