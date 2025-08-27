import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  Trash2,
  Eye,
  Copy,
  MoreHorizontal,
  FolderPlus,
  Folder
} from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/admin/useSupabaseQuery';
import { useSupabaseStorage } from '@/hooks/admin/useSupabaseStorage';
import { MediaFile, MediaType, MediaFolder } from '@/types/admin';
import { formatBytes } from '@/utils/admin/format';
import { formatDistanceToNow } from 'date-fns';

interface MediaLibraryProps {
  userRole: 'admin' | 'editor' | 'viewer';
  selectionMode?: boolean;
  onSelect?: (file: MediaFile) => void;
  allowedTypes?: MediaType[];
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ 
  userRole, 
  selectionMode = false, 
  onSelect,
  allowedTypes = ['image', 'video', 'document', 'audio']
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUpload = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  // Build query for media files
  const buildMediaQuery = () => {
    let query = 'media_files';
    const conditions = [];

    if (searchQuery) {
      conditions.push(`name.ilike.%${searchQuery}%`);
    }
    if (typeFilter !== 'all') {
      conditions.push(`type.eq.${typeFilter}`);
    }
    if (selectedFolder) {
      conditions.push(`folder_id.eq.${selectedFolder}`);
    } else {
      conditions.push(`folder_id.is.null`);
    }

    if (conditions.length > 0) {
      query += `?${conditions.join('&')}`;
    }

    return query;
  };

  const { data: mediaFiles, loading, error, refetch } = useSupabaseQuery<MediaFile[]>(buildMediaQuery());
  const { data: folders } = useSupabaseQuery<MediaFolder[]>('media_folders');
  const { upload, deleteFile, getPublicUrl } = useSupabaseStorage('media');

  const handleFileUpload = async (files: FileList) => {
    if (!canUpload) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${Date.now()}-${i}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        const result = await upload(file, {
          folder: selectedFolder || undefined,
          onProgress: (progress) => {
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
          }
        });

        // Create database record
        const mediaFile: Omit<MediaFile, 'id'> = {
          name: file.name,
          type: getFileType(file.type),
          size: file.size,
          mime_type: file.type,
          url: result.publicUrl,
          folder_id: selectedFolder,
          alt_text: '',
          description: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Save to database would go here
        console.log('Creating media record:', mediaFile);

      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }

    await refetch();
    setShowUploadDialog(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && canUpload) {
      handleFileUpload(files);
    }
  };

  const handleDelete = async (fileIds: string[]) => {
    if (!canDelete) return;

    if (window.confirm(`Delete ${fileIds.length} file(s)?`)) {
      for (const id of fileIds) {
        const file = mediaFiles?.find(f => f.id === id);
        if (file) {
          try {
            await deleteFile(file.url);
            // Delete database record would go here
          } catch (error) {
            console.error('Delete failed:', error);
          }
        }
      }
      await refetch();
      setSelectedFiles([]);
    }
  };

  const handleCopyUrl = (file: MediaFile) => {
    navigator.clipboard.writeText(file.url);
    // Show toast notification
  };

  const handleDownload = (file: MediaFile) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getFileType = (mimeType: string): MediaType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return FileText; // Could use a music icon
      case 'document': return FileText;
      default: return FileText;
    }
  };

  const filteredFiles = mediaFiles?.filter(file => 
    allowedTypes.includes(file.type)
  ) || [];

  const renderGridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {filteredFiles.map((file) => {
        const Icon = getFileIcon(file.type);
        const isSelected = selectedFiles.includes(file.id);

        return (
          <div
            key={file.id}
            className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            }`}
            onClick={() => {
              if (selectionMode && onSelect) {
                onSelect(file);
              } else {
                if (selectedFiles.includes(file.id)) {
                  setSelectedFiles(prev => prev.filter(id => id !== file.id));
                } else {
                  setSelectedFiles(prev => [...prev, file.id]);
                }
              }
            }}
          >
            {/* File Preview */}
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {file.type === 'image' ? (
                <img 
                  src={file.url} 
                  alt={file.alt_text || file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* File Info */}
            <div className="p-2">
              <div className="text-sm font-medium truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </div>
            </div>

            {/* Actions Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFile(file);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl(file);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selection Checkbox */}
            {!selectionMode && (
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="rounded"
                />
              </div>
            )}

            {/* Type Badge */}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                {file.type}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredFiles.map((file) => {
        const Icon = getFileIcon(file.type);
        const isSelected = selectedFiles.includes(file.id);

        return (
          <div
            key={file.id}
            className={`flex items-center space-x-4 p-3 border rounded-lg cursor-pointer transition-all ${
              isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
            }`}
            onClick={() => {
              if (selectionMode && onSelect) {
                onSelect(file);
              } else {
                if (selectedFiles.includes(file.id)) {
                  setSelectedFiles(prev => prev.filter(id => id !== file.id));
                } else {
                  setSelectedFiles(prev => [...prev, file.id]);
                }
              }
            }}
          >
            {!selectionMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="rounded"
              />
            )}
            
            <div className="flex-shrink-0">
              {file.type === 'image' ? (
                <img 
                  src={file.url} 
                  alt={file.alt_text || file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(file.size)} • {file.type} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewFile(file);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl(file);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(file);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Media Library</h2>
          <p className="text-muted-foreground">
            Manage your images, videos, and documents
          </p>
        </div>
        {canUpload && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <Select value={typeFilter} onValueChange={(value: MediaType | 'all') => setTypeFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedFiles.length > 0 && canDelete && (
              <Button 
                variant="outline"
                onClick={() => handleDelete(selectedFiles)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedFiles.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Folders */}
      {folders && folders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Folders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedFolder === null ? 'default' : 'outline'}
                onClick={() => setSelectedFolder(null)}
              >
                All Files
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant={selectedFolder === folder.id ? 'default' : 'outline'}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  {folder.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid/List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Files ({filteredFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <p className="text-red-600 text-center py-8">Error loading media files</p>
          ) : filteredFiles.length > 0 ? (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="min-h-[200px]"
            >
              {viewMode === 'grid' ? renderGridView() : renderListView()}
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No media files found</p>
              {canUpload && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  Upload your first file
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Drag and drop files here, or click to select files
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop files here to upload</p>
              <p className="text-muted-foreground">or click to browse</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.map(type => {
                switch (type) {
                  case 'image': return 'image/*';
                  case 'video': return 'video/*';
                  case 'audio': return 'audio/*';
                  case 'document': return '.pdf,.doc,.docx,.txt,.md';
                  default: return '*/*';
                }
              }).join(',')}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      {previewFile && (
        <Dialog open={true} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewFile.name}</DialogTitle>
              <DialogDescription>
                {formatBytes(previewFile.size)} • {previewFile.type} • 
                Created {formatDistanceToNow(new Date(previewFile.created_at), { addSuffix: true })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {previewFile.type === 'image' ? (
                <img 
                  src={previewFile.url} 
                  alt={previewFile.alt_text || previewFile.name}
                  className="w-full max-h-96 object-contain rounded"
                />
              ) : previewFile.type === 'video' ? (
                <video 
                  src={previewFile.url} 
                  controls
                  className="w-full max-h-96 rounded"
                />
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-100 rounded">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handleCopyUrl(previewFile)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button onClick={() => handleDownload(previewFile)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {canDelete && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleDelete([previewFile.id]);
                      setPreviewFile(null);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MediaLibrary;