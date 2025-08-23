/**
 * Portfolio Report Generator
 * Generates downloadable portfolio performance reports in multiple formats
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class ReportGenerator {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
    this.reportsDir = path.join(__dirname, '../../../reports');
    this.ensureReportsDirectory();
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create reports directory:', error);
    }
  }

  /**
   * Generate comprehensive portfolio report
   */
  async generatePortfolioReport(reportType, options = {}) {
    const { format = 'json', period = '30d', includeCharts = false } = options;

    // Gather all data
    const reportData = await this.gatherReportData(reportType, period);
    
    // Add metadata
    reportData.metadata = {
      reportType,
      period,
      generatedAt: new Date().toISOString(),
      generatedBy: 'Portfolio Analytics System',
      version: '1.0.0'
    };

    switch (format) {
      case 'pdf':
        return await this.generatePDFReport(reportData, reportType);
      case 'xlsx':
        return await this.generateExcelReport(reportData, reportType);
      case 'csv':
        return await this.generateCSVReport(reportData, reportType);
      default:
        return reportData;
    }
  }

  async gatherReportData(reportType, period) {
    switch (reportType) {
      case 'visitor-interest':
        return await this.generateVisitorInterestData(period);
      case 'employer-analysis':
        return await this.generateEmployerAnalysisData(period);
      case 'content-effectiveness':
        return await this.generateContentEffectivenessData(period);
      case 'conversion-tracking':
        return await this.generateConversionTrackingData(period);
      case 'geographic-analysis':
        return await this.generateGeographicAnalysisData(period);
      case 'technology-trends':
        return await this.generateTechnologyTrendsData(period);
      case 'comprehensive':
        return await this.generateComprehensiveData(period);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  async generateVisitorInterestData(period) {
    const [projectAnalytics, skillTrends, engagementMetrics] = await Promise.all([
      this.analyticsService.getProjectInterestAnalytics({ period }),
      this.analyticsService.getSkillInterestAnalytics({ period }),
      this.analyticsService.getEngagementMetrics({ period })
    ]);

    return {
      title: 'Visitor Interest Analysis Report',
      summary: {
        totalProjects: projectAnalytics.projects?.length || 0,
        mostViewedProject: projectAnalytics.projects?.[0]?.title || 'N/A',
        totalSkillInteractions: skillTrends.totalInteractions || 0,
        avgEngagementScore: engagementMetrics.averageScore || 0,
        topSkills: skillTrends.skills?.slice(0, 10) || []
      },
      projects: projectAnalytics.projects || [],
      skills: skillTrends.skills || [],
      engagement: engagementMetrics,
      insights: this.generateVisitorInsights(projectAnalytics, skillTrends)
    };
  }

  async generateEmployerAnalysisData(period) {
    const [employerBehavior, conversionData, sourceAnalysis] = await Promise.all([
      this.analyticsService.getEmployerBehaviorAnalysis({ period }),
      this.analyticsService.getEmployerConversions({ period }),
      this.analyticsService.getEmployerTrafficSources({ period })
    ]);

    return {
      title: 'Employer & Client Behavior Analysis',
      summary: {
        potentialEmployers: employerBehavior.highScoreSessions || 0,
        avgEmployerScore: employerBehavior.averageScore || 0,
        employerConversions: conversionData.totalConversions || 0,
        conversionRate: conversionData.conversionRate || 0,
        topSignals: employerBehavior.topSignals?.slice(0, 5) || []
      },
      employerBehavior,
      conversions: conversionData,
      trafficSources: sourceAnalysis,
      insights: this.generateEmployerInsights(employerBehavior, conversionData)
    };
  }

  async generateContentEffectivenessData(period) {
    const [contentMetrics, pageAnalytics, engagementTrends] = await Promise.all([
      this.analyticsService.getContentEffectivenessMetrics({ period }),
      this.analyticsService.getPagePerformanceAnalytics({ period }),
      this.analyticsService.getContentEngagementTrends({ period })
    ]);

    return {
      title: 'Content Effectiveness Report',
      summary: {
        totalContent: contentMetrics.content?.length || 0,
        avgEngagementScore: contentMetrics.summary?.avgEngagement || 0,
        topPerformingContent: contentMetrics.content?.[0]?.title || 'N/A',
        contentWithHighBounce: this.findHighBounceContent(pageAnalytics),
        improvementOpportunities: this.identifyContentImprovements(contentMetrics)
      },
      contentMetrics,
      pageAnalytics,
      engagementTrends,
      recommendations: this.generateContentRecommendations(contentMetrics, pageAnalytics)
    };
  }

  async generateConversionTrackingData(period) {
    const [conversionData, funnelAnalysis, valueAnalysis] = await Promise.all([
      this.analyticsService.getConversionTracking({ period }),
      this.analyticsService.getConversionFunnelAnalysis({ period }),
      this.analyticsService.getConversionValueAnalysis({ period })
    ]);

    return {
      title: 'Conversion Tracking Report',
      summary: {
        totalConversions: conversionData.summary?.totalConversions || 0,
        conversionRate: conversionData.summary?.conversionRate || 0,
        totalValue: valueAnalysis.totalValue || 0,
        avgConversionValue: valueAnalysis.averageValue || 0,
        topConversionTypes: conversionData.byType?.slice(0, 5) || []
      },
      conversions: conversionData,
      funnel: funnelAnalysis,
      value: valueAnalysis,
      optimizationTips: this.generateConversionOptimizationTips(conversionData, funnelAnalysis)
    };
  }

  async generateGeographicAnalysisData(period) {
    const geoData = await this.analyticsService.getGeographicAnalysis({ 
      period, 
      includeRelocation: true 
    });

    return {
      title: 'Geographic Visitor Analysis',
      summary: {
        totalCountries: geoData.summary?.totalCountries || 0,
        internationalPercentage: geoData.summary?.internationalPercentage || 0,
        topMarkets: geoData.countries?.slice(0, 5) || [],
        relocationOpportunities: geoData.relocationInsights?.opportunities || []
      },
      countries: geoData.countries || [],
      relocationInsights: geoData.relocationInsights || {},
      marketAnalysis: this.generateMarketAnalysis(geoData.countries || [])
    };
  }

  async generateTechnologyTrendsData(period) {
    const techData = await this.analyticsService.getTechnologyTrendAnalysis({ period });

    return {
      title: 'Technology Trends Analysis',
      summary: {
        totalTechnologies: techData.summary?.totalTechnologies || 0,
        emergingTechnologies: techData.emergingTechnologies?.length || 0,
        avgGrowthRate: techData.summary?.avgGrowthRate || 0,
        hottestTech: techData.emergingTechnologies?.[0]?.name || 'N/A',
        marketDemand: this.calculateMarketDemand(techData.trends || [])
      },
      technologies: techData.topTechnologies || [],
      emerging: techData.emergingTechnologies || [],
      trends: techData.trends || [],
      recommendations: this.generateTechRecommendations(techData)
    };
  }

  async generateComprehensiveData(period) {
    const [
      visitorData,
      employerData,
      contentData,
      conversionData,
      geoData,
      techData
    ] = await Promise.all([
      this.generateVisitorInterestData(period),
      this.generateEmployerAnalysisData(period),
      this.generateContentEffectivenessData(period),
      this.generateConversionTrackingData(period),
      this.generateGeographicAnalysisData(period),
      this.generateTechnologyTrendsData(period)
    ]);

    return {
      title: 'Comprehensive Portfolio Analytics Report',
      executiveSummary: this.generateExecutiveSummary({
        visitor: visitorData,
        employer: employerData,
        content: contentData,
        conversion: conversionData,
        geographic: geoData,
        technology: techData
      }),
      sections: {
        visitorInterest: visitorData,
        employerAnalysis: employerData,
        contentEffectiveness: contentData,
        conversionTracking: conversionData,
        geographicAnalysis: geoData,
        technologyTrends: techData
      },
      actionItems: this.generateActionItems({
        visitor: visitorData,
        employer: employerData,
        content: contentData,
        conversion: conversionData,
        geographic: geoData,
        technology: techData
      })
    };
  }

  /**
   * Generate PDF Report
   */
  async generatePDFReport(data, reportType) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `portfolio-${reportType}-${Date.now()}.pdf`;
    const filepath = path.join(this.reportsDir, filename);

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(data.title, 50, 50);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.moveDown();

    // Executive Summary
    if (data.executiveSummary) {
      doc.fontSize(16).text('Executive Summary', 50, doc.y);
      doc.fontSize(12).text(data.executiveSummary, 50, doc.y + 20);
      doc.moveDown();
    }

    // Summary Section
    if (data.summary) {
      doc.fontSize(14).text('Key Metrics', 50, doc.y);
      doc.moveDown(0.5);
      
      Object.entries(data.summary).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        doc.text(`${label}: ${value}`, 70, doc.y);
      });
      doc.moveDown();
    }

    // Data Sections
    this.addDataSectionsToPDF(doc, data);

    // Action Items
    if (data.actionItems && data.actionItems.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Recommended Actions', 50, 50);
      doc.moveDown();
      
      data.actionItems.forEach((item, index) => {
        doc.fontSize(12).text(`${index + 1}. ${item}`, 70, doc.y);
        doc.moveDown(0.5);
      });
    }

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          mimeType: 'application/pdf'
        });
      });
    });
  }

  /**
   * Generate Excel Report
   */
  async generateExcelReport(data, reportType) {
    const workbook = new ExcelJS.Workbook();
    const filename = `portfolio-${reportType}-${Date.now()}.xlsx`;
    const filepath = path.join(this.reportsDir, filename);

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.addSummaryToExcel(summarySheet, data);

    // Data Sheets
    this.addDataSheetsToExcel(workbook, data);

    await workbook.xlsx.writeFile(filepath);

    return {
      filename,
      filepath,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Generate CSV Report
   */
  async generateCSVReport(data, reportType) {
    const filename = `portfolio-${reportType}-${Date.now()}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    let csvContent = this.convertToCSV(data);

    await fs.writeFile(filepath, csvContent, 'utf8');

    return {
      filename,
      filepath,
      mimeType: 'text/csv'
    };
  }

  // Helper Methods

  generateVisitorInsights(projectAnalytics, skillTrends) {
    const insights = [];
    
    if (projectAnalytics.projects && projectAnalytics.projects.length > 0) {
      const topProject = projectAnalytics.projects[0];
      insights.push(`Most popular project: ${topProject.title} with ${topProject.views} views`);
    }

    if (skillTrends.skills && skillTrends.skills.length > 0) {
      const topSkill = skillTrends.skills[0];
      insights.push(`Most sought-after skill: ${topSkill.name} (${topSkill.interest}% interest)`);
    }

    return insights;
  }

  generateEmployerInsights(employerBehavior, conversionData) {
    const insights = [];
    
    if (employerBehavior.averageScore > 70) {
      insights.push('High employer interest detected - consider highlighting availability');
    }

    if (conversionData.conversionRate < 0.02) {
      insights.push('Low conversion rate - optimize call-to-action placement');
    }

    return insights;
  }

  generateContentRecommendations(contentMetrics, pageAnalytics) {
    const recommendations = [];
    
    const lowPerforming = contentMetrics.content?.filter(c => c.engagementScore < 30) || [];
    if (lowPerforming.length > 0) {
      recommendations.push('Update low-performing content to improve engagement');
    }

    const highBounce = pageAnalytics.pages?.filter(p => p.bounceRate > 0.7) || [];
    if (highBounce.length > 0) {
      recommendations.push('Reduce bounce rate on high-traffic pages');
    }

    return recommendations;
  }

  generateExecutiveSummary(allData) {
    const insights = [];
    
    // Visitor insights
    if (allData.visitor.summary.totalProjects > 0) {
      insights.push(`Portfolio showcases ${allData.visitor.summary.totalProjects} projects`);
    }

    // Employer insights
    if (allData.employer.summary.potentialEmployers > 0) {
      insights.push(`${allData.employer.summary.potentialEmployers} potential employer visits detected`);
    }

    // Geographic insights
    if (allData.geographic.summary.totalCountries > 5) {
      insights.push(`International reach across ${allData.geographic.summary.totalCountries} countries`);
    }

    return insights.join('. ') + '.';
  }

  generateActionItems(allData) {
    const actions = [];

    // Conversion optimization
    if (allData.conversion.summary.conversionRate < 0.02) {
      actions.push('Optimize conversion funnel to improve contact form completion rates');
    }

    // Content optimization
    if (allData.content.summary.avgEngagementScore < 50) {
      actions.push('Enhance content engagement through better visuals and interactive elements');
    }

    // Geographic expansion
    const topMarkets = allData.geographic.summary.topMarkets || [];
    if (topMarkets.length > 0) {
      actions.push(`Consider creating localized content for top markets: ${topMarkets.join(', ')}`);
    }

    return actions;
  }

  addDataSectionsToPDF(doc, data) {
    // Implementation for adding data sections to PDF
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'title' && key !== 'summary' && typeof value === 'object') {
        if (doc.y > 700) doc.addPage();
        
        const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        doc.fontSize(14).text(title, 50, doc.y);
        doc.moveDown();
        
        if (Array.isArray(value)) {
          value.slice(0, 10).forEach((item, index) => {
            doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(item)}`, 70, doc.y);
          });
        }
        doc.moveDown();
      }
    });
  }

  addSummaryToExcel(sheet, data) {
    sheet.addRow(['Portfolio Analytics Report']);
    sheet.addRow(['Generated:', new Date().toLocaleDateString()]);
    sheet.addRow([]);

    if (data.summary) {
      sheet.addRow(['Key Metrics']);
      Object.entries(data.summary).forEach(([key, value]) => {
        sheet.addRow([key, value]);
      });
    }
  }

  addDataSheetsToExcel(workbook, data) {
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'title' && key !== 'summary' && Array.isArray(value)) {
        const sheet = workbook.addWorksheet(key);
        
        if (value.length > 0) {
          const headers = Object.keys(value[0]);
          sheet.addRow(headers);
          
          value.forEach(item => {
            const row = headers.map(header => item[header]);
            sheet.addRow(row);
          });
        }
      }
    });
  }

  convertToCSV(data) {
    let csv = `Portfolio Analytics Report\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    
    if (data.summary) {
      csv += "Key Metrics\n";
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
      csv += "\n";
    }

    // Add other data sections
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        csv += `${key}\n`;
        const headers = Object.keys(value[0]);
        csv += headers.join(',') + '\n';
        
        value.forEach(item => {
          const row = headers.map(header => item[header] || '');
          csv += row.join(',') + '\n';
        });
        csv += "\n";
      }
    });

    return csv;
  }
}

module.exports = ReportGenerator;