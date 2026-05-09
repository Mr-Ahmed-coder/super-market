const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters']
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      set: (value) => (value === '' ? undefined : value)
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    buyingPrice: {
      type: Number,
      required: [true, 'Buying price is required'],
      min: [0, 'Buying price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    stockQuantity: {
      type: Number,
      min: [0, 'Stock quantity cannot be negative'],
      default: 0
    },
    lowStockLimit: {
      type: Number,
      min: [0, 'Low stock limit cannot be negative'],
      default: 10
    },
    expiryDate: {
      type: Date,
      default: null
    },
    supplier: {
      type: String,
      trim: true,
      default: ''
    },
    unitType: {
      type: String,
      trim: true,
      default: 'pcs'
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

productSchema.index({ name: 'text', barcode: 'text', supplier: 'text' });
productSchema.index({ category: 1, isDeleted: 1 });

module.exports = mongoose.model('Product', productSchema);
