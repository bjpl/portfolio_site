import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Globe, 
  Eye, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Hash,
  Image,
  Link,
  FileText,
  Smartphone,
  Monitor,
  Target,
  TrendingUp
} from 'lucide-react';
import { SEOMetadata } from '@/types/admin';

interface SEOEditorProps {
  seoData: SEOMetadata | undefined;
  onChange: (seoData: SEOMetadata) => void;
  contentTitle?: string;
  contentExcerpt?: string;
  contentUrl?: string;
}

export const SEOEditor: React.FC<SEOEditorProps> = ({
  seoData,
  onChange,
  contentTitle = '',
  contentExcerpt = '',
  contentUrl = ''
}) => {
  const [formData, setFormData] = useState<SEOMetadata>({
    title: '',
    description: '',
    keywords: [],
    og_image: '',
    canonical_url: '',
    robots: 'index,follow',
    structured_data: {},
    ...seoData
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [seoScore, setSeoScore] = useState(0);
  const [seoIssues, setSeoIssues] = useState<string[]>([]);

  // Auto-generate SEO data from content
  useEffect(() => {
    if (!formData.title && contentTitle) {
      setFormData(prev => ({ ...prev, title: contentTitle }));
    }
    if (!formData.description && contentExcerpt) {
      const description = contentExcerpt.length > 160 
        ? contentExcerpt.substring(0, 157) + '...'
        : contentExcerpt;
      setFormData(prev => ({ ...prev, description }));
    }
    if (!formData.canonical_url && contentUrl) {
      setFormData(prev => ({ ...prev, canonical_url: contentUrl }));
    }
  }, [contentTitle, contentExcerpt, contentUrl, formData.title, formData.description, formData.canonical_url]);

  // Calculate SEO score and issues
  useEffect(() => {
    const issues: string[] = [];
    let score = 0;

    // Title checks
    if (!formData.title) {
      issues.push('Title is required');
    } else {
      score += 20;
      if (formData.title.length < 30) {
        issues.push('Title is too short (recommended: 30-60 characters)');
      } else if (formData.title.length > 60) {
        issues.push('Title is too long (recommended: 30-60 characters)');
        score -= 5;
      } else {
        score += 10;
      }
    }

    // Description checks
    if (!formData.description) {
      issues.push('Meta description is required');
    } else {
      score += 20;
      if (formData.description.length < 120) {
        issues.push('Description is too short (recommended: 120-160 characters)');
      } else if (formData.description.length > 160) {
        issues.push('Description is too long (recommended: 120-160 characters)');
        score -= 5;
      } else {
        score += 10;
      }
    }

    // Keywords checks
    if (!formData.keywords || formData.keywords.length === 0) {
      issues.push('Keywords are recommended');
    } else {
      score += 15;
      if (formData.keywords.length > 10) {
        issues.push('Too many keywords (recommended: 3-5)');
        score -= 5;
      }
    }

    // Image checks
    if (!formData.og_image) {
      issues.push('Open Graph image is recommended');
    } else {
      score += 10;
    }

    // URL checks
    if (formData.canonical_url) {
      score += 10;
    }

    // Robots checks
    if (formData.robots === 'noindex,nofollow') {
      issues.push('Content is set to not be indexed');
    } else {
      score += 5;
    }

    // Structured data
    if (formData.structured_data && Object.keys(formData.structured_data).length > 0) {
      score += 10;
    }

    setSeoScore(Math.min(score, 100));
    setSeoIssues(issues);
  }, [formData]);

  // Update parent component
  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleFieldChange = (field: keyof SEOMetadata, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleKeywordAdd = () => {
    if (keywordInput.trim() && !formData.keywords?.includes(keywordInput.trim())) {
      const newKeywords = [...(formData.keywords || []), keywordInput.trim()];
      handleFieldChange('keywords', newKeywords);
      setKeywordInput('');
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    const newKeywords = formData.keywords?.filter(k => k !== keyword) || [];
    handleFieldChange('keywords', newKeywords);
  };

  const generateStructuredData = () => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": formData.title || contentTitle,
      "description": formData.description || contentExcerpt,
      "image": formData.og_image,
      "url": formData.canonical_url,
      "datePublished": new Date().toISOString(),
      "author": {
        "@type": "Person",
        "name": "Author Name"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Your Website",
        "logo": {
          "@type": "ImageObject",
          "url": "https://yourwebsite.com/logo.png"
        }
      }
    };

    handleFieldChange('structured_data', structuredData);
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeoScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertCircle;
    return XCircle;
  };

  const SeoScoreIcon = getSeoScoreIcon(seoScore);

  return (
    <div className="space-y-6">
      {/* SEO Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              SEO Analysis
            </div>
            <div className={`flex items-center gap-2 ${getSeoScoreColor(seoScore)}`}>
              <SeoScoreIcon className="h-5 w-5" />
              <span className="text-2xl font-bold">{seoScore}/100</span>
            </div>
          </CardTitle>
          <CardDescription>
            Optimize your content for better search engine visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seoIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Issues to fix:</h4>
              <ul className="space-y-1">
                {seoIssues.map((issue, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {seoIssues.length === 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Great! No SEO issues found.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic SEO</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Basic SEO Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Engine Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={formData.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Enter SEO title (30-60 characters)"
                  maxLength={60}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>This appears in search results</span>
                  <span>{formData.title?.length || 0}/60</span>
                </div>
              </div>

              <div>
                <Label htmlFor="seo-description">Meta Description</Label>
                <Textarea
                  id="seo-description"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Enter meta description (120-160 characters)"
                  rows={3}
                  maxLength={160}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Brief description for search results</span>
                  <span>{formData.description?.length || 0}/160</span>
                </div>
              </div>

              <div>
                <Label>Keywords</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Enter keyword"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleKeywordAdd();
                      }
                    }}
                  />
                  <Button onClick={handleKeywordAdd}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.keywords?.map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                      <button
                        onClick={() => handleKeywordRemove(keyword)}
                        className="ml-2 text-xs hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add 3-5 relevant keywords for your content
                </p>
              </div>

              <div>
                <Label htmlFor="canonical-url">Canonical URL</Label>
                <Input
                  id="canonical-url"
                  value={formData.canonical_url || ''}
                  onChange={(e) => handleFieldChange('canonical_url', e.target.value)}
                  placeholder="https://example.com/your-page"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preferred URL for this content (prevents duplicate content issues)
                </p>
              </div>

              <div>
                <Label>Search Engine Robots</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.robots?.includes('index') !== false}
                      onCheckedChange={(checked) => {
                        const robots = checked ? 'index,follow' : 'noindex,nofollow';
                        handleFieldChange('robots', robots);
                      }}
                    />
                    <span className="text-sm">Allow indexing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.robots?.includes('follow') !== false}
                      onCheckedChange={(checked) => {
                        const isIndex = formData.robots?.includes('index') !== false;
                        const robots = isIndex 
                          ? (checked ? 'index,follow' : 'index,nofollow')
                          : (checked ? 'noindex,follow' : 'noindex,nofollow');
                        handleFieldChange('robots', robots);
                      }}
                    />
                    <span className="text-sm">Follow links</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Open Graph & Social Media
              </CardTitle>
              <CardDescription>
                Control how your content appears when shared on social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="og-title">Social Media Title</Label>
                <Input
                  id="og-title"
                  value={formData.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Title for social media (defaults to SEO title)"
                />
              </div>

              <div>
                <Label htmlFor="og-description">Social Media Description</Label>
                <Textarea
                  id="og-description"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Description for social media (defaults to meta description)"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="og-image">Social Media Image</Label>
                <div className="space-y-2">
                  <Input
                    id="og-image"
                    value={formData.og_image || ''}
                    onChange={(e) => handleFieldChange('og_image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.og_image && (
                    <div className="border rounded p-2">
                      <img 
                        src={formData.og_image} 
                        alt="Social media preview"
                        className="w-full max-w-sm h-32 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 1200x630 pixels (1.91:1 ratio)
                </p>
              </div>

              <div>
                <Label>Twitter Card Type</Label>
                <select 
                  className="w-full p-2 border rounded"
                  value={formData.structured_data?.twitter_card || 'summary_large_image'}
                  onChange={(e) => handleFieldChange('structured_data', {
                    ...formData.structured_data,
                    twitter_card: e.target.value
                  })}
                >
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Summary Large Image</option>
                  <option value="app">App</option>
                  <option value="player">Player</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Advanced SEO
              </CardTitle>
              <CardDescription>
                Advanced settings for technical SEO optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Structured Data (JSON-LD)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateStructuredData}
                  >
                    Auto-Generate
                  </Button>
                </div>
                <Textarea
                  value={JSON.stringify(formData.structured_data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleFieldChange('structured_data', parsed);
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="Enter JSON-LD structured data"
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valid JSON-LD structured data helps search engines understand your content
                </p>
              </div>

              <div>
                <Label>Additional Meta Tags</Label>
                <Textarea
                  placeholder="Enter additional meta tags (one per line)"
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: viewport, theme-color, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Search & Social Preview
              </CardTitle>
              <CardDescription>
                See how your content will appear in search results and social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Search Preview */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Google Search Preview
                </h4>
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="space-y-1">
                    <div className="text-sm text-green-600">
                      {formData.canonical_url || 'https://example.com/your-page'}
                    </div>
                    <div className="text-lg text-blue-600 hover:underline cursor-pointer">
                      {formData.title || contentTitle || 'Your Page Title'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.description || contentExcerpt || 'Your page description will appear here...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Facebook Preview */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Facebook Preview
                </h4>
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  {formData.og_image && (
                    <img 
                      src={formData.og_image} 
                      alt="Facebook preview"
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4 border-t">
                    <div className="text-sm text-gray-500 mb-1">
                      {formData.canonical_url || 'EXAMPLE.COM'}
                    </div>
                    <div className="font-semibold text-lg mb-2">
                      {formData.title || contentTitle || 'Your Page Title'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {formData.description || contentExcerpt || 'Your page description will appear here...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter Preview */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Twitter Preview
                </h4>
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 max-w-md">
                  {formData.og_image && (
                    <img 
                      src={formData.og_image} 
                      alt="Twitter preview"
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-3 border-t">
                    <div className="font-semibold mb-1">
                      {formData.title || contentTitle || 'Your Page Title'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {formData.description || contentExcerpt || 'Your page description...'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formData.canonical_url || 'example.com'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SEOEditor;