const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  STOCK_KEEPER: 'stock_keeper',
  ACCOUNTANT: 'accountant'
});

const ROLE_VALUES = Object.values(ROLES);

module.exports = {
  ROLES,
  ROLE_VALUES
};
