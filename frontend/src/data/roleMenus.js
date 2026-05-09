import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  FileBarChart,
  HandCoins,
  LayoutDashboard,
  Package,
  PackagePlus,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  TriangleAlert,
  UserRound,
  Users,
  WalletCards
} from 'lucide-react';

export const roleMenus = {
  admin: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/users', icon: Users },
    { label: 'Categories', path: '/categories', icon: Tags },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Purchases', path: '/purchases', icon: PackagePlus },
    { label: 'Supplier Payments', path: '/supplier-payments', icon: HandCoins },
    { label: 'POS', path: '/pos', icon: ShoppingCart },
    { label: 'Sales', path: '/sales', icon: Receipt },
    { label: 'Customers', path: '/customers', icon: UserRound },
    { label: 'Customer Payments', path: '/customer-payments', icon: HandCoins },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList }
  ],
  manager: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Categories', path: '/categories', icon: Tags },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Purchases', path: '/purchases', icon: PackagePlus },
    { label: 'Supplier Payments', path: '/supplier-payments', icon: HandCoins },
    { label: 'POS', path: '/pos', icon: ShoppingCart },
    { label: 'Sales', path: '/sales', icon: Receipt },
    { label: 'Customers', path: '/customers', icon: UserRound },
    { label: 'Customer Payments', path: '/customer-payments', icon: HandCoins },
    { label: 'Reports', path: '/reports', icon: FileBarChart },
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList }
  ],
  cashier: [
    { label: 'Products', path: '/products', icon: Package },
    { label: 'POS', path: '/pos', icon: ShoppingCart },
    { label: 'Sales', path: '/sales', icon: Receipt },
    { label: 'Customers', path: '/customers', icon: UserRound },
    { label: 'Customer Payments', path: '/customer-payments', icon: HandCoins }
  ],
  stock_keeper: [
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Purchases', path: '/purchases', icon: PackagePlus },
    { label: 'Supplier Payments', path: '/supplier-payments', icon: HandCoins },
    { label: 'Stock Alerts', path: '/stock-alerts', icon: TriangleAlert }
  ],
  accountant: [
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Purchases', path: '/purchases', icon: PackagePlus },
    { label: 'Supplier Payments', path: '/supplier-payments', icon: HandCoins },
    { label: 'Expenses', path: '/expenses', icon: WalletCards },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Sales', path: '/sales', icon: Receipt },
    { label: 'Customers', path: '/customers', icon: UserRound },
    { label: 'Customer Payments', path: '/customer-payments', icon: HandCoins },
    { label: 'Reports', path: '/reports', icon: BarChart3 }
  ]
};
