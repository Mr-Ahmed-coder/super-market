const mongoose = require('mongoose');

const PAYMENT_METHODS = Object.freeze(['cash', 'mobile_money', 'bank', 'card']);

const supplierPaymentSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required']
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative']
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Invalid payment method'
      },
      required: [true, 'Payment method is required']
    },
    reference: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

supplierPaymentSchema.index({ supplier: 1, createdAt: -1 });
supplierPaymentSchema.index({ purchase: 1, createdAt: -1 });
supplierPaymentSchema.index({ paymentMethod: 1, createdAt: -1 });

module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);
