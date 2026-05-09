import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AuditLogsPage from './pages/AuditLogsPage.jsx';
import Categories from './pages/Categories.jsx';
import Products from './pages/Products.jsx';
import POS from './pages/POS.jsx';
import SalesHistory from './pages/SalesHistory.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Purchases from './pages/Purchases.jsx';
import Customers from './pages/Customers.jsx';
import SupplierPayments from './pages/SupplierPayments.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['admin', 'manager']} />}>
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/categories" element={<Categories />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'stock_keeper', 'accountant']} />}>
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/supplier-payments" element={<SupplierPayments />} />
        </Route>
        <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'cashier']} />}>
          <Route path="/pos" element={<POS />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'cashier', 'accountant']} />}>
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customer-payments" element={<Customers />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'stock_keeper', 'cashier', 'accountant']} />}>
          <Route path="/products" element={<Products />} />
        </Route>
        <Route path="/stock-alerts" element={<PlaceholderPage title="Stock Alerts" />} />
        <Route path="/expenses" element={<PlaceholderPage title="Expenses" />} />
        <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
