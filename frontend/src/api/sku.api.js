/**
 * SKU API — Endpoints for product catalog
 */
import axiosClient from './axiosClient';

const skuApi = {
  getAll: (params) =>
    axiosClient.get('/api/sku/', { params }).then((r) => r.data),

  getById: (id) =>
    axiosClient.get(`/api/sku/${id}`).then((r) => r.data),
};

export default skuApi;
