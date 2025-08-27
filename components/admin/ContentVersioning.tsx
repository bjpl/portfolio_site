import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  History, 
  Clock, 
  User, 
  GitBranch, 
  RotateCcw, 
  Eye, 
  FileText,
  ArrowRight,
  Plus,
  Trash2
} from 'lucide-react';
import { ContentVersion, ContentItem } from '@/types/admin';
import { useContentVersions } from '@/hooks/admin/useContentVersions';
import { formatDistanceToNow } from 'date-fns';

interface ContentVersioningProps {
  contentId: string;
  currentContent: ContentItem;
  onRestore: (version: ContentVersion) => void;
  userRole: 'admin' | 'editor' | 'viewer';
}

export const ContentVersioning: React.FC<ContentVersioningProps> = ({
  contentId,
  currentContent,
  onRestore,
  userRole
}) => {
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<ContentVersion | null>(null);
  const [versionComment, setVersionComment] = useState('');
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const { versions, loading, createVersion, deleteVersion } = useContentVersions(contentId);

  const canCreateVersion = userRole === 'admin' || userRole === 'editor';
  const canDeleteVersion = userRole === 'admin';

  const handleCreateVersion = async () => {
    if (currentContent) {
      await createVersion(currentContent, versionComment);
      setVersionComment('');
      setShowCreateVersion(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (window.confirm('Are you sure you want to delete this version?')) {
      await deleteVersion(versionId);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800',
      scheduled: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderVersionPreview = (version: ContentVersion) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{version.title}</h3>
        {getStatusBadge(version.status)}
      </div>
      <div className="prose prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: version.content.slice(0, 500) + '...' }} />
      </div>
    </div>
  );

  const renderVersionComparison = () => {
    if (!selectedVersion || !compareVersion) return null;

    return (
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Version {versions.findIndex(v => v.id === compareVersion.id) + 1}
          </h4>
          <div className="text-sm text-muted-foreground mb-2">
            {formatDistanceToNow(new Date(compareVersion.created_at), { addSuffix: true })}
          </div>
          {renderVersionPreview(compareVersion)}
        </div>

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Version {versions.findIndex(v => v.id === selectedVersion.id) + 1}
          </h4>
          <div className="text-sm text-muted-foreground mb-2">
            {formatDistanceToNow(new Date(selectedVersion.created_at), { addSuffix: true })}
          </div>
          {renderVersionPreview(selectedVersion)}
        </div>
      </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Version History
          </h2>
          <p className="text-muted-foreground">
            Track and manage content versions with rollback capability
          </p>
        </div>
        
        {canCreateVersion && (
          <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Version</DialogTitle>
                <DialogDescription>
                  Save the current state of this content as a new version
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Version Comment (optional)
                  </label>
                  <Textarea
                    value={versionComment}
                    onChange={(e) => setVersionComment(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateVersion(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateVersion}>
                    Create Version
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Version Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <GitBranch className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{versions.length}</p>
              <p className="text-sm text-muted-foreground">Total Versions</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">
                {versions.length > 0 
                  ? formatDistanceToNow(new Date(versions[0].created_at), { addSuffix: true })
                  : 'Never'
                }
              </p>
              <p className="text-sm text-muted-foreground">Last Version</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <User className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">
                {new Set(versions.map(v => v.created_by)).size}
              </p>
              <p className="text-sm text-muted-foreground">Contributors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {versions.length > 1 && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowComparison(!showComparison)}
            disabled={!selectedVersion || !compareVersion}
          >
            <Eye className="h-4 w-4 mr-2" />
            Compare Versions
          </Button>
        </div>
      )}

      {/* Version Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Version Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderVersionComparison()}
          </CardContent>
        </Card>
      )}

      {/* Version Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Version Timeline</CardTitle>
          <CardDescription>
            Click on versions to compare or restore
          </CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length > 0 ? (
            <div className="space-y-4">
              {versions.map((version, index) => {
                const isSelected = selectedVersion?.id === version.id;
                const isCompareSelected = compareVersion?.id === version.id;
                const versionNumber = versions.length - index;
                
                return (
                  <div 
                    key={version.id} 
                    className={`relative flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 
                      isCompareSelected ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                      'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      if (!selectedVersion || selectedVersion.id === version.id) {
                        setSelectedVersion(isSelected ? null : version);
                      } else if (!compareVersion || compareVersion.id === version.id) {
                        setCompareVersion(isCompareSelected ? null : version);
                      }
                    }}
                  >
                    {/* Version Number */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {versionNumber}
                      </div>
                    </div>

                    {/* Version Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium truncate">
                            Version {versionNumber}
                            {index === 0 && <span className="text-green-600 ml-2">(Current)</span>}
                          </h3>
                          {getStatusBadge(version.status)}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isSelected && (
                            <Badge variant="default" className="text-xs">Selected</Badge>
                          )}
                          {isCompareSelected && (
                            <Badge variant="secondary" className="text-xs">Compare</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                        </span>
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {version.created_by}
                        </span>
                      </div>
                      
                      {version.comment && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          "{version.comment}"
                        </p>
                      )}

                      {/* Title Changes */}
                      {version.title !== currentContent.title && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Title:</span> {version.title}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Version {versionNumber} Preview</DialogTitle>
                            <DialogDescription>
                              Created {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-semibold">{version.title}</h3>
                              {getStatusBadge(version.status)}
                            </div>
                            <div className="prose max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: version.content }} />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {index > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to restore this version? This will replace the current content.')) {
                              onRestore(version);
                            }
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canDeleteVersion && index > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVersion(version.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Timeline connector */}
                    {index < versions.length - 1 && (
                      <div className="absolute left-7 top-16 w-px h-6 bg-gray-300 dark:bg-gray-600" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No versions available</p>
              {canCreateVersion && (
                <Button onClick={() => setShowCreateVersion(true)}>
                  Create your first version
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentVersioning;