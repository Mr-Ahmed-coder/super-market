import api from '../api/axios.js';

export const getCustomers = async (search = '') => {
  const response = await api.get('/customers', {
    params: search ? { search } : {}
  });
  return response.data.data.customers;
};

export const createCustomer = async (payload) => {
  const response = await api.post('/customers', payload);
  return response.data.data.customer;
};

export const updateCustomer = async (id, payload) => {
  const response = await api.put(`/customers/${id}`, payload);
  return response.data.data.customer;
};

export const toggleCustomerStatus = async (id) => {
  const response = await api.patch(`/customers/${id}/toggle-status`);
  return response.data.data.customer;
};

export const softDeleteCustomer = async (id) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data.data.customer;
};
