# Simple Content Development Tool

A clean, functional content management system for your Hugo portfolio site.

## Features

### 1. **CLI Tool** (`content-tool.js`)
- Create new content from templates
- List all existing content
- Validate content for issues
- Preview content with stats
- Build site with Hugo

### 2. **Web Editor** (`content-editor.html`)
- Live markdown preview
- Auto-save to browser storage
- Markdown toolbar buttons
- Frontmatter management
- Download as Hugo-ready files

## Quick Start

### Using the CLI Tool

#### Windows:
```bash
content-tool.bat
```

#### Mac/Linux:
```bash
node content-tool.js
```

### Using the Web Editor

Open in browser:
```
http://localhost:1313/content-editor.html
```

## CLI Tool Commands

### 1. Create New Content
- Choose from templates (blog, tool, strategy, poem, portfolio)
- Auto-generates proper frontmatter
- Creates file in correct location
- Optional: Opens in VS Code

### 2. List All Content
- Shows hierarchical view of all content
- Displays actual titles (not filenames)
- Color-coded by type

### 3. Validate Content
- Checks for missing frontmatter
- Verifies content length
- Finds broken internal links
- Reports all issues

### 4. Preview Content
- Shows frontmatter and content
- Displays word count
- Calculates reading time

### 5. Build Site
- Runs Hugo build
- Shows errors and warnings
- Color-coded output

## Web Editor Features

### Toolbar Buttons
- **H1, H2, H3**: Insert headings
- **Bold** (Ctrl+B): Make text bold
- **Italic** (Ctrl+I): Make text italic
- **Link** (Ctrl+K): Insert link
- **Image**: Insert image markdown
- **Code**: Insert inline code
- **Quote**: Insert blockquote
- **List**: Insert bullet list

### Keyboard Shortcuts
- `Ctrl+B`: Bold
- `Ctrl+I`: Italic
- `Ctrl+K`: Link
- `Ctrl+S`: Download file

### Auto-Save
- Saves to browser localStorage
- Persists between sessions
- Never lose your work

### Download
- Generates proper Hugo frontmatter
- Creates correctly formatted .md file
- Uses title for filename

## Content Templates

### Blog Post
```markdown
---
title: "Your Title"
date: 2025-08-18T...
draft: true
description: ""
categories: []
tags: []
---

## Introduction
[Your content here]

## Main Points
1. First point
2. Second point

## Conclusion
[Your conclusion here]
```

### Tool/Strategy
```markdown
---
title: "Tool Name"
date: 2025-08-18T...
description: ""
categories: ["tools"]
tags: []
---

## What it is
[Description]

## How to use it
[Instructions]

## Quick Specs
- Cost: 
- Platform: 
```

### Poetry
```markdown
---
title: "Poem Title"
date: 2025-08-18T...
categories: ["poetry"]
---

<div class="poem-original">
[Your poem here]
</div>

<div class="poem-translation">
*[Translation here]*
</div>
```

## File Organization

Content is organized as:
```
content/
├── writing/
│   ├── poetry/
│   ├── sounds/
│   └── visuals/
├── tools/
│   ├── what-i-use/
│   ├── strategies/
│   └── built/
├── photography/
└── me/
```

## Tips

1. **Use templates**: Start with a template for consistent formatting
2. **Validate regularly**: Run validation to catch issues early
3. **Preview before publishing**: Check how content looks
4. **Keep drafts**: Set `draft: true` until ready
5. **Tag appropriately**: Use consistent tags for better organization

## Troubleshooting

### CLI Tool won't start
- Make sure Node.js is installed
- Run `npm install` in project root

### Web editor not saving
- Check browser localStorage isn't full
- Try different browser

### Hugo build fails
- Run validation to find content issues
- Check Hugo is installed: `hugo version`

## Future Enhancements

Planned features:
- [ ] Image upload handling
- [ ] Batch operations
- [ ] Content scheduling
- [ ] SEO optimization checker
- [ ] Grammar/spell check
- [ ] Version history
- [ ] Collaborative editing

---

Built with simplicity and functionality in mind. No complex dependencies, just clean tools that work.