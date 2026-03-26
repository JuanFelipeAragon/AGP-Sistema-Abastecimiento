import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({
  icon = <InboxIcon sx={{ fontSize: 64, color: 'text.disabled' }} />,
  title = 'No hay datos',
  description = '',
  actionLabel,
  onAction,
}) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
      {icon}
      <Typography variant="h6" sx={{ mt: 2 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" sx={{ mt: 3 }} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
