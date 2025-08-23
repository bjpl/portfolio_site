import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Warning,
  Error,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Refresh,
  Timeline,
  Computer,
  Cloud,
  Security,
} from '@mui/icons-material';
import { Line, Gauge } from 'react-chartjs-2';

interface PerformanceMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
    readSpeed: number;
    writeSpeed: number;
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
    packetLoss: number;
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
    lockWaits: number;
  };
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  category: 'performance' | 'security' | 'system' | 'application';
}

interface PerformanceHistory {
  timestamp: Date;
  metrics: Partial<PerformanceMetrics>;
}

const MetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const AlertCard = styled(Card)<{ alertType: string }>(({ theme, alertType }) => ({
  borderLeft: `4px solid ${
    alertType === 'error' ? theme.palette.error.main :
    alertType === 'warning' ? theme.palette.warning.main :
    theme.palette.info.main
  }`,
  marginBottom: theme.spacing(1),
}));

const GaugeContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  padding: theme.spacing(2),
}));

export const PerformanceMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cpu: { usage: 0, cores: 4 },
    memory: { used: 0, total: 16, usage: 0 },
    disk: { used: 0, total: 512, usage: 0, readSpeed: 0, writeSpeed: 0 },
    network: { inbound: 0, outbound: 0, latency: 0, packetLoss: 0 },
    application: { responseTime: 0, throughput: 0, errorRate: 0, activeConnections: 0 },
    database: { connectionPool: 0, queryTime: 0, slowQueries: 0, lockWaits: 0 },
  });
  
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [history, setHistory] = useState<PerformanceHistory[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [isRealTime, setIsRealTime] = useState(true);

  useEffect(() => {
    loadPerformanceData();
    
    if (isRealTime) {
      const interval = setInterval(loadPerformanceData, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [timeRange, isRealTime]);

  const loadPerformanceData = async () => {
    try {
      const [metricsResponse, alertsResponse, historyResponse] = await Promise.all([
        fetch('/api/admin/performance/metrics'),
        fetch('/api/admin/performance/alerts'),
        fetch(`/api/admin/performance/history?range=${timeRange}`),
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
        })));
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.data.map((point: any) => ({
          ...point,
          timestamp: new Date(point.timestamp),
        })));
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNetworkSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const chartData = {
    labels: history.map(h => h.timestamp.toLocaleTimeString()),
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: history.map(h => h.metrics.cpu?.usage || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'Memory Usage (%)',
        data: history.map(h => h.metrics.memory?.usage || 0),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'Response Time (ms)',
        data: history.map(h => h.metrics.application?.responseTime || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Percentage (%)',
        },
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Response Time (ms)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Performance Monitoring
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="5m">Last 5 minutes</MenuItem>
              <MenuItem value="15m">Last 15 minutes</MenuItem>
              <MenuItem value="1h">Last hour</MenuItem>
              <MenuItem value="6h">Last 6 hours</MenuItem>
              <MenuItem value="24h">Last 24 hours</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant={isRealTime ? 'contained' : 'outlined'}
            onClick={() => setIsRealTime(!isRealTime)}
            size="small"
          >
            {isRealTime ? 'Real-time On' : 'Real-time Off'}
          </Button>
          
          <IconButton onClick={loadPerformanceData}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* System Metrics */}
          <Grid container spacing={3} mb={3}>
            {/* CPU Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Computer color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">CPU</Typography>
                  </Box>
                  <Typography variant="h4" color={getStatusColor(metrics.cpu.usage, { warning: 70, critical: 90 })}>
                    {metrics.cpu.usage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.cpu.usage} 
                    color={getStatusColor(metrics.cpu.usage, { warning: 70, critical: 90 }) as any}
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {metrics.cpu.cores} cores
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>

            {/* Memory Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Memory color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Memory</Typography>
                  </Box>
                  <Typography variant="h4" color={getStatusColor(metrics.memory.usage, { warning: 80, critical: 95 })}>
                    {metrics.memory.usage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.memory.usage} 
                    color={getStatusColor(metrics.memory.usage, { warning: 80, critical: 95 }) as any}
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {formatBytes(metrics.memory.used * 1024 * 1024 * 1024)} / {formatBytes(metrics.memory.total * 1024 * 1024 * 1024)}
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>

            {/* Disk Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Storage color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Disk</Typography>
                  </Box>
                  <Typography variant="h4" color={getStatusColor(metrics.disk.usage, { warning: 80, critical: 95 })}>
                    {metrics.disk.usage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.disk.usage} 
                    color={getStatusColor(metrics.disk.usage, { warning: 80, critical: 95 }) as any}
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {formatBytes(metrics.disk.used * 1024 * 1024 * 1024)} / {formatBytes(metrics.disk.total * 1024 * 1024 * 1024)}
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>

            {/* Network */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <NetworkCheck color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Network</Typography>
                  </Box>
                  <Typography variant="h4" color={getStatusColor(metrics.network.latency, { warning: 100, critical: 500 })}>
                    {metrics.network.latency}ms
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      ↓ {formatNetworkSpeed(metrics.network.inbound)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ↑ {formatNetworkSpeed(metrics.network.outbound)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Packet Loss: {metrics.network.packetLoss}%
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>
          </Grid>

          {/* Application Metrics */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Speed color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Response Time</Typography>
                  </Box>
                  <Typography variant="h4" color={getStatusColor(metrics.application.responseTime, { warning: 500, critical: 1000 })}>
                    {metrics.application.responseTime}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Average response time
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrendingUp color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Throughput</Typography>
                  </Box>
                  <Typography variant="h4" color="success">
                    {metrics.application.throughput}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Requests per second
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Error color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Error Rate</Typography>
                  </Box>
                  <Typography variant="h4" color={getStatusColor(metrics.application.errorRate, { warning: 1, critical: 5 })}>
                    {metrics.application.errorRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Error percentage
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Cloud color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Connections</Typography>
                  </Box>
                  <Typography variant="h4" color="info">
                    {metrics.application.activeConnections}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Active connections
                  </Typography>
                </CardContent>
              </MetricCard>
            </Grid>
          </Grid>

          {/* Performance Chart */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Trends
                </Typography>
                <Line data={chartData} options={chartOptions} />
              </Paper>
            </Grid>

            {/* System Alerts */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: 400, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  System Alerts
                </Typography>
                
                {alerts.length === 0 ? (
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="300px">
                    <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      All systems operational
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {alerts.slice(0, 10).map((alert) => (
                      <AlertCard key={alert.id} alertType={alert.type}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Box display="flex" alignItems="flex-start">
                            <Box mr={2} mt={0.5}>
                              {alert.type === 'error' ? (
                                <Error color="error" fontSize="small" />
                              ) : alert.type === 'warning' ? (
                                <Warning color="warning" fontSize="small" />
                              ) : (
                                <CheckCircle color="info" fontSize="small" />
                              )}
                            </Box>
                            <Box flex={1}>
                              <Typography variant="subtitle2" gutterBottom>
                                {alert.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {alert.message}
                              </Typography>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                <Typography variant="caption" color="text.secondary">
                                  {alert.timestamp.toLocaleString()}
                                </Typography>
                                <Chip 
                                  size="small" 
                                  label={alert.category} 
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </AlertCard>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Database Metrics */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Database Performance
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {metrics.database.connectionPool}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Connections
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color={getStatusColor(metrics.database.queryTime, { warning: 100, critical: 500 })}>
                        {metrics.database.queryTime}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Query Time
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color={metrics.database.slowQueries > 0 ? 'warning' : 'success'}>
                        {metrics.database.slowQueries}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Slow Queries
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color={metrics.database.lockWaits > 0 ? 'error' : 'success'}>
                        {metrics.database.lockWaits}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Lock Waits
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default PerformanceMonitoring;