import api from '../api/axios.js';

export const getSuppliers = async (search = '') => {
  const response = await api.get('/suppliers', {
    params: search ? { search } : {}
  });
  return response.data.data.suppliers;
};

export const createSupplier = async (payload) => {
  const response = await api.post('/suppliers', payload);
  return response.data.data.supplier;
};

export const updateSupplier = async (id, payload) => {
  const response = await api.put(`/suppliers/${id}`, payload);
  return response.data.data.supplier;
};

export const toggleSupplierStatus = async (id) => {
  const response = await api.patch(`/suppliers/${id}/toggle-status`);
  return response.data.data.supplier;
};

export const softDeleteSupplier = async (id) => {
  const response = await api.delete(`/suppliers/${id}`);
  return response.data.data.supplier;
};
