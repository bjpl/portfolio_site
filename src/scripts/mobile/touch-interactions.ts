// src/scripts/mobile/touch-interactions.ts

/**
 * Touch Interactions Handler
 * Optimizes the site for touch devices with gestures and mobile-specific interactions
 */

interface TouchTargetOptions {
  swipeable?: boolean;
  pinchable?: boolean;
  longPressable?: boolean;
  draggable?: boolean;
  preventScroll?: boolean;
  hapticFeedback?: boolean;
  customHandlers?: Map<string, Function>;
}

interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
  velocity: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface PinchEvent {
  scale: number;
  center: { x: number; y: number };
}

export class TouchInteractions {
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchEndX: number = 0;
  private touchEndY: number = 0;
  private touchStartTime: number = 0;
  private touchThreshold: number = 50;
  private swipeThreshold: number = 100;
  private tapThreshold: number = 200;
  private longPressThreshold: number = 500;
  private pinchStartDistance: number = 0;
  private isMultiTouch: boolean = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private activeElement: HTMLElement | null = null;
  private swipeHandlers: Map<string, Function[]> = new Map();
  private gestureHandlers: Map<string, Function[]> = new Map();
  private touchTargets: WeakMap<Element, TouchTargetOptions> = new WeakMap();



  constructor() {
    this.init();
  }

  /**
   * Initialize touch interactions
   */
  private init(): void {
    // Check if device supports touch
    if (!this.isTouchDevice()) {
      console.log('Touch interactions: Device does not support touch');
      return;
    }

    // Add touch device class
    document.documentElement.classList.add('touch-device');

    // Setup global touch listeners
    this.setupTouchListeners();

    // Setup gesture recognizers
    this.setupGestureRecognizers();

    // Enhance touch targets
    this.enhanceTouchTargets();

    // Setup mobile-specific UI
    this.setupMobileUI();

    // Handle orientation changes
    this.handleOrientationChanges();

    // Setup pull-to-refresh
    this.setupPullToRefresh();

    // Setup edge swipe gestures
    this.setupEdgeSwipes();

    // Optimize scrolling
    this.optimizeScrolling();

    // Add haptic feedback support
    this.setupHapticFeedback();
  }

  /**
   * Check if device supports touch
   */
  private isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }

  /**
   * Setup global touch listeners
   */
  private setupTouchListeners(): void {
    // Touch start
    document.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e);
    }, { passive: false });

    // Touch move
    document.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, { passive: false });

    // Touch end
    document.addEventListener('touchend', (e) => {
      this.handleTouchEnd(e);
    }, { passive: false });

    // Touch cancel
    document.addEventListener('touchcancel', (e) => {
      this.handleTouchCancel(e);
    }, { passive: false });
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.activeElement = e.target as HTMLElement;

    // Multi-touch detection
    if (e.touches.length > 1) {
      this.isMultiTouch = true;
      this.handleMultiTouchStart(e);
    } else {
      this.isMultiTouch = false;
    }

    // Long press detection
    this.startLongPressDetection(e);

    // Add active state
    this.addActiveState(this.activeElement);

    // Check if element has special touch handling
    const options = this.touchTargets.get(this.activeElement);
    if (options?.preventScroll) {
      e.preventDefault();
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.activeElement) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Cancel long press if moved too much
    if (Math.abs(deltaX) > this.touchThreshold || Math.abs(deltaY) > this.touchThreshold) {
      this.cancelLongPress();
    }

    // Handle multi-touch gestures
    if (this.isMultiTouch && e.touches.length > 1) {
      this.handleMultiTouchMove(e);
      return;
    }

    // Handle dragging
    const options = this.touchTargets.get(this.activeElement);
    if (options?.draggable) {
      this.handleDrag(this.activeElement, deltaX, deltaY, e);
    }

    // Handle swipe preview
    if (options?.swipeable) {
      this.handleSwipePreview(this.activeElement, deltaX, deltaY);
    }

    // Prevent scrolling for certain elements
    if (options?.preventScroll) {
      e.preventDefault();
    }
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.activeElement) return;

    const touch = e.changedTouches[0];
    this.touchEndX = touch.clientX;
    this.touchEndY = touch.clientY;
    const touchDuration = Date.now() - this.touchStartTime;

    // Cancel long press
    this.cancelLongPress();

    // Remove active state
    this.removeActiveState(this.activeElement);

    // Detect gestures
    if (!this.isMultiTouch) {
      // Check for tap
      if (this.isTap(touchDuration)) {
        this.handleTap(this.activeElement, e);
      }

      // Check for swipe
      const swipe = this.detectSwipe(touchDuration);
      if (swipe) {
        this.handleSwipe(swipe, this.activeElement);
      }
    }

    // Reset
    this.resetTouch();
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(e: TouchEvent): void {
    this.cancelLongPress();
    this.removeActiveState(this.activeElement);
    this.resetTouch();
  }

  /**
   * Handle multi-touch start
   */
  private handleMultiTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      // Calculate initial pinch distance
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.pinchStartDistance = this.getDistance(touch1, touch2);
    }
  }

  /**
   * Handle multi-touch move
   */
  private handleMultiTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = this.getDistance(touch1, touch2);
      const scale = currentDistance / this.pinchStartDistance;
      
      // Calculate center point
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      // Trigger pinch event
      this.triggerPinch({
        scale,
        center: { x: centerX, y: centerY }
      });

      // Handle rotation if needed
      const rotation = this.getRotation(touch1, touch2);
      if (Math.abs(rotation) > 5) {
        this.triggerRotation(rotation);
      }
    }
  }

  /**
   * Get distance between two touches
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get rotation angle between two touches
   */
  private getRotation(touch1: Touch, touch2: Touch): number {
    const angle = Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    );
    return angle * (180 / Math.PI);
  }

  /**
   * Detect if gesture is a tap
   */
  private isTap(duration: number): boolean {
    const distanceX = Math.abs(this.touchEndX - this.touchStartX);
    const distanceY = Math.abs(this.touchEndY - this.touchStartY);
    
    return (
      duration < this.tapThreshold &&
      distanceX < this.touchThreshold &&
      distanceY < this.touchThreshold
    );
  }

  /**
   * Detect swipe gesture
   */
  private detectSwipe(duration: number): SwipeEvent | null {
    const distanceX = this.touchEndX - this.touchStartX;
    const distanceY = this.touchEndY - this.touchStartY;
    const absX = Math.abs(distanceX);
    const absY = Math.abs(distanceY);

    // Check if movement is enough for a swipe
    if (absX < this.swipeThreshold && absY < this.swipeThreshold) {
      return null;
    }

    // Determine direction
    let direction: 'left' | 'right' | 'up' | 'down';
    if (absX > absY) {
      direction = distanceX > 0 ? 'right' : 'left';
    } else {
      direction = distanceY > 0 ? 'down' : 'up';
    }

    // Calculate velocity
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    const velocity = distance / duration;

    return {
      direction,
      distance,
      duration,
      velocity,
      startX: this.touchStartX,
      startY: this.touchStartY,
      endX: this.touchEndX,
      endY: this.touchEndY
    };
  }

  /**
   * Handle tap gesture
   */
  private handleTap(element: HTMLElement, e: TouchEvent): void {
    // Trigger haptic feedback
    this.triggerHapticFeedback('light');

    // Handle double tap
    if (this.isDoubleTap(element)) {
      this.handleDoubleTap(element, e);
      return;
    }

    // Dispatch custom tap event
    element.dispatchEvent(new CustomEvent('tap', {
      bubbles: true,
      detail: {
        x: this.touchEndX,
        y: this.touchEndY
      }
    }));

    // Handle link taps
    if (element.tagName === 'A') {
      this.handleLinkTap(element as HTMLAnchorElement, e);
    }
  }

  /**
   * Handle double tap
   */
  private lastTapTime: number = 0;
  private lastTapElement: HTMLElement | null = null;

  private isDoubleTap(element: HTMLElement): boolean {
    const now = Date.now();
    const timeDiff = now - this.lastTapTime;
    const isDouble = timeDiff < 300 && element === this.lastTapElement;
    
    this.lastTapTime = now;
    this.lastTapElement = element;
    
    return isDouble;
  }

  private handleDoubleTap(element: HTMLElement, e: TouchEvent): void {
    e.preventDefault();
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');

    // Dispatch double tap event
    element.dispatchEvent(new CustomEvent('doubletap', {
      bubbles: true,
      detail: {
        x: this.touchEndX,
        y: this.touchEndY
      }
    }));

    // Zoom on double tap for images
    if (element.tagName === 'IMG') {
      this.handleImageZoom(element as HTMLImageElement);
    }
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipe(swipe: SwipeEvent, element: HTMLElement): void {
    // Trigger haptic feedback for fast swipes
    if (swipe.velocity > 1) {
      this.triggerHapticFeedback('light');
    }

    // Dispatch swipe event
    element.dispatchEvent(new CustomEvent('swipe', {
      bubbles: true,
      detail: swipe
    }));

    // Trigger direction-specific handlers
    const handlers = this.swipeHandlers.get(swipe.direction);
    if (handlers) {
      handlers.forEach(handler => handler(swipe));
    }

    // Handle carousel swipes
    const carousel = element.closest('.carousel');
    if (carousel) {
      this.handleCarouselSwipe(carousel as HTMLElement, swipe);
    }

    // Handle navigation drawer swipes
    if (swipe.direction === 'right' && this.touchStartX < 50) {
      this.openNavigationDrawer();
    } else if (swipe.direction === 'left' && this.touchStartX > window.innerWidth - 50) {
      this.openSettingsPanel();
    }
  }

  /**
   * Start long press detection
   */
  private startLongPressDetection(e: TouchEvent): void {
    this.cancelLongPress();
    
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(this.activeElement!, e);
    }, this.longPressThreshold);
  }

  /**
   * Cancel long press detection
   */
  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Handle long press gesture
   */
  private handleLongPress(element: HTMLElement, e: TouchEvent): void {
    // Trigger haptic feedback
    this.triggerHapticFeedback('heavy');

    // Add long press visual feedback
    element.classList.add('long-press-active');

    // Dispatch long press event
    element.dispatchEvent(new CustomEvent('longpress', {
      bubbles: true,
      detail: {
        x: this.touchStartX,
        y: this.touchStartY
      }
    }));

    // Show context menu for certain elements
    if (element.dataset.contextMenu) {
      this.showContextMenu(element, this.touchStartX, this.touchStartY);
    }

    // Handle image long press
    if (element.tagName === 'IMG') {
      this.handleImageLongPress(element as HTMLImageElement, e);
    }
  }

  /**
   * Handle drag gesture
   */
  private handleDrag(element: HTMLElement, deltaX: number, deltaY: number, e: TouchEvent): void {
    // Apply transform
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Dispatch drag event
    element.dispatchEvent(new CustomEvent('drag', {
      bubbles: true,
      detail: {
        deltaX,
        deltaY,
        currentX: this.touchStartX + deltaX,
        currentY: this.touchStartY + deltaY
      }
    }));

    // Check for drop zones
    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementBelow?.classList.contains('drop-zone')) {
      elementBelow.classList.add('drop-zone-active');
    }
  }

  /**
   * Handle swipe preview
   */
  private handleSwipePreview(element: HTMLElement, deltaX: number, deltaY: number): void {
    // Add visual feedback for swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      element.style.transform = `translateX(${deltaX * 0.3}px)`;
      element.style.opacity = `${1 - Math.abs(deltaX) / 500}`;
    }
  }

  /**
   * Trigger pinch event
   */
  private triggerPinch(pinch: PinchEvent): void {
    if (!this.activeElement) return;

    // Dispatch pinch event
    this.activeElement.dispatchEvent(new CustomEvent('pinch', {
      bubbles: true,
      detail: pinch
    }));

    // Handle image pinch zoom
    if (this.activeElement.tagName === 'IMG') {
      this.handleImagePinch(this.activeElement as HTMLImageElement, pinch);
    }

    // Trigger registered handlers
    const handlers = this.gestureHandlers.get('pinch');
    if (handlers) {
      handlers.forEach(handler => handler(pinch));
    }
  }

  /**
   * Trigger rotation event
   */
  private triggerRotation(angle: number): void {
    if (!this.activeElement) return;

    this.activeElement.dispatchEvent(new CustomEvent('rotate', {
      bubbles: true,
      detail: { angle }
    }));
  }

  /**
   * Add active state to element
   */
  private addActiveState(element: HTMLElement | null): void {
    if (!element) return;
    
    element.classList.add('touch-active');
    element.dataset.touchActive = 'true';
  }

  /**
   * Remove active state from element
   */
  private removeActiveState(element: HTMLElement | null): void {
    if (!element) return;
    
    element.classList.remove('touch-active', 'long-press-active');
    delete element.dataset.touchActive;
  }

  /**
   * Reset touch state
   */
  private resetTouch(): void {
    this.activeElement = null;
    this.isMultiTouch = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.touchStartTime = 0;
  }

  /**
   * Setup gesture recognizers
   */
  private setupGestureRecognizers(): void {
    // Swipe to go back
    this.onSwipe('right', (swipe) => {
      if (swipe.startX < 50 && swipe.velocity > 0.5) {
        window.history.back();
      }
    });

    // Pull down to refresh
    this.onSwipe('down', (swipe) => {
      if (swipe.startY < 100 && window.scrollY === 0) {
        window.location.reload();
      }
    });

    // Pinch to zoom
    this.onGesture('pinch', (pinch: PinchEvent) => {
      if (pinch.scale > 1.5) {
        document.documentElement.style.zoom = `${pinch.scale}`;
      }
    });
  }

  /**
   * Enhance touch targets
   */
  private enhanceTouchTargets(): void {
    // Increase touch target size for small elements
    const smallTargets = document.querySelectorAll('a, button, input, select, textarea');
    
    smallTargets.forEach(target => {
      const rect = target.getBoundingClientRect();
      
      // Check if target is too small
      if (rect.width < 44 || rect.height < 44) {
        target.classList.add('enhanced-touch-target');
      }

      // Add touch options
      if (target.hasAttribute('data-swipeable')) {
        this.touchTargets.set(target, { swipeable: true });
      }
      
      if (target.hasAttribute('data-draggable')) {
        this.touchTargets.set(target, { draggable: true });
      }
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button, .button, [role="button"]');
    buttons.forEach(button => {
      this.addRippleEffect(button as HTMLElement);
    });
  }

  /**
   * Add ripple effect to element
   */
  private addRippleEffect(element: HTMLElement): void {
    element.addEventListener('touchstart', (e) => {
      const touch = (e as TouchEvent).touches[0];
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement('span');
      
      ripple.className = 'ripple';
      ripple.style.left = `${touch.clientX - rect.left}px`;
      ripple.style.top = `${touch.clientY - rect.top}px`;
      
      element.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  }

  /**
   * Setup mobile-specific UI
   */
  private setupMobileUI(): void {
    // Add mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.toggleMobileMenu();
      });
    }

    // Add bottom navigation
    this.createBottomNavigation();

    // Add floating action button
    this.createFloatingActionButton();

    // Setup tab bar
    this.setupTabBar();

    // Add swipe-to-dismiss for modals
    this.setupModalSwipeToDismiss();
  }

  /**
   * Create bottom navigation
   */
  private createBottomNavigation(): void {
    const nav = document.createElement('nav');
    nav.className = 'bottom-navigation';
    nav.innerHTML = `
      <button class="bottom-nav-item" data-page="home">
        <svg class="bottom-nav-icon"><use href="#icon-home"></use></svg>
        <span>Home</span>
      </button>
      <button class="bottom-nav-item" data-page="search">
        <svg class="bottom-nav-icon"><use href="#icon-search"></use></svg>
        <span>Search</span>
      </button>
      <button class="bottom-nav-item" data-page="create">
        <svg class="bottom-nav-icon"><use href="#icon-plus"></use></svg>
        <span>Create</span>
      </button>
      <button class="bottom-nav-item" data-page="profile">
        <svg class="bottom-nav-icon"><use href="#icon-user"></use></svg>
        <span>Profile</span>
      </button>
    `;
    
    document.body.appendChild(nav);
    
    // Add touch handlers
    nav.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.addEventListener('touchend', (e) => {
        e.preventDefault();
        const page = (item as HTMLElement).dataset.page;
        this.navigateToPage(page!);
      });
    });
  }

  /**
   * Create floating action button
   */
  private createFloatingActionButton(): void {
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '<svg><use href="#icon-plus"></use></svg>';
    fab.setAttribute('aria-label', 'Create new');
    
    document.body.appendChild(fab);
    
    // Add touch handlers
    fab.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.openCreateMenu();
    });

    // Make draggable
    this.makeDraggable(fab);
  }

  /**
   * Make element draggable
   */
  private makeDraggable(element: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    element.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX - currentX;
      startY = touch.clientY - currentY;
      element.classList.add('dragging');
    });

    element.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      currentX = touch.clientX - startX;
      currentY = touch.clientY - startY;
      
      // Keep within viewport
      const rect = element.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      
      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
    });

    element.addEventListener('touchend', () => {
      element.classList.remove('dragging');
      
      // Snap to edge
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      
      if (centerX < window.innerWidth / 2) {
        currentX = 20; // Left edge
      } else {
        currentX = window.innerWidth - rect.width - 20; // Right edge
      }
      
      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      element.style.transition = 'transform 0.3s ease';
      
      setTimeout(() => {
        element.style.transition = '';
      }, 300);
    });
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChanges(): void {
    window.addEventListener('orientationchange', () => {
      const orientation = window.orientation;
      
      // Update classes
      document.documentElement.classList.remove('orientation-portrait', 'orientation-landscape');
      
      if (orientation === 0 || orientation === 180) {
        document.documentElement.classList.add('orientation-portrait');
      } else {
        document.documentElement.classList.add('orientation-landscape');
      }
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('orientationchanged', {
        detail: { orientation }
      }));

      // Adjust UI
      this.adjustUIForOrientation();
    });
  }

  /**
   * Adjust UI for orientation
   */
  private adjustUIForOrientation(): void {
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isLandscape) {
      // Hide bottom navigation in landscape
      const bottomNav = document.querySelector('.bottom-navigation');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'none';
      }
    } else {
      // Show bottom navigation in portrait
      const bottomNav = document.querySelector('.bottom-navigation');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'flex';
      }
    }
  }

  /**
   * Setup pull-to-refresh
   */
  private setupPullToRefresh(): void {
    let startY = 0;
    let isPulling = false;
    const threshold = 100;
    
    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'pull-to-refresh';
    refreshIndicator.innerHTML = '<div class="pull-to-refresh-spinner"></div>';
    document.body.insertBefore(refreshIndicator, document.body.firstChild);

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      
      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
        
        const progress = Math.min(pullDistance / threshold, 1);
        refreshIndicator.style.transform = `translateY(${pullDistance}px)`;
        refreshIndicator.style.opacity = `${progress}`;
        
        if (pullDistance > threshold) {
          refreshIndicator.classList.add('ready');
        } else {
          refreshIndicator.classList.remove('ready');
        }
      }
    });

    document.addEventListener('touchend', () => {
      if (!isPulling) return;
      
      if (refreshIndicator.classList.contains('ready')) {
        refreshIndicator.classList.add('refreshing');
        this.performRefresh();
      } else {
        refreshIndicator.style.transform = '';
        refreshIndicator.style.opacity = '';
      }
      
      isPulling = false;
    });
  }

  /**
   * Perform refresh action
   */
  private performRefresh(): void {
    // Trigger haptic feedback
    this.triggerHapticFeedback('success');

    // Simulate refresh
    setTimeout(() => {
      const refreshIndicator = document.querySelector('.pull-to-refresh');
      if (refreshIndicator) {
        refreshIndicator.classList.remove('ready', 'refreshing');
        (refreshIndicator as HTMLElement).style.transform = '';
        (refreshIndicator as HTMLElement).style.opacity = '';
      }
      
      // Reload or fetch new data
      window.location.reload();
    }, 1500);
  }

  /**
   * Setup edge swipe gestures
   */
  private setupEdgeSwipes(): void {
    // Left edge swipe for navigation drawer
    this.setupEdgeSwipe('left', () => {
      this.openNavigationDrawer();
    });

    // Right edge swipe for settings
    this.setupEdgeSwipe('right', () => {
      this.openSettingsPanel();
    });
  }

  /**
   * Setup individual edge swipe
   */
  private setupEdgeSwipe(edge: 'left' | 'right', callback: Function): void {
    const edgeThreshold = 20;
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const x = touch.clientX;
      
      if (
        (edge === 'left' && x < edgeThreshold) ||
        (edge === 'right' && x > window.innerWidth - edgeThreshold)
      ) {
        this.edgeSwipeCallback = callback;
      }
    });
  }

  private edgeSwipeCallback: Function | null = null;

  /**
   * Open navigation drawer
   */
  private openNavigationDrawer(): void {
    const drawer = document.querySelector('.nav-drawer');
    if (drawer) {
      drawer.classList.add('open');
      this.triggerHapticFeedback('light');
    }
  }

  /**
   * Open settings panel
   */
  private openSettingsPanel(): void {
    const panel = document.querySelector('.settings-panel');
    if (panel) {
      panel.classList.add('open');
      this.triggerHapticFeedback('light');
    }
  }

  /**
   * Optimize scrolling performance
   */
  private optimizeScrolling(): void {
    // Add momentum scrolling
    const scrollContainers = document.querySelectorAll('.scroll-container');
    scrollContainers.forEach(container => {
      (container as HTMLElement).style.webkitOverflowScrolling = 'touch';
      (container as HTMLElement).style.overflowScrolling = 'touch';
    });

    // Passive event listeners for better scrolling
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });

    // Hide elements during scroll for better performance
    let scrollTimer: ReturnType<typeof setTimeout>;
    window.addEventListener('scroll', () => {
      document.body.classList.add('is-scrolling');
      
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
      }, 100);
    }, { passive: true });
  }

  /**
   * Setup haptic feedback
   */
  private setupHapticFeedback(): void {
    // Check for haptic feedback support
    if ('vibrate' in navigator) {
      // Add haptic feedback to buttons
      const buttons = document.querySelectorAll('button, a, .touchable');
      buttons.forEach(button => {
        button.addEventListener('touchstart', () => {
          this.triggerHapticFeedback('light');
        });
      });
    }
  }

  /**
   * Trigger haptic feedback
   */
  private triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void {
    if (!('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 20],
      error: [50, 50, 50]
    };

    navigator.vibrate(patterns[type]);
  }

  /**
   * Handle carousel swipe
   */
  private handleCarouselSwipe(carousel: HTMLElement, swipe: SwipeEvent): void {
    const currentSlide = parseInt(carousel.dataset.currentSlide || '0');
    const totalSlides = carousel.querySelectorAll('.carousel-item').length;
    
    if (swipe.direction === 'left' && currentSlide < totalSlides - 1) {
      this.goToSlide(carousel, currentSlide + 1);
    } else if (swipe.direction === 'right' && currentSlide > 0) {
      this.goToSlide(carousel, currentSlide - 1);
    }
  }

  /**
   * Go to carousel slide
   */
  private goToSlide(carousel: HTMLElement, index: number): void {
    const track = carousel.querySelector('.carousel-track') as HTMLElement;
    if (track) {
      track.style.transform = `translateX(-${index * 100}%)`;
      carousel.dataset.currentSlide = index.toString();
    }
  }

  /**
   * Handle image zoom
   */
  private handleImageZoom(img: HTMLImageElement): void {
    img.classList.toggle('zoomed');
    
    if (img.classList.contains('zoomed')) {
      img.style.transform = 'scale(2)';
    } else {
      img.style.transform = '';
    }
  }

  /**
   * Handle image pinch zoom
   */
  private handleImagePinch(img: HTMLImageElement, pinch: PinchEvent): void {
    const currentScale = parseFloat(img.dataset.scale || '1');
    const newScale = Math.max(0.5, Math.min(3, currentScale * pinch.scale));
    
    img.style.transform = `scale(${newScale})`;
    img.dataset.scale = newScale.toString();
  }

  /**
   * Handle image long press
   */
  private handleImageLongPress(img: HTMLImageElement, e: TouchEvent): void {
    e.preventDefault();
    
    // Show image options menu
    this.showImageOptions(img);
  }

  /**
   * Show image options menu
   */
  private showImageOptions(img: HTMLImageElement): void {
    const menu = document.createElement('div');
    menu.className = 'image-options-menu';
    menu.innerHTML = `
      <button data-action="save">Save Image</button>
      <button data-action="share">Share</button>
      <button data-action="copy">Copy</button>
      <button data-action="cancel">Cancel</button>
    `;
    
    document.body.appendChild(menu);
    
    menu.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        const action = (button as HTMLElement).dataset.action;
        this.handleImageAction(img, action!);
        menu.remove();
      });
    });
  }

  /**
   * Handle image action
   */
  private handleImageAction(img: HTMLImageElement, action: string): void {
    switch (action) {
      case 'save':
        // Trigger download
        const link = document.createElement('a');
        link.href = img.src;
        link.download = img.alt || 'image';
        link.click();
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: img.alt,
            url: img.src
          });
        }
        break;
      case 'copy':
        // Copy image URL to clipboard
        navigator.clipboard.writeText(img.src);
        break;
    }
  }

  /**
   * Handle link tap
   */
  private handleLinkTap(link: HTMLAnchorElement, e: TouchEvent): void {
    // Check if link should be handled specially
    if (link.dataset.smoothScroll) {
      e.preventDefault();
      const target = document.querySelector(link.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  /**
   * Toggle mobile menu
   */
  private toggleMobileMenu(): void {
    const menu = document.querySelector('.mobile-menu');
    if (menu) {
      menu.classList.toggle('open');
      this.triggerHapticFeedback('light');
    }
  }

  /**
   * Navigate to page
   */
  private navigateToPage(page: string): void {
    // Handle navigation
    console.log(`Navigating to ${page}`);
    this.triggerHapticFeedback('light');
  }

  /**
   * Open create menu
   */
  private openCreateMenu(): void {
    // Handle create menu
    console.log('Opening create menu');
    this.triggerHapticFeedback('medium');
  }

  /**
   * Setup tab bar
   */
  private setupTabBar(): void {
    const tabBar = document.querySelector('.tab-bar');
    if (!tabBar) return;

    const tabs = tabBar.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('touchend', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.triggerHapticFeedback('light');
      });
    });
  }

  /**
   * Setup modal swipe to dismiss
   */
  private setupModalSwipeToDismiss(): void {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      let startY = 0;
      let currentY = 0;
      
      modal.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
      });
      
      modal.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        if (deltaY > 0) {
          (modal as HTMLElement).style.transform = `translateY(${deltaY}px)`;
          (modal as HTMLElement).style.opacity = `${1 - deltaY / 300}`;
        }
      });
      
      modal.addEventListener('touchend', () => {
        const deltaY = currentY - startY;
        
        if (deltaY > 100) {
          // Dismiss modal
          modal.classList.remove('open');
          this.triggerHapticFeedback('light');
        } else {
          // Snap back
          (modal as HTMLElement).style.transform = '';
          (modal as HTMLElement).style.opacity = '';
        }
      });
    });
  }

  /**
   * Show context menu
   */
  private showContextMenu(element: HTMLElement, x: number, y: number): void {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Build menu based on element type
    const menuItems = this.getContextMenuItems(element);
    menu.innerHTML = menuItems.map(item => 
      `<button data-action="${item.action}">${item.label}</button>`
    ).join('');
    
    document.body.appendChild(menu);
    
    // Handle menu item clicks
    menu.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        const action = (button as HTMLElement).dataset.action;
        this.handleContextMenuAction(element, action!);
        menu.remove();
      });
    });
    
    // Dismiss on outside tap
    setTimeout(() => {
      document.addEventListener('touchstart', () => menu.remove(), { once: true });
    }, 100);
  }

  /**
   * Get context menu items for element
   */
  private getContextMenuItems(element: HTMLElement): Array<{ label: string; action: string }> {
    const items = [];
    
    if (element.tagName === 'A') {
      items.push(
        { label: 'Open in new tab', action: 'open-new-tab' },
        { label: 'Copy link', action: 'copy-link' },
        { label: 'Share', action: 'share' }
      );
    } else if (element.tagName === 'IMG') {
      items.push(
        { label: 'Save image', action: 'save-image' },
        { label: 'Copy image', action: 'copy-image' },
        { label: 'Share', action: 'share' }
      );
    } else if (element.textContent) {
      items.push(
        { label: 'Copy text', action: 'copy-text' },
        { label: 'Share', action: 'share' }
      );
    }
    
    return items;
  }

  /**
   * Handle context menu action
   */
  private handleContextMenuAction(element: HTMLElement, action: string): void {
    switch (action) {
      case 'open-new-tab':
        window.open((element as HTMLAnchorElement).href, '_blank');
        break;
      case 'copy-link':
        navigator.clipboard.writeText((element as HTMLAnchorElement).href);
        break;
      case 'copy-text':
        navigator.clipboard.writeText(element.textContent || '');
        break;
      case 'save-image':
        this.handleImageAction(element as HTMLImageElement, 'save');
        break;
      case 'copy-image':
        this.handleImageAction(element as HTMLImageElement, 'copy');
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: document.title,
            text: element.textContent || '',
            url: window.location.href
          });
        }
        break;
    }
    
    this.triggerHapticFeedback('light');
  }

  /**
   * Register swipe handler
   */
  public onSwipe(direction: 'left' | 'right' | 'up' | 'down', handler: Function): void {
    if (!this.swipeHandlers.has(direction)) {
      this.swipeHandlers.set(direction, []);
    }
    this.swipeHandlers.get(direction)!.push(handler);
  }

  /**
   * Register gesture handler
   */
  public onGesture(gesture: string, handler: Function): void {
    if (!this.gestureHandlers.has(gesture)) {
      this.gestureHandlers.set(gesture, []);
    }
    this.gestureHandlers.get(gesture)!.push(handler);
  }

  /**
   * Enable touch interactions for element
   */
  public enableTouch(element: Element, options: TouchTargetOptions): void {
    this.touchTargets.set(element, options);
  }
}

// Initialize touch interactions when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TouchInteractions();
  });
} else {
  new TouchInteractions();
}

export default TouchInteractions;
