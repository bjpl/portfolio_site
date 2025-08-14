// tools/monitor/performance.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function monitorPerformance() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.evaluateOnNewDocument(() => {
        window.performanceMetrics = [];
        
        // Monitor all performance metrics
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                window.performanceMetrics.push({
                    name: entry.name,
                    type: entry.entryType,
                    duration: entry.duration,
                    timestamp: entry.startTime
                });
            }
        }).observe({ entryTypes: ['navigation', 'resource', 'paint', 'measure'] });
    });
    
    await page.goto('http://localhost:1313');
    
    // Get metrics
    const metrics = await page.evaluate(() => window.performanceMetrics);
    const performanceData = await page.metrics();
    
    // Save report
    await fs.writeFile('performance-report.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics,
        performance: performanceData
    }, null, 2));
    
    await browser.close();
    console.log('✅ Performance report saved');
}

if (require.main === module) {
    monitorPerformance();
}

module.exports = { monitorPerformance };
