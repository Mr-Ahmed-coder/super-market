const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const createCategory = asyncHandler(async (req, res, next) => {
  const { name, description, isActive } = req.body;

  if (!name) {
    return next(new AppError('Category name is required', 400));
  }

  const category = await Category.create({
    name,
    description,
    isActive,
    createdBy: req.user.id
  });

  await createAuditLog({
    req,
    action: 'CREATE_CATEGORY',
    module: 'Category Management',
    description: `Created category ${category.name}`
  });

  return res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: {
      category
    }
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isDeleted: false })
    .populate('createdBy updatedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: {
      categories
    }
  });
});

const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ _id: req.params.id, isDeleted: false }).populate(
    'createdBy updatedBy',
    'name email role'
  );

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  return res.status(200).json({
    success: true,
    data: {
      category
    }
  });
});

const updateCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ _id: req.params.id, isDeleted: false });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const allowedFields = ['name', 'description', 'isActive'];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      category[field] = req.body[field];
    }
  });

  category.updatedBy = req.user.id;
  await category.save();

  await createAuditLog({
    req,
    action: 'UPDATE_CATEGORY',
    module: 'Category Management',
    description: `Updated category ${category.name}`
  });

  return res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: {
      category
    }
  });
});

const toggleCategoryStatus = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ _id: req.params.id, isDeleted: false });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  category.isActive = !category.isActive;
  category.updatedBy = req.user.id;
  await category.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: category.isActive ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY',
    module: 'Category Management',
    description: `${category.isActive ? 'Activated' : 'Deactivated'} category ${category.name}`
  });

  return res.status(200).json({
    success: true,
    message: category.isActive ? 'Category activated successfully' : 'Category deactivated successfully',
    data: {
      category
    }
  });
});

const softDeleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ _id: req.params.id, isDeleted: false });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  category.isDeleted = true;
  category.isActive = false;
  category.updatedBy = req.user.id;
  await category.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: 'SOFT_DELETE_CATEGORY',
    module: 'Category Management',
    description: `Soft deleted category ${category.name}`
  });

  return res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    data: {
      category
    }
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  toggleCategoryStatus,
  softDeleteCategory
};
