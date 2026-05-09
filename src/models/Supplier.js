const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [120, 'Supplier name cannot exceed 120 characters']
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
    companyName: {
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
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
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
  {
    timestamps: true
  }
);

supplierSchema.index({ name: 'text', phone: 'text', companyName: 'text', email: 'text' });
supplierSchema.index({ isDeleted: 1, isActive: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
