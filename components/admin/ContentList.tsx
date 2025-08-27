import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Clock,
  User,
  MoreHorizontal
} from 'lucide-react';
import { ContentEditor } from './ContentEditor';
import { useSupabaseQuery } from '@/hooks/admin/useSupabaseQuery';
import { ContentItem, ContentStatus, ContentType } from '@/types/admin';
import { formatDistanceToNow } from 'date-fns';

interface ContentListProps {
  userRole: 'admin' | 'editor' | 'viewer';
}

export const ContentList: React.FC<ContentListProps> = ({ userRole }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'title'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  // Build query based on filters
  const buildQuery = () => {
    let query = 'content';
    const conditions = [];

    if (searchQuery) {
      conditions.push(`title.ilike.%${searchQuery}%`);
    }
    if (statusFilter !== 'all') {
      conditions.push(`status.eq.${statusFilter}`);
    }
    if (typeFilter !== 'all') {
      conditions.push(`type.eq.${typeFilter}`);
    }

    if (conditions.length > 0) {
      query += `?${conditions.join('&')}`;
    }

    return query;
  };

  const { data: content, loading, error, refetch } = useSupabaseQuery<ContentItem[]>(
    buildQuery(),
    {
      orderBy: { column: sortBy, ascending: sortOrder === 'asc' }
    }
  );

  const handleCreateNew = () => {
    setSelectedContent(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (item: ContentItem) => {
    setSelectedContent(item);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        // Delete implementation would go here
        await refetch();
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  const handleDuplicate = async (item: ContentItem) => {
    if (!canEdit) return;

    const duplicated = {
      ...item,
      id: undefined,
      title: `${item.title} (Copy)`,
      slug: `${item.slug}-copy`,
      status: 'draft' as ContentStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setSelectedContent(duplicated);
    setIsEditorOpen(true);
  };

  const getStatusBadge = (status: ContentStatus) => {
    const variants = {
      published: 'default',
      draft: 'secondary',
      archived: 'outline',
      scheduled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: ContentType) => {
    const colors = {
      page: 'bg-blue-100 text-blue-800',
      post: 'bg-green-100 text-green-800',
      project: 'bg-purple-100 text-purple-800',
      media: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={colors[type]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-600">Error loading content: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Content Management</h2>
          <p className="text-muted-foreground">
            Manage your website content, posts, and pages
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: ContentStatus | 'all') => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(value: ContentType | 'all') => setTypeFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="page">Pages</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as any);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                <SelectItem value="created_at-desc">Recently Created</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Items ({content?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {content && content.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          /{item.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {item.author?.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => window.open(item.slug, '_blank')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(item)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No content found</p>
              {canEdit && (
                <Button onClick={handleCreateNew} className="mt-4">
                  Create your first content
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedContent?.id ? 'Edit Content' : 'Create New Content'}
            </DialogTitle>
            <DialogDescription>
              {selectedContent?.id ? 'Make changes to your content' : 'Create new content for your website'}
            </DialogDescription>
          </DialogHeader>
          <ContentEditor
            content={selectedContent}
            onSave={() => {
              setIsEditorOpen(false);
              refetch();
            }}
            onCancel={() => setIsEditorOpen(false)}
            userRole={userRole}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentList;