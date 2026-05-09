const Category = require('../models/Category');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const getDefaultLowStockLimit = async () => {
  const settings = await Settings.findOne();
  return settings?.lowStockLimit ?? 10;
};

const ensureUsableCategory = async (categoryId) => {
  const category = await Category.findOne({ _id: categoryId, isDeleted: false });

  if (!category) {
    throw new AppError('Category not found or has been deleted', 400);
  }

  if (!category.isActive) {
    throw new AppError('Cannot use an inactive category', 400);
  }

  return category;
};

const createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    barcode,
    category,
    buyingPrice,
    sellingPrice,
    stockQuantity,
    lowStockLimit,
    expiryDate,
    supplier,
    unitType,
    isActive
  } = req.body;

  if (!name || !category) {
    return next(new AppError('Product name and category are required', 400));
  }

  await ensureUsableCategory(category);

  if (barcode) {
    const existingBarcode = await Product.findOne({ barcode });
    if (existingBarcode) {
      return next(new AppError('A product with this barcode already exists', 409));
    }
  }

  const resolvedLowStockLimit =
    lowStockLimit === undefined || lowStockLimit === null || lowStockLimit === ''
      ? await getDefaultLowStockLimit()
      : lowStockLimit;

  const product = await Product.create({
    name,
    barcode,
    category,
    buyingPrice,
    sellingPrice,
    stockQuantity,
    lowStockLimit: resolvedLowStockLimit,
    expiryDate,
    supplier,
    unitType,
    isActive,
    createdBy: req.user.id
  });

  await createAuditLog({
    req,
    action: 'CREATE_PRODUCT',
    module: 'Product Management',
    description: `Created product ${product.name}`
  });

  return res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      product
    }
  });
});

const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isDeleted: false })
    .populate('category', 'name description isActive')
    .populate('createdBy updatedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products
    }
  });
});

const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false })
    .populate('category', 'name description isActive')
    .populate('createdBy updatedBy', 'name email role');

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  return res.status(200).json({
    success: true,
    data: {
      product
    }
  });
});

const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  if (req.body.category !== undefined) {
    await ensureUsableCategory(req.body.category);
  }

  if (req.body.barcode) {
    const existingBarcode = await Product.findOne({
      barcode: req.body.barcode,
      _id: { $ne: product._id }
    });

    if (existingBarcode) {
      return next(new AppError('A product with this barcode already exists', 409));
    }
  }

  const allowedFields = [
    'name',
    'barcode',
    'category',
    'buyingPrice',
    'sellingPrice',
    'stockQuantity',
    'lowStockLimit',
    'expiryDate',
    'supplier',
    'unitType',
    'isActive'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  product.updatedBy = req.user.id;
  await product.save();

  await createAuditLog({
    req,
    action: 'UPDATE_PRODUCT',
    module: 'Product Management',
    description: `Updated product ${product.name}`
  });

  return res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product
    }
  });
});

const toggleProductStatus = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  product.isActive = !product.isActive;
  product.updatedBy = req.user.id;
  await product.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: product.isActive ? 'ACTIVATE_PRODUCT' : 'DEACTIVATE_PRODUCT',
    module: 'Product Management',
    description: `${product.isActive ? 'Activated' : 'Deactivated'} product ${product.name}`
  });

  return res.status(200).json({
    success: true,
    message: product.isActive ? 'Product activated successfully' : 'Product deactivated successfully',
    data: {
      product
    }
  });
});

const softDeleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  product.isDeleted = true;
  product.isActive = false;
  product.updatedBy = req.user.id;
  await product.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: 'SOFT_DELETE_PRODUCT',
    module: 'Product Management',
    description: `Soft deleted product ${product.name}`
  });

  return res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
    data: {
      product
    }
  });
});

const searchProducts = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new AppError('Search query is required', 400));
  }

  const searchRegex = new RegExp(query, 'i');
  const products = await Product.find({
    isDeleted: false,
    $or: [{ name: searchRegex }, { barcode: searchRegex }, { supplier: searchRegex }]
  })
    .populate('category', 'name description isActive')
    .sort({ name: 1 })
    .limit(50);

  return res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products
    }
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  toggleProductStatus,
  softDeleteProduct,
  searchProducts
};
