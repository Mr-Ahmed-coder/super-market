import api from '../api/axios.js';

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data.data.categories;
};

export const createCategory = async (payload) => {
  const response = await api.post('/categories', payload);
  return response.data.data.category;
};

export const updateCategory = async (id, payload) => {
  const response = await api.put(`/categories/${id}`, payload);
  return response.data.data.category;
};

export const toggleCategoryStatus = async (id) => {
  const response = await api.patch(`/categories/${id}/toggle-status`);
  return response.data.data.category;
};

export const softDeleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data.data.category;
};
