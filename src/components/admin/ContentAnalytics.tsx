import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Article,
  Visibility,
  ThumbUp,
  Share,
  Comment,
  TrendingUp,
  TrendingDown,
  AccessTime,
  People,
  Language,
  DeviceHub,
  FilterList,
  FileDownload,
} from '@mui/icons-material';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';

interface ContentMetrics {
  id: string;
  title: string;
  type: 'blog' | 'page' | 'portfolio';
  publishedDate: Date;
  views: number;
  uniqueViews: number;
  likes: number;
  shares: number;
  comments: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversionRate: number;
  socialEngagement: {
    facebook: number;
    twitter: number;
    linkedin: number;
    instagram: number;
  };
  searchTerms: Array<{ term: string; count: number }>;
  referrers: Array<{ source: string; count: number }>;
  demographics: {
    ageGroups: Array<{ range: string; count: number }>;
    locations: Array<{ country: string; count: number }>;
    devices: Array<{ type: string; count: number }>;
  };
  performance: {
    loadTime: number;
    coreWebVitals: {
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
    };
  };
}

interface AnalyticsOverview {
  totalContent: number;
  totalViews: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topPerformingContent: ContentMetrics[];
  growthRate: number;
  periodComparison: {
    views: { current: number; previous: number; change: number };
    engagement: { current: number; previous: number; change: number };
    newContent: { current: number; previous: number; change: number };
  };
}

const MetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: theme.palette.common.white,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const EngagementCard = styled(Card)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const TrendChip = styled(Chip)<{ trend: 'up' | 'down' | 'neutral' }>(({ theme, trend }) => ({
  backgroundColor:
    trend === 'up' ? theme.palette.success.main :
    trend === 'down' ? theme.palette.error.main :
    theme.palette.grey[500],
  color: theme.palette.common.white,
  '& .MuiChip-icon': {
    color: 'inherit',
  },
}));

export const ContentAnalytics: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [contentMetrics, setContentMetrics] = useState<ContentMetrics[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [contentType, setContentType] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, contentType]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [overviewResponse, metricsResponse] = await Promise.all([
        fetch(`/api/analytics/overview?range=${timeRange}&type=${contentType}`),
        fetch(`/api/analytics/content?range=${timeRange}&type=${contentType}`),
      ]);

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setOverview(overviewData.data);
      }

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setContentMetrics(metricsData.data.map((item: any) => ({
          ...item,
          publishedDate: new Date(item.publishedDate),
        })));
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const dataToExport = {
      overview,
      contentMetrics,
      generatedAt: new Date().toISOString(),
      filters: { timeRange, contentType },
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-analytics-${timeRange}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTrendDirection = (change: number): 'up' | 'down' | 'neutral' => {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'neutral';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Chart data
  const viewsOverTimeData = {
    labels: contentMetrics.slice(0, 30).map(c => c.publishedDate.toLocaleDateString()),
    datasets: [
      {
        label: 'Views',
        data: contentMetrics.slice(0, 30).map(c => c.views),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Unique Views',
        data: contentMetrics.slice(0, 30).map(c => c.uniqueViews),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const engagementData = {
    labels: ['Likes', 'Shares', 'Comments'],
    datasets: [
      {
        data: [
          contentMetrics.reduce((sum, c) => sum + c.likes, 0),
          contentMetrics.reduce((sum, c) => sum + c.shares, 0),
          contentMetrics.reduce((sum, c) => sum + c.comments, 0),
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const performanceScatterData = {
    datasets: [
      {
        label: 'Content Performance',
        data: contentMetrics.map(c => ({
          x: c.views,
          y: c.avgTimeOnPage,
          r: Math.sqrt(c.likes + c.shares + c.comments) / 10,
        })),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
      },
    ],
  };

  if (isLoading || !overview) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Content Analytics
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 3 months</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Content Type</InputLabel>
            <Select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              label="Content Type"
            >
              <MenuItem value="all">All Content</MenuItem>
              <MenuItem value="blog">Blog Posts</MenuItem>
              <MenuItem value="page">Pages</MenuItem>
              <MenuItem value="portfolio">Portfolio</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            startIcon={<FileDownload />}
            onClick={exportData}
            variant="outlined"
            size="small"
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Overview Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Article sx={{ mr: 1 }} />
                <Typography variant="h6">Total Content</Typography>
              </Box>
              <Typography variant="h3" component="div">
                {overview.totalContent}
              </Typography>
              <TrendChip
                size="small"
                icon={getTrendDirection(overview.periodComparison.newContent.change) === 'up' ? <TrendingUp /> : <TrendingDown />}
                label={`${overview.periodComparison.newContent.change > 0 ? '+' : ''}${overview.periodComparison.newContent.change}%`}
                trend={getTrendDirection(overview.periodComparison.newContent.change)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Visibility sx={{ mr: 1 }} />
                <Typography variant="h6">Total Views</Typography>
              </Box>
              <Typography variant="h3" component="div">
                {formatNumber(overview.totalViews)}
              </Typography>
              <TrendChip
                size="small"
                icon={getTrendDirection(overview.periodComparison.views.change) === 'up' ? <TrendingUp /> : <TrendingDown />}
                label={`${overview.periodComparison.views.change > 0 ? '+' : ''}${overview.periodComparison.views.change}%`}
                trend={getTrendDirection(overview.periodComparison.views.change)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ThumbUp sx={{ mr: 1 }} />
                <Typography variant="h6">Engagement</Typography>
              </Box>
              <Typography variant="h3" component="div">
                {formatNumber(overview.totalEngagement)}
              </Typography>
              <TrendChip
                size="small"
                icon={getTrendDirection(overview.periodComparison.engagement.change) === 'up' ? <TrendingUp /> : <TrendingDown />}
                label={`${overview.periodComparison.engagement.change > 0 ? '+' : ''}${overview.periodComparison.engagement.change}%`}
                trend={getTrendDirection(overview.periodComparison.engagement.change)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp sx={{ mr: 1 }} />
                <Typography variant="h6">Engagement Rate</Typography>
              </Box>
              <Typography variant="h3" component="div">
                {overview.avgEngagementRate.toFixed(1)}%
              </Typography>
              <TrendChip
                size="small"
                icon={<TrendingUp />}
                label={`${overview.growthRate > 0 ? '+' : ''}${overview.growthRate}%`}
                trend={getTrendDirection(overview.growthRate)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </MetricCard>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Views Over Time
            </Typography>
            <Line
              data={viewsOverTimeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Engagement Distribution
            </Typography>
            <Doughnut
              data={engagementData}
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

      {/* Performance Analysis */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Content Performance Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Bubble size represents engagement level
            </Typography>
            <Scatter
              data={performanceScatterData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    display: true,
                    title: {
                      display: true,
                      text: 'Views',
                    },
                  },
                  y: {
                    display: true,
                    title: {
                      display: true,
                      text: 'Time on Page (seconds)',
                    },
                  },
                },
              }}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Top Performing Content
            </Typography>
            
            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              {overview.topPerformingContent.map((content, index) => (
                <EngagementCard key={content.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap flex={1}>
                        #{index + 1} {content.title}
                      </Typography>
                      <Chip size="small" label={content.type} color="primary" />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <Visibility fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatNumber(content.views)} views
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <AccessTime fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatTime(content.avgTimeOnPage)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <ThumbUp fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {content.likes} likes
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <Share fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {content.shares} shares
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </EngagementCard>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed Content Table */}
      <Paper>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Detailed Content Analytics
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Views</TableCell>
                  <TableCell align="right">Unique Views</TableCell>
                  <TableCell align="right">Engagement</TableCell>
                  <TableCell align="right">Time on Page</TableCell>
                  <TableCell align="right">Bounce Rate</TableCell>
                  <TableCell align="right">Published</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contentMetrics.slice(0, 20).map((content) => (
                  <TableRow key={content.id} hover>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {content.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={content.type} />
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(content.views)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(content.uniqueViews)}
                    </TableCell>
                    <TableCell align="right">
                      {content.likes + content.shares + content.comments}
                    </TableCell>
                    <TableCell align="right">
                      {formatTime(content.avgTimeOnPage)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={`${content.bounceRate}%`}
                        color={content.bounceRate > 70 ? 'error' : content.bounceRate > 40 ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {content.publishedDate.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default ContentAnalytics;