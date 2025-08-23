# Portfolio CMS Quick Start Guide

## Getting Started

### Accessing the CMS
1. Navigate to `/admin` on your website
2. The system uses simple authentication - no complex login required for local development
3. You'll be redirected to the dashboard automatically

### Dashboard Overview
The main dashboard shows:
- **Content Statistics**: Total pages, blog posts, media files, and visitor metrics
- **Recent Activity**: Latest content updates and changes
- **Quick Actions**: Fast access to common tasks
- **System Status**: API health, build status, and storage usage

---

## Content Management

### Creating New Content

#### Method 1: Quick Create
1. Click **"New Post"** in Quick Actions on the dashboard
2. Choose content type (Blog Post, Page, Portfolio Item)
3. Fill in the required fields:
   - **Title**: Your content headline
   - **Slug**: URL-friendly version (auto-generated)
   - **Content**: Write in Markdown format
   - **Tags/Categories**: Add relevant taxonomy

#### Method 2: Content Editor
1. Navigate to **Content → Simple Editor** in the sidebar
2. Select content type from dropdown
3. Use the visual editor with formatting toolbar
4. Preview your content in real-time on the right panel

### Editing Existing Content
1. Go to **Content → All Content** or use the sidebar file browser
2. Click on any content item to open it
3. Make your changes in the editor
4. Click **Save** (auto-saves every 30 seconds)

### Deleting Content
1. Open the content item
2. Click the **Delete** button (trash icon)
3. Confirm deletion in the popup
4. Content is moved to trash (recoverable for 30 days)

---

## Media Management

### Uploading Media

#### Single Upload
1. Navigate to **Media → Dashboard**
2. Click **Upload Files** or drag & drop
3. Supported formats: JPG, PNG, GIF, WebP, SVG, PDF
4. Maximum file size: 10MB per file

#### Bulk Upload
1. Go to **Media → Bulk Upload**
2. Select multiple files or drag entire folders
3. Files are automatically optimized:
   - Images compressed without quality loss
   - Thumbnails generated (150x150, 300x300, 800x800)
   - WebP versions created for web optimization

### Organizing Media
- **Folders**: Create folders to organize files
- **Tags**: Add tags for easy searching
- **Search**: Use the search bar to find files by name or tag

### Using Media in Content
1. In the content editor, click the **Insert Media** button (image icon)
2. Select from existing media or upload new
3. Choose display options:
   - Alignment (left, center, right)
   - Size (thumbnail, medium, large, full)
   - Alt text for accessibility

---

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl/Cmd + S` - Save current content
- `Ctrl/Cmd + N` - Create new content
- `Ctrl/Cmd + /` - Toggle help panel
- `Esc` - Close modals/popups

### Editor Shortcuts
- `Ctrl/Cmd + B` - Bold text
- `Ctrl/Cmd + I` - Italic text
- `Ctrl/Cmd + K` - Insert link
- `Ctrl/Cmd + Shift + I` - Insert image
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Tab` - Indent list item
- `Shift + Tab` - Outdent list item

### Navigation Shortcuts
- `G then D` - Go to Dashboard
- `G then C` - Go to Content
- `G then M` - Go to Media
- `G then S` - Go to Settings

---

## Tips & Best Practices

### Content Writing
1. **Use Markdown**: Faster than visual editing for experienced users
2. **Frontmatter**: Add metadata at the top of Markdown files:
   ```yaml
   ---
   title: "My Post Title"
   date: 2024-01-20
   tags: ["tutorial", "tips"]
   draft: false
   ---
   ```
3. **SEO**: Always fill in meta descriptions and use descriptive titles
4. **Images**: Optimize before uploading (use tools like TinyPNG)

### Workflow Tips
1. **Draft Mode**: Save as draft to preview before publishing
2. **Scheduling**: Set future publish dates for automatic posting
3. **Templates**: Use content templates for consistent formatting
4. **Bulk Actions**: Select multiple items for batch operations

### Performance
1. **Image Optimization**: Use the built-in optimizer for best results
2. **Lazy Loading**: Enabled by default for all images
3. **CDN**: Media automatically served via CDN when available
4. **Caching**: Content cached for 1 hour, purge cache after major updates

---

## Troubleshooting

### Common Issues

#### Content Not Saving
- **Check connection**: Ensure you're connected to the internet
- **Browser storage**: Clear browser cache and cookies
- **Permissions**: Verify you have write permissions
- **Solution**: Copy content to clipboard, refresh page, paste and retry

#### Media Upload Fails
- **File size**: Ensure file is under 10MB
- **File type**: Check if format is supported
- **Storage space**: Verify available storage in System Status
- **Solution**: Compress image or convert to supported format

#### Editor Not Loading
- **JavaScript**: Enable JavaScript in browser
- **Browser compatibility**: Use Chrome, Firefox, Safari, or Edge (latest versions)
- **Extensions**: Disable ad blockers or script blockers
- **Solution**: Try incognito/private mode or different browser

#### Preview Not Updating
- **Cache**: Hard refresh with `Ctrl/Cmd + Shift + R`
- **Build status**: Check if build is running in System Status
- **Solution**: Wait 30 seconds and refresh, or trigger manual build

### Build & Deployment

#### Local Development
```bash
# Start the CMS server
npm run cms

# Access at http://localhost:3000/admin
```

#### Production Deployment
1. Click **Deploy** in Quick Actions
2. Changes pushed to Git automatically
3. Netlify/Vercel triggers build
4. Live in ~1-2 minutes

### Getting Help

#### Resources
- **Documentation**: `/docs` folder in project
- **API Reference**: `/api/docs` endpoint
- **Support**: Create issue in GitHub repository

#### Debug Mode
1. Add `?debug=true` to any admin URL
2. Opens developer console with verbose logging
3. Export logs via **Settings → Export Debug Log**

---

## Quick Reference

### File Structure
```
content/
├── blog/           # Blog posts
├── pages/          # Static pages
├── portfolio/      # Portfolio items
└── _index.md       # Homepage

static/
├── images/         # Image assets
├── uploads/        # User uploads
└── media/          # Processed media

data/
├── navigation.json # Menu structure
└── site.json       # Site settings
```

### Markdown Cheatsheet
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
[Link text](https://example.com)
![Image alt](image.jpg)

- Bullet list
1. Numbered list

> Blockquote

\`inline code\`

\`\`\`language
code block
\`\`\`
```

### Hugo Shortcodes
```markdown
{{< youtube VIDEO_ID >}}
{{< tweet TWEET_ID >}}
{{< codepen PEN_ID >}}
{{< link-item url="..." title="..." >}}
```

---

*Last updated: January 2025 | Version 1.0*