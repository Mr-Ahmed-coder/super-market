const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const Sale = require('../models/Sale');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'bank'];

const createCustomerPayment = asyncHandler(async (req, res, next) => {
  const { customer: customerId, sale: saleId = null, amount, paymentMethod, notes = '', allowOverpay = false } = req.body;
  let linkedSale = null;

  if (!customerId) {
    return next(new AppError('Customer is required', 400));
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return next(new AppError('Invalid payment method', 400));
  }

  const paymentAmount = Number(amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return next(new AppError('Payment amount must be greater than zero', 400));
  }

  const customer = await Customer.findOne({ _id: customerId, isDeleted: false, isActive: true });

  if (!customer) {
    return next(new AppError('Customer not found, inactive, or deleted', 404));
  }

  if (saleId) {
    linkedSale = await Sale.findOne({ _id: saleId, isDeleted: false, customer: customer._id });
    if (!linkedSale) {
      return next(new AppError('Sale not found for this customer', 404));
    }
  }

  if (paymentAmount > customer.currentBalance && !(req.user.role === 'admin' && allowOverpay)) {
    return next(new AppError('Payment cannot be greater than customer balance', 400));
  }

  customer.currentBalance = Math.max(0, Number(customer.currentBalance || 0) - paymentAmount);
  customer.updatedBy = req.user.id;
  await customer.save({ validateBeforeSave: false });

  if (linkedSale) {
    linkedSale.amountPaid = Number(linkedSale.amountPaid || 0) + paymentAmount;
    linkedSale.balance = Math.max(0, Number(linkedSale.balance || 0) - paymentAmount);
    linkedSale.paymentStatus = linkedSale.balance === 0 ? 'paid' : 'partial';
    await linkedSale.save({ validateBeforeSave: false });
  }

  const payment = await CustomerPayment.create({
    customer: customer._id,
    sale: saleId || null,
    amount: paymentAmount,
    paymentMethod,
    notes,
    receivedBy: req.user.id
  });

  const populatedPayment = await CustomerPayment.findById(payment._id)
    .populate('customer', 'name phone currentBalance creditLimit')
    .populate('sale', 'saleNumber grandTotal balance')
    .populate('receivedBy', 'name email role');

  await createAuditLog({
    req,
    action: 'CREATE_CUSTOMER_PAYMENT',
    module: 'Customer Payments',
    description: `Recorded customer payment ${paymentAmount} for ${customer.name} via ${paymentMethod}`
  });

  res.status(201).json({
    success: true,
    message: 'Customer payment recorded successfully',
    data: { payment: populatedPayment }
  });
});

const getCustomerPayments = asyncHandler(async (req, res) => {
  const payments = await CustomerPayment.find()
    .populate('customer', 'name phone currentBalance creditLimit')
    .populate('sale', 'saleNumber grandTotal balance')
    .populate('receivedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: { payments }
  });
});

const getCustomerPaymentsByCustomer = asyncHandler(async (req, res) => {
  const payments = await CustomerPayment.find({ customer: req.params.customerId })
    .populate('customer', 'name phone currentBalance creditLimit')
    .populate('sale', 'saleNumber grandTotal balance')
    .populate('receivedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: { payments }
  });
});

module.exports = {
  createCustomerPayment,
  getCustomerPayments,
  getCustomerPaymentsByCustomer
};
