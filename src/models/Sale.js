const mongoose = require('mongoose');

const PAYMENT_METHODS = Object.freeze(['cash', 'mobile_money', 'card', 'bank']);
const PAYMENT_STATUSES = Object.freeze(['paid', 'partial', 'unpaid']);
const SALE_STATUSES = Object.freeze(['completed', 'refunded', 'partial_refund', 'cancelled']);

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required']
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    barcode: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    buyingPrice: {
      type: Number,
      required: true,
      min: [0, 'Buying price cannot be negative']
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      default: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: [0, 'Line total cannot be negative']
    }
  },
  {
    _id: false
  }
);

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cashier is required']
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Sale must contain at least one item'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    discountTotal: {
      type: Number,
      min: [0, 'Discount total cannot be negative'],
      default: 0
    },
    taxAmount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: [0, 'Grand total cannot be negative']
    },
    amountPaid: {
      type: Number,
      min: [0, 'Amount paid cannot be negative'],
      default: 0
    },
    changeAmount: {
      type: Number,
      min: [0, 'Change amount cannot be negative'],
      default: 0
    },
    balance: {
      type: Number,
      min: [0, 'Balance cannot be negative'],
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Invalid payment method'
      },
      required: [true, 'Payment method is required']
    },
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: 'Invalid payment status'
      },
      required: true
    },
    saleStatus: {
      type: String,
      enum: {
        values: SALE_STATUSES,
        message: 'Invalid sale status'
      },
      default: 'completed'
    },
    isCreditSale: {
      type: Boolean,
      default: false
    },
    customerName: {
      type: String,
      trim: true,
      default: ''
    },
    customerPhone: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    refundHistory: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        productName: {
          type: String,
          required: true,
          trim: true
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, 'Refund quantity cannot be negative']
        },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Refund amount cannot be negative']
        },
        reason: {
          type: String,
          trim: true,
          required: [true, 'Refund reason is required']
        },
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        refundedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ cashier: 1, createdAt: -1 });
saleSchema.index({ paymentMethod: 1, createdAt: -1 });
saleSchema.index({ paymentStatus: 1, createdAt: -1 });
saleSchema.index({ saleStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
