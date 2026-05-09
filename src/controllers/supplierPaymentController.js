const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const SupplierPayment = require('../models/SupplierPayment');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank', 'card'];

let cachedTransactionSupport = null;

const withSession = (query, session) => (session ? query.session(session) : query);

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

const getPurchasePaymentStatus = (purchase) => {
  if (Number(purchase.balance || 0) <= 0) {
    return 'paid';
  }

  if (Number(purchase.amountPaid || 0) > 0) {
    return 'partial';
  }

  return 'unpaid';
};

const rollbackStandalonePayment = async ({ supplierSnapshot, purchaseSnapshot, paymentId }) => {
  const rollbackErrors = [];

  if (supplierSnapshot) {
    try {
      await Supplier.updateOne(
        { _id: supplierSnapshot._id },
        {
          $set: {
            currentBalance: supplierSnapshot.currentBalance,
            updatedBy: supplierSnapshot.updatedBy
          }
        },
        { runValidators: false }
      );
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  if (purchaseSnapshot) {
    try {
      await Purchase.updateOne(
        { _id: purchaseSnapshot._id },
        {
          $set: {
            amountPaid: purchaseSnapshot.amountPaid,
            balance: purchaseSnapshot.balance,
            paymentStatus: purchaseSnapshot.paymentStatus
          }
        },
        { runValidators: false }
      );
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  if (paymentId) {
    try {
      await SupplierPayment.deleteOne({ _id: paymentId });
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  if (rollbackErrors.length > 0) {
    throw new AppError('Supplier payment failed and automatic rollback could not be completed. Please review supplier and purchase balances.', 500);
  }
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

const populatePayment = (id) =>
  SupplierPayment.findById(id)
    .populate('supplier', 'name companyName phone currentBalance')
    .populate('purchase', 'purchaseNumber grandTotal amountPaid balance paymentStatus')
    .populate('paidBy', 'name email role');

const createSupplierPayment = asyncHandler(async (req, res, next) => {
  const {
    supplier: supplierId,
    purchase: purchaseId = null,
    amount,
    paymentMethod,
    reference = '',
    notes = '',
    allowOverpay = false
  } = req.body;

  if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
    return next(new AppError('Valid supplier is required', 400));
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return next(new AppError('Invalid payment method', 400));
  }

  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return next(new AppError('Payment amount must be greater than zero', 400));
  }

  try {
    let createdPayment;
    let auditSupplierName = '';
    let auditPurchaseNumber = '';

    await runWithOptionalTransaction(async ({ session, trackRollback }) => {
      let supplierSnapshot = null;
      let purchaseSnapshot = null;

      try {
        const supplier = await withSession(
          Supplier.findOne({ _id: supplierId, isDeleted: false, isActive: true }),
          session
        );

        if (!supplier) {
          throw new AppError('Supplier not found, inactive, or deleted', 404);
        }

        if (paymentAmount > Number(supplier.currentBalance || 0) && !(req.user.role === 'admin' && allowOverpay)) {
          throw new AppError('Payment cannot be greater than supplier current balance', 400);
        }

        auditSupplierName = supplier.name;

        if (trackRollback) {
          supplierSnapshot = {
            _id: supplier._id,
            currentBalance: supplier.currentBalance,
            updatedBy: supplier.updatedBy || null
          };
        }

        supplier.currentBalance = Math.max(0, Number(supplier.currentBalance || 0) - paymentAmount);
        supplier.updatedBy = req.user.id;
        await supplier.save({ ...(session ? { session } : {}), validateBeforeSave: false });

        let purchase = null;

        if (purchaseId) {
          purchase = await withSession(
            Purchase.findOne({ _id: purchaseId, supplier: supplier._id, isDeleted: false }),
            session
          );

          if (!purchase) {
            throw new AppError('Purchase invoice not found for this supplier', 404);
          }

          auditPurchaseNumber = purchase.purchaseNumber;

          if (trackRollback) {
            purchaseSnapshot = {
              _id: purchase._id,
              amountPaid: purchase.amountPaid,
              balance: purchase.balance,
              paymentStatus: purchase.paymentStatus
            };
          }

          purchase.amountPaid = Number(purchase.amountPaid || 0) + paymentAmount;
          purchase.balance = Math.max(0, Number(purchase.balance || 0) - paymentAmount);
          purchase.paymentStatus = getPurchasePaymentStatus(purchase);
          await purchase.save({ ...(session ? { session } : {}), validateBeforeSave: false });
        }

        const payments = session
          ? await SupplierPayment.create(
              [
                {
                  supplier: supplier._id,
                  purchase: purchase?._id || null,
                  amount: paymentAmount,
                  paymentMethod,
                  reference,
                  notes,
                  paidBy: req.user.id
                }
              ],
              { session }
            )
          : [
              await SupplierPayment.create({
                supplier: supplier._id,
                purchase: purchase?._id || null,
                amount: paymentAmount,
                paymentMethod,
                reference,
                notes,
                paidBy: req.user.id
              })
            ];

        createdPayment = payments[0];
      } catch (error) {
        if (trackRollback) {
          await rollbackStandalonePayment({
            supplierSnapshot,
            purchaseSnapshot,
            paymentId: createdPayment?._id
          });
        }

        throw error;
      }
    });

    const populatedPayment = await populatePayment(createdPayment._id);

    await createAuditLog({
      req,
      action: 'CREATE_SUPPLIER_PAYMENT',
      module: 'Supplier Payments',
      description: `Recorded supplier payment for ${auditSupplierName}: ${paymentAmount} via ${paymentMethod}${auditPurchaseNumber ? ` for purchase ${auditPurchaseNumber}` : ''}`
    });

    res.status(201).json({
      success: true,
      message: 'Supplier payment recorded successfully',
      data: { payment: populatedPayment }
    });
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError(error.message || 'Unable to record supplier payment', 500));
  }
});

const getSupplierPayments = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.supplier) {
    filter.supplier = req.query.supplier;
  }

  if (req.query.paymentMethod) {
    filter.paymentMethod = req.query.paymentMethod;
  }

  const payments = await SupplierPayment.find(filter)
    .populate('supplier', 'name companyName phone currentBalance')
    .populate('purchase', 'purchaseNumber grandTotal amountPaid balance paymentStatus')
    .populate('paidBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: { payments }
  });
});

const getSupplierPaymentsBySupplier = asyncHandler(async (req, res) => {
  const payments = await SupplierPayment.find({ supplier: req.params.supplierId })
    .populate('supplier', 'name companyName phone currentBalance')
    .populate('purchase', 'purchaseNumber grandTotal amountPaid balance paymentStatus')
    .populate('paidBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: { payments }
  });
});

const getSupplierPaymentsByPurchase = asyncHandler(async (req, res) => {
  const payments = await SupplierPayment.find({ purchase: req.params.purchaseId })
    .populate('supplier', 'name companyName phone currentBalance')
    .populate('purchase', 'purchaseNumber grandTotal amountPaid balance paymentStatus')
    .populate('paidBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: { payments }
  });
});

module.exports = {
  createSupplierPayment,
  getSupplierPayments,
  getSupplierPaymentsBySupplier,
  getSupplierPaymentsByPurchase
};
