import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  AccountTree,
  PlayArrow,
  Pause,
  Stop,
  Edit,
  Add,
  Delete,
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  Person,
  Assignment,
  Notifications,
  Settings,
  Analytics,
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge as FlowEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'start' | 'task' | 'decision' | 'end' | 'review' | 'publish';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  assignee?: string;
  estimatedTime?: number; // in minutes
  actualTime?: number;
  dependencies?: string[];
  conditions?: string[];
  position: { x: number; y: number };
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'content_creation' | 'content_review' | 'deployment' | 'user_onboarding' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  totalSteps: number;
  completedSteps: number;
  estimatedDuration: number;
  actualDuration?: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentStepId?: string;
  executedSteps: Array<{
    stepId: string;
    status: 'completed' | 'failed' | 'skipped';
    startedAt: Date;
    completedAt?: Date;
    assignee?: string;
    notes?: string;
  }>;
  metadata?: any;
}

const WorkflowCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const StepNode = styled(Box)<{ stepType: string; status: string }>(({ theme, stepType, status }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  minWidth: 150,
  textAlign: 'center',
  backgroundColor: 
    status === 'completed' ? theme.palette.success.light :
    status === 'in_progress' ? theme.palette.info.light :
    status === 'failed' ? theme.palette.error.light :
    theme.palette.grey[300],
  color: 
    status === 'completed' ? theme.palette.success.contrastText :
    status === 'in_progress' ? theme.palette.info.contrastText :
    status === 'failed' ? theme.palette.error.contrastText :
    theme.palette.text.primary,
  border: `2px solid ${
    stepType === 'start' || stepType === 'end' ? theme.palette.primary.main :
    stepType === 'decision' ? theme.palette.warning.main :
    stepType === 'review' ? theme.palette.info.main :
    theme.palette.grey[400]
  }`,
  borderRadius: 
    stepType === 'start' || stepType === 'end' ? '50%' :
    stepType === 'decision' ? '8px' :
    '4px',
}));

const FlowContainer = styled(Box)(({ theme }) => ({
  height: 600,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  '& .react-flow__node': {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
  },
  '& .react-flow__edge': {
    stroke: theme.palette.primary.main,
    strokeWidth: 2,
  },
  '& .react-flow__controls': {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

// Custom Node Component
const CustomNode: React.FC<{ data: WorkflowStep }> = ({ data }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in_progress': return <PlayArrow color="info" />;
      case 'failed': return <Stop color="error" />;
      default: return <RadioButtonUnchecked color="action" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'start': return <PlayArrow />;
      case 'end': return <CheckCircle />;
      case 'decision': return <AccountTree />;
      case 'review': return <Assignment />;
      case 'publish': return <Notifications />;
      default: return <Assignment />;
    }
  };

  return (
    <StepNode stepType={data.type} status={data.status}>
      <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
        {getStatusIcon(data.status)}
        <Box ml={1}>
          {getTypeIcon(data.type)}
        </Box>
      </Box>
      <Typography variant="body2" fontWeight={600}>
        {data.title}
      </Typography>
      {data.assignee && (
        <Typography variant="caption" display="block">
          @{data.assignee}
        </Typography>
      )}
      {data.estimatedTime && (
        <Typography variant="caption" display="block">
          ~{data.estimatedTime}min
        </Typography>
      )}
    </StepNode>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

export const WorkflowVisualization: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'flow' | 'timeline'>('list');
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [newWorkflow, setNewWorkflow] = useState<Partial<Workflow>>({
    name: '',
    description: '',
    type: 'content_creation',
    status: 'draft',
    steps: [],
  });

  useEffect(() => {
    loadWorkflows();
    loadExecutions();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/admin/workflows');
      const result = await response.json();
      
      if (result.success) {
        setWorkflows(result.data.map((workflow: any) => ({
          ...workflow,
          createdAt: new Date(workflow.createdAt),
          updatedAt: new Date(workflow.updatedAt),
        })));
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/admin/workflow-executions');
      const result = await response.json();
      
      if (result.success) {
        setExecutions(result.data.map((execution: any) => ({
          ...execution,
          startedAt: new Date(execution.startedAt),
          completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
          executedSteps: execution.executedSteps.map((step: any) => ({
            ...step,
            startedAt: new Date(step.startedAt),
            completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
          })),
        })));
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const convertWorkflowToFlow = useCallback((workflow: Workflow) => {
    const flowNodes: Node[] = workflow.steps.map(step => ({
      id: step.id,
      type: 'customNode',
      position: step.position,
      data: step,
    }));

    const flowEdges: Edge[] = [];
    workflow.steps.forEach(step => {
      if (step.dependencies) {
        step.dependencies.forEach(depId => {
          flowEdges.push({
            id: `${depId}-${step.id}`,
            source: depId,
            target: step.id,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        });
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [setNodes, setEdges]);

  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    if (viewMode === 'flow') {
      convertWorkflowToFlow(workflow);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const response = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorkflow),
      });
      
      if (response.ok) {
        await loadWorkflows();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/admin/workflows/${workflowId}/execute`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadExecutions();
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const resetForm = () => {
    setNewWorkflow({
      name: '',
      description: '',
      type: 'content_creation',
      status: 'draft',
      steps: [],
    });
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      default: return 'default';
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Workflow Visualization
        </Typography>
        
        <Box display="flex" gap={1}>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('list')}
            size="small"
          >
            List
          </Button>
          <Button
            variant={viewMode === 'flow' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('flow')}
            size="small"
          >
            Flow
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('timeline')}
            size="small"
          >
            Timeline
          </Button>
          
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => {
              resetForm();
              setIsEditing(false);
              setIsDialogOpen(true);
            }}
          >
            New Workflow
          </Button>
        </Box>
      </Box>

      {/* List View */}
      {viewMode === 'list' && (
        <Grid container spacing={3}>
          {workflows.map((workflow) => (
            <Grid item xs={12} md={6} lg={4} key={workflow.id}>
              <WorkflowCard onClick={() => handleWorkflowSelect(workflow)}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="div" noWrap>
                      {workflow.name}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={workflow.status} 
                      color={getWorkflowStatusColor(workflow.status) as any}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {workflow.description}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Progress: {workflow.completedSteps}/{workflow.totalSteps}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ~{workflow.estimatedDuration}min
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<PlayArrow />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteWorkflow(workflow.id);
                      }}
                      disabled={workflow.status !== 'active'}
                    >
                      Execute
                    </Button>
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewWorkflow(workflow);
                        setIsEditing(true);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                  </Box>
                </CardContent>
              </WorkflowCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Flow View */}
      {viewMode === 'flow' && selectedWorkflow && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {selectedWorkflow.name} - Flow Diagram
          </Typography>
          
          <FlowContainer>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <Background />
            </ReactFlow>
          </FlowContainer>
        </Paper>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Workflow Executions Timeline
          </Typography>
          
          <Timeline position="alternate">
            {executions.slice(0, 10).map((execution, index) => (
              <TimelineItem key={execution.id}>
                <TimelineOppositeContent sx={{ m: 'auto 0' }} align={index % 2 === 0 ? 'right' : 'left'} variant="body2" color="text.secondary">
                  {execution.startedAt.toLocaleString()}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={getExecutionStatusColor(execution.status) as any}>
                    {execution.status === 'running' ? <PlayArrow /> :
                     execution.status === 'completed' ? <CheckCircle /> :
                     execution.status === 'failed' ? <Stop /> :
                     <Pause />}
                  </TimelineDot>
                  {index < executions.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent sx={{ py: '12px', px: 2 }}>
                  <Typography variant="h6" component="span">
                    {workflows.find(w => w.id === execution.workflowId)?.name || 'Unknown Workflow'}
                  </Typography>
                  <Typography color="text.secondary">
                    Status: {execution.status}
                  </Typography>
                  <Typography variant="body2">
                    Steps completed: {execution.executedSteps.filter(s => s.status === 'completed').length}
                  </Typography>
                  {execution.completedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Duration: {Math.round((execution.completedAt.getTime() - execution.startedAt.getTime()) / 60000)}min
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Paper>
      )}

      {/* Workflow Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Workflow' : 'Create New Workflow'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Workflow Name"
                value={newWorkflow.name || ''}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newWorkflow.description || ''}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newWorkflow.type || 'content_creation'}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, type: e.target.value as any })}
                >
                  <MenuItem value="content_creation">Content Creation</MenuItem>
                  <MenuItem value="content_review">Content Review</MenuItem>
                  <MenuItem value="deployment">Deployment</MenuItem>
                  <MenuItem value="user_onboarding">User Onboarding</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newWorkflow.status || 'draft'}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, status: e.target.value as any })}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="paused">Paused</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateWorkflow}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowVisualization;