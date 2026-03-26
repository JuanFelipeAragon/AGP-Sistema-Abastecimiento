/**
 * Module Registry — Lazy-loaded module exports with retry.
 * Every ERP module is registered here for code splitting.
 * If a chunk fails to load (network error), it retries once.
 */
import { lazy } from 'react';

function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      // Retry once after a brief delay (handles flaky network)
      return new Promise((resolve) => setTimeout(resolve, 1500)).then(importFn);
    })
  );
}

// Core pages
export const DashboardPage = lazyWithRetry(() => import('../pages/dashboard/DashboardPage'));

// ERP modules
export const SupplyModule = lazyWithRetry(() => import('../pages/supply/SupplyRoot'));

// Placeholder modules (to be built)
export const PlaceholderModule = lazyWithRetry(() => import('../pages/PlaceholderModule'));
