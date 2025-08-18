// Image Optimizer Module
class ImageOptimizer {
    constructor() {
        this.images = [];
        this.optimizedImages = new Map();
        this.init();
    }

    init() {
        this.setupDropZone();
        this.setupControls();
        this.loadSavedSettings();
    }

    setupDropZone() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        if (!dropZone || !fileInput) return;

        // Click to upload
        uploadBtn?.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    setupControls() {
        // Quality slider
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = e.target.value + '%';
                this.reprocessImages();
            });
        }

        // Format selector
        const formatSelect = document.getElementById('formatSelect');
        if (formatSelect) {
            formatSelect.addEventListener('change', () => this.reprocessImages());
        }

        // Resize controls
        const resizeToggle = document.getElementById('resizeToggle');
        const maxWidth = document.getElementById('maxWidth');
        const maxHeight = document.getElementById('maxHeight');
        
        if (resizeToggle) {
            resizeToggle.addEventListener('change', () => {
                const resizeControls = document.querySelector('.resize-controls');
                if (resizeControls) {
                    resizeControls.style.display = resizeToggle.checked ? 'block' : 'none';
                }
                this.reprocessImages();
            });
        }

        // Batch actions
        document.getElementById('optimizeAllBtn')?.addEventListener('click', () => this.optimizeAll());
        document.getElementById('downloadAllBtn')?.addEventListener('click', () => this.downloadAll());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearAll());
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                this.processImage(file);
            } else {
                window.Toast?.show(`${file.name} is not an image`, 'warning');
            }
        });
    }

    async processImage(file) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = () => {
                const imageData = {
                    id: Date.now() + Math.random(),
                    file: file,
                    name: file.name,
                    originalSize: file.size,
                    originalUrl: e.target.result,
                    width: img.width,
                    height: img.height,
                    element: img
                };
                
                this.images.push(imageData);
                this.displayImage(imageData);
                this.optimizeImage(imageData);
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }

    displayImage(imageData) {
        const container = document.getElementById('imagesContainer');
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'image-card';
        card.id = `image-${imageData.id}`;
        card.innerHTML = `
            <div class="image-preview">
                <img src="${imageData.originalUrl}" alt="${imageData.name}">
                <div class="image-overlay">
                    <button class="btn-icon" onclick="imageOptimizer.removeImage('${imageData.id}')">
                        <span>✕</span>
                    </button>
                </div>
            </div>
            <div class="image-info">
                <h4>${imageData.name}</h4>
                <div class="image-stats">
                    <div class="stat">
                        <span class="label">Original:</span>
                        <span class="value">${this.formatFileSize(imageData.originalSize)}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Optimized:</span>
                        <span class="value optimized-size">Processing...</span>
                    </div>
                    <div class="stat">
                        <span class="label">Dimensions:</span>
                        <span class="value">${imageData.width} × ${imageData.height}</span>
                    </div>
                    <div class="stat savings" style="display: none;">
                        <span class="label">Saved:</span>
                        <span class="value savings-value">0%</span>
                    </div>
                </div>
                <div class="image-actions">
                    <button class="btn btn-sm btn-primary download-btn" disabled>
                        Download Optimized
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="imageOptimizer.compareImage('${imageData.id}')">
                        Compare
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    }

    async optimizeImage(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get settings
        const quality = parseInt(document.getElementById('qualitySlider')?.value || 85) / 100;
        const format = document.getElementById('formatSelect')?.value || 'webp';
        const shouldResize = document.getElementById('resizeToggle')?.checked;
        const maxWidth = parseInt(document.getElementById('maxWidth')?.value || 1920);
        const maxHeight = parseInt(document.getElementById('maxHeight')?.value || 1080);
        
        let width = imageData.width;
        let height = imageData.height;
        
        // Calculate new dimensions if resizing
        if (shouldResize) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            if (ratio < 1) {
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and optimize
        ctx.drawImage(imageData.element, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
            const optimizedUrl = URL.createObjectURL(blob);
            const optimizedData = {
                blob: blob,
                url: optimizedUrl,
                size: blob.size,
                format: format,
                width: width,
                height: height
            };
            
            this.optimizedImages.set(imageData.id, optimizedData);
            this.updateImageCard(imageData.id, optimizedData);
        }, `image/${format}`, quality);
    }

    updateImageCard(imageId, optimizedData) {
        const card = document.getElementById(`image-${imageId}`);
        if (!card) return;
        
        const imageData = this.images.find(img => img.id === imageId);
        const savings = Math.round((1 - optimizedData.size / imageData.originalSize) * 100);
        
        card.querySelector('.optimized-size').textContent = this.formatFileSize(optimizedData.size);
        
        const savingsDiv = card.querySelector('.savings');
        if (savingsDiv) {
            savingsDiv.style.display = 'block';
            savingsDiv.querySelector('.savings-value').textContent = `${savings}%`;
            savingsDiv.querySelector('.savings-value').style.color = savings > 0 ? '#48bb78' : '#f56565';
        }
        
        const downloadBtn = card.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => this.downloadImage(imageId);
        }
        
        // Update dimensions if resized
        if (optimizedData.width !== imageData.width || optimizedData.height !== imageData.height) {
            const dimensionStat = card.querySelector('.image-stats .stat:nth-child(3) .value');
            if (dimensionStat) {
                dimensionStat.innerHTML = `${imageData.width} × ${imageData.height}<br>→ ${optimizedData.width} × ${optimizedData.height}`;
            }
        }
    }

    reprocessImages() {
        this.images.forEach(imageData => {
            this.optimizeImage(imageData);
        });
    }

    optimizeAll() {
        if (this.images.length === 0) {
            window.Toast?.show('No images to optimize', 'info');
            return;
        }
        
        this.reprocessImages();
        window.Toast?.show(`Optimizing ${this.images.length} images...`, 'success');
    }

    downloadImage(imageId) {
        const imageData = this.images.find(img => img.id === imageId);
        const optimizedData = this.optimizedImages.get(imageId);
        
        if (!imageData || !optimizedData) return;
        
        const link = document.createElement('a');
        link.href = optimizedData.url;
        const extension = optimizedData.format === 'jpeg' ? 'jpg' : optimizedData.format;
        link.download = imageData.name.replace(/\.[^/.]+$/, `.${extension}`);
        link.click();
    }

    downloadAll() {
        if (this.optimizedImages.size === 0) {
            window.Toast?.show('No optimized images to download', 'info');
            return;
        }
        
        this.optimizedImages.forEach((optimizedData, imageId) => {
            setTimeout(() => this.downloadImage(imageId), 100);
        });
    }

    compareImage(imageId) {
        const imageData = this.images.find(img => img.id === imageId);
        const optimizedData = this.optimizedImages.get(imageId);
        
        if (!imageData || !optimizedData) return;
        
        // Create comparison modal
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="comparison-content">
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
                <h3>Image Comparison</h3>
                <div class="comparison-slider">
                    <div class="comparison-images">
                        <div class="original-image">
                            <img src="${imageData.originalUrl}" alt="Original">
                            <div class="image-label">Original (${this.formatFileSize(imageData.originalSize)})</div>
                        </div>
                        <div class="optimized-image">
                            <img src="${optimizedData.url}" alt="Optimized">
                            <div class="image-label">Optimized (${this.formatFileSize(optimizedData.size)})</div>
                        </div>
                    </div>
                    <input type="range" class="slider" min="0" max="100" value="50">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup comparison slider
        const slider = modal.querySelector('.slider');
        const optimizedImg = modal.querySelector('.optimized-image');
        
        slider.addEventListener('input', (e) => {
            optimizedImg.style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`;
        });
    }

    removeImage(imageId) {
        const index = this.images.findIndex(img => img.id === imageId);
        if (index > -1) {
            this.images.splice(index, 1);
            this.optimizedImages.delete(imageId);
            document.getElementById(`image-${imageId}`)?.remove();
        }
    }

    clearAll() {
        if (confirm('Remove all images?')) {
            this.images = [];
            this.optimizedImages.clear();
            const container = document.getElementById('imagesContainer');
            if (container) container.innerHTML = '';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    loadSavedSettings() {
        const savedSettings = localStorage.getItem('imageOptimizerSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            document.getElementById('qualitySlider').value = settings.quality || 85;
            document.getElementById('formatSelect').value = settings.format || 'webp';
            document.getElementById('resizeToggle').checked = settings.resize || false;
            document.getElementById('maxWidth').value = settings.maxWidth || 1920;
            document.getElementById('maxHeight').value = settings.maxHeight || 1080;
        }
    }

    saveSettings() {
        const settings = {
            quality: document.getElementById('qualitySlider').value,
            format: document.getElementById('formatSelect').value,
            resize: document.getElementById('resizeToggle').checked,
            maxWidth: document.getElementById('maxWidth').value,
            maxHeight: document.getElementById('maxHeight').value
        };
        localStorage.setItem('imageOptimizerSettings', JSON.stringify(settings));
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.imageOptimizer = new ImageOptimizer();
    });
} else {
    window.imageOptimizer = new ImageOptimizer();
}