const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const buildCustomerFilter = (query) => {
  const filter = { isDeleted: false };

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [{ name: searchRegex }, { phone: searchRegex }];
  }

  return filter;
};

const validateBalances = ({ openingBalance, currentBalance, creditLimit }) => {
  const values = { openingBalance, currentBalance, creditLimit };

  for (const [field, value] of Object.entries(values)) {
    if (value !== undefined) {
      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new AppError(`${field} cannot be negative`, 400);
      }
    }
  }
};

const createCustomer = asyncHandler(async (req, res, next) => {
  const {
    name,
    phone,
    email,
    address,
    openingBalance = 0,
    creditLimit = 0,
    isActive,
    notes
  } = req.body;

  if (!name) {
    return next(new AppError('Customer name is required', 400));
  }

  try {
    validateBalances({ openingBalance, creditLimit });
  } catch (error) {
    return next(error);
  }

  const balance = Number(openingBalance || 0);

  const customer = await Customer.create({
    name,
    phone,
    email,
    address,
    openingBalance: balance,
    currentBalance: balance,
    creditLimit: Number(creditLimit || 0),
    isActive,
    notes,
    createdBy: req.user.id
  });

  await createAuditLog({
    req,
    action: 'CREATE_CUSTOMER',
    module: 'Customer Management',
    description: `Created customer ${customer.name}`
  });

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: { customer }
  });
});

const getCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find(buildCustomerFilter(req.query))
    .populate('createdBy updatedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: customers.length,
    data: { customers }
  });
});

const getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false })
    .populate('createdBy updatedBy', 'name email role');

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { customer }
  });
});

const updateCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  try {
    validateBalances(req.body);
  } catch (error) {
    return next(error);
  }

  const allowedFields = [
    'name',
    'phone',
    'email',
    'address',
    'openingBalance',
    'currentBalance',
    'creditLimit',
    'isActive',
    'notes'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      customer[field] = ['openingBalance', 'currentBalance', 'creditLimit'].includes(field)
        ? Number(req.body[field])
        : req.body[field];
    }
  });

  customer.updatedBy = req.user.id;
  await customer.save();

  await createAuditLog({
    req,
    action: 'UPDATE_CUSTOMER',
    module: 'Customer Management',
    description: `Updated customer ${customer.name}`
  });

  res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: { customer }
  });
});

const toggleCustomerStatus = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  customer.isActive = !customer.isActive;
  customer.updatedBy = req.user.id;
  await customer.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: customer.isActive ? 'ACTIVATE_CUSTOMER' : 'DEACTIVATE_CUSTOMER',
    module: 'Customer Management',
    description: `${customer.isActive ? 'Activated' : 'Deactivated'} customer ${customer.name}`
  });

  res.status(200).json({
    success: true,
    message: customer.isActive ? 'Customer activated successfully' : 'Customer deactivated successfully',
    data: { customer }
  });
});

const softDeleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  customer.isDeleted = true;
  customer.isActive = false;
  customer.updatedBy = req.user.id;
  await customer.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: 'SOFT_DELETE_CUSTOMER',
    module: 'Customer Management',
    description: `Soft deleted customer ${customer.name}`
  });

  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully',
    data: { customer }
  });
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  toggleCustomerStatus,
  softDeleteCustomer
};
