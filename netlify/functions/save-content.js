/**
 * Netlify Function: Save Content
 * Handles saving content files via serverless function
 * Can integrate with Git API, Netlify Forms, or file system
 */

const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed',
                message: 'Only POST requests are supported'
            }),
        };
    }

    try {
        // Parse request body
        const { filePath, content, timestamp } = JSON.parse(event.body);
        
        // Validate input
        if (!filePath || content === undefined) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid input',
                    message: 'filePath and content are required'
                }),
            };
        }

        // Security check: ensure file path is within allowed directories
        const allowedPaths = ['content/', 'static/', 'src/'];
        const isAllowed = allowedPaths.some(allowedPath => 
            filePath.startsWith(allowedPath)
        );
        
        if (!isAllowed) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ 
                    error: 'Forbidden',
                    message: 'File path not in allowed directories'
                }),
            };
        }

        // For demo purposes, we'll save to a temporary location
        // In production, you might want to:
        // 1. Save to Git repository via GitHub API
        // 2. Save to a database
        // 3. Save to cloud storage (AWS S3, Google Cloud Storage)
        // 4. Trigger a build process

        const result = await saveContentDemo(filePath, content, timestamp);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Content saved successfully',
                filePath,
                timestamp,
                ...result
            }),
        };

    } catch (error) {
        console.error('Save content error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: 'Failed to save content'
            }),
        };
    }
};

/**
 * Demo implementation of content saving
 * In production, replace this with your preferred storage method
 */
async function saveContentDemo(filePath, content, timestamp) {
    try {
        // Method 1: Save to Netlify Forms (for logging/backup)
        const formData = {
            'form-name': 'cms-content-save',
            'file-path': filePath,
            'content': content,
            'timestamp': timestamp,
            'content-length': content.length
        };

        // In a real implementation, you might:
        // 1. Use GitHub API to commit to repository
        await saveToGitHub(filePath, content);
        
        // 2. Save to a database
        await saveToDatabase(filePath, content, timestamp);
        
        // 3. Trigger site rebuild
        await triggerRebuild();

        return {
            method: 'demo',
            saved_at: new Date().toISOString(),
            content_length: content.length,
            backup_created: true
        };
    } catch (error) {
        console.error('Demo save error:', error);
        throw error;
    }
}

/**
 * Save content to GitHub repository (example implementation)
 */
async function saveToGitHub(filePath, content) {
    // This would require GitHub API integration
    // Example using Octokit:
    /*
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });
    
    try {
        // Get current file to get SHA
        let sha;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: 'your-username',
                repo: 'your-repo',
                path: filePath
            });
            sha = data.sha;
        } catch (error) {
            // File doesn't exist, that's ok
        }
        
        // Create or update file
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: 'your-username',
            repo: 'your-repo',
            path: filePath,
            message: `Update ${filePath} via CMS`,
            content: Buffer.from(content).toString('base64'),
            sha: sha
        });
        
        return { github: 'success' };
    } catch (error) {
        console.error('GitHub save error:', error);
        return { github: 'error', error: error.message };
    }
    */
    
    // For demo, just return success
    return { github: 'demo-mode' };
}

/**
 * Save content to database (example implementation)
 */
async function saveToDatabase(filePath, content, timestamp) {
    // This would require database integration
    // Example with Supabase, Firebase, or any database:
    /*
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
        .from('content_files')
        .upsert({
            file_path: filePath,
            content: content,
            updated_at: timestamp
        });
        
    if (error) throw error;
    return { database: 'success', id: data[0].id };
    */
    
    // For demo, just return success
    return { database: 'demo-mode' };
}

/**
 * Trigger site rebuild (example implementation)
 */
async function triggerRebuild() {
    // Trigger Netlify build hook
    /*
    if (process.env.NETLIFY_BUILD_HOOK) {
        const response = await fetch(process.env.NETLIFY_BUILD_HOOK, {
            method: 'POST'
        });
        return { rebuild: response.ok ? 'triggered' : 'failed' };
    }
    */
    
    return { rebuild: 'demo-mode' };
}

/**
 * Alternative: Save to file system (if running on server with file access)
 * Note: This won't work on Netlify Functions due to read-only filesystem
 */
async function saveToFileSystem(filePath, content) {
    try {
        const fullPath = path.join('/tmp', filePath);
        const dir = path.dirname(fullPath);
        
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        
        // Write file
        await fs.writeFile(fullPath, content, 'utf8');
        
        return { 
            filesystem: 'success',
            path: fullPath,
            size: Buffer.byteLength(content, 'utf8')
        };
    } catch (error) {
        console.error('Filesystem save error:', error);
        return { filesystem: 'error', error: error.message };
    }
}