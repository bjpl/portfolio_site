// Lazy Loading for Images
(function() {
    'use strict';
    
    // Check if native lazy loading is supported
    if ('loading' in HTMLImageElement.prototype) {
        // Native lazy loading is supported
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    } else {
        // Fallback to Intersection Observer
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Load the image
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    
                    // Add loaded class for animations
                    img.classList.add('loaded');
                    
                    // Stop observing this image
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        // Observe all images with data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
        
        // Also observe images with loading="lazy" attribute
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            if (img.dataset.src) {
                imageObserver.observe(img);
            }
        });
    }
    
    // Add CSS for smooth loading
    const style = document.createElement('style');
    style.textContent = `
        img[data-src] {
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        img.loaded {
            opacity: 1;
        }
        
        /* Blur-up effect */
        .lazy-blur {
            filter: blur(5px);
            transition: filter 0.3s;
        }
        
        .lazy-blur.loaded {
            filter: blur(0);
        }
    `;
    document.head.appendChild(style);
})();