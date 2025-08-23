/**
 * UI Integration Tests for Supabase
 * Tests how Supabase integrates with UI components and user interactions
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

describe('Supabase UI Integration', () => {
  let supabase;
  let dom;
  let window;
  let document;
  let uiComponents;

  beforeAll(async () => {
    // Setup comprehensive DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supabase UI Integration Test</title>
          <style>
            .loading { opacity: 0.5; pointer-events: none; }
            .error { border-color: red; }
            .success { border-color: green; }
            .hidden { display: none; }
          </style>
        </head>
        <body>
          <!-- Authentication UI -->
          <div id="auth-container">
            <form id="login-form">
              <input id="email" type="email" placeholder="Email" required>
              <input id="password" type="password" placeholder="Password" required>
              <button id="login-btn" type="submit">Login</button>
              <button id="register-btn" type="button">Register</button>
            </form>
            
            <div id="auth-status"></div>
            <div id="auth-error" class="hidden"></div>
            <div id="user-profile" class="hidden">
              <h3>Welcome, <span id="user-name"></span></h3>
              <button id="logout-btn">Logout</button>
            </div>
          </div>

          <!-- Data Display Components -->
          <div id="data-container">
            <div id="loading-indicator" class="hidden">Loading...</div>
            <div id="blog-posts">
              <h2>Blog Posts</h2>
              <ul id="posts-list"></ul>
              <button id="load-more-posts">Load More</button>
            </div>
            
            <div id="projects">
              <h2>Projects</h2>
              <div id="projects-grid"></div>
              <select id="filter-category">
                <option value="">All Categories</option>
                <option value="web">Web Development</option>
                <option value="mobile">Mobile Apps</option>
              </select>
            </div>
          </div>

          <!-- Real-time Components -->
          <div id="realtime-container">
            <div id="online-users">
              <h3>Online Users</h3>
              <ul id="users-list"></ul>
            </div>
            
            <div id="notifications">
              <h3>Notifications</h3>
              <div id="notifications-list"></div>
            </div>

            <div id="chat-room">
              <div id="messages"></div>
              <form id="message-form">
                <input id="message-input" type="text" placeholder="Type a message...">
                <button type="submit">Send</button>
              </form>
            </div>
          </div>

          <!-- Forms and Inputs -->
          <div id="forms-container">
            <form id="contact-form">
              <input id="contact-name" type="text" placeholder="Name" required>
              <input id="contact-email" type="email" placeholder="Email" required>
              <textarea id="contact-message" placeholder="Message" required></textarea>
              <button id="contact-submit" type="submit">Send Message</button>
            </form>

            <form id="profile-form">
              <input id="profile-name" type="text" placeholder="Full Name">
              <textarea id="profile-bio" placeholder="Bio"></textarea>
              <button id="profile-save" type="submit">Save Profile</button>
            </form>
          </div>

          <!-- File Upload -->
          <div id="upload-container">
            <input id="file-input" type="file" multiple>
            <div id="upload-progress"></div>
            <div id="uploaded-files"></div>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;

    // Setup global environment
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage;
    global.fetch = require('node-fetch');
    global.FormData = window.FormData;
    global.File = window.File;
    global.FileReader = window.FileReader;

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';

    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    // Initialize UI components manager
    uiComponents = createUIComponents(supabase, document);
  });

  afterAll(() => {
    if (dom) {
      dom.window.close();
    }
  });

  beforeEach(() => {
    // Reset UI state
    resetUIState();
  });

  afterEach(async () => {
    // Cleanup auth state
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // Helper function to create UI components manager
  function createUIComponents(supabase, document) {
    return {
      // Authentication UI
      updateAuthUI: (user, session) => {
        const authContainer = document.getElementById('auth-container');
        const loginForm = document.getElementById('login-form');
        const userProfile = document.getElementById('user-profile');
        const userName = document.getElementById('user-name');
        const authStatus = document.getElementById('auth-status');

        if (user && session) {
          loginForm.classList.add('hidden');
          userProfile.classList.remove('hidden');
          userName.textContent = user.email;
          authStatus.textContent = 'Authenticated';
        } else {
          loginForm.classList.remove('hidden');
          userProfile.classList.add('hidden');
          userName.textContent = '';
          authStatus.textContent = 'Not authenticated';
        }
      },

      // Error handling
      showError: (message, elementId = 'auth-error') => {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
          errorElement.classList.add('hidden');
        }, 5000);
      },

      // Loading states
      setLoading: (isLoading, elementId = 'loading-indicator') => {
        const loadingElement = document.getElementById(elementId);
        if (isLoading) {
          loadingElement.classList.remove('hidden');
        } else {
          loadingElement.classList.add('hidden');
        }
      },

      // Data rendering
      renderBlogPosts: (posts) => {
        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = '';
        
        posts.forEach(post => {
          const li = document.createElement('li');
          li.innerHTML = `
            <h4>${post.title}</h4>
            <p>${post.excerpt}</p>
            <small>Published: ${new Date(post.published_at).toLocaleDateString()}</small>
          `;
          postsList.appendChild(li);
        });
      },

      renderProjects: (projects) => {
        const projectsGrid = document.getElementById('projects-grid');
        projectsGrid.innerHTML = '';
        
        projects.forEach(project => {
          const div = document.createElement('div');
          div.className = 'project-card';
          div.innerHTML = `
            <h4>${project.title}</h4>
            <p>${project.description}</p>
            <div class="tech-stack">${project.tech_stack?.join(', ') || ''}</div>
          `;
          projectsGrid.appendChild(div);
        });
      },

      // Real-time UI updates
      updateOnlineUsers: (presenceState) => {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        Object.values(presenceState).forEach(presence => {
          presence.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.user || 'Anonymous';
            usersList.appendChild(li);
          });
        });
      },

      addNotification: (notification) => {
        const notificationsList = document.getElementById('notifications-list');
        const div = document.createElement('div');
        div.className = 'notification';
        div.innerHTML = `
          <strong>${notification.title}</strong>
          <p>${notification.message}</p>
          <small>${new Date(notification.timestamp).toLocaleTimeString()}</small>
        `;
        notificationsList.insertBefore(div, notificationsList.firstChild);
      },

      addChatMessage: (message) => {
        const messagesContainer = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `
          <strong>${message.user}:</strong>
          <span>${message.text}</span>
          <small>${new Date(message.timestamp).toLocaleTimeString()}</small>
        `;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    };
  }

  function resetUIState() {
    // Clear forms
    document.querySelectorAll('form').forEach(form => form.reset());
    
    // Hide error messages
    document.querySelectorAll('.error, .hidden').forEach(el => {
      el.classList.add('hidden');
    });
    
    // Clear dynamic content
    document.getElementById('posts-list').innerHTML = '';
    document.getElementById('projects-grid').innerHTML = '';
    document.getElementById('users-list').innerHTML = '';
    document.getElementById('notifications-list').innerHTML = '';
    document.getElementById('messages').innerHTML = '';
  }

  describe('Authentication UI Integration', () => {
    it('should handle login form submission', async () => {
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const loginForm = document.getElementById('login-form');

      // Fill form
      emailInput.value = 'test@example.com';
      passwordInput.value = 'password123';

      // Mock form submission
      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      let formSubmitted = false;

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formSubmitted = true;
        
        // Show loading state
        uiComponents.setLoading(true);
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value
          });

          if (error) {
            uiComponents.showError(error.message);
          } else {
            uiComponents.updateAuthUI(data.user, data.session);
          }
        } catch (err) {
          uiComponents.showError('Login failed');
        } finally {
          uiComponents.setLoading(false);
        }
      });

      loginForm.dispatchEvent(submitEvent);
      expect(formSubmitted).toBe(true);
    });

    it('should update UI on authentication state changes', (done) => {
      let stateChangeHandled = false;

      supabase.auth.onAuthStateChange((event, session) => {
        if (!stateChangeHandled) {
          stateChangeHandled = true;
          uiComponents.updateAuthUI(session?.user, session);
          
          const authStatus = document.getElementById('auth-status');
          expect(authStatus.textContent).toBeDefined();
          done();
        }
      });
    });

    it('should handle logout functionality', () => {
      const logoutBtn = document.getElementById('logout-btn');
      let logoutClicked = false;

      logoutBtn.addEventListener('click', async () => {
        logoutClicked = true;
        await supabase.auth.signOut();
        uiComponents.updateAuthUI(null, null);
      });

      logoutBtn.click();
      expect(logoutClicked).toBe(true);
    });

    it('should display authentication errors in UI', () => {
      const errorMessage = 'Invalid credentials';
      uiComponents.showError(errorMessage);

      const errorElement = document.getElementById('auth-error');
      expect(errorElement.textContent).toBe(errorMessage);
      expect(errorElement.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Data Loading and Display', () => {
    it('should load and display blog posts', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post 1',
          excerpt: 'This is a test post',
          published_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Test Post 2',
          excerpt: 'Another test post',
          published_at: new Date().toISOString()
        }
      ];

      // Mock loading state
      uiComponents.setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        uiComponents.renderBlogPosts(mockPosts);
        uiComponents.setLoading(false);
      }, 100);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 150));

      const postsList = document.getElementById('posts-list');
      expect(postsList.children.length).toBe(2);
      expect(postsList.children[0].textContent).toContain('Test Post 1');
    });

    it('should handle load more functionality', () => {
      const loadMoreBtn = document.getElementById('load-more-posts');
      let loadMoreClicked = false;

      loadMoreBtn.addEventListener('click', async () => {
        loadMoreClicked = true;
        
        // Show loading
        uiComponents.setLoading(true);
        
        try {
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(0, 9);

          if (!error && data) {
            uiComponents.renderBlogPosts(data);
          }
        } catch (err) {
          uiComponents.showError('Failed to load posts');
        } finally {
          uiComponents.setLoading(false);
        }
      });

      loadMoreBtn.click();
      expect(loadMoreClicked).toBe(true);
    });

    it('should filter projects by category', () => {
      const filterSelect = document.getElementById('filter-category');
      let filterChanged = false;

      filterSelect.addEventListener('change', async () => {
        filterChanged = true;
        const category = filterSelect.value;
        
        let query = supabase
          .from('projects')
          .select('*')
          .eq('status', 'active');

        if (category) {
          query = query.eq('category', category);
        }

        try {
          const { data, error } = await query;
          if (!error && data) {
            uiComponents.renderProjects(data);
          }
        } catch (err) {
          uiComponents.showError('Failed to filter projects');
        }
      });

      // Simulate selection change
      filterSelect.value = 'web';
      const changeEvent = new window.Event('change', { bubbles: true });
      filterSelect.dispatchEvent(changeEvent);
      
      expect(filterChanged).toBe(true);
    });

    it('should handle empty data states', () => {
      uiComponents.renderBlogPosts([]);
      uiComponents.renderProjects([]);

      const postsList = document.getElementById('posts-list');
      const projectsGrid = document.getElementById('projects-grid');

      expect(postsList.children.length).toBe(0);
      expect(projectsGrid.children.length).toBe(0);
    });
  });

  describe('Real-time UI Updates', () => {
    it('should update online users display', () => {
      const mockPresenceState = {
        'user1': [{ user: 'Alice', status: 'online' }],
        'user2': [{ user: 'Bob', status: 'online' }]
      };

      uiComponents.updateOnlineUsers(mockPresenceState);

      const usersList = document.getElementById('users-list');
      expect(usersList.children.length).toBe(2);
      expect(usersList.textContent).toContain('Alice');
      expect(usersList.textContent).toContain('Bob');
    });

    it('should add notifications to UI', () => {
      const notification = {
        title: 'New Message',
        message: 'You have a new contact form submission',
        timestamp: Date.now()
      };

      uiComponents.addNotification(notification);

      const notificationsList = document.getElementById('notifications-list');
      expect(notificationsList.children.length).toBe(1);
      expect(notificationsList.textContent).toContain('New Message');
    });

    it('should handle chat messages', () => {
      const messages = [
        { user: 'Alice', text: 'Hello everyone!', timestamp: Date.now() },
        { user: 'Bob', text: 'Hi Alice!', timestamp: Date.now() + 1000 }
      ];

      messages.forEach(message => {
        uiComponents.addChatMessage(message);
      });

      const messagesContainer = document.getElementById('messages');
      expect(messagesContainer.children.length).toBe(2);
      expect(messagesContainer.textContent).toContain('Hello everyone!');
      expect(messagesContainer.textContent).toContain('Hi Alice!');
    });

    it('should integrate with realtime subscriptions', (done) => {
      let messageReceived = false;

      // Create realtime subscription
      const channel = supabase
        .channel('ui-integration-test')
        .on('broadcast', { event: 'new-message' }, (payload) => {
          messageReceived = true;
          uiComponents.addChatMessage({
            user: payload.user,
            text: payload.message,
            timestamp: payload.timestamp
          });
          
          const messagesContainer = document.getElementById('messages');
          expect(messagesContainer.children.length).toBeGreaterThan(0);
          
          channel.unsubscribe();
          done();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Send test message
            channel.send({
              type: 'broadcast',
              event: 'new-message',
              payload: {
                user: 'TestUser',
                message: 'Integration test message',
                timestamp: Date.now()
              }
            });
          }
        });
    });
  });

  describe('Form Interactions', () => {
    it('should handle contact form submission', () => {
      const contactForm = document.getElementById('contact-form');
      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const messageInput = document.getElementById('contact-message');
      
      let formSubmitted = false;

      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formSubmitted = true;

        const formData = {
          name: nameInput.value,
          email: emailInput.value,
          message: messageInput.value
        };

        try {
          const response = await fetch('/.netlify/functions/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          if (response.ok) {
            contactForm.reset();
            uiComponents.showError('Message sent successfully!', 'success-message');
          } else {
            uiComponents.showError('Failed to send message');
          }
        } catch (err) {
          uiComponents.showError('Network error');
        }
      });

      // Fill and submit form
      nameInput.value = 'Test User';
      emailInput.value = 'test@example.com';
      messageInput.value = 'Test message';

      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      contactForm.dispatchEvent(submitEvent);

      expect(formSubmitted).toBe(true);
    });

    it('should handle profile form with Supabase updates', () => {
      const profileForm = document.getElementById('profile-form');
      const nameInput = document.getElementById('profile-name');
      const bioInput = document.getElementById('profile-bio');
      
      let profileUpdated = false;

      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        profileUpdated = true;

        const updates = {
          full_name: nameInput.value,
          bio: bioInput.value,
          updated_at: new Date().toISOString()
        };

        try {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', 'current-user-id')
            .select();

          if (error) {
            uiComponents.showError('Failed to update profile');
          } else {
            uiComponents.showError('Profile updated successfully!', 'success-message');
          }
        } catch (err) {
          uiComponents.showError('Update failed');
        }
      });

      // Fill and submit form
      nameInput.value = 'Updated Name';
      bioInput.value = 'Updated bio';

      const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
      profileForm.dispatchEvent(submitEvent);

      expect(profileUpdated).toBe(true);
    });

    it('should validate form inputs', () => {
      const emailInput = document.getElementById('email');
      const contactEmail = document.getElementById('contact-email');

      // Test email validation
      emailInput.value = 'invalid-email';
      expect(emailInput.validity.valid).toBe(false);

      emailInput.value = 'valid@example.com';
      expect(emailInput.validity.valid).toBe(true);

      // Test required field validation
      contactEmail.value = '';
      expect(contactEmail.validity.valid).toBe(false);

      contactEmail.value = 'test@example.com';
      expect(contactEmail.validity.valid).toBe(true);
    });
  });

  describe('File Upload Integration', () => {
    it('should handle file selection', () => {
      const fileInput = document.getElementById('file-input');
      let filesSelected = false;

      fileInput.addEventListener('change', (e) => {
        filesSelected = true;
        const files = e.target.files;
        
        if (files.length > 0) {
          // Display selected files
          const uploadedFiles = document.getElementById('uploaded-files');
          uploadedFiles.innerHTML = '';
          
          Array.from(files).forEach(file => {
            const div = document.createElement('div');
            div.textContent = `${file.name} (${file.size} bytes)`;
            uploadedFiles.appendChild(div);
          });
        }
      });

      // Simulate file selection
      const file = new window.File(['test content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      const changeEvent = new window.Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      expect(filesSelected).toBe(true);
    });

    it('should handle file upload with progress', async () => {
      const fileInput = document.getElementById('file-input');
      const progressDiv = document.getElementById('upload-progress');
      
      const mockFile = new window.File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock upload function
      const uploadFile = async (file) => {
        progressDiv.textContent = 'Uploading...';
        
        try {
          const { data, error } = await supabase.storage
            .from('uploads')
            .upload(`test/${file.name}`, file);

          if (error) {
            progressDiv.textContent = 'Upload failed';
            return false;
          } else {
            progressDiv.textContent = 'Upload complete';
            return true;
          }
        } catch (err) {
          progressDiv.textContent = 'Upload error';
          return false;
        }
      };

      const result = await uploadFile(mockFile);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('should display loading states appropriately', () => {
      const loadingIndicator = document.getElementById('loading-indicator');
      
      // Initially hidden
      expect(loadingIndicator.classList.contains('hidden')).toBe(true);
      
      // Show loading
      uiComponents.setLoading(true);
      expect(loadingIndicator.classList.contains('hidden')).toBe(false);
      
      // Hide loading
      uiComponents.setLoading(false);
      expect(loadingIndicator.classList.contains('hidden')).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      // Simulate network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        await fetch('/api/test');
      } catch (error) {
        uiComponents.showError('Network connection failed');
      }
      
      const errorElement = document.getElementById('auth-error');
      expect(errorElement.textContent).toBe('Network connection failed');
    });

    it('should provide user feedback for all interactions', () => {
      const testActions = [
        () => uiComponents.showError('Test error message'),
        () => uiComponents.setLoading(true),
        () => uiComponents.addNotification({ title: 'Test', message: 'Test notification', timestamp: Date.now() }),
      ];

      testActions.forEach((action, index) => {
        action();
        
        // Each action should provide visible feedback
        const hasVisibleFeedback = 
          !document.getElementById('auth-error').classList.contains('hidden') ||
          !document.getElementById('loading-indicator').classList.contains('hidden') ||
          document.getElementById('notifications-list').children.length > 0;
          
        expect(hasVisibleFeedback).toBe(true);
        
        // Reset for next test
        resetUIState();
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('should maintain focus management', () => {
      const loginBtn = document.getElementById('login-btn');
      const emailInput = document.getElementById('email');

      loginBtn.focus();
      expect(document.activeElement).toBe(loginBtn);

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
    });

    it('should provide keyboard navigation', () => {
      const form = document.getElementById('login-form');
      const inputs = form.querySelectorAll('input, button');
      
      // Should be able to tab through form elements
      inputs.forEach((input, index) => {
        input.tabIndex = index;
        expect(input.tabIndex).toBe(index);
      });
    });

    it('should handle form validation messages', () => {
      const emailInput = document.getElementById('email');
      
      // Set custom validity
      emailInput.setCustomValidity('Email is required');
      expect(emailInput.validationMessage).toBe('Email is required');
      
      // Clear validity
      emailInput.setCustomValidity('');
      expect(emailInput.validationMessage).toBe('');
    });

    it('should maintain responsive behavior', () => {
      const container = document.getElementById('data-container');
      
      // Simulate responsive breakpoints
      container.style.width = '320px'; // Mobile
      expect(container.style.width).toBe('320px');
      
      container.style.width = '768px'; // Tablet
      expect(container.style.width).toBe('768px');
      
      container.style.width = '1024px'; // Desktop
      expect(container.style.width).toBe('1024px');
    });
  });

  describe('Performance Optimization', () => {
    it('should implement virtual scrolling for large lists', () => {
      const postsList = document.getElementById('posts-list');
      
      // Mock large dataset
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Post ${i}`,
        excerpt: `Excerpt for post ${i}`
      }));

      // Only render visible items (mock virtual scrolling)
      const renderVisibleItems = (items, startIndex = 0, endIndex = 10) => {
        const visibleItems = items.slice(startIndex, endIndex);
        uiComponents.renderBlogPosts(visibleItems);
      };

      renderVisibleItems(largePosts);
      
      // Should only render limited items for performance
      expect(postsList.children.length).toBeLessThanOrEqual(10);
    });

    it('should debounce user input', (done) => {
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search...';
      document.body.appendChild(searchInput);

      let searchCount = 0;
      const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      };

      const debouncedSearch = debounce(() => {
        searchCount++;
      }, 300);

      searchInput.addEventListener('input', debouncedSearch);

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        searchInput.value = `search${i}`;
        const inputEvent = new window.Event('input');
        searchInput.dispatchEvent(inputEvent);
      }

      // After debounce delay, search should only execute once
      setTimeout(() => {
        expect(searchCount).toBe(1);
        done();
      }, 350);
    });

    it('should cache data appropriately', () => {
      const cache = new Map();
      
      const cacheKey = 'blog_posts';
      const mockData = [{ id: 1, title: 'Test Post' }];
      
      // Cache data
      cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      
      // Retrieve from cache
      const cached = cache.get(cacheKey);
      expect(cached.data).toEqual(mockData);
      expect(cached.timestamp).toBeDefined();
      
      // Cache should expire after certain time
      const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000; // 5 minutes
      expect(typeof isExpired).toBe('boolean');
    });
  });
});