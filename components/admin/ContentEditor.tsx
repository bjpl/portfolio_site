import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  Eye, 
  Clock, 
  History, 
  Globe, 
  Image as ImageIcon,
  Calendar,
  Tag,
  Hash,
  FileText,
  Sparkles
} from 'lucide-react';
import { ContentItem, ContentStatus, ContentType, SEOMetadata } from '@/types/admin';
import { useAutoSave } from '@/hooks/admin/useAutoSave';
import { useContentVersions } from '@/hooks/admin/useContentVersions';
import { WYSIWYGEditor } from '@/components/admin/WYSIWYGEditor';
import { SEOEditor } from '@/components/admin/SEOEditor';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { debounce } from '@/utils/admin/debounce';
import { generateSlug } from '@/utils/admin/slug';

interface ContentEditorProps {
  content: ContentItem | null;
  onSave: (content: ContentItem) => void;
  onCancel: () => void;
  userRole: 'admin' | 'editor' | 'viewer';
}

export const ContentEditor: React.FC<ContentEditorProps> = ({ 
  content, 
  onSave, 
  onCancel, 
  userRole 
}) => {
  const [formData, setFormData] = useState<Partial<ContentItem>>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'draft',
    tags: [],
    categories: [],
    featured_image: '',
    seo_metadata: {
      title: '',
      description: '',
      keywords: [],
      og_image: '',
      canonical_url: '',
      robots: 'index,follow'
    },
    publish_date: null,
    ...content
  });

  const [activeTab, setActiveTab] = useState('content');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'featured' | 'content'>('featured');

  const canPublish = userRole === 'admin' || userRole === 'editor';
  const isEditing = Boolean(content?.id);

  // Auto-save functionality
  const { saveStatus, lastSaved } = useAutoSave(formData, {
    enabled: isDirty && isEditing,
    interval: 30000, // 30 seconds
    onSave: async (data) => {
      // Save draft to Supabase
      console.log('Auto-saving:', data);
    }
  });

  // Version history
  const { versions, createVersion, restoreVersion } = useContentVersions(content?.id);

  // Generate slug from title
  const debouncedSlugGeneration = useCallback(
    debounce((title: string) => {
      if (!formData.slug || formData.slug === generateSlug(formData.title || '')) {
        setFormData(prev => ({ ...prev, slug: generateSlug(title) }));
      }
    }, 500),
    [formData.slug, formData.title]
  );

  useEffect(() => {
    if (formData.title) {
      debouncedSlugGeneration(formData.title);
    }
  }, [formData.title, debouncedSlugGeneration]);

  const handleFieldChange = (field: keyof ContentItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSEOChange = (seoData: SEOMetadata) => {
    setFormData(prev => ({ ...prev, seo_metadata: seoData }));
    setIsDirty(true);
  };

  const handleSave = async (status?: ContentStatus) => {
    const saveData: ContentItem = {
      ...formData,
      status: status || formData.status,
      updated_at: new Date().toISOString(),
      ...(isEditing ? {} : { created_at: new Date().toISOString() })
    } as ContentItem;

    // Create version before saving if editing
    if (isEditing) {
      await createVersion(content!);
    }

    onSave(saveData);
    setIsDirty(false);
  };

  const handleSchedule = () => {
    const publishDate = prompt('Enter publish date and time (YYYY-MM-DD HH:MM):');
    if (publishDate) {
      handleFieldChange('publish_date', publishDate);
      handleSave('scheduled');
    }
  };

  const handleMediaSelect = (mediaUrl: string) => {
    if (mediaPickerTarget === 'featured') {
      handleFieldChange('featured_image', mediaUrl);
    } else {
      // Insert into content at cursor position
      const currentContent = formData.content || '';
      const imageMarkdown = `![Image](${mediaUrl})`;
      handleFieldChange('content', currentContent + '\n' + imageMarkdown);
    }
    setShowMediaPicker(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Content' : 'Create New Content'}
          </h2>
          {saveStatus && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {saveStatus === 'saving' ? 'Saving...' : 
                 saveStatus === 'saved' ? `Saved ${lastSaved}` : 
                 'Unsaved changes'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsPreviewMode(!isPreviewMode)}>
            <Eye className="h-4 w-4 mr-2" />
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          
          {versions.length > 0 && (
            <Button variant="outline" onClick={() => setActiveTab('versions')}>
              <History className="h-4 w-4 mr-2" />
              Versions ({versions.length})
            </Button>
          )}
          
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          <Button onClick={() => handleSave('draft')}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          
          {canPublish && (
            <>
              <Button onClick={() => handleSave('published')} className="bg-green-600 hover:bg-green-700">
                <Globe className="h-4 w-4 mr-2" />
                Publish
              </Button>
              
              <Button variant="outline" onClick={handleSchedule}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="flex-1 overflow-hidden">
            <div className="h-full p-4 space-y-4">
              {/* Title and Slug */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Enter content title..."
                    className="text-lg font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug || ''}
                    onChange={(e) => handleFieldChange('slug', e.target.value)}
                    placeholder="url-slug"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt || ''}
                  onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                  placeholder="Brief description or excerpt..."
                  rows={2}
                />
              </div>

              {/* WYSIWYG Editor */}
              <div className="flex-1">
                <Label>Content</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  {isPreviewMode ? (
                    <div className="p-4 prose max-w-none">
                      {/* Preview would render formatted content */}
                      <div dangerouslySetInnerHTML={{ __html: formData.content || '' }} />
                    </div>
                  ) : (
                    <WYSIWYGEditor
                      content={formData.content || ''}
                      onChange={(content) => handleFieldChange('content', content)}
                      onImageUpload={() => {
                        setMediaPickerTarget('content');
                        setShowMediaPicker(true);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="p-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Basic Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Content Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: ContentType) => handleFieldChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Blog Post</SelectItem>
                        <SelectItem value="page">Page</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: ContentStatus) => handleFieldChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.publish_date && (
                    <div>
                      <Label>Publish Date</Label>
                      <Input
                        type="datetime-local"
                        value={formData.publish_date}
                        onChange={(e) => handleFieldChange('publish_date', e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Featured Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.featured_image ? (
                    <div className="space-y-4">
                      <img 
                        src={formData.featured_image} 
                        alt="Featured"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setMediaPickerTarget('featured');
                            setShowMediaPicker(true);
                          }}
                        >
                          Change Image
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleFieldChange('featured_image', '')}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full h-32 border-dashed"
                      onClick={() => {
                        setMediaPickerTarget('featured');
                        setShowMediaPicker(true);
                      }}
                    >
                      <ImageIcon className="h-6 w-6 mr-2" />
                      Select Featured Image
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Tags and Categories */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags & Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                          <button 
                            onClick={() => {
                              const newTags = formData.tags?.filter((_, i) => i !== index);
                              handleFieldChange('tags', newTags);
                            }}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Add tags (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          e.preventDefault();
                          const newTag = e.currentTarget.value.trim();
                          const currentTags = formData.tags || [];
                          if (!currentTags.includes(newTag)) {
                            handleFieldChange('tags', [...currentTags, newTag]);
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Categories</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.categories?.map((category, index) => (
                        <Badge key={index} variant="outline">
                          {category}
                          <button 
                            onClick={() => {
                              const newCategories = formData.categories?.filter((_, i) => i !== index);
                              handleFieldChange('categories', newCategories);
                            }}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Add categories (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          e.preventDefault();
                          const newCategory = e.currentTarget.value.trim();
                          const currentCategories = formData.categories || [];
                          if (!currentCategories.includes(newCategory)) {
                            handleFieldChange('categories', [...currentCategories, newCategory]);
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="p-4">
            <SEOEditor
              seoData={formData.seo_metadata}
              onChange={handleSEOChange}
              contentTitle={formData.title}
              contentExcerpt={formData.excerpt}
            />
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versions.length > 0 ? (
                  <div className="space-y-4">
                    {versions.map((version, index) => (
                      <div key={version.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">Version {versions.length - index}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                          {version.comment && (
                            <div className="text-sm mt-1">{version.comment}</div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => restoreVersion(version)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No version history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onCancel={() => setShowMediaPicker(false)}
          allowedTypes={mediaPickerTarget === 'featured' ? ['image'] : ['image', 'video', 'document']}
        />
      )}
    </div>
  );
};

export default ContentEditor;