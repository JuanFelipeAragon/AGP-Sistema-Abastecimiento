/**
 * Products API — Endpoints for SKUs, Classifications, and Acabados
 */
import axiosClient from './axiosClient';

const productsApi = {
  // ── SKUs ──
  getSkus: (params) =>
    axiosClient.get('/api/products/skus', { params }).then((r) => r.data),

  getSkuByRef: (ref) =>
    axiosClient.get(`/api/products/skus/${ref}`).then((r) => r.data),

  // ── Classifications ──
  getClassifications: (dimension, search) =>
    axiosClient
      .get(`/api/products/classifications/${dimension}`, { params: { search } })
      .then((r) => r.data),

  createClassification: (dimension, data) =>
    axiosClient
      .post(`/api/products/classifications/${dimension}`, data)
      .then((r) => r.data),

  updateClassification: (dimension, originalValue, data) =>
    axiosClient
      .put(`/api/products/classifications/${dimension}/${encodeURIComponent(originalValue)}`, data)
      .then((r) => r.data),

  bulkClassificationAction: (dimension, actionData) =>
    axiosClient
      .post(`/api/products/classifications/${dimension}/bulk`, actionData)
      .then((r) => r.data),

  // ── Acabados ──
  getAcabados: (search) =>
    axiosClient
      .get('/api/products/acabados', { params: { search } })
      .then((r) => r.data),

  createAcabado: (data) =>
    axiosClient.post('/api/products/acabados', data).then((r) => r.data),

  updateAcabado: (originalValue, data) =>
    axiosClient
      .put(`/api/products/acabados/${encodeURIComponent(originalValue)}`, data)
      .then((r) => r.data),

  bulkAcabadoAction: (actionData) =>
    axiosClient
      .post('/api/products/acabados/bulk', actionData)
      .then((r) => r.data),

  // ── Base Products ──
  getBaseProducts: (params) =>
    axiosClient.get('/api/products/base', { params }).then((r) => r.data),

  getBaseProductDetail: (productId) =>
    axiosClient.get(`/api/products/base/${productId}`).then((r) => r.data),

  // ── Warehouse Records ──
  getWarehouseRecords: (params) =>
    axiosClient.get('/api/products/warehouse', { params }).then((r) => r.data),

  // ── Warehouses List ──
  getWarehouses: () =>
    axiosClient.get('/api/products/warehouses').then((r) => r.data),

  // ── Summary / KPIs ──
  getProductsSummary: () =>
    axiosClient.get('/api/products/summary').then((r) => r.data),

  getDashboardSummary: () =>
    axiosClient.get('/api/products/dashboard-summary').then((r) => r.data),
};

export default productsApi;
