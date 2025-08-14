// unified-server.js - Complete Backend for All Hugo Management Tools
// This single server handles Dashboard, Review Tool, and Bulk Upload System

const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const sharp = require('sharp');
const pdf = require('pdf-parse');
const matter = require('gray-matter');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const type = req.body.type || 'general';
        const uploadPath = path.join(process.cwd(), 'static', 'uploads', type);
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = {
            image: /\.(jpg|jpeg|png|gif|webp)$/i,
            video: /\.(mp4|webm|avi|mov)$/i,
            pdf: /\.pdf$/i,
            document: /\.(md|txt|doc|docx)$/i
        };
        
        const isValid = Object.values(allowedTypes).some(regex => regex.test(file.originalname));
        cb(null, isValid);
    }
});

// Global state management
const globalState = {
    hugoServerProcess: null,
    contentDatabase: {
        revisions: {},
        comments: {},
        approvals: {},
        qualityScores: {},
        autosaves: {}
    },
    uploadQueue: [],
    processingStatus: {}
};

// ============================================
// DASHBOARD API ENDPOINTS
// ============================================

// Create new content
app.post('/api/dashboard/create', async (req, res) => {
    const { title, section, language, tags, description, isDraft } = req.body;
    
    try {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const commands = [];
        
        // Section mappings for Spanish
        const sectionMappings = {
            'learn/built': 'aprender/construido',
            'learn/found': 'aprender/encontrado',
            'learn/strategies': 'aprender/estrategias',
            'make/sounds': 'hacer/sonidos',
            'make/visuals': 'hacer/visuales',
            'make/words': 'hacer/palabras',
            'meet/me': 'conocer/yo',
            'meet/work': 'conocer/trabajo',
            'think/links': 'pensar/enlaces',
            'think/positions': 'pensar/posiciones'
        };
        
        if (language === 'both' || language === 'en') {
            commands.push(`hugo new ${section}/${slug}.md`);
        }
        
        if (language === 'both' || language === 'es') {
            const esSection = sectionMappings[section] || section;
            commands.push(`hugo new es/${esSection}/${slug}.md`);
        }
        
        // Execute commands
        for (const cmd of commands) {
            await execPromise(cmd, { cwd: process.cwd() });
        }
        
        // Update front matter if needed
        if (tags || description) {
            await updateFrontMatter(section, slug, language, { tags, description, draft: isDraft });
        }
        
        res.json({ 
            success: true, 
            message: 'Content created successfully', 
            files: commands,
            slug 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start/Stop Hugo server
app.post('/api/dashboard/server/:action', async (req, res) => {
    const { action } = req.params;
    
    if (action === 'start') {
        if (globalState.hugoServerProcess) {
            return res.json({ success: false, message: 'Server already running' });
        }
        
        globalState.hugoServerProcess = exec('hugo server -D --navigateToChanged', (error, stdout, stderr) => {
            if (error) console.error(`Error: ${error}`);
        });
        
        res.json({ success: true, message: 'Server started', pid: globalState.hugoServerProcess.pid });
    } else if (action === 'stop') {
        if (globalState.hugoServerProcess) {
            globalState.hugoServerProcess.kill();
            globalState.hugoServerProcess = null;
            res.json({ success: true, message: 'Server stopped' });
        } else {
            res.json({ success: false, message: 'Server not running' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid action' });
    }
});

// Build site
app.post('/api/dashboard/build', async (req, res) => {
    try {
        const { stdout, stderr } = await execPromise('hugo --minify');
        res.json({ 
            success: true, 
            message: 'Site built successfully',
            output: stdout,
            warnings: stderr 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get site statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = await getSiteStatistics();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REVIEW TOOL API ENDPOINTS
// ============================================

// Get all content files with metadata
app.get('/api/review/content', async (req, res) => {
    try {
        const { status, section, search } = req.query;
        const contentFiles = await getAllContentFiles();
        
        let filteredFiles = contentFiles;
        
        if (status) {
            filteredFiles = filteredFiles.filter(f => f.status === status);
        }
        if (section) {
            filteredFiles = filteredFiles.filter(f => f.path.includes(`/${section}/`));
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredFiles = filteredFiles.filter(f => 
                f.title.toLowerCase().includes(searchLower) ||
                f.content.toLowerCase().includes(searchLower)
            );
        }
        
        res.json(filteredFiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific content file
app.get('/api/review/content/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = Buffer.from(id, 'base64').toString('utf-8');
        const content = await getContentFile(filePath);
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save content with revision
app.post('/api/review/content/:id/save', async (req, res) => {
    try {
        const { id } = req.params;
        const { frontMatter, content } = req.body;
        const filePath = Buffer.from(id, 'base64').toString('utf-8');
        
        // Create revision before saving
        await createRevision(filePath);
        
        // Combine front matter and content
        const fullContent = `${frontMatter}\n\n${content}`;
        
        // Save file
        await fs.writeFile(filePath, fullContent, 'utf8');
        
        res.json({ 
            success: true, 
            message: 'Content saved successfully',
            revisionId: crypto.randomBytes(8).toString('hex')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Quality check
app.post('/api/review/quality', async (req, res) => {
    try {
        const { content, frontMatter } = req.body;
        const qualityReport = await performQualityCheck(content, frontMatter);
        res.json(qualityReport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BULK UPLOAD API ENDPOINTS
// ============================================

// Process bulk images
app.post('/api/bulk/images', upload.array('images', 50), async (req, res) => {
    try {
        const { section, subsection, customPath } = req.body;
        const processedFiles = [];
        
        for (const file of req.files) {
            // Process image (resize, optimize)
            const processedImage = await processImage(file);
            
            // Generate Hugo content
            const hugoContent = await generateImageContent(processedImage, section, subsection, customPath);
            
            processedFiles.push(hugoContent);
        }
        
        res.json({ 
            success: true, 
            processed: processedFiles.length,
            files: processedFiles 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process YouTube videos
app.post('/api/bulk/youtube', async (req, res) => {
    try {
        const { urls, section, subsection, customPath } = req.body;
        const processedVideos = [];
        
        for (const url of urls) {
            const videoId = extractYouTubeId(url);
            if (videoId) {
                const metadata = await fetchYouTubeMetadata(videoId);
                const hugoContent = await generateYouTubeContent(metadata, section, subsection, customPath);
                processedVideos.push(hugoContent);
            }
        }
        
        res.json({ 
            success: true, 
            processed: processedVideos.length,
            files: processedVideos 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process PDFs
app.post('/api/bulk/pdf', upload.array('pdfs', 20), async (req, res) => {
    try {
        const { section, subsection, customPath } = req.body;
        const processedPDFs = [];
        
        for (const file of req.files) {
            const pdfData = await processPDF(file);
            const hugoContent = await generatePDFContent(pdfData, section, subsection, customPath);
            processedPDFs.push(hugoContent);
        }
        
        res.json({ 
            success: true, 
            processed: processedPDFs.length,
            files: processedPDFs 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process social media posts
app.post('/api/bulk/social', async (req, res) => {
    try {
        const { platform, posts, section, subsection, customPath } = req.body;
        const processedPosts = [];
        
        for (const post of posts) {
            const hugoContent = await generateSocialContent(platform, post, section, subsection, customPath);
            processedPosts.push(hugoContent);
        }
        
        res.json({ 
            success: true, 
            processed: processedPosts.length,
            files: processedPosts 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate bulk content files
app.post('/api/bulk/generate', async (req, res) => {
    try {
        const { items, section, subsection, customPath, format } = req.body;
        let output;
        
        switch (format) {
            case 'hugo':
                output = await generateHugoFiles(items, section, subsection, customPath);
                break;
            case 'batch':
                output = generateBatchCommands(items, section, subsection, customPath);
                break;
            case 'json':
                output = JSON.stringify(items, null, 2);
                break;
            case 'csv':
                output = generateCSV(items);
                break;
            default:
                output = await generateHugoFiles(items, section, subsection, customPath);
        }
        
        res.json({ 
            success: true, 
            output,
            format,
            itemCount: items.length 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SHARED HELPER FUNCTIONS
// ============================================

async function getSiteStatistics() {
    const contentDir = path.join(process.cwd(), 'content');
    let totalPosts = 0;
    let draftPosts = 0;
    let publishedPosts = 0;
    let bilingualPosts = 0;
    
    async function countFiles(dir) {
        const files = await fs.readdir(dir, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            
            if (file.isDirectory()) {
                await countFiles(fullPath);
            } else if (file.name.endsWith('.md')) {
                totalPosts++;
                
                const content = await fs.readFile(fullPath, 'utf8');
                if (content.includes('draft: true')) {
                    draftPosts++;
                } else {
                    publishedPosts++;
                }
                
                // Check for translation
                const baseName = file.name.replace('.md', '');
                const esFile = fullPath.replace('/content/', '/content/es/');
                try {
                    await fs.access(esFile);
                    bilingualPosts++;
                } catch {}
            }
        }
    }
    
    await countFiles(contentDir);
    
    return {
        totalPosts,
        draftPosts,
        publishedPosts,
        bilingualPosts
    };
}

async function getAllContentFiles() {
    const contentDir = path.join(process.cwd(), 'content');
    const files = [];
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md')) {
                const content = await fs.readFile(fullPath, 'utf8');
                const parsed = matter(content);
                const stats = await fs.stat(fullPath);
                
                files.push({
                    id: Buffer.from(fullPath).toString('base64'),
                    path: fullPath.replace(process.cwd(), ''),
                    title: parsed.data.title || item.name.replace('.md', ''),
                    status: determineStatus(parsed.data),
                    wordCount: parsed.content.split(/\s+/).length,
                    modified: stats.mtime,
                    frontMatter: parsed.data,
                    content: parsed.content,
                    excerpt: parsed.content.substring(0, 200) + '...'
                });
            }
        }
    }
    
    await scanDir(contentDir);
    return files.sort((a, b) => b.modified - a.modified);
}

async function getContentFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);
    const stats = await fs.stat(filePath);
    
    return {
        id: Buffer.from(filePath).toString('base64'),
        path: filePath.replace(process.cwd(), ''),
        title: parsed.data.title || path.basename(filePath, '.md'),
        frontMatter: matter.stringify('', parsed.data).trim(),
        content: parsed.content,
        data: parsed.data,
        modified: stats.mtime,
        wordCount: parsed.content.split(/\s+/).length
    };
}

function determineStatus(frontMatter) {
    if (frontMatter.status) return frontMatter.status;
    if (frontMatter.archived) return 'archived';
    if (frontMatter.published) return 'published';
    if (frontMatter.approved) return 'approved';
    if (frontMatter.draft === false) return 'published';
    if (frontMatter.review) return 'review';
    return 'draft';
}

async function createRevision(filePath) {
    const revisionId = crypto.randomBytes(8).toString('hex');
    
    try {
        await execPromise('git add .', { cwd: process.cwd() });
        await execPromise(
            `git commit -m "Content revision: ${path.basename(filePath)} - ${revisionId}"`,
            { cwd: process.cwd() }
        );
    } catch (error) {
        // If not a git repo, store revision in memory
        if (!globalState.contentDatabase.revisions[filePath]) {
            globalState.contentDatabase.revisions[filePath] = [];
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        globalState.contentDatabase.revisions[filePath].push({
            id: revisionId,
            content,
            date: new Date().toISOString(),
            author: 'System'
        });
    }
    
    return revisionId;
}

async function updateFrontMatter(section, slug, language, updates) {
    const files = [];
    
    if (language === 'en' || language === 'both') {
        files.push(`content/${section}/${slug}.md`);
    }
    
    if (language === 'es' || language === 'both') {
        const sectionMappings = {
            'learn/built': 'aprender/construido',
            'learn/found': 'aprender/encontrado',
            'learn/strategies': 'aprender/estrategias',
            'make/sounds': 'hacer/sonidos',
            'make/visuals': 'hacer/visuales',
            'make/words': 'hacer/palabras',
            'meet/me': 'conocer/yo',
            'meet/work': 'conocer/trabajo',
            'think/links': 'pensar/enlaces',
            'think/positions': 'pensar/posiciones'
        };
        const esSection = sectionMappings[section] || section;
        files.push(`content/es/${esSection}/${slug}.md`);
    }
    
    for (const file of files) {
        try {
            let content = await fs.readFile(file, 'utf8');
            
            if (updates.draft !== undefined) {
                content = content.replace(/draft:\s*\w+/, `draft: ${updates.draft}`);
            }
            
            if (updates.tags) {
                const tagsArray = updates.tags.split(',').map(t => `"${t.trim()}"`).join(', ');
                content = content.replace(/tags:\s*\[\]/, `tags: [${tagsArray}]`);
            }
            
            if (updates.description) {
                content = content.replace(/description:\s*""/, `description: "${updates.description}"`);
            }
            
            await fs.writeFile(file, content);
        } catch (err) {
            console.error(`Error updating ${file}:`, err);
        }
    }
}

async function performQualityCheck(content, frontMatter) {
    const checks = [];
    let score = 100;
    
    const fm = typeof frontMatter === 'string' ? matter(frontMatter).data : frontMatter;
    
    // Check 1: Meta description
    if (!fm.description || fm.description.length < 50) {
        checks.push({
            type: 'warning',
            message: 'Meta description missing or too short',
            fixable: true
        });
        score -= 10;
    } else {
        checks.push({
            type: 'pass',
            message: 'SEO meta description present'
        });
    }
    
    // Check 2: Word count
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) {
        checks.push({
            type: 'warning',
            message: `Content too short (${wordCount} words)`,
            fixable: false
        });
        score -= 15;
    } else {
        checks.push({
            type: 'pass',
            message: `Appropriate word count (${wordCount} words)`
        });
    }
    
    // Check 3: Images alt text
    const imageMatches = content.match(/!\[([^\]]*)\]/g) || [];
    const missingAlt = imageMatches.filter(img => img === '![]').length;
    if (missingAlt > 0) {
        checks.push({
            type: 'warning',
            message: `Missing alt text for ${missingAlt} image(s)`,
            fixable: true
        });
        score -= 5 * missingAlt;
    }
    
    // Check 4: Headers structure
    const headers = content.match(/^#{1,6}\s.+$/gm) || [];
    if (headers.length === 0) {
        checks.push({
            type: 'warning',
            message: 'No headers found in content',
            fixable: true
        });
        score -= 10;
    }
    
    score = Math.max(0, score);
    
    return {
        score,
        checks,
        passed: checks.filter(c => c.type === 'pass').length,
        warnings: checks.filter(c => c.type === 'warning').length,
        failures: checks.filter(c => c.type === 'fail').length
    };
}

// Image processing
async function processImage(file) {
    const outputPath = file.path.replace(/\.[^.]+$/, '-optimized.webp');
    
    await sharp(file.path)
        .resize(1920, null, { 
            withoutEnlargement: true,
            fit: 'inside'
        })
        .webp({ quality: 85 })
        .toFile(outputPath);
    
    return {
        original: file,
        optimized: outputPath,
        dimensions: await sharp(file.path).metadata()
    };
}

async function generateImageContent(imageData, section, subsection, customPath) {
    const slug = path.basename(imageData.original.filename, path.extname(imageData.original.filename));
    const contentPath = customPath ? 
        `content/${section}/${subsection}/${customPath}` : 
        `content/${section}/${subsection}`;
    
    const frontMatter = {
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        date: new Date().toISOString(),
        draft: false,
        type: 'image',
        image: `/uploads/images/${imageData.original.filename}`,
        alt: '',
        width: imageData.dimensions.width,
        height: imageData.dimensions.height
    };
    
    const content = matter.stringify('', frontMatter);
    const filePath = path.join(contentPath, `${slug}.md`);
    
    await fs.mkdir(contentPath, { recursive: true });
    await fs.writeFile(filePath, content);
    
    return { path: filePath, slug, frontMatter };
}

// YouTube processing
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function fetchYouTubeMetadata(videoId) {
    // In production, you'd use YouTube API
    // For now, return mock data
    return {
        id: videoId,
        title: `YouTube Video ${videoId}`,
        description: 'Video description',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: '10:30',
        publishedAt: new Date().toISOString()
    };
}

async function generateYouTubeContent(metadata, section, subsection, customPath) {
    const slug = metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const contentPath = customPath ? 
        `content/${section}/${subsection}/${customPath}` : 
        `content/${section}/${subsection}`;
    
    const frontMatter = {
        title: metadata.title,
        date: new Date().toISOString(),
        draft: false,
        type: 'youtube',
        videoId: metadata.id,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration
    };
    
    const content = matter.stringify(`{{< youtube ${metadata.id} >}}\n\n${metadata.description}`, frontMatter);
    const filePath = path.join(contentPath, `${slug}.md`);
    
    await fs.mkdir(contentPath, { recursive: true });
    await fs.writeFile(filePath, content);
    
    return { path: filePath, slug, frontMatter };
}

// PDF processing
async function processPDF(file) {
    const dataBuffer = await fs.readFile(file.path);
    const data = await pdf(dataBuffer);
    
    return {
        file,
        text: data.text,
        pages: data.numpages,
        info: data.info
    };
}

async function generatePDFContent(pdfData, section, subsection, customPath) {
    const slug = path.basename(pdfData.file.filename, '.pdf');
    const contentPath = customPath ? 
        `content/${section}/${subsection}/${customPath}` : 
        `content/${section}/${subsection}`;
    
    const frontMatter = {
        title: pdfData.info?.Title || slug.replace(/-/g, ' '),
        date: new Date().toISOString(),
        draft: false,
        type: 'pdf',
        file: `/uploads/pdf/${pdfData.file.filename}`,
        pages: pdfData.pages
    };
    
    const content = matter.stringify(pdfData.text.substring(0, 500) + '...', frontMatter);
    const filePath = path.join(contentPath, `${slug}.md`);
    
    await fs.mkdir(contentPath, { recursive: true });
    await fs.writeFile(filePath, content);
    
    return { path: filePath, slug, frontMatter };
}

// Social media content generation
async function generateSocialContent(platform, post, section, subsection, customPath) {
    const slug = `${platform}-${Date.now()}`;
    const contentPath = customPath ? 
        `content/${section}/${subsection}/${customPath}` : 
        `content/${section}/${subsection}`;
    
    const frontMatter = {
        title: post.title || `${platform} Post`,
        date: new Date().toISOString(),
        draft: false,
        type: 'social',
        platform,
        hashtags: post.hashtags || [],
        engagement: post.engagement || {}
    };
    
    const content = matter.stringify(post.content || post.caption || '', frontMatter);
    const filePath = path.join(contentPath, `${slug}.md`);
    
    await fs.mkdir(contentPath, { recursive: true });
    await fs.writeFile(filePath, content);
    
    return { path: filePath, slug, frontMatter };
}

// Bulk generation functions
async function generateHugoFiles(items, section, subsection, customPath) {
    const results = [];
    
    for (const item of items) {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const contentPath = customPath ? 
            `content/${section}/${subsection}/${customPath}` : 
            `content/${section}/${subsection}`;
        
        const frontMatter = {
            title: item.name,
            date: new Date().toISOString(),
            draft: false,
            type: item.type,
            ...item.metadata
        };
        
        let contentBody = '';
        if (item.type === 'youtube' && item.videoId) {
            contentBody = `{{< youtube ${item.videoId} >}}`;
        } else if (item.type === 'image') {
            contentBody = `![${item.name}](/images/${slug})`;
        } else if (item.content) {
            contentBody = item.content;
        }
        
        const content = matter.stringify(contentBody, frontMatter);
        const filePath = path.join(contentPath, `${slug}.md`);
        
        await fs.mkdir(contentPath, { recursive: true });
        await fs.writeFile(filePath, content);
        
        results.push({ 
            path: filePath, 
            slug, 
            frontMatter,
            success: true 
        });
    }
    
    return results;
}

function generateBatchCommands(items, section, subsection, customPath) {
    const path = customPath ? 
        `${section}/${subsection}/${customPath}` : 
        `${section}/${subsection}`;
    
    let commands = `# PowerShell Batch Commands\n\n`;
    commands += `# Create directory structure\n`;
    commands += `New-Item -ItemType Directory -Path "content/${path}" -Force\n\n`;
    
    items.forEach(item => {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        commands += `hugo new ${path}/${slug}.md\n`;
    });
    
    commands += `\n# Start Hugo server\n`;
    commands += `hugo server -D --navigateToChanged\n`;
    
    return commands;
}

function generateCSV(items) {
    let csv = 'Name,Type,Path,Status,Tags\n';
    items.forEach(item => {
        const tags = item.hashtags ? item.hashtags.join(';') : '';
        csv += `"${item.name}","${item.type}","${item.path || ''}","${item.status || 'pending'}","${tags}"\n`;
    });
    return csv;
}

// WebSocket for real-time updates (optional)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        // Broadcast updates to all connected clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'update',
                    data: data
                }));
            }
        });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        hugoServer: globalState.hugoServerProcess ? 'running' : 'stopped'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Unified Hugo Management Backend`);
    console.log(`================================`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket running on ws://localhost:3001`);
    console.log(`\nEndpoints:`);
    console.log(`  Dashboard: http://localhost:${PORT}/api/dashboard/*`);
    console.log(`  Review:    http://localhost:${PORT}/api/review/*`);
    console.log(`  Bulk:      http://localhost:${PORT}/api/bulk/*`);
    console.log(`\nMake sure to run this from your Hugo project root directory`);
});

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    
    if (globalState.hugoServerProcess) {
        console.log('Stopping Hugo server...');
        globalState.hugoServerProcess.kill();
    }
    
    wss.close(() => {
        console.log('WebSocket server closed');
    });
    
    process.exit();
});