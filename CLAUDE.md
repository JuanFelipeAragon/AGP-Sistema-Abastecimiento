# AGP Sistema de Abastecimiento

## Reglas de desarrollo

### Sidebar — Regla obligatoria
Cada vez que se cree un módulo o sub-módulo nuevo, **SIEMPRE** agregar la entrada correspondiente en el sidebar:
- Archivo: `frontend/src/components/layout/Sidebar.jsx` → constante `MODULE_GROUPS`
- Usar rutas reales (e.g. `/platform/productos/base`), **nunca** query params (`?tab=X`)
- Cada entrada necesita: `key`, `label`, `icon` (importar el ícono), `path`
- Si el módulo padre no tiene `children`, convertirlo a expandable con array de children
- Verificar que la ruta exista en `PlatformRoutes.jsx` o en el router interno del módulo
- Aplica a **todos** los módulos: productos, inventario, ventas, compras, logística, etc.

### Inputs numéricos — Regla obligatoria
Todo input de tipo número o moneda debe seleccionar su contenido al hacer focus (`onFocus: e.target.select()`), para que al editar el valor existente se reemplace en lugar de concatenar (e.g. evitar "02" en vez de "2").
- `FormTextField` con `type="number"`: ya incluido automáticamente en el componente.
- `FormCurrencyField`: ya incluido automáticamente en el componente.
- Si se crean inputs numéricos fuera de estos componentes, agregar `onFocus={(e) => e.target.select()}` manualmente.

### Patrón de vista CRUD — Regla obligatoria
Todos los módulos/submodulos con DataGrid deben seguir el patrón de `BodegasView.jsx` como referencia canónica:

#### KPI Strip (parte superior)
- Usar componente `KpiCard` con: icono 20px en contenedor 36x36, `borderLeft: 3px solid`, hover lift, skeleton loading
- Los KPIs van en `<Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>`
- Cada KPI con `flex: 1, minWidth: 110`
- Fade staggered con delay incremental (0, 50, 100, 150...)
- Colores distintivos por KPI usando `color` (texto/borde) y `bgColor` (fondo icono)

#### Command Bar (barra de funciones/filtros)
- Envolver en `<Paper variant="outlined" borderRadius={2}>` con dos filas separadas por `<Divider />`
- **Fila 1**: Búsqueda (260px en desktop, 100% mobile) + conteo de resultados + chip de selección + acciones por selección (ver, inactivar, activar, exportar) + acciones globales (refrescar con spin, exportar todo, crear)
- **Fila 2**: Filtros siempre visibles como `FilterChip` clickeables — NO usar Select/dropdowns colapsables
  - Agrupar por categoría con labels (`Proposito:`, `Tipo:`, `Estado:`) visibles solo en desktop
  - Separadores verticales `<Divider orientation="vertical" flexItem />` entre grupos
  - Scroll horizontal en mobile con scrollbar oculto
  - Botón "Limpiar" aparece solo cuando hay filtros activos
- Usar `TbIcon` (IconButton + Tooltip) para todas las acciones del toolbar
- Iconos de acción: `VisibilityOutlinedIcon`, `BlockIcon`, `CheckCircleOutlineIcon`, `FileDownloadOutlinedIcon`, `SaveAltIcon`, `AddCircleOutlineIcon`, `RefreshIcon`

#### DataGrid (tabla)
- **Columnas con `flex`** proporcional al contenido (NO usar `width` fijo) + `minWidth` como respaldo
- **Todas las columnas** deben tener `align: 'center'` y `headerAlign: 'center'`
- Usar `density="compact"`, `autoHeight`, `checkboxSelection`, `disableRowSelectionOnClick`
- Doble click abre detalle: `onRowDoubleClick`
- El theme ya aplica: texto centrado, word-wrap, header/footer color sidebar (#0F172A)
- Skeleton loading (`TableSkeleton`) mientras carga, mobile cards como fallback

#### Modales (ver memoria `feedback_modal_pattern.md`)
- Create: `Slide direction="up"`, secciones con `SectionHeader`
- Detail/Edit: Tabs + `Fade`, `maxWidth="md"`, `LinearProgress` + skeleton loading, chips en título

#### Exportar CSV
- Incluir todos los campos relevantes del módulo
- Función `handleExport(items)` que genera y descarga el CSV
