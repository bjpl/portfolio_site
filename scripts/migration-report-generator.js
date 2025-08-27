#!/usr/bin/env node

/**
 * Migration Report Generator
 * Generates comprehensive reports and analytics for Hugo to Supabase migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class MigrationReportGenerator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    this.reportData = {
      timestamp: new Date().toISOString(),
      summary: {},
      content_analysis: {},
      url_mappings: {},
      media_migration: {},
      data_quality: {},
      performance_metrics: {},
      recommendations: []
    };
  }

  /**
   * Generate comprehensive migration report
   */
  async generateReport() {
    console.log('📊 Generating comprehensive migration report...\n');
    
    try {
      await this.analyzeMigrationSummary();
      await this.analyzeContentTypes();
      await this.analyzeUrlMappings();
      await this.analyzeMediaMigration();
      await this.analyzeDataQuality();
      await this.analyzePerformanceMetrics();
      await this.generateRecommendations();
      
      await this.saveReport();
      await this.generateVisualReport();
      
      console.log('✅ Migration report generation completed!\n');
      
    } catch (error) {
      console.error('💥 Report generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze migration summary statistics
   */
  async analyzeMigrationSummary() {
    console.log('📈 Analyzing migration summary...');
    
    try {
      // Get overall statistics from migration log
      const { data: migrationLogs, error: logError } = await this.supabase
        .from('hugo_migration_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (logError) throw logError;
      
      // Get content counts by table
      const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works'];
      const contentCounts = {};
      
      for (const table of tables) {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        contentCounts[table] = count || 0;
      }
      
      // Analyze Hugo source files
      const sourceFiles = await glob('./content/**/*.md', { ignore: '**/index.md' });
      const sourceFilesByType = {
        blog: (await glob('./content/blog/*.md')).length,
        projects: (await glob('./content/me/work/*.md')).length + (await glob('./content/tools/**/*.md')).length,
        academic: (await glob('./content/teaching-learning/**/*.md')).length,
        creative: (await glob('./content/writing/**/*.md')).length,
        spanish: (await glob('./content/es/**/*.md')).length
      };
      
      this.reportData.summary = {
        total_source_files: sourceFiles.length,
        total_migrated_records: Object.values(contentCounts).reduce((a, b) => a + b, 0),
        migration_success_rate: this.calculateSuccessRate(sourceFiles.length, Object.values(contentCounts).reduce((a, b) => a + b, 0)),
        content_distribution: contentCounts,
        source_file_distribution: sourceFilesByType,
        migration_logs_analyzed: migrationLogs?.length || 0,
        latest_migration_time: migrationLogs?.[0]?.created_at || null
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze summary: ${error.message}`);
    }
  }

  /**
   * Analyze content types and their characteristics
   */
  async analyzeContentTypes() {
    console.log('📝 Analyzing content types...');
    
    try {
      const contentTypes = [
        { table: 'hugo_posts', type: 'Blog Posts', fields: ['title', 'content', 'tags', 'categories', 'reading_time', 'word_count'] },
        { table: 'hugo_projects', type: 'Projects', fields: ['title', 'description', 'project_type', 'tech_stack', 'github_url'] },
        { table: 'hugo_academic_content', type: 'Academic Content', fields: ['title', 'content', 'theory_category', 'difficulty'] },
        { table: 'hugo_creative_works', type: 'Creative Works', fields: ['title', 'content', 'work_type', 'original_language'] }
      ];
      
      for (const contentType of contentTypes) {
        const { data, error } = await this.supabase
          .from(contentType.table)
          .select('*');
        
        if (error) throw error;
        
        const analysis = {
          total_records: data?.length || 0,
          average_content_length: this.calculateAverageContentLength(data),
          tag_usage: this.analyzeTagUsage(data),
          language_distribution: this.analyzeLanguageDistribution(data),
          date_range: this.analyzeDateRange(data),
          completeness_score: this.analyzeCompleteness(data, contentType.fields)
        };
        
        if (contentType.table === 'hugo_posts') {
          analysis.reading_time_stats = this.analyzeReadingTimes(data);
          analysis.category_distribution = this.analyzeCategoryDistribution(data);
        }
        
        if (contentType.table === 'hugo_projects') {
          analysis.project_type_distribution = this.analyzeProjectTypes(data);
          analysis.technology_usage = this.analyzeTechStack(data);
        }
        
        this.reportData.content_analysis[contentType.type] = analysis;
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze content types: ${error.message}`);
    }
  }

  /**
   * Analyze URL mappings for SEO preservation
   */
  async analyzeUrlMappings() {
    console.log('🔗 Analyzing URL mappings...');
    
    try {
      const { data: mappings, error } = await this.supabase
        .from('hugo_url_mappings')
        .select('*');
      
      if (error) throw error;
      
      const mappingsByTable = {};
      const redirectTypes = {};
      
      mappings?.forEach(mapping => {
        mappingsByTable[mapping.supabase_table] = (mappingsByTable[mapping.supabase_table] || 0) + 1;
        redirectTypes[mapping.redirect_type] = (redirectTypes[mapping.redirect_type] || 0) + 1;
      });
      
      this.reportData.url_mappings = {
        total_mappings: mappings?.length || 0,
        mappings_by_content_type: mappingsByTable,
        redirect_type_distribution: redirectTypes,
        active_mappings: mappings?.filter(m => m.is_active).length || 0,
        inactive_mappings: mappings?.filter(m => !m.is_active).length || 0
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze URL mappings: ${error.message}`);
    }
  }

  /**
   * Analyze media migration statistics
   */
  async analyzeMediaMigration() {
    console.log('📸 Analyzing media migration...');
    
    try {
      const { data: mediaMigrations, error } = await this.supabase
        .from('hugo_media_migration')
        .select('*');
      
      if (error) throw error;
      
      const statusDistribution = {};
      const categoryDistribution = {};
      let totalSize = 0;
      
      mediaMigrations?.forEach(media => {
        statusDistribution[media.migration_status] = (statusDistribution[media.migration_status] || 0) + 1;
        categoryDistribution[media.category] = (categoryDistribution[media.category] || 0) + 1;
        totalSize += media.file_size || 0;
      });
      
      this.reportData.media_migration = {
        total_media_files: mediaMigrations?.length || 0,
        status_distribution: statusDistribution,
        category_distribution: categoryDistribution,
        total_size_bytes: totalSize,
        total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
        successful_migrations: mediaMigrations?.filter(m => m.migration_status === 'completed').length || 0,
        failed_migrations: mediaMigrations?.filter(m => m.migration_status === 'failed').length || 0
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze media migration: ${error.message}`);
    }
  }

  /**
   * Analyze data quality metrics
   */
  async analyzeDataQuality() {
    console.log('🔍 Analyzing data quality...');
    
    try {
      const qualityMetrics = {
        missing_titles: 0,
        missing_content: 0,
        missing_dates: 0,
        duplicate_slugs: 0,
        empty_frontmatter: 0,
        malformed_data: []
      };
      
      const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works'];
      
      for (const table of tables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('*');
        
        if (error) throw error;
        
        data?.forEach(record => {
          if (!record.title || record.title.trim() === '') qualityMetrics.missing_titles++;
          if (!record.content || record.content.trim() === '') qualityMetrics.missing_content++;
          if (!record.date) qualityMetrics.missing_dates++;
          if (!record.frontmatter || Object.keys(record.frontmatter).length === 0) {
            qualityMetrics.empty_frontmatter++;
          }
        });
        
        // Check for duplicate slugs within table
        const slugs = data?.map(r => r.slug) || [];
        const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
        qualityMetrics.duplicate_slugs += duplicates.length;
      }
      
      this.reportData.data_quality = {
        ...qualityMetrics,
        quality_score: this.calculateQualityScore(qualityMetrics),
        recommendations: this.generateQualityRecommendations(qualityMetrics)
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze data quality: ${error.message}`);
    }
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformanceMetrics() {
    console.log('⚡ Analyzing performance metrics...');
    
    try {
      const { data: logs, error } = await this.supabase
        .from('hugo_migration_log')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const processingTimes = logs?.map(log => log.processing_time_ms).filter(Boolean) || [];
      
      this.reportData.performance_metrics = {
        total_migration_logs: logs?.length || 0,
        average_processing_time_ms: this.calculateAverage(processingTimes),
        min_processing_time_ms: Math.min(...processingTimes) || 0,
        max_processing_time_ms: Math.max(...processingTimes) || 0,
        total_processing_time_ms: processingTimes.reduce((a, b) => a + b, 0),
        migration_efficiency: this.calculateMigrationEfficiency(logs)
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not analyze performance: ${error.message}`);
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Data quality recommendations
    if (this.reportData.data_quality?.missing_titles > 0) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        issue: 'Missing titles detected',
        recommendation: `Fix ${this.reportData.data_quality.missing_titles} records with missing titles`,
        action: 'Update records to include proper titles'
      });
    }
    
    if (this.reportData.data_quality?.duplicate_slugs > 0) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        issue: 'Duplicate slugs found',
        recommendation: `Resolve ${this.reportData.data_quality.duplicate_slugs} duplicate slugs`,
        action: 'Implement unique slug generation or manual correction'
      });
    }
    
    // URL mapping recommendations
    if (this.reportData.url_mappings?.total_mappings === 0) {
      recommendations.push({
        type: 'seo',
        priority: 'high',
        issue: 'No URL mappings found',
        recommendation: 'Create URL mappings to preserve SEO',
        action: 'Run URL mapping generation script'
      });
    }
    
    // Media migration recommendations
    if (this.reportData.media_migration?.failed_migrations > 0) {
      recommendations.push({
        type: 'media',
        priority: 'medium',
        issue: 'Failed media migrations',
        recommendation: `Retry ${this.reportData.media_migration.failed_migrations} failed media migrations`,
        action: 'Review errors and re-run media migration for failed files'
      });
    }
    
    // Performance recommendations
    if (this.reportData.performance_metrics?.average_processing_time_ms > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'low',
        issue: 'Slow migration performance',
        recommendation: 'Consider optimizing migration scripts for better performance',
        action: 'Implement batch processing and connection pooling'
      });
    }
    
    // Content recommendations
    const totalContent = Object.values(this.reportData.summary?.content_distribution || {}).reduce((a, b) => a + b, 0);
    if (totalContent < this.reportData.summary?.total_source_files * 0.9) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        issue: 'Low migration success rate',
        recommendation: 'Investigate why some content files were not migrated',
        action: 'Review migration logs and fix issues with source files'
      });
    }
    
    this.reportData.recommendations = recommendations;
  }

  /**
   * Save comprehensive report to file
   */
  async saveReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = './migration-reports';
    
    fs.mkdirSync(reportDir, { recursive: true });
    
    // Save JSON report
    const jsonPath = path.join(reportDir, `migration-analysis-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.reportData, null, 2));
    
    // Save human-readable report
    const textPath = path.join(reportDir, `migration-summary-${timestamp}.txt`);
    const textReport = this.generateTextReport();
    fs.writeFileSync(textPath, textReport);
    
    console.log(`📄 Reports saved:`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  Text: ${textPath}`);
  }

  /**
   * Generate visual HTML report
   */
  async generateVisualReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = './migration-reports';
    const htmlPath = path.join(reportDir, `migration-dashboard-${timestamp}.html`);
    
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hugo to Supabase Migration Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 15px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart-container { position: relative; height: 300px; margin: 20px 0; }
        .recommendation { padding: 10px; margin: 10px 0; border-left: 4px solid #f59e0b; background: #fffbeb; }
        .recommendation.high { border-left-color: #dc2626; background: #fef2f2; }
        .recommendation.medium { border-left-color: #f59e0b; background: #fffbeb; }
        .recommendation.low { border-left-color: #10b981; background: #f0fdf4; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Hugo to Supabase Migration Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${this.reportData.summary?.total_source_files || 0}</div>
                    <div class="metric-label">Source Files</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${this.reportData.summary?.total_migrated_records || 0}</div>
                    <div class="metric-label">Migrated Records</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${this.reportData.summary?.migration_success_rate || 0}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${this.reportData.url_mappings?.total_mappings || 0}</div>
                    <div class="metric-label">URL Mappings</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>📝 Content Distribution</h2>
            <div class="chart-container">
                <canvas id="contentChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h2>📸 Media Migration Status</h2>
            <div class="chart-container">
                <canvas id="mediaChart"></canvas>
            </div>
        </div>

        <div class="card">
            <h2>💡 Recommendations</h2>
            ${this.reportData.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <strong>${rec.issue}</strong><br>
                    ${rec.recommendation}<br>
                    <em>Action: ${rec.action}</em>
                </div>
            `).join('')}
        </div>

        <div class="card">
            <h2>📈 Performance Metrics</h2>
            <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Average Processing Time</td><td>${this.reportData.performance_metrics?.average_processing_time_ms || 0}ms</td></tr>
                <tr><td>Total Processing Time</td><td>${this.reportData.performance_metrics?.total_processing_time_ms || 0}ms</td></tr>
                <tr><td>Migration Logs</td><td>${this.reportData.performance_metrics?.total_migration_logs || 0}</td></tr>
            </table>
        </div>
    </div>

    <script>
        // Content Distribution Chart
        const contentCtx = document.getElementById('contentChart').getContext('2d');
        new Chart(contentCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(this.reportData.summary?.content_distribution || {}))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(this.reportData.summary?.content_distribution || {}))},
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#dc2626', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Media Migration Chart
        const mediaCtx = document.getElementById('mediaChart').getContext('2d');
        new Chart(mediaCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(this.reportData.media_migration?.status_distribution || {}))},
                datasets: [{
                    label: 'Media Files',
                    data: ${JSON.stringify(Object.values(this.reportData.media_migration?.status_distribution || {}))},
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    </script>
</body>
</html>`;
    
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`🌐 Visual report: ${htmlPath}`);
  }

  /**
   * Generate text summary report
   */
  generateTextReport() {
    return `
HUGO TO SUPABASE MIGRATION REPORT
Generated: ${this.reportData.timestamp}

MIGRATION SUMMARY
================
Source Files Found: ${this.reportData.summary?.total_source_files || 0}
Records Migrated: ${this.reportData.summary?.total_migrated_records || 0}
Success Rate: ${this.reportData.summary?.migration_success_rate || 0}%

CONTENT DISTRIBUTION
===================
${Object.entries(this.reportData.summary?.content_distribution || {})
  .map(([table, count]) => `${table}: ${count}`)
  .join('\n')}

URL MAPPINGS
============
Total Mappings: ${this.reportData.url_mappings?.total_mappings || 0}
Active Mappings: ${this.reportData.url_mappings?.active_mappings || 0}

MEDIA MIGRATION
===============
Total Media Files: ${this.reportData.media_migration?.total_media_files || 0}
Successful: ${this.reportData.media_migration?.successful_migrations || 0}
Failed: ${this.reportData.media_migration?.failed_migrations || 0}
Total Size: ${this.reportData.media_migration?.total_size_mb || 0} MB

DATA QUALITY
============
Quality Score: ${this.reportData.data_quality?.quality_score || 0}/100
Missing Titles: ${this.reportData.data_quality?.missing_titles || 0}
Missing Content: ${this.reportData.data_quality?.missing_content || 0}
Duplicate Slugs: ${this.reportData.data_quality?.duplicate_slugs || 0}

RECOMMENDATIONS
===============
${this.reportData.recommendations.map(rec => 
  `[${rec.priority.toUpperCase()}] ${rec.issue}\n  → ${rec.recommendation}\n  → Action: ${rec.action}\n`
).join('\n')}

PERFORMANCE METRICS
==================
Average Processing Time: ${this.reportData.performance_metrics?.average_processing_time_ms || 0}ms
Total Processing Time: ${this.reportData.performance_metrics?.total_processing_time_ms || 0}ms
Migration Efficiency: ${this.reportData.performance_metrics?.migration_efficiency || 'N/A'}
`;
  }

  // Utility methods for calculations
  calculateSuccessRate(source, migrated) {
    return source > 0 ? ((migrated / source) * 100).toFixed(2) : '0.00';
  }

  calculateAverageContentLength(data) {
    if (!data || data.length === 0) return 0;
    const lengths = data.map(item => (item.content || '').length);
    return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  }

  calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  calculateQualityScore(metrics) {
    // Simple quality score based on data completeness
    const totalIssues = Object.values(metrics).reduce((sum, val) => 
      typeof val === 'number' ? sum + val : sum, 0);
    return Math.max(0, 100 - (totalIssues * 2));
  }

  calculateMigrationEfficiency(logs) {
    if (!logs || logs.length === 0) return 'N/A';
    const completedLogs = logs.filter(log => log.status === 'completed');
    return `${completedLogs.length}/${logs.length} (${((completedLogs.length / logs.length) * 100).toFixed(1)}%)`;
  }

  analyzeTagUsage(data) {
    const tagCounts = {};
    data?.forEach(item => {
      (item.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [tag, count]) => ({ ...obj, [tag]: count }), {});
  }

  analyzeLanguageDistribution(data) {
    const langCounts = {};
    data?.forEach(item => {
      const lang = item.language || item.original_language || 'unknown';
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });
    return langCounts;
  }

  analyzeDateRange(data) {
    const dates = data?.map(item => new Date(item.date)).filter(date => !isNaN(date)) || [];
    if (dates.length === 0) return null;
    
    return {
      earliest: new Date(Math.min(...dates)).toISOString().split('T')[0],
      latest: new Date(Math.max(...dates)).toISOString().split('T')[0],
      span_days: Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24))
    };
  }

  analyzeCompleteness(data, requiredFields) {
    if (!data || data.length === 0) return 100;
    
    let totalScore = 0;
    data.forEach(item => {
      const filledFields = requiredFields.filter(field => 
        item[field] && item[field] !== '' && item[field] !== null
      );
      totalScore += (filledFields.length / requiredFields.length) * 100;
    });
    
    return Math.round(totalScore / data.length);
  }

  analyzeReadingTimes(data) {
    const times = data?.map(item => item.reading_time).filter(Boolean) || [];
    if (times.length === 0) return null;
    
    return {
      average: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      min: Math.min(...times),
      max: Math.max(...times),
      total: times.reduce((a, b) => a + b, 0)
    };
  }

  analyzeCategoryDistribution(data) {
    const catCounts = {};
    data?.forEach(item => {
      (item.categories || []).forEach(cat => {
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
    });
    return catCounts;
  }

  analyzeProjectTypes(data) {
    const typeCounts = {};
    data?.forEach(item => {
      const type = item.project_type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return typeCounts;
  }

  analyzeTechStack(data) {
    const techCounts = {};
    data?.forEach(item => {
      (item.tech_stack || []).forEach(tech => {
        techCounts[tech] = (techCounts[tech] || 0) + 1;
      });
    });
    return Object.entries(techCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .reduce((obj, [tech, count]) => ({ ...obj, [tech]: count }), {});
  }

  generateQualityRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.missing_titles > 0) {
      recommendations.push('Add titles to all content pieces');
    }
    if (metrics.missing_content > 0) {
      recommendations.push('Ensure all records have content');
    }
    if (metrics.duplicate_slugs > 0) {
      recommendations.push('Resolve duplicate slug conflicts');
    }
    if (metrics.empty_frontmatter > 0) {
      recommendations.push('Add metadata to improve content organization');
    }
    
    return recommendations;
  }
}

// CLI execution
if (require.main === module) {
  const generator = new MigrationReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = MigrationReportGenerator;