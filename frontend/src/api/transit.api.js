/**
 * Transit API — endpoints for transit/shipping tracking.
 */
import axiosClient from './axiosClient';

/**
 * Fetch transit items with optional search, pagination, and sorting.
 * @param {Object} params
 * @param {string} [params.search] - Search term
 * @param {number} [params.page] - Page number (0-based)
 * @param {number} [params.pageSize] - Items per page
 * @param {string} [params.sortField] - Column to sort by
 * @param {string} [params.sortOrder] - 'asc' or 'desc'
 * @returns {Promise} Axios response with { data: [], total: number }
 */
export function getTransit(params = {}) {
  return axiosClient.get('/api/transit', { params });
}
