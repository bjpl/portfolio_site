// Links URL Tracking UI

// Track initialization state
let initialized = false;

// URL tracking UI disabled for cleaner design
// document.addEventListener('DOMContentLoaded', () => {
//     if (!initialized) {
//         initializeUrlTracking();
//     }
// });

// // Also try immediate initialization in case DOM is already ready
// if (document.readyState === 'complete' || document.readyState === 'interactive') {
//     setTimeout(() => {
//         if (!initialized) {
//             initializeUrlTracking();
//         }
//     }, 100);
// }

function initializeUrlTracking() {
    // Prevent multiple initializations
    if (initialized) {
        console.log('⚠️ URL tracking UI already initialized, skipping...');
        return;
    }
    initialized = true;

    console.log('🚀 Initializing URL tracking UI...');

    // Initialize all UI components
    initializeUrlFilters();
    updateUrlProgress();
    updateMissingUrlsCounter();
}

function initializeUrlFilters() {
    const tabs = document.createElement('div');
    tabs.className = 'url-filter-tabs';
    tabs.innerHTML = `
        <div class="url-filter-tab active">All</div>
        <div class="url-filter-tab">Missing Website</div>
        <div class="url-filter-tab">Missing YouTube</div>
    `;

    const linkGrid = document.querySelector('.link-grid');
    if (!linkGrid) return;
    linkGrid.parentNode.insertBefore(tabs, linkGrid);

    tabs.addEventListener('click', e => {
        if (!e.target.classList.contains('url-filter-tab')) return;
        
        tabs.querySelectorAll('.url-filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        e.target.classList.add('active');

        const filter = e.target.textContent;
        const links = document.querySelectorAll('.link-item-wrapper');

        links.forEach(link => {
            if (filter === 'All') {
                link.style.display = '';
                return;
            }

            const websiteIcon = link.querySelector('.social-icon.website');
            const youtubeIcon = link.querySelector('.social-icon.youtube');
            const missingWebsite = websiteIcon.classList.contains('disabled');
            const missingYoutube = youtubeIcon.classList.contains('disabled');

            if (filter === 'Missing Website' && missingWebsite) {
                link.style.display = '';
            } else if (filter === 'Missing YouTube' && missingYoutube) {
                link.style.display = '';
            } else {
                link.style.display = 'none';
            }
        });
    });
}

function updateUrlProgress() {
    // Count verified URLs
    const links = document.querySelectorAll('.link-item-wrapper');
    let websiteUrls = 0;
    let youtubeUrls = 0;

    links.forEach(link => {
        const websiteIcon = link.querySelector('.social-icon.website');
        const youtubeIcon = link.querySelector('.social-icon.youtube');
        
        if (websiteIcon && !websiteIcon.classList.contains('disabled')) {
            websiteUrls++;
        }
        if (youtubeIcon && !youtubeIcon.classList.contains('disabled')) {
            youtubeUrls++;
        }
    });

    const totalAccounts = links.length;
    const websiteProgress = (websiteUrls / totalAccounts) * 100;
    const youtubeProgress = (youtubeUrls / totalAccounts) * 100;

    const progress = document.createElement('div');
    progress.className = 'url-progress';
    progress.innerHTML = `
        <div class="url-progress-label">
            <span>Website URLs</span>
            <span>${websiteUrls}/${totalAccounts}</span>
        </div>
        <div class="url-progress-bar">
            <div style="width: ${websiteProgress}%"></div>
        </div>
        <div class="url-progress-label">
            <span>YouTube Channels</span>
            <span>${youtubeUrls}/${totalAccounts}</span>
        </div>
        <div class="url-progress-bar">
            <div style="width: ${youtubeProgress}%"></div>
        </div>
    `;

    // Remove existing progress element if any
    const existingProgress = document.querySelector('.url-progress');
    if (existingProgress) {
        existingProgress.remove();
    }

    document.body.appendChild(progress);
}

function updateMissingUrlsCounter() {
    // Count missing URLs
    const links = document.querySelectorAll('.link-item-wrapper');
    let missingWebsites = 0;
    let missingYoutube = 0;

    links.forEach(link => {
        const websiteIcon = link.querySelector('.social-icon.website');
        const youtubeIcon = link.querySelector('.social-icon.youtube');
        
        if (websiteIcon && websiteIcon.classList.contains('disabled')) {
            missingWebsites++;
        }
        if (youtubeIcon && youtubeIcon.classList.contains('disabled')) {
            missingYoutube++;
        }
    });

    const counter = document.createElement('div');
    counter.className = 'missing-urls-counter';
    counter.innerHTML = `
        <div>Missing URLs: <span>${missingWebsites}</span></div>
        <div>Missing YouTube: <span>${missingYoutube}</span></div>
    `;

    // Remove existing counter if any
    const existingCounter = document.querySelector('.missing-urls-counter');
    if (existingCounter) {
        existingCounter.remove();
    }

    document.body.appendChild(counter);
}