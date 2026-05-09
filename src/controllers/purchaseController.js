const mongoose = require('mongoose');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const StockMovement = require('../models/StockMovement');
const Supplier = require('../models/Supplier');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

let cachedTransactionSupport = null;

const withSession = (query, session) => (session ? query.session(session) : query);

const generatePurchaseNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = new Date().toISOString().slice(11, 23).replace(/[:.]/g, '');
  const randomPart = new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase();
  return `PUR-${datePart}-${timePart}-${randomPart}`;
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

const createStockMovementRecord = async (stockMovement, session) => {
  if (session) {
    await StockMovement.create([stockMovement], { session });
    return;
  }

  await StockMovement.create(stockMovement);
};

const takeSnapshot = ({ productSnapshots, supplierSnapshots }, product, supplier = null) => {
  if (product && !productSnapshots.has(product._id.toString())) {
    productSnapshots.set(product._id.toString(), {
      _id: product._id,
      stockQuantity: product.stockQuantity,
      buyingPrice: product.buyingPrice,
      updatedBy: product.updatedBy || null
    });
  }

  if (supplier && !supplierSnapshots.has(supplier._id.toString())) {
    supplierSnapshots.set(supplier._id.toString(), {
      _id: supplier._id,
      currentBalance: supplier.currentBalance,
      updatedBy: supplier.updatedBy || null
    });
  }
};

const rollbackStandalone = async ({ productSnapshots, supplierSnapshots, purchaseId, originalPurchase, references }) => {
  const rollbackErrors = [];

  for (const snapshot of productSnapshots.values()) {
    try {
      await Product.updateOne(
        { _id: snapshot._id },
        {
          $set: {
            stockQuantity: snapshot.stockQuantity,
            buyingPrice: snapshot.buyingPrice,
            updatedBy: snapshot.updatedBy
          }
        },
        { runValidators: false }
      );
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  for (const snapshot of supplierSnapshots.values()) {
    try {
      await Supplier.updateOne(
        { _id: snapshot._id },
        {
          $set: {
            currentBalance: snapshot.currentBalance,
            updatedBy: snapshot.updatedBy
          }
        },
        { runValidators: false }
      );
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  try {
    await StockMovement.deleteMany({ reference: { $in: references } });
  } catch (error) {
    rollbackErrors.push(error);
  }

  if (purchaseId && originalPurchase) {
    try {
      await Purchase.updateOne({ _id: purchaseId }, { $set: originalPurchase }, { runValidators: false });
    } catch (error) {
      rollbackErrors.push(error);
    }
  } else if (purchaseId) {
    try {
      await Purchase.deleteOne({ _id: purchaseId });
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  if (rollbackErrors.length > 0) {
    throw new AppError('Purchase failed and automatic rollback could not be completed. Please review inventory and supplier balance.', 500);
  }
};

const buildPurchasePayload = async ({ req, supplierId, items, discount = 0, amountPaid = 0, purchaseDate, notes = '', session = null, snapshots = null }) => {
  if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
    throw new AppError('Valid supplier is required', 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Purchase must contain at least one item', 400);
  }

  const supplier = await withSession(
    Supplier.findOne({ _id: supplierId, isDeleted: false, isActive: true }),
    session
  );

  if (!supplier) {
    throw new AppError('Supplier not found, inactive, or deleted', 404);
  }

  if (snapshots) {
    takeSnapshot(snapshots, null, supplier);
  }

  const purchaseItems = [];
  let subtotal = 0;

  for (const item of items) {
    const productId = item.product;
    const quantity = Number(item.quantity);
    const buyingPrice = roundMoney(item.buyingPrice);

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError('Valid product is required for each purchase item', 400);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError('Purchase item quantity must be greater than zero', 400);
    }

    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) {
      throw new AppError('Buying price cannot be negative', 400);
    }

    const product = await withSession(
      Product.findOne({ _id: productId, isDeleted: false, isActive: true }),
      session
    );

    if (!product) {
      throw new AppError('Product not found, inactive, or deleted', 404);
    }

    if (snapshots) {
      takeSnapshot(snapshots, product);
    }

    const lineTotal = roundMoney(quantity * buyingPrice);

    purchaseItems.push({
      product: product._id,
      productName: product.name,
      quantity,
      buyingPrice,
      lineTotal
    });

    subtotal = roundMoney(subtotal + lineTotal);
  }

  const discountAmount = roundMoney(discount || 0);
  const paidAmount = roundMoney(amountPaid || 0);

  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    throw new AppError('Discount cannot be negative', 400);
  }

  if (discountAmount > subtotal) {
    throw new AppError('Discount cannot be greater than subtotal', 400);
  }

  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw new AppError('Amount paid cannot be negative', 400);
  }

  const grandTotal = roundMoney(subtotal - discountAmount);
  const balance = paidAmount < grandTotal ? roundMoney(grandTotal - paidAmount) : 0;
  const paymentStatus = getPaymentStatus({ amountPaid: paidAmount, grandTotal });

  return {
    supplier,
    payload: {
      supplier: supplier._id,
      items: purchaseItems,
      subtotal,
      discount: discountAmount,
      grandTotal,
      amountPaid: paidAmount,
      balance,
      paymentStatus,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      notes
    }
  };
};

const applyPurchaseEffects = async ({ req, purchase, supplier, previousBalance = 0, session = null, snapshots = null, referenceSuffix = '' }) => {
  const reference = `${purchase.purchaseNumber}${referenceSuffix}`;

  for (const item of purchase.items) {
    const product = await withSession(Product.findById(item.product), session);

    if (!product) {
      throw new AppError(`Product not found for purchase item ${item.productName}`, 404);
    }

    if (snapshots) {
      takeSnapshot(snapshots, product);
    }

    const previousStock = product.stockQuantity;
    const newStock = previousStock + Number(item.quantity);

    product.stockQuantity = newStock;
    product.buyingPrice = Number(item.buyingPrice);
    product.updatedBy = req.user.id;
    await product.save({ ...(session ? { session } : {}), validateBeforeSave: false });

    await createStockMovementRecord(
      {
        product: product._id,
        movementType: 'stock_in',
        quantity: item.quantity,
        previousStock,
        newStock,
        reason: 'Purchase invoice',
        reference,
        createdBy: req.user.id
      },
      session
    );
  }

  if (snapshots) {
    takeSnapshot(snapshots, null, supplier);
  }

  supplier.currentBalance = Math.max(0, roundMoney(Number(supplier.currentBalance || 0) - previousBalance + purchase.balance));
  supplier.updatedBy = req.user.id;
  await supplier.save({ ...(session ? { session } : {}), validateBeforeSave: false });

  return reference;
};

const reversePurchaseEffects = async ({ req, purchase, session = null, snapshots = null, referenceSuffix = '-REVERSE' }) => {
  const supplier = await withSession(Supplier.findById(purchase.supplier), session);

  if (!supplier) {
    throw new AppError('Supplier not found for purchase reversal', 404);
  }

  for (const item of purchase.items) {
    const product = await withSession(Product.findById(item.product), session);

    if (!product) {
      throw new AppError(`Product not found for purchase item ${item.productName}`, 404);
    }

    if (snapshots) {
      takeSnapshot(snapshots, product);
    }

    const previousStock = product.stockQuantity;
    const newStock = Math.max(0, previousStock - Number(item.quantity));

    product.stockQuantity = newStock;
    product.updatedBy = req.user.id;
    await product.save({ ...(session ? { session } : {}), validateBeforeSave: false });

    await createStockMovementRecord(
      {
        product: product._id,
        movementType: 'adjustment',
        quantity: item.quantity,
        previousStock,
        newStock,
        reason: 'Purchase invoice reversal',
        reference: `${purchase.purchaseNumber}${referenceSuffix}`,
        createdBy: req.user.id
      },
      session
    );
  }

  if (snapshots) {
    takeSnapshot(snapshots, null, supplier);
  }

  supplier.currentBalance = Math.max(0, roundMoney(Number(supplier.currentBalance || 0) - Number(purchase.balance || 0)));
  supplier.updatedBy = req.user.id;
  await supplier.save({ ...(session ? { session } : {}), validateBeforeSave: false });

  return `${purchase.purchaseNumber}${referenceSuffix}`;
};

const runWithOptionalTransaction = async (operation) => {
  if (await supportsTransactions()) {
    const session = await mongoose.startSession();

    try {
      let result;
      await session.withTransaction(async () => {
        result = await operation({ session, trackRollback: false });
      });
      return result;
    } finally {
      session.endSession();
    }
  }

  return operation({ session: null, trackRollback: true });
};

const populatePurchase = (id) =>
  Purchase.findById(id)
    .populate('supplier', 'name companyName phone email currentBalance')
    .populate('items.product', 'name barcode stockQuantity buyingPrice sellingPrice')
    .populate('createdBy', 'name email role');

const createPurchase = asyncHandler(async (req, res, next) => {
  try {
    let createdPurchase;

    await runWithOptionalTransaction(async ({ session, trackRollback }) => {
      const snapshots = trackRollback ? { productSnapshots: new Map(), supplierSnapshots: new Map() } : null;
      const references = [];

      try {
        const { supplier, payload } = await buildPurchasePayload({
          req,
          supplierId: req.body.supplier,
          items: req.body.items,
          discount: req.body.discount,
          amountPaid: req.body.amountPaid,
          purchaseDate: req.body.purchaseDate,
          notes: req.body.notes,
          session,
          snapshots
        });

        const purchaseNumber = generatePurchaseNumber();
        const purchasePayload = { ...payload, purchaseNumber, createdBy: req.user.id };
        const purchases = session
          ? await Purchase.create([purchasePayload], { session })
          : [await Purchase.create(purchasePayload)];

        createdPurchase = purchases[0];
        references.push(await applyPurchaseEffects({ req, purchase: createdPurchase, supplier, session, snapshots }));
      } catch (error) {
        if (trackRollback && snapshots) {
          await rollbackStandalone({ ...snapshots, purchaseId: createdPurchase?._id, references });
        }
        throw error;
      }
    });

    const populatedPurchase = await populatePurchase(createdPurchase._id);

    await createAuditLog({
      req,
      action: 'CREATE_PURCHASE',
      module: 'Purchase Management',
      description: `Created purchase ${populatedPurchase.purchaseNumber} for ${populatedPurchase.supplier?.name}. Grand total ${populatedPurchase.grandTotal}, paid ${populatedPurchase.amountPaid}, balance ${populatedPurchase.balance}`
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: { purchase: populatedPurchase }
    });
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(error.message || 'Unable to create purchase', 500));
  }
});

const getPurchases = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };

  if (req.query.supplier) {
    filter.supplier = req.query.supplier;
  }

  if (req.query.paymentStatus) {
    filter.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.search) {
    filter.purchaseNumber = new RegExp(req.query.search, 'i');
  }

  const purchases = await Purchase.find(filter)
    .populate('supplier', 'name companyName phone currentBalance')
    .populate('createdBy', 'name email role')
    .sort({ purchaseDate: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: purchases.length,
    data: { purchases }
  });
});

const getPurchase = asyncHandler(async (req, res, next) => {
  const purchase = await populatePurchase(req.params.id);

  if (!purchase || purchase.isDeleted) {
    return next(new AppError('Purchase not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { purchase }
  });
});

const updatePurchase = asyncHandler(async (req, res, next) => {
  try {
    let updatedPurchase;

    await runWithOptionalTransaction(async ({ session, trackRollback }) => {
      const purchase = await withSession(Purchase.findOne({ _id: req.params.id, isDeleted: false }), session);

      if (!purchase) {
        throw new AppError('Purchase not found', 404);
      }

      const originalPurchase = purchase.toObject();
      const snapshots = trackRollback ? { productSnapshots: new Map(), supplierSnapshots: new Map() } : null;
      const references = [];

      try {
        references.push(await reversePurchaseEffects({ req, purchase, session, snapshots }));

        const { supplier, payload } = await buildPurchasePayload({
          req,
          supplierId: req.body.supplier,
          items: req.body.items,
          discount: req.body.discount,
          amountPaid: req.body.amountPaid,
          purchaseDate: req.body.purchaseDate,
          notes: req.body.notes,
          session,
          snapshots
        });

        Object.assign(purchase, payload);
        await purchase.save({ ...(session ? { session } : {}), validateBeforeSave: false });
        references.push(await applyPurchaseEffects({ req, purchase, supplier, session, snapshots, referenceSuffix: '-UPDATED' }));
        updatedPurchase = purchase;
      } catch (error) {
        if (trackRollback && snapshots) {
          await rollbackStandalone({
            ...snapshots,
            purchaseId: purchase._id,
            originalPurchase,
            references
          });
        }
        throw error;
      }
    });

    const populatedPurchase = await populatePurchase(updatedPurchase._id);

    await createAuditLog({
      req,
      action: 'UPDATE_PURCHASE',
      module: 'Purchase Management',
      description: `Updated purchase ${populatedPurchase.purchaseNumber} for ${populatedPurchase.supplier?.name}. Grand total ${populatedPurchase.grandTotal}, paid ${populatedPurchase.amountPaid}, balance ${populatedPurchase.balance}`
    });

    res.status(200).json({
      success: true,
      message: 'Purchase updated successfully',
      data: { purchase: populatedPurchase }
    });
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(error.message || 'Unable to update purchase', 500));
  }
});

const softDeletePurchase = asyncHandler(async (req, res, next) => {
  try {
    let deletedPurchase;

    await runWithOptionalTransaction(async ({ session, trackRollback }) => {
      const purchase = await withSession(Purchase.findOne({ _id: req.params.id, isDeleted: false }), session);

      if (!purchase) {
        throw new AppError('Purchase not found', 404);
      }

      const originalPurchase = purchase.toObject();
      const snapshots = trackRollback ? { productSnapshots: new Map(), supplierSnapshots: new Map() } : null;
      const references = [];

      try {
        references.push(await reversePurchaseEffects({ req, purchase, session, snapshots, referenceSuffix: '-DELETE' }));
        purchase.isDeleted = true;
        await purchase.save({ ...(session ? { session } : {}), validateBeforeSave: false });
        deletedPurchase = purchase;
      } catch (error) {
        if (trackRollback && snapshots) {
          await rollbackStandalone({
            ...snapshots,
            purchaseId: purchase._id,
            originalPurchase,
            references
          });
        }
        throw error;
      }
    });

    await createAuditLog({
      req,
      action: 'SOFT_DELETE_PURCHASE',
      module: 'Purchase Management',
      description: `Deleted purchase ${deletedPurchase.purchaseNumber}. Grand total ${deletedPurchase.grandTotal}, paid ${deletedPurchase.amountPaid}, balance ${deletedPurchase.balance}`
    });

    res.status(200).json({
      success: true,
      message: 'Purchase deleted successfully',
      data: { purchase: deletedPurchase }
    });
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(error.message || 'Unable to delete purchase', 500));
  }
});

module.exports = {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePurchase,
  softDeletePurchase
};
