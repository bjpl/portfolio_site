import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Add,
  Edit,
  Delete,
  CalendarToday,
  Schedule,
  FilterList,
  ViewWeek,
  ViewDay,
  ViewModule,
  MoreVert,
  Publish,
  Draft,
  Preview,
} from '@mui/icons-material';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface ContentItem {
  id: string;
  title: string;
  type: 'blog' | 'page' | 'portfolio' | 'social';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  author: string;
  scheduledDate: Date;
  publishedDate?: Date;
  tags: string[];
  category: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedReadTime?: number;
  wordCount?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ContentItem;
}

const StyledCalendar = styled(Box)(({ theme }) => ({
  '& .rbc-calendar': {
    height: 600,
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.spacing(1),
    padding: theme.spacing(2),
  },
  '& .rbc-header': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(1),
    fontWeight: 600,
  },
  '& .rbc-event': {
    backgroundColor: theme.palette.secondary.main,
    border: 'none',
    borderRadius: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    '&.draft': {
      backgroundColor: theme.palette.warning.main,
    },
    '&.scheduled': {
      backgroundColor: theme.palette.info.main,
    },
    '&.published': {
      backgroundColor: theme.palette.success.main,
    },
  },
  '& .rbc-today': {
    backgroundColor: `${theme.palette.primary.main}10`,
  },
}));

const ContentCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  '&.high-priority': {
    borderLeft: `4px solid ${theme.palette.error.main}`,
  },
  '&.medium-priority': {
    borderLeft: `4px solid ${theme.palette.warning.main}`,
  },
  '&.low-priority': {
    borderLeft: `4px solid ${theme.palette.success.main}`,
  },
}));

const FilterChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  '&.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

export const ContentCalendar: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    author: 'all',
  });
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    title: '',
    type: 'blog',
    status: 'draft',
    author: '',
    scheduledDate: new Date(),
    tags: [],
    category: '',
    priority: 'medium',
  });

  // Load content data
  useEffect(() => {
    loadContentData();
  }, []);

  // Update events when content changes
  useEffect(() => {
    const calendarEvents: CalendarEvent[] = content
      .filter(item => item.scheduledDate)
      .map(item => ({
        id: item.id,
        title: item.title,
        start: item.scheduledDate,
        end: moment(item.scheduledDate).add(1, 'hour').toDate(),
        resource: item,
      }));
    
    setEvents(calendarEvents);
  }, [content]);

  const loadContentData = async () => {
    try {
      const response = await fetch('/api/content/calendar');
      const result = await response.json();
      
      if (result.success) {
        setContent(result.data.map((item: any) => ({
          ...item,
          scheduledDate: new Date(item.scheduledDate),
          publishedDate: item.publishedDate ? new Date(item.publishedDate) : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to load content data:', error);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setNewContent(event.resource);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setNewContent({
      ...newContent,
      scheduledDate: start,
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleSaveContent = async () => {
    try {
      const endpoint = isEditing ? `/api/content/${newContent.id}` : '/api/content';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContent),
      });
      
      if (response.ok) {
        await loadContentData();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save content:', error);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
      const response = await fetch(`/api/content/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadContentData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
    }
  };

  const handlePublishContent = async (id: string) => {
    try {
      const response = await fetch(`/api/content/${id}/publish`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadContentData();
      }
    } catch (error) {
      console.error('Failed to publish content:', error);
    }
  };

  const resetForm = () => {
    setNewContent({
      title: '',
      type: 'blog',
      status: 'draft',
      author: '',
      scheduledDate: new Date(),
      tags: [],
      category: '',
      priority: 'medium',
    });
    setSelectedEvent(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'info';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const filteredContent = content.filter(item => {
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.author !== 'all' && item.author !== filters.author) return false;
    return true;
  });

  const eventStyleGetter = (event: CalendarEvent) => {
    const item = event.resource;
    let backgroundColor = '#3174ad';
    
    switch (item.status) {
      case 'draft':
        backgroundColor = '#ff9800';
        break;
      case 'scheduled':
        backgroundColor = '#2196f3';
        break;
      case 'published':
        backgroundColor = '#4caf50';
        break;
      case 'archived':
        backgroundColor = '#9e9e9e';
        break;
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const upcomingContent = content
    .filter(item => 
      item.scheduledDate > new Date() && 
      (item.status === 'scheduled' || item.status === 'draft')
    )
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
    .slice(0, 10);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Content Calendar
        </Typography>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            New Content
          </Button>
          
          <IconButton onClick={() => setShowSidePanel(!showSidePanel)}>
            <FilterList />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Box mb={3}>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {['all', 'blog', 'page', 'portfolio', 'social'].map(type => (
            <FilterChip
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              onClick={() => setFilters({ ...filters, type })}
              className={filters.type === type ? 'active' : ''}
            />
          ))}
          
          {['all', 'draft', 'scheduled', 'published', 'archived'].map(status => (
            <FilterChip
              key={status}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              onClick={() => setFilters({ ...filters, status })}
              className={filters.status === status ? 'active' : ''}
            />
          ))}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid item xs={12} lg={showSidePanel ? 8 : 12}>
          <Paper>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" gap={1}>
                  <Button
                    startIcon={<ViewModule />}
                    variant={view === Views.MONTH ? 'contained' : 'outlined'}
                    onClick={() => setView(Views.MONTH)}
                    size="small"
                  >
                    Month
                  </Button>
                  <Button
                    startIcon={<ViewWeek />}
                    variant={view === Views.WEEK ? 'contained' : 'outlined'}
                    onClick={() => setView(Views.WEEK)}
                    size="small"
                  >
                    Week
                  </Button>
                  <Button
                    startIcon={<ViewDay />}
                    variant={view === Views.DAY ? 'contained' : 'outlined'}
                    onClick={() => setView(Views.DAY)}
                    size="small"
                  >
                    Day
                  </Button>
                </Box>
                
                <Typography variant="h6">
                  {moment(date).format('MMMM YYYY')}
                </Typography>
              </Box>
              
              <StyledCalendar>
                <Calendar
                  localizer={localizer}
                  events={events.filter(event => {
                    const item = event.resource;
                    if (filters.type !== 'all' && item.type !== filters.type) return false;
                    if (filters.status !== 'all' && item.status !== filters.status) return false;
                    return true;
                  })}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  onView={setView}
                  date={date}
                  onNavigate={setDate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                />
              </StyledCalendar>
            </Box>
          </Paper>
        </Grid>
        
        {/* Side Panel */}
        {showSidePanel && (
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Upcoming Content
              </Typography>
              
              {upcomingContent.map(item => (
                <ContentCard 
                  key={item.id}
                  className={`${item.priority}-priority`}
                  onClick={() => handleSelectEvent({
                    id: item.id,
                    title: item.title,
                    start: item.scheduledDate,
                    end: moment(item.scheduledDate).add(1, 'hour').toDate(),
                    resource: item,
                  })}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {item.title}
                      </Typography>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnchorEl(e.currentTarget);
                          setSelectedEvent({
                            id: item.id,
                            title: item.title,
                            start: item.scheduledDate,
                            end: moment(item.scheduledDate).add(1, 'hour').toDate(),
                            resource: item,
                          });
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                    
                    <Box display="flex" gap={1} mb={1}>
                      <Chip 
                        size="small" 
                        label={item.type} 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        size="small" 
                        label={item.status} 
                        color={getStatusColor(item.status) as any}
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary">
                      <Schedule fontSize="inherit" /> {moment(item.scheduledDate).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" mt={1}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem', mr: 1 }}>
                        {item.author.charAt(0)}
                      </Avatar>
                      <Typography variant="caption">{item.author}</Typography>
                    </Box>
                  </CardContent>
                </ContentCard>
              ))}
            </Paper>
            
            {/* Quick Stats */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Content: {filteredContent.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Published: {filteredContent.filter(c => c.status === 'published').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scheduled: {filteredContent.filter(c => c.status === 'scheduled').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Drafts: {filteredContent.filter(c => c.status === 'draft').length}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Content Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? 'Edit Content' : 'Create New Content'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newContent.title || ''}
                onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newContent.type || 'blog'}
                  onChange={(e) => setNewContent({ ...newContent, type: e.target.value as any })}
                >
                  <MenuItem value="blog">Blog Post</MenuItem>
                  <MenuItem value="page">Page</MenuItem>
                  <MenuItem value="portfolio">Portfolio</MenuItem>
                  <MenuItem value="social">Social Media</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newContent.status || 'draft'}
                  onChange={(e) => setNewContent({ ...newContent, status: e.target.value as any })}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Author"
                value={newContent.author || ''}
                onChange={(e) => setNewContent({ ...newContent, author: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                value={newContent.category || ''}
                onChange={(e) => setNewContent({ ...newContent, category: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Scheduled Date"
                value={newContent.scheduledDate ? moment(newContent.scheduledDate).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => setNewContent({ ...newContent, scheduledDate: new Date(e.target.value) })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newContent.priority || 'medium'}
                  onChange={(e) => setNewContent({ ...newContent, priority: e.target.value as any })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newContent.description || ''}
                onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          {isEditing && (
            <Button 
              color="error" 
              onClick={() => handleDeleteContent(newContent.id!)}
            >
              Delete
            </Button>
          )}
          <Button variant="contained" onClick={handleSaveContent}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedEvent) {
            setNewContent(selectedEvent.resource);
            setIsEditing(true);
            setIsDialogOpen(true);
          }
          setAnchorEl(null);
        }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedEvent) {
            handlePublishContent(selectedEvent.resource.id);
          }
          setAnchorEl(null);
        }}>
          <ListItemIcon><Publish fontSize="small" /></ListItemIcon>
          <ListItemText>Publish</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedEvent) {
            handleDeleteContent(selectedEvent.resource.id);
          }
          setAnchorEl(null);
        }}>
          <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ContentCalendar;