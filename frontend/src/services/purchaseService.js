import api from '../api/axios.js';

export const getPurchases = async (params = {}) => {
  const response = await api.get('/purchases', { params });
  return response.data.data.purchases;
};

export const createPurchase = async (payload) => {
  const response = await api.post('/purchases', payload);
  return response.data.data.purchase;
};

export const updatePurchase = async (id, payload) => {
  const response = await api.put(`/purchases/${id}`, payload);
  return response.data.data.purchase;
};

export const softDeletePurchase = async (id) => {
  const response = await api.delete(`/purchases/${id}`);
  return response.data.data.purchase;
};
