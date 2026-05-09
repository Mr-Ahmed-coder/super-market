import api from '../api/axios.js';

export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data.data.products;
};

export const searchProducts = async (query) => {
  const response = await api.get('/products/search', {
    params: { query }
  });
  return response.data.data.products;
};

export const createProduct = async (payload) => {
  const response = await api.post('/products', payload);
  return response.data.data.product;
};

export const updateProduct = async (id, payload) => {
  const response = await api.put(`/products/${id}`, payload);
  return response.data.data.product;
};

export const toggleProductStatus = async (id) => {
  const response = await api.patch(`/products/${id}/toggle-status`);
  return response.data.data.product;
};

export const softDeleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data.data.product;
};
