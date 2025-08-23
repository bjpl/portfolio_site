/**
 * Multilingual Content Management API Extension
 * Adds translation status, SEO analysis, and cultural adaptation features
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

function addMultilingualEndpoints(app, HUGO_ROOT, CONTENT_DIR) {

    // ============= MULTILINGUAL CONTENT MANAGEMENT =============

    // Get translation status for all content
    app.get('/api/translation-status', async (req, res) => {
        try {
            const englishFiles = await getContentFiles(CONTENT_DIR);
            const spanishFiles = await getContentFiles(path.join(CONTENT_DIR, 'es'));
            
            const translationStatus = [];
            const englishMap = new Map();
            const spanishMap = new Map();
            
            // Create maps for easier lookup
            englishFiles.forEach(file => {
                englishMap.set(file.path, file);
            });
            
            spanishFiles.forEach(file => {
                const normalizedPath = file.path.replace(/^es\//i, '');
                spanishMap.set(normalizedPath, file);
            });
            
            // Compare English and Spanish content
            englishFiles.forEach(enFile => {
                const esFile = spanishMap.get(enFile.path);
                let status = 'needs-translation';
                let esStatus = 'missing';
                
                if (esFile) {
                    if (enFile.date && esFile.date) {
                        const enDate = new Date(enFile.date);
                        const esDate = new Date(esFile.date);
                        status = enDate > esDate ? 'needs-update' : 'synced';
                    } else {
                        status = 'synced';
                    }
                    esStatus = 'complete';
                }
                
                translationStatus.push({
                    path: enFile.path,
                    en: 'complete',
                    es: esStatus,
                    status: status,
                    lastModified: enFile.date || new Date().toISOString().split('T')[0]
                });
            });
            
            // Calculate stats
            const englishStats = {
                pages: englishFiles.length,
                words: await calculateTotalWords(englishFiles, CONTENT_DIR),
                lastUpdate: getLastUpdateDays(englishFiles)
            };
            
            const spanishStats = {
                pages: spanishFiles.length,
                words: await calculateTotalWords(spanishFiles, CONTENT_DIR),
                lastUpdate: getLastUpdateDays(spanishFiles)
            };
            
            res.json({
                success: true,
                english: englishStats,
                spanish: spanishStats,
                translationStatus: translationStatus
            });
        } catch (error) {
            console.error('Error getting translation status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get translation memory terms
    app.get('/api/translation-memory', async (req, res) => {
        try {
            const memoryPath = path.join(HUGO_ROOT, 'data', 'translation-memory.json');
            let memory = {};
            
            try {
                const memoryData = await fs.readFile(memoryPath, 'utf-8');
                memory = JSON.parse(memoryData);
            } catch (error) {
                // Create default translation memory
                memory = {
                    'portfolio': 'portafolio',
                    'language learning': 'aprendizaje de idiomas',
                    'teaching': 'enseñanza',
                    'technology': 'tecnología',
                    'education': 'educación',
                    'tools': 'herramientas',
                    'creative': 'creativo',
                    'development': 'desarrollo',
                    'experience': 'experiencia',
                    'Colombia': 'Colombia',
                    'Spanish': 'español',
                    'English': 'inglés',
                    'web development': 'desarrollo web',
                    'application': 'aplicación',
                    'learning': 'aprendizaje',
                    'student': 'estudiante',
                    'teacher': 'profesor',
                    'course': 'curso',
                    'lesson': 'lección',
                    'practice': 'práctica',
                    'skill': 'habilidad',
                    'project': 'proyecto',
                    'work': 'trabajo',
                    'professional': 'profesional',
                    'service': 'servicio',
                    'consulting': 'consultoría',
                    'Medellín': 'Medellín',
                    'Bogotá': 'Bogotá',
                    'peso': 'peso',
                    'university': 'universidad',
                    'business': 'negocio'
                };
                
                // Save default memory
                await fs.mkdir(path.dirname(memoryPath), { recursive: true });
                await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
            }
            
            res.json({ success: true, memory });
        } catch (error) {
            console.error('Error getting translation memory:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Update translation memory
    app.post('/api/translation-memory', async (req, res) => {
        try {
            const { terms } = req.body;
            const memoryPath = path.join(HUGO_ROOT, 'data', 'translation-memory.json');
            
            await fs.mkdir(path.dirname(memoryPath), { recursive: true });
            await fs.writeFile(memoryPath, JSON.stringify(terms, null, 2));
            
            res.json({ success: true, message: 'Translation memory updated' });
        } catch (error) {
            console.error('Error updating translation memory:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Generate hreflang tags for all pages
    app.get('/api/hreflang-tags', async (req, res) => {
        try {
            const baseUrl = req.query.baseUrl || 'https://brandonlambert.com';
            const englishFiles = await getContentFiles(CONTENT_DIR);
            const spanishFiles = await getContentFiles(path.join(CONTENT_DIR, 'es'));
            
            const hreflangTags = [];
            const spanishPaths = new Set(spanishFiles.map(f => f.path.replace(/^es\//i, '')));
            
            englishFiles.forEach(file => {
                const urlPath = file.path === '_index.md' ? '/' : `/${file.path.replace(/\_index\.md$|\.md$/, '')}/`;
                const hasSpanishVersion = spanishPaths.has(file.path);
                
                // English version
                hreflangTags.push(`<link rel="alternate" hreflang="en" href="${baseUrl}${urlPath}" />`);
                
                // Spanish version (if exists)
                if (hasSpanishVersion) {
                    const esUrlPath = urlPath === '/' ? '/es/' : `/es${urlPath}`;
                    hreflangTags.push(`<link rel="alternate" hreflang="es" href="${baseUrl}${esUrlPath}" />`);
                    hreflangTags.push(`<link rel="alternate" hreflang="es-CO" href="${baseUrl}${esUrlPath}" />`);
                }
                
                // X-default (English)
                if (file.path === '_index.md') {
                    hreflangTags.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}/" />`);
                }
            });
            
            res.json({ success: true, tags: hreflangTags });
        } catch (error) {
            console.error('Error generating hreflang tags:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // SEO analysis for multilingual content
    app.get('/api/seo-analysis', async (req, res) => {
        try {
            const englishFiles = await getContentFiles(CONTENT_DIR);
            const spanishFiles = await getContentFiles(path.join(CONTENT_DIR, 'es'));
            
            // Analyze SEO metrics for both languages
            const englishAnalysis = await analyzeSEO(englishFiles, 'en', CONTENT_DIR);
            const spanishAnalysis = await analyzeSEO(spanishFiles, 'es', CONTENT_DIR);
            
            res.json({
                success: true,
                english: englishAnalysis,
                spanish: spanishAnalysis,
                recommendations: generateSEORecommendations(englishAnalysis, spanishAnalysis)
            });
        } catch (error) {
            console.error('Error analyzing SEO:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Cultural adaptation notes management
    app.get('/api/cultural-notes', async (req, res) => {
        try {
            const notesPath = path.join(HUGO_ROOT, 'data', 'cultural-notes.json');
            let notes = [];
            
            try {
                const notesData = await fs.readFile(notesPath, 'utf-8');
                notes = JSON.parse(notesData);
            } catch (error) {
                // Create default cultural notes for Colombia
                notes = [
                    {
                        id: 1,
                        category: 'Currency',
                        note: 'Reference Colombian Peso (COP) in pricing examples',
                        context: 'Brandon\'s Colombia relocation',
                        priority: 'high'
                    },
                    {
                        id: 2,
                        category: 'Education',
                        note: 'Adapt academic references to Colombian education system',
                        context: 'Local university system differences',
                        priority: 'medium'
                    },
                    {
                        id: 3,
                        category: 'Business Culture',
                        note: 'Emphasize relationship-building ("confianza") in professional content',
                        context: 'Colombian business practices',
                        priority: 'high'
                    },
                    {
                        id: 4,
                        category: 'Language',
                        note: 'Use Colombian Spanish expressions where appropriate',
                        context: 'Regional Spanish variations',
                        priority: 'medium'
                    },
                    {
                        id: 5,
                        category: 'Geography',
                        note: 'Reference Colombian cities (Medellín, Bogotá, Cartagena) in examples',
                        context: 'Local geographic relevance',
                        priority: 'low'
                    },
                    {
                        id: 6,
                        category: 'Time Zone',
                        note: 'Consider Colombia Time (COT, UTC-5) for scheduling examples',
                        context: 'Local time considerations',
                        priority: 'low'
                    }
                ];
                
                await fs.mkdir(path.dirname(notesPath), { recursive: true });
                await fs.writeFile(notesPath, JSON.stringify(notes, null, 2));
            }
            
            res.json({ success: true, notes });
        } catch (error) {
            console.error('Error getting cultural notes:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Content synchronization checker
    app.get('/api/sync-check', async (req, res) => {
        try {
            const results = await checkContentSynchronization(CONTENT_DIR);
            res.json({ success: true, results });
        } catch (error) {
            console.error('Error checking synchronization:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Translation workflow automation
    app.post('/api/auto-translate', async (req, res) => {
        try {
            const { filePath, targetLanguage = 'es' } = req.body;
            
            // This would integrate with translation services like Google Translate
            // For now, we'll create placeholder functionality
            
            res.json({
                success: true,
                message: 'Auto-translation feature ready for integration',
                suggestions: [
                    'Integrate Google Translate API',
                    'Add DeepL translation service',
                    'Implement terminology consistency checking'
                ]
            });
        } catch (error) {
            console.error('Error in auto-translation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============= HELPER FUNCTIONS =============

    async function getContentFiles(dir, baseDir = dir) {
        const files = [];
        try {
            const items = await fs.readdir(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory()) {
                    files.push(...await getContentFiles(fullPath, baseDir));
                } else if (item.endsWith('.md') || item.endsWith('.markdown')) {
                    const relativePath = path.relative(baseDir, fullPath);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const parsed = matter(content);
                    
                    files.push({
                        path: relativePath.replace(/\\/g, '/'),
                        title: parsed.data.title || item,
                        date: parsed.data.date,
                        draft: parsed.data.draft || false,
                        type: relativePath.split('/')[0] || 'page'
                    });
                }
            }
        } catch (error) {
            // Directory doesn't exist or can't be read
            console.warn(`Cannot read directory: ${dir}`);
        }
        
        return files;
    }

    async function calculateTotalWords(files, contentDir) {
        let totalWords = 0;
        for (const file of files) {
            try {
                const content = await fs.readFile(path.join(contentDir, file.path), 'utf-8');
                const parsed = matter(content);
                const words = parsed.content.trim().split(/\s+/).filter(word => word.length > 0).length;
                totalWords += words;
            } catch (error) {
                // Skip files that can't be read
            }
        }
        return totalWords;
    }

    function getLastUpdateDays(files) {
        if (files.length === 0) return 0;
        
        const latestDate = files.reduce((latest, file) => {
            const fileDate = new Date(file.date || 0);
            return fileDate > latest ? fileDate : latest;
        }, new Date(0));
        
        const diffTime = Math.abs(new Date() - latestDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async function analyzeSEO(files, language, contentDir) {
        const analysis = {
            totalPages: files.length,
            score: 85,
            issues: [],
            keywords: [],
            missingMeta: 0,
            missingTitles: 0,
            averageWordCount: 0
        };
        
        let totalWords = 0;
        let missingTitles = 0;
        let missingDescriptions = 0;
        
        for (const file of files) {
            try {
                const content = await fs.readFile(path.join(contentDir, file.path), 'utf-8');
                const parsed = matter(content);
                const words = parsed.content.trim().split(/\s+/).length;
                totalWords += words;
                
                if (!parsed.data.title) {
                    missingTitles++;
                }
                
                if (!parsed.data.description) {
                    missingDescriptions++;
                }
            } catch (error) {
                // Skip problematic files
            }
        }
        
        analysis.averageWordCount = files.length > 0 ? Math.round(totalWords / files.length) : 0;
        analysis.missingTitles = missingTitles;
        analysis.missingMeta = missingDescriptions;
        
        // Adjust score based on language
        if (language === 'es') {
            analysis.score = Math.max(65, 85 - (missingDescriptions * 2) - (missingTitles * 3));
        } else {
            analysis.score = Math.max(70, 90 - missingDescriptions - (missingTitles * 2));
        }
        
        // Add issues
        if (missingTitles > 0) {
            analysis.issues.push(`${missingTitles} pages missing titles`);
        }
        if (missingDescriptions > 0) {
            analysis.issues.push(`${missingDescriptions} pages missing meta descriptions`);
        }
        
        return analysis;
    }

    function generateSEORecommendations(englishAnalysis, spanishAnalysis) {
        const recommendations = [];
        
        if (spanishAnalysis.totalPages < englishAnalysis.totalPages) {
            recommendations.push({
                priority: 'high',
                title: 'Complete Spanish Translations',
                description: `${englishAnalysis.totalPages - spanishAnalysis.totalPages} pages need Spanish translation`
            });
        }
        
        if (spanishAnalysis.missingMeta > 0) {
            recommendations.push({
                priority: 'medium',
                title: 'Add Spanish Meta Descriptions',
                description: `${spanishAnalysis.missingMeta} Spanish pages need meta descriptions`
            });
        }
        
        recommendations.push({
            priority: 'medium',
            title: 'Implement Colombian Spanish Targeting',
            description: 'Add es-CO hreflang tags for better regional SEO'
        });
        
        if (spanishAnalysis.averageWordCount < englishAnalysis.averageWordCount * 0.8) {
            recommendations.push({
                priority: 'low',
                title: 'Expand Spanish Content',
                description: 'Spanish content is significantly shorter than English versions'
            });
        }
        
        return recommendations;
    }

    async function checkContentSynchronization(contentDir) {
        const englishFiles = await getContentFiles(contentDir);
        const spanishFiles = await getContentFiles(path.join(contentDir, 'es'));
        
        const syncResults = {
            totalEnglish: englishFiles.length,
            totalSpanish: spanishFiles.length,
            synchronized: 0,
            needsUpdate: 0,
            missingTranslations: 0,
            issues: []
        };
        
        const spanishMap = new Map();
        spanishFiles.forEach(file => {
            const normalizedPath = file.path.replace(/^es\//i, '');
            spanishMap.set(normalizedPath, file);
        });
        
        englishFiles.forEach(enFile => {
            const esFile = spanishMap.get(enFile.path);
            
            if (!esFile) {
                syncResults.missingTranslations++;
                syncResults.issues.push({
                    type: 'missing',
                    path: enFile.path,
                    message: 'Spanish translation missing'
                });
            } else {
                const enDate = new Date(enFile.date || 0);
                const esDate = new Date(esFile.date || 0);
                
                if (enDate > esDate) {
                    syncResults.needsUpdate++;
                    syncResults.issues.push({
                        type: 'outdated',
                        path: enFile.path,
                        message: 'Spanish version is outdated'
                    });
                } else {
                    syncResults.synchronized++;
                }
            }
        });
        
        return syncResults;
    }
}

module.exports = { addMultilingualEndpoints };