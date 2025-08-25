/**
 * Simple File-Based CMS JavaScript
 * Handles authentication, file loading, editing, and saving
 */

class SimpleCMS {
    constructor() {
        this.currentFile = null;
        this.files = [];
        this.authKey = 'simple-cms-auth';
        this.defaultPassword = 'admin123'; // In production, this should be configurable
        this.contentFiles = [
            'content/blog/post-1.md',
            'content/blog/post-2.md',
            'content/pages/about.md',
            'content/pages/contact.md',
            'content/projects/project-1.md',
            'content/projects/project-2.md'
        ];
        
        // Initialize sample content if needed
        this.initializeSampleContent();
    }
    
    /**
     * Initialize sample content for demo purposes
     */
    initializeSampleContent() {
        const sampleContent = {
            'content/blog/post-1.md': `---
title: "My First Blog Post"
date: "2024-01-15"
author: "John Doe"
tags: ["web development", "javascript"]
---

# My First Blog Post

Welcome to my blog! This is my first post about web development.

## What I'm Learning

- JavaScript fundamentals
- React development
- Node.js backend
- Database design

Stay tuned for more posts!`,
            
            'content/blog/post-2.md': `---
title: "Advanced JavaScript Techniques"
date: "2024-01-20"
author: "John Doe"
tags: ["javascript", "advanced", "programming"]
---

# Advanced JavaScript Techniques

Let's dive into some advanced JavaScript concepts.

## Async/Await

\`\`\`javascript
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}
\`\`\`

More content coming soon!`,
            
            'content/pages/about.md': `---
title: "About Me"
layout: "page"
---

# About Me

Hi, I'm a web developer passionate about creating amazing digital experiences.

## Skills

- Frontend Development
- Backend Development
- Database Design
- UI/UX Design

## Contact

Feel free to reach out if you'd like to work together!`,
            
            'content/pages/contact.md': `---
title: "Contact"
layout: "page"
---

# Contact Me

Get in touch through any of the following methods:

- **Email**: contact@example.com
- **Phone**: +1 (555) 123-4567
- **LinkedIn**: linkedin.com/in/johndoe

## Location

Based in New York, NY - Available for remote work worldwide.`,
            
            'content/projects/project-1.md': `---
title: "E-Commerce Platform"
category: "Web Development"
technologies: ["React", "Node.js", "MongoDB"]
status: "Completed"
---

# E-Commerce Platform

A full-stack e-commerce solution built with modern technologies.

## Features

- User authentication
- Product catalog
- Shopping cart
- Payment processing
- Admin dashboard

## Technologies Used

- **Frontend**: React, Redux, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Payment**: Stripe API`,
            
            'content/projects/project-2.md': `---
title: "Task Management App"
category: "Mobile Development"
technologies: ["React Native", "Firebase"]
status: "In Progress"
---

# Task Management App

A cross-platform mobile app for managing daily tasks and projects.

## Features

- Task creation and editing
- Project organization
- Team collaboration
- Real-time sync
- Offline support

## Current Status

Currently in development phase with core features implemented.`
        };
        
        // Store sample content in localStorage if not exists
        Object.keys(sampleContent).forEach(filePath => {
            const storageKey = `cms-file-${filePath}`;
            if (!localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, sampleContent[filePath]);
            }
        });
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return localStorage.getItem(this.authKey) === 'authenticated';
    }
    
    /**
     * Authenticate user
     */
    authenticate(password) {
        if (password === this.defaultPassword) {
            localStorage.setItem(this.authKey, 'authenticated');
            this.showAuthenticatedContent();
            this.loadFiles();
            this.showStatus('Authentication successful!', 'success');
            return true;
        } else {
            this.showStatus('Invalid password!', 'error');
            return false;
        }
    }
    
    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(this.authKey);
        this.hideAuthenticatedContent();
        document.getElementById('authPassword').value = '';
        this.showStatus('Logged out successfully!', 'success');
    }
    
    /**
     * Show authenticated content
     */
    showAuthenticatedContent() {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('authenticatedContent').classList.remove('hidden');
        document.getElementById('editorContent').classList.remove('hidden');
        document.getElementById('welcomeMessage').classList.add('hidden');
    }
    
    /**
     * Hide authenticated content
     */
    hideAuthenticatedContent() {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('authenticatedContent').classList.add('hidden');
        document.getElementById('editorContent').classList.add('hidden');
        document.getElementById('welcomeMessage').classList.remove('hidden');
    }
    
    /**
     * Load all content files
     */
    loadFiles() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        this.contentFiles.forEach(filePath => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.onclick = () => this.loadFile(filePath);
            
            const fileName = filePath.split('/').pop();
            const fileType = this.getFileType(filePath);
            
            fileItem.innerHTML = `
                <div>
                    <strong>${fileName}</strong>
                    <br>
                    <small>${fileType}</small>
                </div>
                <div style="font-size: 12px; color: #6c757d;">
                    ${this.getFileSize(filePath)}
                </div>
            `;
            
            fileList.appendChild(fileItem);
        });
    }
    
    /**
     * Get file type based on path
     */
    getFileType(filePath) {
        if (filePath.includes('/blog/')) return 'Blog Post';
        if (filePath.includes('/pages/')) return 'Page';
        if (filePath.includes('/projects/')) return 'Project';
        return 'Content';
    }
    
    /**
     * Get file size from localStorage
     */
    getFileSize(filePath) {
        const content = localStorage.getItem(`cms-file-${filePath}`) || '';
        const bytes = new Blob([content]).size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    
    /**
     * Load a specific file for editing
     */
    loadFile(filePath) {
        // Update active file in UI
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.file-item').classList.add('active');
        
        // Load file content
        const content = localStorage.getItem(`cms-file-${filePath}`) || '';
        document.getElementById('contentEditor').value = content;
        document.getElementById('currentFilePath').textContent = filePath;
        this.currentFile = filePath;
        
        this.showStatus(`Loaded: ${filePath}`, 'success');
    }
    
    /**
     * Save current file
     */
    saveFile() {
        if (!this.currentFile) {
            this.showStatus('No file selected!', 'error');
            return;
        }
        
        const content = document.getElementById('contentEditor').value;
        
        // Save to localStorage
        localStorage.setItem(`cms-file-${this.currentFile}`, content);
        
        // Also try to save via Netlify function
        this.saveToServer(this.currentFile, content);
        
        this.showStatus(`Saved: ${this.currentFile}`, 'success');
    }
    
    /**
     * Save file to server via Netlify function
     */
    async saveToServer(filePath, content) {
        try {
            const response = await fetch('/.netlify/functions/save-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filePath,
                    content,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                console.log('File saved to server successfully');
            } else {
                console.log('Server save failed, content saved locally');
            }
        } catch (error) {
            console.log('Server save error, content saved locally:', error);
        }
    }
    
    /**
     * Preview current file (basic markdown rendering)
     */
    previewFile() {
        if (!this.currentFile) {
            this.showStatus('No file selected!', 'error');
            return;
        }
        
        const content = document.getElementById('contentEditor').value;
        const { frontmatter, markdown } = this.parseFrontmatter(content);
        
        // Create preview window
        const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview: ${frontmatter.title || 'Content'}</title>
                <style>
                    body { font-family: Georgia, serif; max-width: 800px; margin: 50px auto; padding: 20px; line-height: 1.6; }
                    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    h2 { color: #34495e; margin-top: 30px; }
                    pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
                    code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
                    blockquote { border-left: 4px solid #3498db; margin-left: 0; padding-left: 20px; font-style: italic; }
                    .frontmatter { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
                    .frontmatter h3 { margin-top: 0; color: #7f8c8d; }
                </style>
            </head>
            <body>
                ${frontmatter && Object.keys(frontmatter).length > 0 ? `
                    <div class="frontmatter">
                        <h3>Frontmatter</h3>
                        <pre>${JSON.stringify(frontmatter, null, 2)}</pre>
                    </div>
                ` : ''}
                <div>${this.markdownToHtml(markdown)}</div>
            </body>
            </html>
        `);
        previewWindow.document.close();
    }
    
    /**
     * Parse frontmatter from content
     */
    parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (match) {
            const frontmatterText = match[1];
            const markdown = match[2];
            
            try {
                const frontmatter = {};
                frontmatterText.split('\n').forEach(line => {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length > 0) {
                        let value = valueParts.join(':').trim();
                        // Remove quotes
                        value = value.replace(/^["'](.*)["']$/, '$1');
                        frontmatter[key.trim()] = value;
                    }
                });
                
                return { frontmatter, markdown };
            } catch (error) {
                console.error('Frontmatter parsing error:', error);
                return { frontmatter: {}, markdown: content };
            }
        }
        
        return { frontmatter: {}, markdown: content };
    }
    
    /**
     * Simple markdown to HTML conversion
     */
    markdownToHtml(markdown) {
        return markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[hul])/gm, '<p>')
            .replace(/(?<![hul]>)$/gm, '</p>')
            .replace(/<p><\/p>/g, '');
    }
    
    /**
     * Show status message
     */
    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.classList.remove('hidden');
        
        setTimeout(() => {
            status.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * Refresh file list
     */
    refreshFiles() {
        this.loadFiles();
        this.showStatus('Files refreshed!', 'success');
    }
}

// Global CMS instance
let cms;

// Global functions for HTML onclick events
function authenticate() {
    const password = document.getElementById('authPassword').value;
    if (!cms) cms = new SimpleCMS();
    cms.authenticate(password);
}

function logout() {
    if (cms) cms.logout();
}

function saveFile() {
    if (cms) cms.saveFile();
}

function previewFile() {
    if (cms) cms.previewFile();
}

function refreshFiles() {
    if (cms) cms.refreshFiles();
}

function checkAuthentication() {
    cms = new SimpleCMS();
    if (cms.isAuthenticated()) {
        cms.showAuthenticatedContent();
        cms.loadFiles();
    }
}