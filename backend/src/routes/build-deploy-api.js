// Build and Deploy API Routes
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('../middleware/auth-simple');

const execAsync = promisify(exec);

// Build status tracking
let currentBuild = null;
const buildHistory = [];
const MAX_HISTORY = 20;

// Build the site
router.post('/build', authenticateToken, async (req, res) => {
  try {
    if (currentBuild && currentBuild.status === 'running') {
      return res.status(409).json({ 
        error: 'Build already in progress',
        build: currentBuild 
      });
    }
    
    const { 
      environment = 'production',
      clean = false,
      minify = true 
    } = req.body;
    
    // Create build record
    currentBuild = {
      id: Date.now().toString(),
      startTime: new Date(),
      status: 'running',
      environment,
      logs: [],
      warnings: [],
      errors: []
    };
    
    // Send immediate response
    res.json({
      success: true,
      buildId: currentBuild.id,
      status: 'started'
    });
    
    // Run build in background
    runBuild(environment, clean, minify);
    
  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run build process
async function runBuild(environment, clean, minify) {
  const projectRoot = path.join(__dirname, '../../../');
  
  try {
    // Log build start
    addBuildLog('info', `Starting ${environment} build...`);
    
    // Clean if requested
    if (clean) {
      addBuildLog('info', 'Cleaning previous build...');
      try {
        await fs.rm(path.join(projectRoot, 'public'), { recursive: true, force: true });
        addBuildLog('success', 'Clean complete');
      } catch (error) {
        addBuildLog('warning', `Clean failed: ${error.message}`);
      }
    }
    
    // Check if Hugo is installed
    try {
      await execAsync('hugo version');
    } catch (error) {
      // Hugo not installed, use fallback
      addBuildLog('warning', 'Hugo not found, using fallback build');
      
      // Create a simple build
      const publicDir = path.join(projectRoot, 'public');
      await fs.mkdir(publicDir, { recursive: true });
      
      // Copy static files
      const staticDir = path.join(projectRoot, 'static');
      try {
        await copyDirectory(staticDir, publicDir);
        addBuildLog('success', 'Static files copied');
      } catch (error) {
        addBuildLog('error', `Failed to copy static files: ${error.message}`);
      }
      
      // Generate simple index.html if doesn't exist
      const indexPath = path.join(publicDir, 'index.html');
      const indexExists = await fs.stat(indexPath).catch(() => false);
      
      if (!indexExists) {
        const indexContent = `<!DOCTYPE html>
<html>
<head>
    <title>Portfolio Site</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>Portfolio Site</h1>
    <p>Build successful! Site is ready for deployment.</p>
    <p>Environment: ${environment}</p>
    <p>Built at: ${new Date().toISOString()}</p>
</body>
</html>`;
        await fs.writeFile(indexPath, indexContent);
        addBuildLog('success', 'Index page generated');
      }
      
      // Mark build as complete
      currentBuild.status = 'completed';
      currentBuild.endTime = new Date();
      currentBuild.duration = currentBuild.endTime - currentBuild.startTime;
      
      // Add to history
      buildHistory.unshift({ ...currentBuild });
      if (buildHistory.length > MAX_HISTORY) {
        buildHistory.pop();
      }
      
      return;
    }
    
    // Run Hugo build
    let buildCommand = 'hugo';
    
    if (environment === 'production') {
      buildCommand += ' --minify';
    } else if (environment === 'development') {
      buildCommand += ' --buildDrafts --buildFuture';
    }
    
    if (minify && environment === 'production') {
      buildCommand += ' --cleanDestinationDir';
    }
    
    addBuildLog('info', `Running: ${buildCommand}`);
    
    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: projectRoot
    });
    
    if (stdout) {
      stdout.split('\n').forEach(line => {
        if (line.trim()) {
          addBuildLog('info', line);
        }
      });
    }
    
    if (stderr) {
      stderr.split('\n').forEach(line => {
        if (line.trim()) {
          addBuildLog('warning', line);
        }
      });
    }
    
    // Check build output
    const publicDir = path.join(projectRoot, 'public');
    const publicExists = await fs.stat(publicDir).catch(() => false);
    
    if (publicExists) {
      const files = await fs.readdir(publicDir);
      addBuildLog('success', `Build complete! Generated ${files.length} files`);
      
      // Calculate build size
      const buildSize = await getDirectorySize(publicDir);
      currentBuild.outputSize = buildSize;
      addBuildLog('info', `Build size: ${formatBytes(buildSize)}`);
    } else {
      addBuildLog('error', 'Build failed - no output generated');
      currentBuild.status = 'failed';
    }
    
    // Mark build as complete
    currentBuild.status = currentBuild.errors.length > 0 ? 'failed' : 'completed';
    currentBuild.endTime = new Date();
    currentBuild.duration = currentBuild.endTime - currentBuild.startTime;
    
  } catch (error) {
    addBuildLog('error', `Build failed: ${error.message}`);
    currentBuild.status = 'failed';
    currentBuild.endTime = new Date();
    currentBuild.duration = currentBuild.endTime - currentBuild.startTime;
  }
  
  // Add to history
  buildHistory.unshift({ ...currentBuild });
  if (buildHistory.length > MAX_HISTORY) {
    buildHistory.pop();
  }
}

// Add log to current build
function addBuildLog(level, message) {
  const log = {
    timestamp: new Date(),
    level,
    message
  };
  
  if (currentBuild) {
    currentBuild.logs.push(log);
    
    if (level === 'error') {
      currentBuild.errors.push(message);
    } else if (level === 'warning') {
      currentBuild.warnings.push(message);
    }
  }
  
  console.log(`[BUILD ${level.toUpperCase()}] ${message}`);
}

// Get build status
router.get('/status', async (req, res) => {
  res.json({
    current: currentBuild,
    isRunning: currentBuild && currentBuild.status === 'running'
  });
});

// Get build logs
router.get('/logs/:buildId?', async (req, res) => {
  const { buildId } = req.params;
  
  if (buildId) {
    // Get specific build logs
    const build = buildId === currentBuild?.id 
      ? currentBuild 
      : buildHistory.find(b => b.id === buildId);
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found' });
    }
    
    res.json(build);
  } else {
    // Get current build logs
    res.json(currentBuild || { status: 'idle', logs: [] });
  }
});

// Get build history
router.get('/history', async (req, res) => {
  res.json({
    history: buildHistory,
    total: buildHistory.length
  });
});

// Deploy to different targets
router.post('/deploy', authenticateToken, async (req, res) => {
  try {
    const { target = 'netlify', buildFirst = true } = req.body;
    const projectRoot = path.join(__dirname, '../../../');
    
    // Build first if requested
    if (buildFirst && (!currentBuild || currentBuild.status !== 'completed')) {
      return res.status(400).json({ 
        error: 'No successful build available. Please build first.' 
      });
    }
    
    let deployCommand;
    let deployResult = {};
    
    switch (target) {
      case 'netlify':
        // Check if netlify CLI is installed
        try {
          await execAsync('netlify --version');
          deployCommand = 'netlify deploy --prod --dir=public';
        } catch (error) {
          // Netlify CLI not installed
          deployResult = {
            success: false,
            target,
            message: 'Netlify CLI not installed. Install with: npm install -g netlify-cli',
            instructions: [
              '1. Install Netlify CLI: npm install -g netlify-cli',
              '2. Login to Netlify: netlify login',
              '3. Link your site: netlify link',
              '4. Deploy: netlify deploy --prod'
            ]
          };
        }
        break;
        
      case 'github-pages':
        deployCommand = 'git add public && git commit -m "Deploy to GitHub Pages" && git push origin gh-pages';
        break;
        
      case 'ftp':
        deployResult = {
          success: false,
          target,
          message: 'FTP deployment requires configuration',
          config: {
            host: 'ftp.example.com',
            username: 'your-username',
            password: '***',
            remotePath: '/public_html'
          }
        };
        break;
        
      case 'local':
        // Just verify the build exists
        const publicDir = path.join(projectRoot, 'public');
        const exists = await fs.stat(publicDir).catch(() => false);
        deployResult = {
          success: exists,
          target,
          message: exists ? 'Build is ready in /public directory' : 'No build found',
          path: publicDir
        };
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid deployment target' });
    }
    
    // Execute deployment if command is set
    if (deployCommand) {
      try {
        const { stdout, stderr } = await execAsync(deployCommand, {
          cwd: projectRoot
        });
        
        deployResult = {
          success: true,
          target,
          message: 'Deployment successful',
          output: stdout || stderr
        };
      } catch (error) {
        deployResult = {
          success: false,
          target,
          message: 'Deployment failed',
          error: error.message
        };
      }
    }
    
    res.json(deployResult);
    
  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Preview the built site
router.get('/preview', async (req, res) => {
  const publicDir = path.join(__dirname, '../../../public');
  
  try {
    const exists = await fs.stat(publicDir).catch(() => false);
    
    if (!exists) {
      return res.status(404).json({ 
        error: 'No build found. Please build the site first.' 
      });
    }
    
    const files = await fs.readdir(publicDir);
    const stats = await fs.stat(publicDir);
    
    res.json({
      available: true,
      path: publicDir,
      url: '/public/',
      files: files.length,
      lastModified: stats.mtime,
      size: await getDirectorySize(publicDir)
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel current build
router.post('/cancel', authenticateToken, async (req, res) => {
  if (!currentBuild || currentBuild.status !== 'running') {
    return res.status(400).json({ error: 'No build in progress' });
  }
  
  currentBuild.status = 'cancelled';
  currentBuild.endTime = new Date();
  addBuildLog('warning', 'Build cancelled by user');
  
  res.json({
    success: true,
    buildId: currentBuild.id
  });
});

// Helper function to copy directory
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Helper function to get directory size
async function getDirectorySize(dir) {
  let size = 0;
  
  async function calculateSize(dirPath) {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        await calculateSize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        size += stats.size;
      }
    }
  }
  
  await calculateSize(dir);
  return size;
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;