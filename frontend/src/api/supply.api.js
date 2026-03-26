/**
 * Supply API — Endpoints for the abastecimiento module
 */
import axiosClient from './axiosClient';

const supplyApi = {
  getDashboard: () =>
    axiosClient.get('/api/supply/dashboard').then((r) => r.data),

  getDecisions: (params) =>
    axiosClient.get('/api/supply/decisions', { params }).then((r) => r.data),

  recalculate: (parameters) =>
    axiosClient.post('/api/supply/recalculate', parameters).then((r) => r.data),

  inactivate: (id, reason) =>
    axiosClient.post(`/api/supply/inactivate/${id}`, { reason }).then((r) => r.data),

  exportExcel: () =>
    axiosClient.get('/api/supply/export/excel', { responseType: 'blob' }).then((r) => r.data),

  getParameters: () =>
    axiosClient.get('/api/supply/parameters').then((r) => r.data),

  updateParameters: (data) =>
    axiosClient.put('/api/supply/parameters', data).then((r) => r.data),
};

export default supplyApi;
