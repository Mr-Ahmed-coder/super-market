const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [120, 'Customer name cannot exceed 120 characters']
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    openingBalance: {
      type: Number,
      min: [0, 'Opening balance cannot be negative'],
      default: 0
    },
    currentBalance: {
      type: Number,
      min: [0, 'Current balance cannot be negative'],
      default: 0
    },
    creditLimit: {
      type: Number,
      min: [0, 'Credit limit cannot be negative'],
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', phone: 'text', email: 'text' });
customerSchema.index({ isDeleted: 1, isActive: 1 });

module.exports = mongoose.model('Customer', customerSchema);
