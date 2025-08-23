import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  TrendingUp,
  TrendingDown,
  Visibility,
  Speed,
  Public,
  DeviceHub,
  LocationOn,
  Schedule,
} from '@mui/icons-material';
import { Line, Bar, Radar } from 'react-chartjs-2';

interface AnalyticsData {
  realTimeUsers: number;
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number; change: number }>;
  trafficSources: Array<{ source: string; users: number; percentage: number }>;
  deviceTypes: Array<{ type: string; count: number; percentage: number }>;
  geographicData: Array<{ country: string; users: number; sessions: number }>;
  realTimeEvents: Array<{ timestamp: Date; event: string; page: string; user: string }>;
}

const RealTimeCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: theme.palette.common.white,
  '& .MuiCardContent-root': {
    position: 'relative',
    overflow: 'hidden',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100px',
    height: '100px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    transform: 'translate(30px, -30px)',
  },
}));

const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[10],
  },
}));

const PulsingDot = styled(Box)(({ theme }) => ({
  width: 12,
  height: 12,
  backgroundColor: '#4caf50',
  borderRadius: '50%',
  display: 'inline-block',
  marginRight: theme.spacing(1),
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(0.95)',
      boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)',
    },
    '70%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
    },
    '100%': {
      transform: 'scale(0.95)',
      boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
    },
  },
}));

const EventStream = styled(List)(({ theme }) => ({
  maxHeight: 300,
  overflow: 'auto',
  '& .MuiListItem-root': {
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    marginBottom: theme.spacing(1),
    background: theme.palette.background.paper,
    borderRadius: theme.spacing(0.5),
  },
}));

export const RealTimeAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    realTimeUsers: 0,
    pageViews: 0,
    sessionDuration: 0,
    bounceRate: 0,
    topPages: [],
    trafficSources: [],
    deviceTypes: [],
    geographicData: [],
    realTimeEvents: [],
  });
  
  const [timeRange, setTimeRange] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket for real-time data
    const connectWebSocket = () => {
      ws.current = new WebSocket(`${process.env.REACT_APP_WS_URL}/analytics`);
      
      ws.current.onopen = () => {
        console.log('Analytics WebSocket connected');
        ws.current?.send(JSON.stringify({ type: 'subscribe', channel: 'analytics' }));
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'realtime_update':
            setData(prev => ({
              ...prev,
              ...message.data,
            }));
            break;
          case 'page_view':
            setData(prev => ({
              ...prev,
              pageViews: prev.pageViews + 1,
              realTimeEvents: [
                {
                  timestamp: new Date(),
                  event: 'Page View',
                  page: message.data.page,
                  user: message.data.user || 'Anonymous',
                },
                ...prev.realTimeEvents.slice(0, 49),
              ],
            }));
            break;
          case 'user_join':
            setData(prev => ({
              ...prev,
              realTimeUsers: prev.realTimeUsers + 1,
              realTimeEvents: [
                {
                  timestamp: new Date(),
                  event: 'User Joined',
                  page: message.data.page,
                  user: message.data.user || 'Anonymous',
                },
                ...prev.realTimeEvents.slice(0, 49),
              ],
            }));
            break;
          case 'user_leave':
            setData(prev => ({
              ...prev,
              realTimeUsers: Math.max(0, prev.realTimeUsers - 1),
            }));
            break;
        }
      };

      ws.current.onclose = () => {
        console.log('Analytics WebSocket disconnected, attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('Analytics WebSocket error:', error);
      };
    };

    connectWebSocket();

    // Load initial data
    loadAnalyticsData();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/realtime?range=${timeRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  const getChangeIcon = (change: number) => {
    return change > 0 ? <TrendingUp /> : <TrendingDown />;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const realTimeChartData = {
    labels: Array.from({ length: 30 }, (_, i) => 
      new Date(Date.now() - (29 - i) * 60000).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    ),
    datasets: [
      {
        label: 'Active Users',
        data: Array.from({ length: 30 }, () => 
          Math.floor(Math.random() * data.realTimeUsers + data.realTimeUsers * 0.8)
        ),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const deviceChartData = {
    labels: data.deviceTypes.map(d => d.type),
    datasets: [
      {
        label: 'Users by Device',
        data: data.deviceTypes.map(d => d.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          <PulsingDot />
          Real-Time Analytics
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="15m">Last 15 minutes</MenuItem>
            <MenuItem value="1h">Last hour</MenuItem>
            <MenuItem value="6h">Last 6 hours</MenuItem>
            <MenuItem value="1d">Last 24 hours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <RealTimeCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Visibility sx={{ mr: 1 }} />
                    <Typography variant="h6">Active Users</Typography>
                  </Box>
                  <Typography variant="h3" component="div">
                    {data.realTimeUsers}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Right now
                  </Typography>
                </CardContent>
              </RealTimeCard>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <MetricCard>
                <Public color="primary" fontSize="large" />
                <Typography variant="h4" color="primary" gutterBottom>
                  {data.pageViews.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Page Views
                </Typography>
              </MetricCard>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <MetricCard>
                <Schedule color="secondary" fontSize="large" />
                <Typography variant="h4" color="secondary" gutterBottom>
                  {formatDuration(data.sessionDuration)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg. Session Duration
                </Typography>
              </MetricCard>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <MetricCard>
                <Speed color="error" fontSize="large" />
                <Typography variant="h4" color="error" gutterBottom>
                  {data.bounceRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bounce Rate
                </Typography>
              </MetricCard>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Real-Time Users (Last 30 minutes)
                </Typography>
                <Line
                  data={realTimeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Device Types
                </Typography>
                <Bar
                  data={deviceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Detailed Analytics */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Top Pages
                </Typography>
                {data.topPages.map((page, index) => (
                  <Box
                    key={page.path}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={1}
                    borderBottom={index < data.topPages.length - 1 ? 1 : 0}
                    borderColor="divider"
                  >
                    <Box flex={1}>
                      <Typography variant="body2" noWrap>
                        {page.path}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {page.views} views
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      icon={getChangeIcon(page.change)}
                      label={`${page.change > 0 ? '+' : ''}${page.change}%`}
                      color={getChangeColor(page.change) as any}
                    />
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Traffic Sources
                </Typography>
                {data.trafficSources.map((source, index) => (
                  <Box key={source.source} mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{source.source}</Typography>
                      <Typography variant="caption">
                        {source.users} users ({source.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={source.percentage}
                      color={index % 2 === 0 ? 'primary' : 'secondary'}
                    />
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Live Activity Stream
                </Typography>
                <EventStream>
                  {data.realTimeEvents.map((event, index) => (
                    <ListItem key={index} dense>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {event.event === 'Page View' ? <Visibility fontSize="small" /> : <DeviceHub fontSize="small" />}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {event.user} {event.event.toLowerCase()}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {event.page}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              {event.timestamp.toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </EventStream>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default RealTimeAnalytics;