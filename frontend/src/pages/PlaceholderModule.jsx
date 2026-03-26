import { Box, Typography, Chip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import PageHeader from '../components/common/PageHeader';

export default function PlaceholderModule({ title = 'Módulo', subtitle }) {
  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle || 'Este módulo está siendo desarrollado'}
      />
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <ConstructionIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          En Construcción
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          Este módulo estará disponible próximamente. Estamos trabajando para traerte la mejor experiencia.
        </Typography>
        <Chip label="Fase 2" color="info" />
      </Box>
    </Box>
  );
}
