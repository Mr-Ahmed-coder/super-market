const Supplier = require('../models/Supplier');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const buildSupplierFilter = (query) => {
  const filter = { isDeleted: false };

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { companyName: searchRegex }
    ];
  }

  return filter;
};

const createSupplier = asyncHandler(async (req, res, next) => {
  const {
    name,
    phone,
    email,
    address,
    companyName,
    openingBalance = 0,
    notes,
    isActive
  } = req.body;

  if (!name) {
    return next(new AppError('Supplier name is required', 400));
  }

  const balance = Number(openingBalance || 0);

  if (!Number.isFinite(balance) || balance < 0) {
    return next(new AppError('Opening balance cannot be negative', 400));
  }

  const supplier = await Supplier.create({
    name,
    phone,
    email,
    address,
    companyName,
    openingBalance: balance,
    currentBalance: balance,
    notes,
    isActive,
    createdBy: req.user.id
  });

  await createAuditLog({
    req,
    action: 'CREATE_SUPPLIER',
    module: 'Supplier Management',
    description: `Created supplier ${supplier.name}`
  });

  return res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: {
      supplier
    }
  });
});

const getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find(buildSupplierFilter(req.query))
    .populate('createdBy updatedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: suppliers.length,
    data: {
      suppliers
    }
  });
});

const getSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false })
    .populate('createdBy updatedBy', 'name email role');

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      supplier
    }
  });
});

const updateSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  if (req.body.openingBalance !== undefined) {
    const openingBalance = Number(req.body.openingBalance);

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return next(new AppError('Opening balance cannot be negative', 400));
    }
  }

  if (req.body.currentBalance !== undefined) {
    const currentBalance = Number(req.body.currentBalance);

    if (!Number.isFinite(currentBalance) || currentBalance < 0) {
      return next(new AppError('Current balance cannot be negative', 400));
    }
  }

  const allowedFields = [
    'name',
    'phone',
    'email',
    'address',
    'companyName',
    'openingBalance',
    'currentBalance',
    'notes',
    'isActive'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      supplier[field] = ['openingBalance', 'currentBalance'].includes(field)
        ? Number(req.body[field])
        : req.body[field];
    }
  });

  if (supplier.currentBalance < 0) {
    return next(new AppError('Current balance cannot be negative', 400));
  }

  supplier.updatedBy = req.user.id;
  await supplier.save();

  await createAuditLog({
    req,
    action: 'UPDATE_SUPPLIER',
    module: 'Supplier Management',
    description: `Updated supplier ${supplier.name}`
  });

  res.status(200).json({
    success: true,
    message: 'Supplier updated successfully',
    data: {
      supplier
    }
  });
});

const toggleSupplierStatus = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  supplier.isActive = !supplier.isActive;
  supplier.updatedBy = req.user.id;
  await supplier.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: supplier.isActive ? 'ACTIVATE_SUPPLIER' : 'DEACTIVATE_SUPPLIER',
    module: 'Supplier Management',
    description: `${supplier.isActive ? 'Activated' : 'Deactivated'} supplier ${supplier.name}`
  });

  res.status(200).json({
    success: true,
    message: supplier.isActive ? 'Supplier activated successfully' : 'Supplier deactivated successfully',
    data: {
      supplier
    }
  });
});

const softDeleteSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  supplier.isDeleted = true;
  supplier.isActive = false;
  supplier.updatedBy = req.user.id;
  await supplier.save({ validateBeforeSave: false });

  await createAuditLog({
    req,
    action: 'SOFT_DELETE_SUPPLIER',
    module: 'Supplier Management',
    description: `Soft deleted supplier ${supplier.name}`
  });

  res.status(200).json({
    success: true,
    message: 'Supplier deleted successfully',
    data: {
      supplier
    }
  });
});

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  toggleSupplierStatus,
  softDeleteSupplier
};
