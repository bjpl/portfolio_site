import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
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
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  PersonAdd,
  Block,
  CheckCircle,
  Warning,
  Email,
  Phone,
  CalendarToday,
  Security,
  Analytics,
  Badge,
} from '@mui/icons-material';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'author' | 'user';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  permissions: string[];
  profile: {
    phone?: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  stats: {
    contentCreated: number;
    loginCount: number;
    lastActive: Date;
  };
}

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress: string;
}

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const RoleChip = styled(Chip)<{ role: string }>(({ theme, role }) => ({
  backgroundColor: 
    role === 'admin' ? theme.palette.error.main :
    role === 'editor' ? theme.palette.warning.main :
    role === 'author' ? theme.palette.info.main :
    theme.palette.success.main,
  color: theme.palette.common.white,
  fontWeight: 600,
}));

const StatusChip = styled(Chip)<{ status: string }>(({ theme, status }) => ({
  backgroundColor:
    status === 'active' ? theme.palette.success.main :
    status === 'suspended' ? theme.palette.error.main :
    status === 'pending' ? theme.palette.warning.main :
    theme.palette.grey[500],
  color: theme.palette.common.white,
}));

const StatsCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: theme.palette.common.white,
}));

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    status: 'active',
    permissions: [],
    profile: {},
  });

  useEffect(() => {
    loadUsers();
    loadActivities();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
          stats: {
            ...user.stats,
            lastActive: new Date(user.stats.lastActive),
          },
        })));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch('/api/admin/user-activities');
      const result = await response.json();
      
      if (result.success) {
        setActivities(result.data.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        })));
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      if (response.ok) {
        await loadUsers();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      if (response.ok) {
        await loadUsers();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to reactivate user:', error);
    }
  };

  const resetForm = () => {
    setNewUser({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      status: 'active',
      permissions: [],
      profile: {},
    });
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    pending: users.filter(u => u.status === 'pending').length,
    admins: users.filter(u => u.role === 'admin').length,
    editors: users.filter(u => u.role === 'editor').length,
    authors: users.filter(u => u.role === 'author').length,
    regularUsers: users.filter(u => u.role === 'user').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          User Management
        </Typography>
        
        <Button
          startIcon={<PersonAdd />}
          variant="contained"
          onClick={() => {
            resetForm();
            setIsEditing(false);
            setIsDialogOpen(true);
          }}
        >
          Add User
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Typography variant="h4" component="div">
                {userStats.total}
              </Typography>
              <Typography variant="body2">
                Total Users
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Typography variant="h4" component="div">
                {userStats.active}
              </Typography>
              <Typography variant="body2">
                Active Users
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Typography variant="h4" component="div">
                {userStats.admins + userStats.editors}
              </Typography>
              <Typography variant="body2">
                Staff Members
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Typography variant="h4" component="div">
                {userStats.pending}
              </Typography>
              <Typography variant="body2">
                Pending Approval
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      <Paper>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Badge />} label="Users" />
          <Tab icon={<Analytics />} label="Activity Log" />
          <Tab icon={<Security />} label="Permissions" />
        </Tabs>

        {/* Users Tab */}
        {activeTab === 0 && (
          <Box p={3}>
            {/* Filters */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="editor">Editor</MenuItem>
                    <MenuItem value="author">Author</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {isLoading ? (
              <LinearProgress />
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Content Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <StyledTableRow key={user.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar 
                                src={user.avatar} 
                                sx={{ mr: 2, width: 40, height: 40 }}
                              >
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {user.firstName} {user.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{user.username}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  {user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <RoleChip size="small" label={user.role} role={user.role} />
                          </TableCell>
                          <TableCell>
                            <StatusChip size="small" label={user.status} status={user.status} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.stats.contentCreated}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              onClick={(e) => {
                                setAnchorEl(e.currentTarget);
                                setSelectedUser(user);
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredUsers.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </>
            )}
          </Box>
        )}

        {/* Activity Log Tab */}
        {activeTab === 1 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Recent User Activities
            </Typography>
            
            {activities.slice(0, 20).map((activity) => (
              <Card key={activity.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="between" alignItems="center">
                    <Box flex={1}>
                      <Typography variant="subtitle2">
                        {activity.action}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.details}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.timestamp.toLocaleString()} • {activity.ipAddress}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Permissions Tab */}
        {activeTab === 2 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Role Permissions
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Define what each role can access and modify in the system.
            </Alert>
            
            <Grid container spacing={3}>
              {['admin', 'editor', 'author', 'user'].map(role => (
                <Grid item xs={12} md={6} key={role}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {role.charAt(0).toUpperCase() + role.slice(1)} Permissions
                      </Typography>
                      
                      {[
                        'Create Content',
                        'Edit Content',
                        'Delete Content',
                        'Manage Users',
                        'View Analytics',
                        'System Settings',
                      ].map(permission => (
                        <FormControlLabel
                          key={permission}
                          control={
                            <Switch 
                              checked={
                                (role === 'admin') ||
                                (role === 'editor' && !['Manage Users', 'System Settings'].includes(permission)) ||
                                (role === 'author' && ['Create Content', 'Edit Content'].includes(permission))
                              }
                              disabled
                            />
                          }
                          label={permission}
                          sx={{ display: 'block' }}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* User Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username || ''}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email || ''}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={newUser.firstName || ''}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={newUser.lastName || ''}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newUser.role || 'user'}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="editor">Editor</MenuItem>
                  <MenuItem value="author">Author</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newUser.status || 'active'}
                  onChange={(e) => setNewUser({ ...newUser, status: e.target.value as any })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={isEditing ? handleUpdateUser : handleCreateUser}
          >
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
        <MenuItem
          onClick={() => {
            if (selectedUser) {
              setNewUser(selectedUser);
              setIsEditing(true);
              setIsDialogOpen(true);
            }
            setAnchorEl(null);
          }}
        >
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        
        {selectedUser?.status === 'active' ? (
          <MenuItem
            onClick={() => {
              if (selectedUser) {
                handleSuspendUser(selectedUser.id);
              }
              setAnchorEl(null);
            }}
          >
            <ListItemIcon><Block fontSize="small" /></ListItemIcon>
            <ListItemText>Suspend User</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              if (selectedUser) {
                handleReactivateUser(selectedUser.id);
              }
              setAnchorEl(null);
            }}
          >
            <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
            <ListItemText>Reactivate User</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem
          onClick={() => {
            if (selectedUser) {
              handleDeleteUser(selectedUser.id);
            }
            setAnchorEl(null);
          }}
        >
          <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserManagement;