import api from '../api/axios.js';

export const getCustomerPayments = async () => {
  const response = await api.get('/customer-payments');
  return response.data.data.payments;
};

export const getCustomerPaymentsByCustomer = async (customerId) => {
  const response = await api.get(`/customer-payments/customer/${customerId}`);
  return response.data.data.payments;
};

export const createCustomerPayment = async (payload) => {
  const response = await api.post('/customer-payments', payload);
  return response.data.data.payment;
};
