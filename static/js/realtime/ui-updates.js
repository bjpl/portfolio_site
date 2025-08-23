/**
 * UI Updates Manager
 * Handles DOM manipulation for live updates, notifications, and real-time UI changes
 */

class UIUpdates {
  constructor() {
    this.notificationContainer = null;
    this.toastQueue = [];
    this.activeToasts = new Map();
    this.counters = new Map();
    this.optimisticUpdates = new Map();
    
    this.initializeNotificationSystem();
    this.initializeCounters();
  }

  /**
   * Initialize notification system
   */
  initializeNotificationSystem() {
    // Create notification container if it doesn't exist
    this.notificationContainer = document.getElementById('notification-container');
    
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.id = 'notification-container';
      this.notificationContainer.className = 'notification-container';
      this.notificationContainer.innerHTML = '';
      document.body.appendChild(this.notificationContainer);
    }

    // Add styles if not already present
    this.injectNotificationStyles();
  }

  /**
   * Inject notification styles
   */
  injectNotificationStyles() {
    if (document.getElementById('realtime-ui-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'realtime-ui-styles';
    styles.textContent = `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      }
      
      .toast {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 10px;
        padding: 16px;
        transform: translateX(100%);
        transition: all 0.3s ease;
        border-left: 4px solid #3b82f6;
        position: relative;
        overflow: hidden;
      }
      
      .toast.show {
        transform: translateX(0);
      }
      
      .toast.success {
        border-left-color: #10b981;
      }
      
      .toast.warning {
        border-left-color: #f59e0b;
      }
      
      .toast.error {
        border-left-color: #ef4444;
      }
      
      .toast-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .toast-title {
        font-weight: 600;
        color: #1f2937;
        margin: 0;
      }
      
      .toast-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        line-height: 1;
      }
      
      .toast-close:hover {
        color: #374151;
      }
      
      .toast-message {
        color: #4b5563;
        margin: 0;
        line-height: 1.5;
      }
      
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(59, 130, 246, 0.3);
        transition: width linear;
      }
      
      .toast-progress.success {
        background: rgba(16, 185, 129, 0.3);
      }
      
      .toast-progress.warning {
        background: rgba(245, 158, 11, 0.3);
      }
      
      .toast-progress.error {
        background: rgba(239, 68, 68, 0.3);
      }
      
      .live-counter {
        display: inline-block;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        min-width: 20px;
        height: 20px;
        line-height: 20px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        margin-left: 6px;
        animation: pulse 2s infinite;
      }
      
      .live-counter.zero {
        display: none;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .user-presence {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f3f4f6;
        border-radius: 6px;
        font-size: 14px;
        margin: 10px 0;
      }
      
      .presence-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        animation: pulse 2s infinite;
      }
      
      .presence-indicator.offline {
        background: #6b7280;
        animation: none;
      }
      
      .live-update {
        animation: highlight 1s ease-out;
      }
      
      @keyframes highlight {
        0% { background-color: #fef3c7; }
        100% { background-color: transparent; }
      }
      
      .optimistic-update {
        opacity: 0.6;
        position: relative;
      }
      
      .optimistic-update::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
        animation: shimmer 1.5s infinite;
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Initialize counters
   */
  initializeCounters() {
    // Find existing counter elements and register them
    document.querySelectorAll('[data-live-counter]').forEach(element => {
      const counterId = element.dataset.liveCounter;
      this.counters.set(counterId, {
        element,
        value: parseInt(element.textContent) || 0
      });
    });
  }

  /**
   * Show notification toast
   */
  showNotification({ type = 'info', title, message, duration = 5000, persistent = false }) {
    const toastId = this.generateId();
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast-header">
        <h4 class="toast-title">${title}</h4>
        <button class="toast-close" onclick="uiUpdates.dismissNotification('${toastId}')">&times;</button>
      </div>
      <p class="toast-message">${message}</p>
      ${!persistent ? `<div class="toast-progress ${type}"></div>` : ''}
    `;

    this.notificationContainer.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto dismiss if not persistent
    if (!persistent && duration > 0) {
      const progressBar = toast.querySelector('.toast-progress');
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${duration}ms linear`;
        
        requestAnimationFrame(() => {
          progressBar.style.width = '0%';
        });
      }

      setTimeout(() => {
        this.dismissNotification(toastId);
      }, duration);
    }

    this.activeToasts.set(toastId, {
      element: toast,
      type,
      persistent,
      created: Date.now()
    });

    return toastId;
  }

  /**
   * Dismiss notification
   */
  dismissNotification(toastId) {
    const toast = this.activeToasts.get(toastId);
    
    if (!toast) return;

    toast.element.classList.remove('show');
    
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.activeToasts.delete(toastId);
    }, 300);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    this.activeToasts.forEach((toast, id) => {
      this.dismissNotification(id);
    });
  }

  /**
   * Add new comment to the UI
   */
  addNewComment(comment) {
    const commentsSection = document.getElementById('comments-section');
    
    if (!commentsSection) return;

    const commentElement = this.createCommentElement(comment);
    
    // Add to the top of comments list
    const commentsList = commentsSection.querySelector('.comments-list');
    if (commentsList) {
      commentsList.insertBefore(commentElement, commentsList.firstChild);
      this.highlightElement(commentElement);
    }

    // Update comment count
    this.updateCommentCount(comment.post_id, 1);
  }

  /**
   * Update existing comment
   */
  updateComment(comment) {
    const commentElement = document.getElementById(`comment-${comment.id}`);
    
    if (!commentElement) return;

    // Update comment content
    const contentElement = commentElement.querySelector('.comment-content');
    if (contentElement) {
      contentElement.innerHTML = comment.content;
    }

    // Update status if needed
    if (comment.status === 'approved') {
      commentElement.classList.remove('pending');
      commentElement.classList.add('approved');
    }

    this.highlightElement(commentElement);
  }

  /**
   * Create comment element
   */
  createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.id = `comment-${comment.id}`;
    commentDiv.className = `comment ${comment.status}`;
    
    commentDiv.innerHTML = `
      <div class="comment-header">
        <strong class="comment-author">${comment.author_name}</strong>
        <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
      </div>
      <div class="comment-content">${comment.content}</div>
      ${comment.status === 'pending' ? '<div class="comment-status">Pending approval</div>' : ''}
    `;

    return commentDiv;
  }

  /**
   * Add new blog post to the UI
   */
  addNewBlogPost(post) {
    const blogList = document.getElementById('blog-posts-list');
    
    if (!blogList) return;

    const postElement = this.createBlogPostElement(post);
    
    // Add to the top of blog list
    blogList.insertBefore(postElement, blogList.firstChild);
    this.highlightElement(postElement);
  }

  /**
   * Update blog post
   */
  updateBlogPost(newPost, oldPost) {
    const postElement = document.getElementById(`post-${newPost.id}`);
    
    if (!postElement) return;

    // Update title
    const titleElement = postElement.querySelector('.post-title');
    if (titleElement && oldPost.title !== newPost.title) {
      titleElement.textContent = newPost.title;
      this.highlightElement(titleElement);
    }

    // Update content preview
    const excerptElement = postElement.querySelector('.post-excerpt');
    if (excerptElement && oldPost.excerpt !== newPost.excerpt) {
      excerptElement.textContent = newPost.excerpt;
      this.highlightElement(excerptElement);
    }

    // Update status
    if (oldPost.status !== newPost.status) {
      postElement.className = `blog-post ${newPost.status}`;
      this.highlightElement(postElement);
    }
  }

  /**
   * Remove blog post
   */
  removeBlogPost(post) {
    const postElement = document.getElementById(`post-${post.id}`);
    
    if (postElement) {
      postElement.style.transition = 'all 0.3s ease';
      postElement.style.opacity = '0';
      postElement.style.transform = 'translateX(-100%)';
      
      setTimeout(() => {
        if (postElement.parentNode) {
          postElement.parentNode.removeChild(postElement);
        }
      }, 300);
    }
  }

  /**
   * Create blog post element
   */
  createBlogPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.id = `post-${post.id}`;
    postDiv.className = `blog-post ${post.status}`;
    
    postDiv.innerHTML = `
      <h3 class="post-title">${post.title}</h3>
      <p class="post-excerpt">${post.excerpt}</p>
      <div class="post-meta">
        <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
        <span class="post-status">${post.status}</span>
      </div>
    `;

    return postDiv;
  }

  /**
   * Add contact form submission to admin view
   */
  addContactSubmission(submission) {
    const submissionsList = document.getElementById('contact-submissions-list');
    
    if (!submissionsList) return;

    const submissionElement = this.createContactSubmissionElement(submission);
    
    // Add to the top of submissions list
    submissionsList.insertBefore(submissionElement, submissionsList.firstChild);
    this.highlightElement(submissionElement);
  }

  /**
   * Create contact submission element
   */
  createContactSubmissionElement(submission) {
    const submissionDiv = document.createElement('div');
    submissionDiv.id = `submission-${submission.id}`;
    submissionDiv.className = 'contact-submission new';
    
    submissionDiv.innerHTML = `
      <div class="submission-header">
        <strong class="submission-name">${submission.name}</strong>
        <span class="submission-email">${submission.email}</span>
        <span class="submission-date">${new Date(submission.created_at).toLocaleString()}</span>
      </div>
      <div class="submission-subject">${submission.subject}</div>
      <div class="submission-message">${submission.message}</div>
      <div class="submission-actions">
        <button class="btn btn-primary" onclick="markAsRead('${submission.id}')">Mark as Read</button>
        <button class="btn btn-secondary" onclick="replyToSubmission('${submission.id}')">Reply</button>
      </div>
    `;

    return submissionDiv;
  }

  /**
   * Update active users count and presence
   */
  updateActiveUsers(count, presenceState) {
    // Update counter
    this.updateCounter('active-users', count);

    // Update presence indicators
    const presenceContainer = document.getElementById('user-presence');
    
    if (presenceContainer) {
      presenceContainer.innerHTML = `
        <div class="presence-indicator ${count > 0 ? 'online' : 'offline'}"></div>
        <span>${count} user${count !== 1 ? 's' : ''} online</span>
      `;
    }

    // Show detailed presence if available
    const detailedPresence = document.getElementById('detailed-presence');
    if (detailedPresence && presenceState) {
      this.updateDetailedPresence(detailedPresence, presenceState);
    }
  }

  /**
   * Update detailed presence information
   */
  updateDetailedPresence(container, presenceState) {
    const users = Object.values(presenceState).flat();
    
    container.innerHTML = users.map(user => `
      <div class="presence-user">
        <div class="presence-indicator online"></div>
        <span>${user.user_id}</span>
        <small>on ${user.page}</small>
      </div>
    `).join('');
  }

  /**
   * Show user joined notification
   */
  showUserJoined(presence) {
    if (presence.user_id === 'anonymous') return;
    
    this.showNotification({
      type: 'info',
      title: 'User Joined',
      message: `${presence.user_id} joined the site`,
      duration: 3000
    });
  }

  /**
   * Show user left notification
   */
  showUserLeft(presence) {
    if (presence.user_id === 'anonymous') return;
    
    this.showNotification({
      type: 'info',
      title: 'User Left',
      message: `${presence.user_id} left the site`,
      duration: 3000
    });
  }

  /**
   * Update analytics dashboard
   */
  updateAnalyticsDashboard(data) {
    // Update page views
    if (data.page_views !== undefined) {
      this.updateCounter('total-page-views', data.page_views);
    }

    // Update unique visitors
    if (data.unique_visitors !== undefined) {
      this.updateCounter('unique-visitors', data.unique_visitors);
    }

    // Update charts if present
    this.updateAnalyticsCharts(data);
  }

  /**
   * Update analytics charts
   */
  updateAnalyticsCharts(data) {
    // This would integrate with your charting library
    const event = new CustomEvent('analytics:update', { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * Update session count
   */
  updateSessionCount(eventType, session) {
    if (eventType === 'INSERT') {
      this.incrementCounter('active-sessions');
    } else if (eventType === 'DELETE') {
      this.decrementCounter('active-sessions');
    }
  }

  /**
   * Update counter value
   */
  updateCounter(counterId, value) {
    const counter = this.counters.get(counterId);
    
    if (counter) {
      const oldValue = counter.value;
      counter.value = value;
      counter.element.textContent = value;
      
      // Add animation class
      if (oldValue !== value) {
        counter.element.classList.add('live-update');
        setTimeout(() => {
          counter.element.classList.remove('live-update');
        }, 1000);
      }
      
      // Handle zero values
      if (value === 0) {
        counter.element.classList.add('zero');
      } else {
        counter.element.classList.remove('zero');
      }
    }
  }

  /**
   * Update comment count for a post
   */
  updateCommentCount(postId, increment = 1) {
    const countElement = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
    
    if (countElement) {
      const currentCount = parseInt(countElement.textContent) || 0;
      const newCount = currentCount + increment;
      countElement.textContent = newCount;
      
      this.highlightElement(countElement);
    }
  }

  /**
   * Increment counter
   */
  incrementCounter(counterId, amount = 1) {
    const counter = this.counters.get(counterId);
    
    if (counter) {
      this.updateCounter(counterId, counter.value + amount);
    }
  }

  /**
   * Decrement counter
   */
  decrementCounter(counterId, amount = 1) {
    const counter = this.counters.get(counterId);
    
    if (counter) {
      this.updateCounter(counterId, Math.max(0, counter.value - amount));
    }
  }

  /**
   * Add optimistic update
   */
  addOptimisticUpdate(elementId, updateData) {
    const element = document.getElementById(elementId);
    
    if (!element) return;

    // Store original state
    this.optimisticUpdates.set(elementId, {
      originalHTML: element.innerHTML,
      originalClasses: element.className,
      updateData,
      timestamp: Date.now()
    });

    // Apply optimistic update
    element.classList.add('optimistic-update');
    
    // Apply the update
    if (updateData.content) {
      element.innerHTML = updateData.content;
    }
    
    if (updateData.classes) {
      element.className = updateData.classes;
    }

    // Set timeout to revert if not confirmed
    setTimeout(() => {
      this.revertOptimisticUpdate(elementId);
    }, 10000); // 10 seconds timeout
  }

  /**
   * Confirm optimistic update
   */
  confirmOptimisticUpdate(elementId) {
    const update = this.optimisticUpdates.get(elementId);
    
    if (update) {
      const element = document.getElementById(elementId);
      if (element) {
        element.classList.remove('optimistic-update');
      }
      this.optimisticUpdates.delete(elementId);
    }
  }

  /**
   * Revert optimistic update
   */
  revertOptimisticUpdate(elementId) {
    const update = this.optimisticUpdates.get(elementId);
    
    if (!update) return;

    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = update.originalHTML;
      element.className = update.originalClasses;
    }

    this.optimisticUpdates.delete(elementId);
  }

  /**
   * Highlight element with animation
   */
  highlightElement(element) {
    element.classList.add('live-update');
    setTimeout(() => {
      element.classList.remove('live-update');
    }, 1000);
  }

  /**
   * Show connection status
   */
  showConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
      statusElement.textContent = status === 'connected' ? 'Online' : 'Offline';
    }
  }

  /**
   * Show loading state
   */
  showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    
    if (element) {
      element.innerHTML = `<div class="loading-spinner">${message}</div>`;
      element.classList.add('loading');
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(elementId) {
    const element = document.getElementById(elementId);
    
    if (element) {
      element.classList.remove('loading');
      // Remove loading spinner if present
      const spinner = element.querySelector('.loading-spinner');
      if (spinner) {
        spinner.remove();
      }
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Batch DOM updates for performance
   */
  batchUpdates(updates) {
    // Use requestAnimationFrame to batch DOM updates
    requestAnimationFrame(() => {
      updates.forEach(update => {
        try {
          update();
        } catch (error) {
          console.error('Error in batched update:', error);
        }
      });
    });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.clearAllNotifications();
    this.optimisticUpdates.clear();
    
    // Remove event listeners
    // (Add specific cleanup based on your implementation)
  }
}

// Create singleton instance
export const uiUpdates = new UIUpdates();

// Global access for debugging
window.uiUpdates = uiUpdates;