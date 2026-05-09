const mongoose = require('mongoose');

const MOVEMENT_TYPES = Object.freeze([
  'stock_in',
  'stock_out',
  'adjustment',
  'damaged',
  'expired',
  'return'
]);

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required']
    },
    movementType: {
      type: String,
      enum: {
        values: MOVEMENT_TYPES,
        message: 'Invalid stock movement type'
      },
      required: [true, 'Movement type is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    previousStock: {
      type: Number,
      required: true,
      min: [0, 'Previous stock cannot be negative']
    },
    newStock: {
      type: Number,
      required: true,
      min: [0, 'New stock cannot be negative']
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    reference: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ movementType: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
