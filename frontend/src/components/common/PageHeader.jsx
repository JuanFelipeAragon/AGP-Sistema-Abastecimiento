/**
 * PageHeader — Page title + subtitle + action buttons.
 * Breadcrumbs are now handled by TopBar automatically.
 */
import { Box, Typography, Button } from '@mui/material';

export default function PageHeader({
  title,
  subtitle,
  actions = [],
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            typeof subtitle === 'string'
              ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
              : subtitle
          )}
        </Box>
        {actions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {actions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                size="small"
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
