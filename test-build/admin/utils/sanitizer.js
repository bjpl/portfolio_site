/**
 * Client-side input sanitization utility
 * Prevents XSS attacks in admin interface
 */

class InputSanitizer {
  constructor() {
    // HTML entities map for escaping
    this.htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
  }

  /**
   * Escape HTML entities to prevent XSS
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/[&<>"'\/]/g, (char) => this.htmlEntities[char]);
  }

  /**
   * Safe innerHTML replacement
   */
  safeSetInnerHTML(element, html) {
    if (!element) return;
    
    // Basic sanitization - remove script tags and event handlers
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:/gi, '');
    
    element.innerHTML = sanitized;
  }

  /**
   * Create safe text content
   */
  createSafeTextNode(text) {
    const span = document.createElement('span');
    span.textContent = this.escapeHtml(text);
    return span;
  }

  /**
   * Sanitize form input data
   */
  sanitizeFormData(formData) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = this.escapeHtml(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// Global instance
window.sanitizer = new InputSanitizer();

// Safe jQuery-like helper
window.safeHTML = (element, content) => {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  
  if (element && content !== undefined) {
    window.sanitizer.safeSetInnerHTML(element, content);
    return element;
  }
  
  return element;
};