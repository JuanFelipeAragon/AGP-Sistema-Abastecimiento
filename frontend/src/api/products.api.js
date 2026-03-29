/**
 * Products API — Endpoints for SKUs, Classifications, and Acabados
 */
import axiosClient from './axiosClient';

// ── In-memory cache for filter options (classifications, warehouses) ──
const _cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key, fetcher) {
  const entry = _cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return Promise.resolve(entry.data);
  }
  return fetcher().then((data) => {
    _cache[key] = { data, ts: Date.now() };
    return data;
  });
}

/** Call after mutations (create/update/bulk) to clear stale cache entries */
function invalidateCache(prefix) {
  Object.keys(_cache).forEach((k) => {
    if (k.startsWith(prefix)) delete _cache[k];
  });
}

const productsApi = {
  // ── SKUs ──
  getSkuFilterOptions: (params) =>
    axiosClient.get('/api/products/skus/filter-options', { params }).then((r) => r.data),

  getSkus: (params) =>
    axiosClient.get('/api/products/skus', { params }).then((r) => r.data),

  getSkuByRef: (ref) =>
    axiosClient.get(`/api/products/skus/${ref}`).then((r) => r.data),

  // ── Classifications (cached when no search) ──
  getClassifications: (dimension, search) => {
    if (search) {
      return axiosClient
        .get(`/api/products/classifications/${dimension}`, { params: { search } })
        .then((r) => r.data);
    }
    return getCached(`cls:${dimension}`, () =>
      axiosClient
        .get(`/api/products/classifications/${dimension}`)
        .then((r) => r.data)
    );
  },

  createClassification: (dimension, data) =>
    axiosClient
      .post(`/api/products/classifications/${dimension}`, data)
      .then((r) => r.data)
      .then((res) => { invalidateCache(`cls:${dimension}`); return res; }),

  updateClassification: (dimension, classificationId, data) =>
    axiosClient
      .put(`/api/products/classifications/${dimension}/${classificationId}`, data)
      .then((r) => r.data)
      .then((res) => { invalidateCache(`cls:${dimension}`); return res; }),

  bulkClassificationAction: (dimension, actionData) =>
    axiosClient
      .post(`/api/products/classifications/${dimension}/bulk`, actionData)
      .then((r) => r.data)
      .then((res) => { invalidateCache(`cls:${dimension}`); return res; }),

  // ── Acabados (dedicated table) ──
  getAcabados: (params = {}) => {
    const hasFilters = Object.values(params).some((v) => v);
    if (hasFilters) {
      return axiosClient
        .get('/api/products/acabados', { params })
        .then((r) => r.data);
    }
    return getCached('acabados', () =>
      axiosClient.get('/api/products/acabados').then((r) => r.data)
    );
  },

  getAcabadoById: (id) =>
    axiosClient.get(`/api/products/acabados/${id}`).then((r) => r.data),

  getAcabadoFilters: () =>
    getCached('acabado_filters', () =>
      axiosClient.get('/api/products/acabados/filters').then((r) => r.data)
    ),

  createAcabado: (data) =>
    axiosClient.post('/api/products/acabados', data).then((r) => r.data)
      .then((res) => { invalidateCache('acabado'); return res; }),

  updateAcabado: (id, data) =>
    axiosClient
      .put(`/api/products/acabados/${id}`, data)
      .then((r) => r.data)
      .then((res) => { invalidateCache('acabado'); return res; }),

  bulkAcabadoAction: (actionData) =>
    axiosClient
      .post('/api/products/acabados/bulk', actionData)
      .then((r) => r.data)
      .then((res) => { invalidateCache('acabado'); return res; }),

  // ── Generic Product Attributes ──
  getAttributes: (dimension, params = {}) => {
    const hasFilters = Object.values(params).some((v) => v);
    if (hasFilters) {
      return axiosClient
        .get(`/api/products/attributes/${dimension}`, { params })
        .then((r) => r.data);
    }
    return getCached(`attr:${dimension}:${params.product_type || 'all'}`, () =>
      axiosClient
        .get(`/api/products/attributes/${dimension}`, { params })
        .then((r) => r.data)
    );
  },

  getAttributeById: (dimension, id) =>
    axiosClient.get(`/api/products/attributes/${dimension}/${id}`).then((r) => r.data),

  getAttributeFilters: (dimension, productType) =>
    getCached(`attrFilters:${dimension}:${productType || ''}`, () =>
      axiosClient
        .get(`/api/products/attributes/${dimension}/filters`, {
          params: productType ? { product_type: productType } : {},
        })
        .then((r) => r.data)
    ),

  createAttribute: (dimension, data) =>
    axiosClient
      .post(`/api/products/attributes/${dimension}`, data)
      .then((r) => r.data)
      .then((res) => { invalidateCache(`attr:${dimension}`); return res; }),

  updateAttribute: (dimension, id, data) =>
    axiosClient
      .put(`/api/products/attributes/${dimension}/${id}`, data)
      .then((r) => r.data)
      .then((res) => { invalidateCache(`attr:${dimension}`); return res; }),

  bulkAttributeAction: (dimension, actionData) =>
    axiosClient
      .post(`/api/products/attributes/${dimension}/bulk`, actionData)
      .then((r) => r.data)
      .then((res) => { invalidateCache(`attr:${dimension}`); return res; }),

  // ── Base Products ──
  getBaseProducts: (params) =>
    axiosClient.get('/api/products/base', { params }).then((r) => r.data),

  getBaseProductDetail: (productId) =>
    axiosClient.get(`/api/products/base/${productId}`).then((r) => r.data),

  updateTechnicalSpecs: (productId, technicalSpecs) =>
    axiosClient.put(`/api/products/base/${productId}/technical-specs`, { technicalSpecs }).then((r) => r.data),

  // ── Warehouse Records ──
  getWarehouseRecords: (params) =>
    axiosClient.get('/api/products/warehouse', { params }).then((r) => r.data),

  // ── Warehouses List (cached) ──
  getWarehouses: () =>
    getCached('warehouses', () =>
      axiosClient.get('/api/products/warehouses').then((r) => r.data)
    ),

  // ── Product Type Config (cached) ──
  getTypeConfig: () =>
    getCached('typeConfig', () =>
      axiosClient.get('/api/products/type-config').then((r) => r.data)
    ),

  getSubcategoriaTypeMap: () =>
    getCached('subcatTypeMap', () =>
      axiosClient.get('/api/products/subcategoria-type-map').then((r) => r.data)
    ),

  // ── Summary / KPIs ──
  getProductsSummary: () =>
    axiosClient.get('/api/products/summary').then((r) => r.data),

  getDashboardSummary: () =>
    axiosClient.get('/api/products/dashboard-summary').then((r) => r.data),
};

export default productsApi;
