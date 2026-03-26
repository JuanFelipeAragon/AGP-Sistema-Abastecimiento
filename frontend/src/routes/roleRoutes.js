/**
 * Role-based route definitions
 * Maps module keys to their route paths and required permissions.
 */
export const moduleRoutes = {
  dashboard:  { path: 'dashboard',        permission: null }, // Always accessible
  products:   { path: 'productos',        permission: 'products' },
  inventory:  { path: 'inventario',       permission: 'inventory' },
  sales:      { path: 'ventas',           permission: 'sales' },
  purchases:  { path: 'compras',          permission: 'purchases' },
  logistics:  { path: 'logistica',        permission: 'logistics' },
  supply:     { path: 'abastecimiento',   permission: 'supply' },
  users:      { path: 'usuarios',         permission: 'users' },
  settings:   { path: 'configuracion',    permission: 'settings' },
};
