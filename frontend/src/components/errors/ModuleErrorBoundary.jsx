import { Component } from 'react';
import { Box, Typography, Button, Alert, Collapse, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';

export default class ModuleErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[Module: ${this.props.moduleName}] Error:`, error, errorInfo);
    // Future: report to error tracking service
    // errorService.capture(error, { module: this.props.moduleName, ...errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleGoHome = () => {
    window.location.href = '/platform/dashboard';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ textAlign: 'center', py: 8, px: 2, maxWidth: 500, mx: 'auto' }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Error en el módulo de {this.props.moduleName || 'este módulo'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Este módulo ha encontrado un error. El resto de la aplicación sigue funcionando
            correctamente.
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleRetry}>
              Reintentar
            </Button>
            <Button variant="outlined" startIcon={<HomeIcon />} onClick={this.handleGoHome}>
              Ir al Dashboard
            </Button>
          </Stack>

          <Button size="small" color="inherit" onClick={this.toggleDetails} sx={{ mb: 1 }}>
            {this.state.showDetails ? 'Ocultar detalles' : 'Ver detalles del error'}
          </Button>
          <Collapse in={this.state.showDetails}>
            <Alert severity="error" sx={{ textAlign: 'left', mt: 1 }}>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error?.message || 'Error desconocido'}
              </Typography>
            </Alert>
          </Collapse>
        </Box>
      );
    }
    return this.props.children;
  }
}
