const mongoose = require('mongoose');

const PAYMENT_METHODS = Object.freeze(['cash', 'mobile_money', 'card', 'bank']);

const customerPaymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required']
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
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
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

customerPaymentSchema.index({ customer: 1, createdAt: -1 });
customerPaymentSchema.index({ sale: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);
