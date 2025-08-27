import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Upload, 
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Grid3X3,
  List,
  Filter,
  X,
  Check
} from 'lucide-react';
import { MediaFile, MediaType } from '@/types/admin';
import { useSupabaseQuery } from '@/hooks/admin/useSupabaseQuery';
import { useSupabaseStorage } from '@/hooks/admin/useSupabaseStorage';
import { formatBytes } from '@/utils/admin/format';

interface MediaPickerProps {
  onSelect: (file: MediaFile) => void;
  onCancel: () => void;
  allowedTypes?: MediaType[];
  multiple?: boolean;
  title?: string;
  description?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onSelect,
  onCancel,
  allowedTypes = ['image', 'video', 'audio', 'document'],
  multiple = false,
  title = "Select Media",
  description = "Choose a file from your media library or upload a new one"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [activeTab, setActiveTab] = useState('library');
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: number}>({});

  const { upload, validateFile, uploading } = useSupabaseStorage('media');

  // Build media query with filters
  const buildQuery = () => {
    const conditions = [];
    
    if (searchQuery) {
      conditions.push(`name.ilike.%${searchQuery}%`);
    }
    
    if (typeFilter !== 'all') {
      conditions.push(`type.eq.${typeFilter}`);
    }

    return conditions.length > 0 ? conditions.join('&') : '';
  };

  const { data: mediaFiles, loading, refetch } = useSupabaseQuery<MediaFile[]>(
    'media_files',
    {
      filters: buildQuery() ? { [buildQuery()]: true } : {},
      orderBy: { column: 'created_at', ascending: false },
    }
  );

  // Filter by allowed types
  const filteredFiles = mediaFiles?.filter(file => 
    allowedTypes.includes(file.type)
  ) || [];

  const handleFileSelect = (file: MediaFile) => {
    if (multiple) {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.id === file.id);
        if (isSelected) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
    } else {
      onSelect(file);
    }
  };

  const handleConfirmSelection = () => {
    if (multiple && selectedFiles.length > 0) {
      selectedFiles.forEach(file => onSelect(file));
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileId = `${Date.now()}-${i}`;
      
      // Validate file
      const validation = validateFile(file, {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: allowedTypes.map(type => {
          switch (type) {
            case 'image': return 'image/*';
            case 'video': return 'video/*';
            case 'audio': return 'audio/*';
            case 'document': return 'application/*';
            default: return '*/*';
          }
        }).join(',').split(',')
      });

      if (!validation.isValid) {
        alert(`File ${file.name}: ${validation.errors.join(', ')}`);
        continue;
      }

      try {
        setUploadingFiles(prev => ({ ...prev, [fileId]: 0 }));

        const result = await upload(file, {
          onProgress: (progress) => {
            setUploadingFiles(prev => ({ ...prev, [fileId]: progress }));
          }
        });

        if (result.error) {
          throw result.error;
        }

        // TODO: Create database record for the uploaded file
        console.log('File uploaded:', result);

      } catch (error) {
        console.error('Upload failed:', error);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
      }
    }

    await refetch();
  };

  const getFileIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return FileText;
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {filteredFiles.map((file) => {
        const Icon = getFileIcon(file.type);
        const isSelected = selectedFiles.some(f => f.id === file.id);

        return (
          <div
            key={file.id}
            className={`
              relative group border rounded-lg overflow-hidden cursor-pointer transition-all
              ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}
            `}
            onClick={() => handleFileSelect(file)}
          >
            {/* Preview */}
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

            {/* File info */}
            <div className="p-2">
              <div className="text-xs font-medium truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </div>
            </div>

            {/* Selection indicator */}
            {multiple && isSelected && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            )}

            {/* Type badge */}
            <div className="absolute top-2 left-2">
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
        const isSelected = selectedFiles.some(f => f.id === file.id);

        return (
          <div
            key={file.id}
            className={`
              flex items-center space-x-4 p-3 border rounded-lg cursor-pointer transition-all
              ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
            `}
            onClick={() => handleFileSelect(file)}
          >
            {multiple && (
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
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(file.size)} • {file.type}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Badge variant="outline">{file.type}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library">Media Library</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="flex-1 flex flex-col space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search media files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as MediaType | 'all')}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Types</option>
                  {allowedTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>

                <div className="flex border rounded">
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
              </div>

              {/* Media Grid/List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  viewMode === 'grid' ? renderGridView() : renderListView()
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                      <p>No media files found</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="flex-1 flex flex-col space-y-4">
              <div
                className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = allowedTypes.map(type => {
                    switch (type) {
                      case 'image': return 'image/*';
                      case 'video': return 'video/*';
                      case 'audio': return 'audio/*';
                      case 'document': return '.pdf,.doc,.docx,.txt,.md';
                      default: return '*/*';
                    }
                  }).join(',');
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      handleFileUpload(files);
                    }
                  };
                  input.click();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Drop files here to upload</p>
                <p className="text-muted-foreground">
                  or click to browse files
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supported types: {allowedTypes.join(', ')}
                </p>
              </div>

              {/* Upload Progress */}
              {Object.keys(uploadingFiles).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Uploading...</h4>
                  {Object.entries(uploadingFiles).map(([fileId, progress]) => (
                    <div key={fileId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Uploading file...</span>
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
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {multiple && selectedFiles.length > 0 && 
                `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected`
              }
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              
              {multiple ? (
                <Button 
                  onClick={handleConfirmSelection}
                  disabled={selectedFiles.length === 0}
                >
                  Select {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPicker;