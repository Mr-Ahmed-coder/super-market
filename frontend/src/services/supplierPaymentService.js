import api from '../api/axios.js';

export const getSupplierPayments = async (params = {}) => {
  const response = await api.get('/supplier-payments', { params });
  return response.data.data.payments;
};

export const getSupplierPaymentsBySupplier = async (supplierId) => {
  const response = await api.get(`/supplier-payments/supplier/${supplierId}`);
  return response.data.data.payments;
};

export const getSupplierPaymentsByPurchase = async (purchaseId) => {
  const response = await api.get(`/supplier-payments/purchase/${purchaseId}`);
  return response.data.data.payments;
};

export const createSupplierPayment = async (payload) => {
  const response = await api.post('/supplier-payments', payload);
  return response.data.data.payment;
};
