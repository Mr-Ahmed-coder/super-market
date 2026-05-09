const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { createAuditLog } = require('../utils/auditLogger');

const defaultSettings = {
  supermarketName: 'MarketPro Supermarket',
  logo: '',
  phone: '',
  address: '',
  currency: 'USD',
  taxPercentage: 0,
  receiptFooter: 'Thank you for shopping with us.',
  lowStockLimit: 10
};

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create(defaultSettings);
  }

  return settings;
};

const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();

  res.status(200).json({
    success: true,
    data: {
      settings
    }
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const allowedFields = [
    'supermarketName',
    'logo',
    'phone',
    'address',
    'currency',
    'taxPercentage',
    'receiptFooter',
    'lowStockLimit'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      settings[field] = req.body[field];
    }
  });

  await settings.save();

  await createAuditLog({
    req,
    action: 'UPDATE_SETTINGS',
    module: 'Settings',
    description: 'Updated system settings'
  });

  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      settings
    }
  });
});

module.exports = {
  getSettings,
  updateSettings
};
