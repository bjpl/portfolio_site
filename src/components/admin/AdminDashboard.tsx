import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, IconButton, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  People,
  Article,
  Analytics,
  Refresh,
  Notifications,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { RealTimeAnalytics } from './RealTimeAnalytics';
import { ContentCalendar } from './ContentCalendar';
import { UserManagement } from './UserManagement';
import { WorkflowVisualization } from './WorkflowVisualization';
import { PerformanceMonitoring } from './PerformanceMonitoring';
import { ContentAnalytics } from './ContentAnalytics';
import { NotificationCenter } from './NotificationCenter';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface DashboardStats {
  totalUsers: number;
  totalContent: number;
  totalViews: number;
  conversionRate: number;
  systemHealth: 'good' | 'warning' | 'error';
  lastUpdate: Date;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'content' | 'system' | 'analytics';
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'success';
}

const StyledDashboard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  '& .MuiPaper-root': {
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      boxShadow: theme.shadows[8],
      transform: 'translateY(-2px)',
    },
  },
}));

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: theme.palette.common.white,
  '& .MuiCardContent-root': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: theme.spacing(3),
  },
}));

const MetricValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}));

const ActivityFeed = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  maxHeight: 400,
  overflow: 'auto',
  '& .activity-item': {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
}));

const TabPanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  '& > *': {
    display: 'none',
  },
  '& > .active': {
    display: 'block',
  },
}));

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalContent: 0,
    totalViews: 0,
    conversionRate: 0,
    systemHealth: 'good',
    lastUpdate: new Date(),
  });
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const websocket = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'stats_update':
          setStats(prev => ({ ...prev, ...data.payload, lastUpdate: new Date() }));
          break;
        case 'activity':
          setActivities(prev => [data.payload, ...prev.slice(0, 19)]);
          break;
        case 'system_health':
          setStats(prev => ({ ...prev, systemHealth: data.payload.status }));
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (websocket.readyState === WebSocket.CLOSED) {
          window.location.reload();
        }
      }, 5000);
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // Load initial dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/activities'),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(prev => ({ ...prev, ...statsData, lastUpdate: new Date() }));
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.slice(0, 20));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Add error activity
      setActivities(prev => [{
        id: Date.now().toString(),
        type: 'system',
        message: 'Failed to load dashboard data',
        timestamp: new Date(),
        severity: 'error',
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const refreshData = () => {
    loadDashboardData();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'refresh_stats' }));
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <People />;
      case 'content': return <Article />;
      case 'analytics': return <Analytics />;
      case 'system': return <Warning />;
      default: return <CheckCircle />;
    }
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Traffic Overview',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const trafficData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Page Views',
        data: [1200, 1900, 3000, 5000, 2000, 3000],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Unique Visitors',
        data: [800, 1200, 1800, 2400, 1600, 2000],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const contentTypeData = {
    labels: ['Blog Posts', 'Portfolio', 'Pages', 'Media'],
    datasets: [
      {
        data: [45, 30, 15, 10],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ],
      },
    ],
  };

  return (
    <StyledDashboard>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {stats.lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={refreshData} color="primary">
            <Refresh />
          </IconButton>
          <NotificationCenter />
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box mb={3}>
        <Box display="flex" gap={2}>
          {[
            { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
            { id: 'analytics', label: 'Analytics', icon: <Analytics /> },
            { id: 'content', label: 'Content Calendar', icon: <Article /> },
            { id: 'users', label: 'Users', icon: <People /> },
            { id: 'workflow', label: 'Workflow', icon: <TrendingUp /> },
            { id: 'performance', label: 'Performance', icon: <TrendingUp /> },
          ].map((tab) => (
            <Chip
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              onClick={() => setActiveTab(tab.id)}
              color={activeTab === tab.id ? 'primary' : 'default'}
              variant={activeTab === tab.id ? 'filled' : 'outlined'}
              clickable
            />
          ))}
        </Box>
      </Box>

      <TabPanel>
        {/* Overview Tab */}
        <Box className={activeTab === 'overview' ? 'active' : ''}>
          {/* Stats Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard>
                <CardContent>
                  <People fontSize="large" />
                  <MetricValue variant="h4">
                    {stats.totalUsers.toLocaleString()}
                  </MetricValue>
                  <Typography variant="body2">Total Users</Typography>
                </CardContent>
              </StatCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard>
                <CardContent>
                  <Article fontSize="large" />
                  <MetricValue variant="h4">
                    {stats.totalContent.toLocaleString()}
                  </MetricValue>
                  <Typography variant="body2">Content Items</Typography>
                </CardContent>
              </StatCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard>
                <CardContent>
                  <TrendingUp fontSize="large" />
                  <MetricValue variant="h4">
                    {stats.totalViews.toLocaleString()}
                  </MetricValue>
                  <Typography variant="body2">Total Views</Typography>
                </CardContent>
              </StatCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard>
                <CardContent>
                  <Analytics fontSize="large" />
                  <MetricValue variant="h4">
                    {stats.conversionRate.toFixed(1)}%
                  </MetricValue>
                  <Typography variant="body2">Conversion Rate</Typography>
                </CardContent>
              </StatCard>
            </Grid>
          </Grid>

          {/* Charts and Activity */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Traffic Overview
                </Typography>
                <Line data={trafficData} options={chartOptions} />
              </Paper>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Content Distribution
                </Typography>
                <Doughnut 
                  data={contentTypeData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }} 
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Activity Feed */}
          <Grid container spacing={3} mt={1}>
            <Grid item xs={12}>
              <ActivityFeed>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                {activities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <Box mr={2} color={getActivityColor(activity.severity)}>
                      {getActivityIcon(activity.type)}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="body2">
                        {activity.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.timestamp.toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip 
                      size="small" 
                      label={activity.severity} 
                      color={getActivityColor(activity.severity) as any}
                    />
                  </div>
                ))}
              </ActivityFeed>
            </Grid>
          </Grid>
        </Box>

        {/* Analytics Tab */}
        <Box className={activeTab === 'analytics' ? 'active' : ''}>
          <RealTimeAnalytics />
          <ContentAnalytics />
        </Box>

        {/* Content Calendar Tab */}
        <Box className={activeTab === 'content' ? 'active' : ''}>
          <ContentCalendar />
        </Box>

        {/* Users Tab */}
        <Box className={activeTab === 'users' ? 'active' : ''}>
          <UserManagement />
        </Box>

        {/* Workflow Tab */}
        <Box className={activeTab === 'workflow' ? 'active' : ''}>
          <WorkflowVisualization />
        </Box>

        {/* Performance Tab */}
        <Box className={activeTab === 'performance' ? 'active' : ''}>
          <PerformanceMonitoring />
        </Box>
      </TabPanel>
    </StyledDashboard>
  );
};

export default AdminDashboard;