const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const sumField = async (Model, match, field) => {
  const result = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } }
  ]);

  return result[0]?.total || 0;
};

const getDashboardSummary = asyncHandler(async (req, res) => {
  const { start, end } = getTodayRange();
  const todaySalesMatch = {
    isDeleted: false,
    saleStatus: { $ne: 'cancelled' },
    createdAt: { $gte: start, $lt: end }
  };

  if (req.user.role === 'cashier') {
    todaySalesMatch.cashier = req.user._id;
  }

  const [
    todaySalesTotal,
    todaySalesCount,
    totalProducts,
    lowStockProductsCount,
    totalUsers,
    activeUsers,
    totalCustomers,
    totalSuppliers,
    totalPurchases,
    customerDebtTotal,
    supplierDebtTotal,
    recentSales,
    lowStockProducts
  ] = await Promise.all([
    sumField(Sale, todaySalesMatch, 'grandTotal'),
    Sale.countDocuments(todaySalesMatch),
    Product.countDocuments({ isDeleted: false }),
    Product.countDocuments({
      isDeleted: false,
      $expr: { $lte: ['$stockQuantity', '$lowStockLimit'] }
    }),
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ isDeleted: false, isActive: true }),
    Customer.countDocuments({ isDeleted: false }),
    Supplier.countDocuments({ isDeleted: false }),
    Purchase.countDocuments({ isDeleted: false }),
    sumField(Customer, { isDeleted: false }, 'currentBalance'),
    sumField(Supplier, { isDeleted: false }, 'currentBalance'),
    Sale.find({ isDeleted: false })
      .populate('cashier', 'name email role')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('saleNumber cashier customer grandTotal paymentStatus saleStatus createdAt'),
    Product.find({
      isDeleted: false,
      $expr: { $lte: ['$stockQuantity', '$lowStockLimit'] }
    })
      .sort({ stockQuantity: 1, name: 1 })
      .limit(8)
      .select('name barcode stockQuantity lowStockLimit unitType')
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: {
        todaySalesTotal,
        todaySalesCount,
        totalProducts,
        lowStockProductsCount,
        totalUsers,
        activeUsers,
        totalCustomers,
        totalSuppliers,
        totalPurchases,
        customerDebtTotal,
        supplierDebtTotal,
        recentSales,
        lowStockProducts
      }
    }
  });
});

module.exports = {
  getDashboardSummary
};
