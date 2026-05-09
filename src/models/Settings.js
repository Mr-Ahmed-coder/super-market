const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    supermarketName: {
      type: String,
      required: [true, 'Supermarket name is required'],
      trim: true,
      default: 'MarketPro Supermarket'
    },
    logo: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'USD'
    },
    taxPercentage: {
      type: Number,
      min: [0, 'Tax percentage cannot be negative'],
      default: 0
    },
    receiptFooter: {
      type: String,
      trim: true,
      default: 'Thank you for shopping with us.'
    },
    lowStockLimit: {
      type: Number,
      min: [0, 'Low stock limit cannot be negative'],
      default: 10
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
