import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  DollarSign,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Truck,
  UserRound,
  UsersRound
} from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

const getCashierStats = (summary) => [
  {
    label: 'Today Sales',
    value: formatMoney(summary.todaySalesTotal),
    note: `${summary.todaySalesCount} sales today`,
    icon: DollarSign
  }
];

const getStockKeeperStats = (summary) => [
  {
    label: 'Inventory Items',
    value: summary.totalProducts,
    note: `${summary.lowStockProductsCount} low stock products`,
    icon: Boxes
  }
];

const getAccountantStats = (summary) => [
  {
    label: 'Today Sales',
    value: formatMoney(summary.todaySalesTotal),
    note: `${summary.todaySalesCount} sales today`,
    icon: DollarSign
  },
  {
    label: 'Purchases',
    value: summary.totalPurchases,
    note: 'Recorded purchase invoices',
    icon: PackagePlus
  },
  {
    label: 'Customer Debt',
    value: formatMoney(summary.customerDebtTotal),
    note: 'Outstanding customer balances',
    icon: UserRound
  },
  {
    label: 'Supplier Debt',
    value: formatMoney(summary.supplierDebtTotal),
    note: 'Outstanding supplier balances',
    icon: Truck
  }
];

const getFullStats = (summary) => [
  {
    label: 'Today Sales',
    value: formatMoney(summary.todaySalesTotal),
    note: `${summary.todaySalesCount} sales today`,
    icon: DollarSign
  },
  {
    label: 'Inventory Items',
    value: summary.totalProducts,
    note: `${summary.lowStockProductsCount} low stock products`,
    icon: Boxes
  },
  {
    label: 'Active Staff',
    value: summary.activeUsers,
    note: `${summary.totalUsers} total users`,
    icon: UsersRound
  },
  {
    label: 'Customers',
    value: summary.totalCustomers,
    note: `${formatMoney(summary.customerDebtTotal)} total debt`,
    icon: UserRound
  },
  {
    label: 'Suppliers',
    value: summary.totalSuppliers,
    note: `${formatMoney(summary.supplierDebtTotal)} supplier debt`,
    icon: Truck
  },
  {
    label: 'Purchases',
    value: summary.totalPurchases,
    note: 'Recorded purchase invoices',
    icon: ReceiptText
  }
];

const getStatsForRole = (role, summary) => {
  if (role === 'cashier') {
    return getCashierStats(summary);
  }

  if (role === 'stock_keeper') {
    return getStockKeeperStats(summary);
  }

  if (role === 'accountant') {
    return getAccountantStats(summary);
  }

  return getFullStats(summary);
};

function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    if (!summary) {
      return [];
    }

    return getStatsForRole(user?.role, summary);
  }, [summary, user?.role]);

  const canShowRecentSales = ['admin', 'manager', 'accountant'].includes(user?.role);
  const canShowLowStock = ['admin', 'manager', 'stock_keeper'].includes(user?.role);
  const isCashier = user?.role === 'cashier';

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get('/dashboard/summary');
        setSummary(response.data.data.summary);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load dashboard summary.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome, {user?.name || 'User'}</h1>
          <p>Monitor real store activity from live sales, inventory, customers, suppliers, and purchases.</p>
        </div>
      </section>

      {isLoading && <div className="panel-card">Loading dashboard summary...</div>}
      {error && <div className="form-error">{error}</div>}

      {!isLoading && !error && summary && (
        <>
          <section className="stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article className="stat-card" key={stat.label}>
                  <div className="stat-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                    <p>{stat.note}</p>
                  </div>
                </article>
              );
            })}
          </section>

          {isCashier && (
            <section className="panel-card dashboard-shortcut">
              <div>
                <h2>Point of Sale</h2>
                <p className="muted-copy">Go straight to checkout and continue selling.</p>
              </div>
              <Link className="primary-action-button" to="/pos">
                <ShoppingCart size={18} />
                <span>Open POS</span>
              </Link>
            </section>
          )}

          <section className="content-grid">
            {canShowRecentSales && (
              <article className="panel-card">
                <h2>Recent Sales</h2>
                <div className="activity-list">
                  {summary.recentSales.length === 0 ? (
                    <p className="muted-copy">No sales recorded yet</p>
                  ) : (
                    summary.recentSales.map((sale) => (
                      <div key={sale._id}>
                        <span>
                          {sale.saleNumber}
                          <small className="table-subtext">
                            {sale.cashier?.name || 'Cashier'} - {formatDateTime(sale.createdAt)}
                          </small>
                        </span>
                        <strong>{formatMoney(sale.grandTotal)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </article>
            )}

            {canShowLowStock && (
              <article className="panel-card">
                <h2>Low Stock Products</h2>
                <div className="stock-list">
                  {summary.lowStockProducts.length === 0 ? (
                    <p className="muted-copy">No low stock products</p>
                  ) : (
                    summary.lowStockProducts.map((product) => (
                      <div key={product._id}>
                        <span>
                          {product.name}
                          <small className="table-subtext">
                            Stock {product.stockQuantity} / Limit {product.lowStockLimit}
                          </small>
                        </span>
                        <meter
                          min="0"
                          max={Math.max(Number(product.lowStockLimit || 1), 1)}
                          value={Math.max(Number(product.stockQuantity || 0), 0)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </article>
            )}
          </section>
        </>
      )}

      {!isLoading && !error && !summary && (
        <section className="panel-card empty-state">
          <h2>No dashboard data available</h2>
          <p>Start by adding products, customers, suppliers, purchases, or sales.</p>
        </section>
      )}
    </div>
  );
}

export default DashboardPage;
