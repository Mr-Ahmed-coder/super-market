const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const INCREASE_MOVEMENTS = ['stock_in', 'adjustment', 'return'];
const DECREASE_MOVEMENTS = ['stock_out', 'damaged', 'expired'];

const calculateNewStock = ({ movementType, quantity, previousStock }) => {
  if (INCREASE_MOVEMENTS.includes(movementType)) {
    return previousStock + quantity;
  }

  if (DECREASE_MOVEMENTS.includes(movementType)) {
    if (quantity > previousStock) {
      throw new AppError('Stock movement quantity cannot be greater than current stock', 400);
    }

    return previousStock - quantity;
  }

  throw new AppError('Invalid stock movement type', 400);
};

const createStockMovement = asyncHandler(async (req, res, next) => {
  const { product: productId, movementType, quantity, reason, reference } = req.body;

  if (!productId || !movementType || quantity === undefined) {
    return next(new AppError('Product, movement type, and quantity are required', 400));
  }

  if (Number(quantity) < 0) {
    return next(new AppError('Quantity cannot be negative', 400));
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const movementQuantity = Number(quantity);
  const previousStock = product.stockQuantity;
  const newStock = calculateNewStock({
    movementType,
    quantity: movementQuantity,
    previousStock
  });

  product.stockQuantity = newStock;
  product.updatedBy = req.user.id;
  await product.save({ validateBeforeSave: false });

  const stockMovement = await StockMovement.create({
    product: product._id,
    movementType,
    quantity: movementQuantity,
    previousStock,
    newStock,
    reason,
    reference,
    createdBy: req.user.id
  });

  await createAuditLog({
    req,
    action: 'CREATE_STOCK_MOVEMENT',
    module: 'Inventory History',
    description: `${product.name}: ${movementType} quantity ${movementQuantity}. Stock changed from ${previousStock} to ${newStock}`
  });

  const populatedMovement = await StockMovement.findById(stockMovement._id)
    .populate('product', 'name barcode stockQuantity unitType')
    .populate('createdBy', 'name email role');

  return res.status(201).json({
    success: true,
    message: 'Stock movement created successfully',
    data: {
      stockMovement: populatedMovement
    }
  });
});

const getStockMovements = asyncHandler(async (req, res) => {
  const stockMovements = await StockMovement.find()
    .populate('product', 'name barcode stockQuantity unitType')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: stockMovements.length,
    data: {
      stockMovements
    }
  });
});

const getProductStockMovements = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.productId, isDeleted: false });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const stockMovements = await StockMovement.find({ product: product._id })
    .populate('product', 'name barcode stockQuantity unitType')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: stockMovements.length,
    data: {
      product,
      stockMovements
    }
  });
});

module.exports = {
  createStockMovement,
  getStockMovements,
  getProductStockMovements
};
