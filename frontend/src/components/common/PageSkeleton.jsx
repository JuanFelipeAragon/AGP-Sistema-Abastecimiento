/**
 * PageSkeleton — Standardized loading state for pages.
 * Provides consistent skeleton patterns across all modules.
 */
import { Box, Grid, Skeleton } from '@mui/material';

export default function PageSkeleton({ variant = 'dashboard' }) {
  if (variant === 'table') {
    return (
      <Box>
        <Skeleton variant="text" width={250} height={36} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={480} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (variant === 'form') {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Skeleton variant="text" width={250} height={36} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={20} sx={{ mb: 3 }} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 3 }} />
        ))}
      </Box>
    );
  }

  // Default: dashboard variant
  return (
    <Box>
      <Skeleton variant="text" width={250} height={36} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={350} height={20} sx={{ mb: 3 }} />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Box>
  );
}
