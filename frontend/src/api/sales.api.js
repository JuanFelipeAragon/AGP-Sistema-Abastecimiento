/**
 * Sales API — Read sales, customers, salespeople, geography.
 */
import axiosClient from './axiosClient';

const _cache = {};
const CACHE_TTL = 3 * 60 * 1000;

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

function invalidateCache(prefix) {
  Object.keys(_cache).forEach((k) => {
    if (k.startsWith(prefix)) delete _cache[k];
  });
}

const salesApi = {
  // ── Sales ──
  getSales: (params = {}) =>
    axiosClient.get('/api/sales', { params }).then((r) => r.data),

  getSaleById: (id) =>
    axiosClient.get(`/api/sales/${id}`).then((r) => r.data),

  getSummary: (params = {}) =>
    axiosClient.get('/api/sales/summary', { params }).then((r) => r.data),

  getFilterOptions: () =>
    getCached('sales:filter-options', () =>
      axiosClient.get('/api/sales/filter-options').then((r) => r.data)
    ),

  // ── Customers ──
  getCustomers: (params = {}) => {
    const hasFilters = Object.values(params).some((v) => v !== undefined && v !== null && v !== '');
    if (hasFilters) {
      return axiosClient.get('/api/sales/customers', { params }).then((r) => r.data);
    }
    return getCached('sales:customers', () =>
      axiosClient.get('/api/sales/customers').then((r) => r.data)
    );
  },

  getCustomerById: (id) =>
    axiosClient.get(`/api/sales/customers/${id}`).then((r) => r.data),

  bulkCustomers: (actionData) =>
    axiosClient.post('/api/sales/customers/bulk', actionData).then((r) => r.data)
      .then((res) => { invalidateCache('sales:customers'); return res; }),

  // ── Salespeople ──
  getSalespeople: (params = {}) => {
    const hasFilters = Object.values(params).some((v) => v !== undefined && v !== null && v !== '');
    if (hasFilters) {
      return axiosClient.get('/api/sales/salespeople', { params }).then((r) => r.data);
    }
    return getCached('sales:salespeople', () =>
      axiosClient.get('/api/sales/salespeople').then((r) => r.data)
    );
  },

  getSalespersonById: (id) =>
    axiosClient.get(`/api/sales/salespeople/${id}`).then((r) => r.data),

  bulkSalespeople: (actionData) =>
    axiosClient.post('/api/sales/salespeople/bulk', actionData).then((r) => r.data)
      .then((res) => { invalidateCache('sales:salespeople'); return res; }),

  // ── Geography ──
  getGeography: (params = {}) => {
    const hasFilters = Object.values(params).some((v) => v !== undefined && v !== null && v !== '');
    if (hasFilters) {
      return axiosClient.get('/api/sales/geography', { params }).then((r) => r.data);
    }
    return getCached('sales:geography', () =>
      axiosClient.get('/api/sales/geography').then((r) => r.data)
    );
  },
};

export default salesApi;
