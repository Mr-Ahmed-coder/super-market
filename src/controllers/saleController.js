const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'bank'];

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

let cachedTransactionSupport = null;

const generateSaleNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = new Date().toISOString().slice(11, 23).replace(/[:.]/g, '');
  const randomPart = new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase();

  return `SALE-${datePart}-${timePart}-${randomPart}`;
};

const withSession = (query, session) => (session ? query.session(session) : query);

const getTaxPercentage = async (session = null) => {
  const settings = await withSession(Settings.findOne(), session);
  return Number(settings?.taxPercentage || 0);
};

const supportsTransactions = async () => {
  if (cachedTransactionSupport !== null) {
    return cachedTransactionSupport;
  }

  try {
    const adminDb = mongoose.connection.db.admin();
    let serverStatus;

    try {
      serverStatus = await adminDb.command({ hello: 1 });
    } catch {
      serverStatus = await adminDb.command({ isMaster: 1 });
    }

    cachedTransactionSupport = Boolean(serverStatus.setName || serverStatus.msg === 'isdbgrid');
    return cachedTransactionSupport;
  } catch {
    cachedTransactionSupport = false;
    return cachedTransactionSupport;
  }
};

const getPaymentStatus = ({ amountPaid, grandTotal }) => {
  if (amountPaid >= grandTotal) {
    return 'paid';
  }

  if (amountPaid > 0) {
    return 'partial';
  }

  return 'unpaid';
};

const getSaleItemProductId = (item) => item.product?._id || item.product;

const getRefundedQuantity = (sale, productId) =>
  sale.refundHistory
    .filter((refund) => refund.product?.toString() === productId.toString())
    .reduce((sum, refund) => sum + Number(refund.quantity || 0), 0);

const getTotalRefundedQuantity = (sale) =>
  sale.refundHistory.reduce((sum, refund) => sum + Number(refund.quantity || 0), 0);

const getTotalSoldQuantity = (sale) =>
  sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const buildDateFilter = (date) => {
  const start = new Date(date);

  if (Number.isNaN(start.getTime())) {
    throw new AppError('Invalid date filter', 400);
  }

  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { $gte: start, $lt: end };
};

const buildDateRangeFilter = ({ date, startDate, endDate }) => {
  if (date) {
    return buildDateFilter(date);
  }

  const range = {};

  if (startDate) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      throw new AppError('Invalid start date filter', 400);
    }
    start.setHours(0, 0, 0, 0);
    range.$gte = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      throw new AppError('Invalid end date filter', 400);
    }
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return Object.keys(range).length > 0 ? range : null;
};

const createStockMovementRecord = async (stockMovement, session) => {
  if (session) {
    await StockMovement.create([stockMovement], { session });
    return;
  }

  await StockMovement.create(stockMovement);
};

const createSaleRecord = async (salePayload, session) => {
  if (session) {
    const sales = await Sale.create([salePayload], { session });
    return sales[0];
  }

  return Sale.create(salePayload);
};

const saveSaleDocument = async (sale, session) => {
  await sale.save({
    ...(session ? { session } : {}),
    validateBeforeSave: false
  });
};

const rollbackStandaloneRefund = async ({ stockRollbacks, saleId, originalSaleStatus, originalRefundHistoryLength, reference }) => {
  const rollbackErrors = [];

  for (const rollback of stockRollbacks) {
    try {
      await Product.updateOne(
        { _id: rollback.productId },
        {
          $set: {
            stockQuantity: rollback.originalStock,
            updatedBy: rollback.updatedBy
          }
        },
        { runValidators: false }
      );
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }
  }

  try {
    await StockMovement.deleteMany({ reference, reason: 'Refund/Return' });
  } catch (rollbackError) {
    rollbackErrors.push(rollbackError);
  }

  try {
    const sale = await Sale.findById(saleId);
    if (sale) {
      sale.saleStatus = originalSaleStatus;
      sale.refundHistory = sale.refundHistory.slice(0, originalRefundHistoryLength);
      await sale.save({ validateBeforeSave: false });
    }
  } catch (rollbackError) {
    rollbackErrors.push(rollbackError);
  }

  if (rollbackErrors.length > 0) {
    throw new AppError('Refund failed and automatic rollback could not be completed. Please review inventory and sale history.', 500);
  }
};

const rollbackStandaloneSale = async ({ stockRollbacks, saleNumber }) => {
  const rollbackErrors = [];

  for (const rollback of stockRollbacks.values()) {
    try {
      await Product.updateOne(
        { _id: rollback.productId },
        {
          $set: {
            stockQuantity: rollback.originalStock,
            updatedBy: rollback.updatedBy
          }
        },
        { runValidators: false }
      );
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }
  }

  try {
    await StockMovement.deleteMany({ reference: saleNumber, reason: 'Sale' });
  } catch (rollbackError) {
    rollbackErrors.push(rollbackError);
  }

  if (rollbackErrors.length > 0) {
    throw new AppError('Sale failed and automatic stock rollback could not be completed. Please review inventory.', 500);
  }
};

const rollbackStandaloneCustomerCredit = async (customerRollback) => {
  if (!customerRollback) {
    return;
  }

  await Customer.updateOne(
    { _id: customerRollback.customerId },
    {
      $set: {
        currentBalance: customerRollback.currentBalance,
        updatedBy: customerRollback.updatedBy
      }
    },
    { runValidators: false }
  );
};

const buildSale = async ({
  req,
  items,
  paidAmount,
  paymentMethod,
  customerName,
  customerPhone,
  notes,
  customer: customerId = null,
  session = null,
  trackRollback = false
}) => {
  const saleNumber = generateSaleNumber();
  const taxPercentage = await getTaxPercentage(session);
  const saleItems = [];
  const stockRollbacks = new Map();
  let customerRollback = null;
  let subtotal = 0;
  let discountTotal = 0;

  try {
    for (const item of items) {
      const productId = item.product;
      const quantity = Number(item.quantity);
      const discount = roundMoney(item.discount || 0);

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw new AppError('Valid product is required for each sale item', 400);
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new AppError('Sale item quantity must be greater than zero', 400);
      }

      if (!Number.isFinite(discount) || discount < 0) {
        throw new AppError('Sale item discount cannot be negative', 400);
      }

      const product = await withSession(
        Product.findOne({
          _id: productId,
          isDeleted: false,
          isActive: true
        }),
        session
      );

      if (!product) {
        throw new AppError('Product not found, inactive, or deleted', 404);
      }

      if (quantity > product.stockQuantity) {
        throw new AppError(
          `Insufficient stock for ${product.name}. Available stock is ${product.stockQuantity}`,
          400
        );
      }

      const unitPrice = roundMoney(product.sellingPrice);
      const buyingPrice = roundMoney(product.buyingPrice);
      const grossLineTotal = roundMoney(quantity * unitPrice);

      if (discount > grossLineTotal) {
        throw new AppError(`Discount cannot exceed line total for ${product.name}`, 400);
      }

      const lineTotal = roundMoney(grossLineTotal - discount);
      const previousStock = product.stockQuantity;
      const newStock = previousStock - quantity;
      const productKey = product._id.toString();

      if (trackRollback && !stockRollbacks.has(productKey)) {
        stockRollbacks.set(productKey, {
          productId: product._id,
          originalStock: previousStock,
          updatedBy: product.updatedBy || null
        });
      }

      product.stockQuantity = newStock;
      product.updatedBy = req.user.id;
      await product.save({
        ...(session ? { session } : {}),
        validateBeforeSave: false
      });

      saleItems.push({
        product: product._id,
        productName: product.name,
        barcode: product.barcode || '',
        quantity,
        unitPrice,
        buyingPrice,
        discount,
        lineTotal
      });

      await createStockMovementRecord(
        {
          product: product._id,
          movementType: 'stock_out',
          quantity,
          previousStock,
          newStock,
          reason: 'Sale',
          reference: saleNumber,
          createdBy: req.user.id
        },
        session
      );

      subtotal = roundMoney(subtotal + grossLineTotal);
      discountTotal = roundMoney(discountTotal + discount);
    }

    const taxableAmount = roundMoney(subtotal - discountTotal);
    const taxAmount = roundMoney((taxableAmount * taxPercentage) / 100);
    const grandTotal = roundMoney(taxableAmount + taxAmount);
    const changeAmount = paidAmount > grandTotal ? roundMoney(paidAmount - grandTotal) : 0;
    const balance = paidAmount < grandTotal ? roundMoney(grandTotal - paidAmount) : 0;
    const paymentStatus = getPaymentStatus({ amountPaid: paidAmount, grandTotal });
    const isCreditSale = balance > 0;
    let saleCustomer = null;
    let resolvedCustomerName = customerName;
    let resolvedCustomerPhone = customerPhone;

    if (isCreditSale && !customerId) {
      throw new AppError('Customer is required for credit sale', 400);
    }

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new AppError('Valid customer is required', 400);
      }

      saleCustomer = await withSession(
        Customer.findOne({ _id: customerId, isDeleted: false, isActive: true }),
        session
      );

      if (!saleCustomer) {
        throw new AppError('Customer not found, inactive, or deleted', 404);
      }

      resolvedCustomerName = saleCustomer.name;
      resolvedCustomerPhone = saleCustomer.phone || '';

      if (isCreditSale) {
        const nextBalance = roundMoney(Number(saleCustomer.currentBalance || 0) + balance);

        if (saleCustomer.creditLimit > 0 && nextBalance > saleCustomer.creditLimit) {
          throw new AppError('Credit sale exceeds customer credit limit', 400);
        }

        if (trackRollback) {
          customerRollback = {
            customerId: saleCustomer._id,
            currentBalance: saleCustomer.currentBalance,
            updatedBy: saleCustomer.updatedBy || null
          };
        }

        saleCustomer.currentBalance = nextBalance;
        saleCustomer.updatedBy = req.user.id;
        await saleCustomer.save({
          ...(session ? { session } : {}),
          validateBeforeSave: false
        });
      }
    }

    return createSaleRecord(
      {
        saleNumber,
        cashier: req.user.id,
        customer: saleCustomer?._id || null,
        items: saleItems,
        subtotal,
        discountTotal,
        taxAmount,
        grandTotal,
        amountPaid: paidAmount,
        changeAmount,
        balance,
        paymentMethod,
        paymentStatus,
        saleStatus: 'completed',
        isCreditSale,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        notes
      },
      session
    );
  } catch (error) {
    if (trackRollback && stockRollbacks.size > 0) {
      await rollbackStandaloneSale({ stockRollbacks, saleNumber });
    }

    if (trackRollback && customerRollback) {
      await rollbackStandaloneCustomerCredit(customerRollback);
    }

    throw error;
  }
};

const createSale = asyncHandler(async (req, res, next) => {
  const {
    items,
    amountPaid = 0,
    paymentMethod,
    customerName = '',
    customerPhone = '',
    customer = null,
    notes = ''
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return next(new AppError('Sale must contain at least one item', 400));
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return next(new AppError('Invalid payment method', 400));
  }

  const paidAmount = roundMoney(amountPaid);
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    return next(new AppError('Amount paid cannot be negative', 400));
  }

  try {
    let createdSale;
    const canUseTransactions = await supportsTransactions();

    if (canUseTransactions) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          createdSale = await buildSale({
            req,
            items,
            paidAmount,
            paymentMethod,
            customerName,
            customerPhone,
            notes,
            customer,
            session
          });
        });
      } finally {
        session.endSession();
      }
    } else {
      createdSale = await buildSale({
        req,
        items,
        paidAmount,
        paymentMethod,
        customerName,
        customerPhone,
        notes,
        customer,
        trackRollback: true
      });
    }

    const populatedSale = await Sale.findById(createdSale._id)
      .populate('cashier', 'name email role')
      .populate('customer', 'name phone currentBalance creditLimit')
      .populate('items.product', 'name barcode stockQuantity unitType sellingPrice buyingPrice');

    await createAuditLog({
      req,
      action: 'CREATE_SALE',
      module: 'Sales',
      description: `Created sale ${populatedSale.saleNumber} by ${req.user.name} with grand total ${populatedSale.grandTotal} via ${populatedSale.paymentMethod}`
    });

    return res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: {
        sale: populatedSale
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError(error.message || 'Unable to create sale. Please try again.', 500));
  }
});

const getSales = asyncHandler(async (req, res, next) => {
  const {
    date,
    startDate,
    endDate,
    cashier,
    paymentMethod,
    paymentStatus,
    saleStatus,
    saleNumber,
    search
  } = req.query;
  const filter = { isDeleted: false };

  try {
    const dateFilter = buildDateRangeFilter({ date, startDate, endDate });
    if (dateFilter) {
      filter.createdAt = dateFilter;
    }
  } catch (error) {
    return next(error);
  }

  if (cashier) {
    filter.cashier = cashier;
  }

  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (saleStatus) {
    filter.saleStatus = saleStatus;
  }

  const saleSearch = saleNumber || search;
  if (saleSearch) {
    filter.saleNumber = new RegExp(saleSearch, 'i');
  }

  const sales = await Sale.find(filter)
    .populate('cashier', 'name email role')
    .populate('customer', 'name phone currentBalance creditLimit')
    .populate('items.product', 'name barcode stockQuantity unitType')
    .populate('refundHistory.approvedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: sales.length,
    data: {
      sales
    }
  });
});

const getSale = asyncHandler(async (req, res, next) => {
  const sale = await Sale.findOne({ _id: req.params.id, isDeleted: false })
    .populate('cashier', 'name email role')
    .populate('customer', 'name phone currentBalance creditLimit')
    .populate('items.product', 'name barcode stockQuantity unitType sellingPrice buyingPrice')
    .populate('refundHistory.approvedBy', 'name email role');

  if (!sale) {
    return next(new AppError('Sale not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      sale
    }
  });
});

const applyRefund = async ({ saleId, refundType, items = [], reason, approvedBy, session = null, trackRollback = false }) => {
  const sale = await withSession(
    Sale.findOne({ _id: saleId, isDeleted: false }).populate('items.product', 'name stockQuantity'),
    session
  );

  if (!sale) {
    throw new AppError('Sale not found', 404);
  }

  if (sale.saleStatus === 'cancelled') {
    throw new AppError('Cannot refund a cancelled sale', 400);
  }

  if (sale.saleStatus === 'refunded') {
    throw new AppError('This sale has already been fully refunded', 400);
  }

  if (!reason || !reason.trim()) {
    throw new AppError('Refund reason is required', 400);
  }

  const originalSaleStatus = sale.saleStatus;
  const originalRefundHistoryLength = sale.refundHistory.length;
  const reference = `${sale.saleNumber}-REFUND-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;
  const stockRollbacks = [];

  try {
    const requestedItems =
      refundType === 'full'
        ? sale.items.map((item) => ({
            product: getSaleItemProductId(item),
            quantity: item.quantity - getRefundedQuantity(sale, getSaleItemProductId(item))
          }))
        : items;

    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
      throw new AppError('Refund must include at least one item', 400);
    }

    for (const requestedItem of requestedItems) {
      const productId = requestedItem.product;
      const refundQuantity = Number(requestedItem.quantity);

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw new AppError('Valid product is required for each refund item', 400);
      }

      if (!Number.isFinite(refundQuantity) || refundQuantity <= 0) {
        continue;
      }

      const saleItem = sale.items.find((item) => getSaleItemProductId(item)?.toString() === productId.toString());

      if (!saleItem) {
        throw new AppError('Refund item does not belong to this sale', 400);
      }

      const previouslyRefunded = getRefundedQuantity(sale, productId);
      const refundableQuantity = Number(saleItem.quantity) - previouslyRefunded;

      if (refundQuantity > refundableQuantity) {
        throw new AppError(`Cannot refund more than sold quantity for ${saleItem.productName}`, 400);
      }

      const product = await withSession(Product.findById(productId), session);

      if (!product) {
        throw new AppError(`Product not found for refund: ${saleItem.productName}`, 404);
      }

      const previousStock = product.stockQuantity;
      const newStock = previousStock + refundQuantity;
      const refundAmount = roundMoney((Number(saleItem.lineTotal) / Number(saleItem.quantity)) * refundQuantity);

      if (trackRollback) {
        stockRollbacks.push({
          productId: product._id,
          originalStock: previousStock,
          updatedBy: product.updatedBy || null
        });
      }

      product.stockQuantity = newStock;
      product.updatedBy = approvedBy;
      await product.save({
        ...(session ? { session } : {}),
        validateBeforeSave: false
      });

      await createStockMovementRecord(
        {
          product: product._id,
          movementType: 'return',
          quantity: refundQuantity,
          previousStock,
          newStock,
          reason: 'Refund/Return',
          reference,
          createdBy: approvedBy
        },
        session
      );

      sale.refundHistory.push({
        product: product._id,
        productName: saleItem.productName,
        quantity: refundQuantity,
        amount: refundAmount,
        reason: reason.trim(),
        approvedBy,
        refundedAt: new Date()
      });
    }

    if (sale.refundHistory.length === originalRefundHistoryLength) {
      throw new AppError('No refundable quantity was provided', 400);
    }

    const totalRefundedQuantity = getTotalRefundedQuantity(sale);
    const totalSoldQuantity = getTotalSoldQuantity(sale);
    sale.saleStatus = totalRefundedQuantity >= totalSoldQuantity ? 'refunded' : 'partial_refund';
    await saveSaleDocument(sale, session);

    return sale;
  } catch (error) {
    if (trackRollback && (stockRollbacks.length > 0 || sale.refundHistory.length !== originalRefundHistoryLength)) {
      await rollbackStandaloneRefund({
        stockRollbacks,
        saleId,
        originalSaleStatus,
        originalRefundHistoryLength,
        reference
      });
    }

    throw error;
  }
};

const refundSale = asyncHandler(async (req, res, next) => {
  const { refundType = 'full', items = [], reason = '' } = req.body;

  if (!['full', 'items'].includes(refundType)) {
    return next(new AppError('Invalid refund type', 400));
  }

  try {
    let refundedSale;
    const canUseTransactions = await supportsTransactions();

    if (canUseTransactions) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          refundedSale = await applyRefund({
            saleId: req.params.id,
            refundType,
            items,
            reason,
            approvedBy: req.user.id,
            session
          });
        });
      } finally {
        session.endSession();
      }
    } else {
      refundedSale = await applyRefund({
        saleId: req.params.id,
        refundType,
        items,
        reason,
        approvedBy: req.user.id,
        trackRollback: true
      });
    }

    const populatedSale = await Sale.findById(refundedSale._id)
      .populate('cashier', 'name email role')
      .populate('items.product', 'name barcode stockQuantity unitType sellingPrice buyingPrice')
      .populate('refundHistory.approvedBy', 'name email role');

    await createAuditLog({
      req,
      action: 'REFUND_SALE',
      module: 'Sales',
      description: `Refunded sale ${populatedSale.saleNumber} by ${req.user.name}. Status: ${populatedSale.saleStatus}`
    });

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        sale: populatedSale
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError(error.message || 'Unable to process refund. Please try again.', 500));
  }
});

module.exports = {
  createSale,
  getSales,
  getSale,
  refundSale
};
