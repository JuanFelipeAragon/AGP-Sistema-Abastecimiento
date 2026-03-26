/**
 * DEPRECATED: APIs have been split into individual files.
 * Use imports from './supply.api', './sku.api', './imports.api' instead.
 * This file is kept for backwards compatibility during migration.
 */
import axiosClient from './axiosClient';

export const supplyApi = {
  // Dashboard summary (counts by alert, total value)
  getDashboard: () => axiosClient.get('/api/supply/dashboard').then((r) => r.data),

  // Paginated decisions list with filters
  getDecisions: (params) => axiosClient.get('/api/supply/decisions', { params }).then((r) => r.data),

  // Recalculate all decisions with new parameters
  recalculate: (parameters) => axiosClient.post('/api/supply/recalculate', parameters).then((r) => r.data),

  // Inactivate a SKU
  inactivate: (id, reason) => axiosClient.post(`/api/supply/inactivate/${id}`, { reason }).then((r) => r.data),

  // Export purchase list to Excel
  exportExcel: () => axiosClient.get('/api/supply/export/excel', { responseType: 'blob' }).then((r) => r.data),

  // Get supply parameters
  getParameters: () => axiosClient.get('/api/supply/parameters').then((r) => r.data),

  // Update supply parameters
  updateParameters: (data) => axiosClient.put('/api/supply/parameters', data).then((r) => r.data),
};

export const skuApi = {
  getAll: (params) => axiosClient.get('/api/sku/', { params }).then((r) => r.data),
  getById: (id) => axiosClient.get(`/api/sku/${id}`).then((r) => r.data),
};

export const importsApi = {
  upload: (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    if (type) formData.append('type', type);
    return axiosClient.post('/api/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
