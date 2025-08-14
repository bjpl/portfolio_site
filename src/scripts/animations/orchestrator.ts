// src/scripts/animations/orchestrator.ts

interface AnimationConfig {
  duration: number;
  delay: number;
  easing: string;
  fill: 'none' | 'forwards' | 'backwards' | 'both';
  iterations: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
}

interface ScrollAnimation {
  element: Element;
  animation: Animation | null;
  config: AnimationConfig;
  trigger: 'enter' | 'leave' | 'progress';
  threshold: number;
  started: boolean;
}

interface GestureAnimation {
  element: Element;
  gesture: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'hold';
  animation: () => void;
}

interface PhysicsConfig {
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  mass?: number;
  elasticity?: number;
}

interface PhysicsBody {
  element: Element;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  mass: number;
  elasticity: number;
}

export class AnimationOrchestrator {
  private scrollAnimations: Map<Element, ScrollAnimation> = new Map();
  private gestureAnimations: Map<Element, GestureAnimation[]> = new Map();
  private runningAnimations: Set<Animation> = new Set();
  private observer: IntersectionObserver | null = null;
  private performanceMode: 'high' | 'balanced' | 'low' = 'balanced';
  private reducedMotion: boolean = false;
  private animationQueue: Array<() => void> = [];
  private rafId: number | null = null;
  private physics: PhysicsEngine;

  constructor() {
    this.detectPerformanceMode();
    this.checkReducedMotion();
    this.setupIntersectionObserver();
    this.physics = new PhysicsEngine();
    this.startAnimationLoop();
  }

  private detectPerformanceMode(): void {
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    if (memory >= 8 && cores >= 4) {
      this.performanceMode = 'high';
    } else if (memory >= 4 && cores >= 2) {
      this.performanceMode = 'balanced';
    } else {
      this.performanceMode = 'low';
    }
    
    const connection = (navigator as any).connection;
    if (connection?.saveData || connection?.effectiveType === '2g') {
      this.performanceMode = 'low';
    }
  }

  private checkReducedMotion(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      if (e.matches) {
        this.stopAllAnimations();
      }
    });
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '50px'
      }
    );
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      const animation = this.scrollAnimations.get(entry.target);
      if (!animation) return;
      
      if (animation.trigger === 'enter' && entry.isIntersecting) {
        this.playScrollAnimation(animation);
      } else if (animation.trigger === 'leave' && !entry.isIntersecting) {
        this.playScrollAnimation(animation);
      } else if (animation.trigger === 'progress') {
        this.updateProgressAnimation(animation, entry.intersectionRatio);
      }
    });
  }

  private playScrollAnimation(animation: ScrollAnimation): void {
    if (animation.started || this.reducedMotion) return;
    
    const keyframes = this.getKeyframesForElement(animation.element);
    
    animation.animation = animation.element.animate(keyframes, {
      duration: animation.config.duration,
      delay: animation.config.delay,
      easing: animation.config.easing,
      fill: animation.config.fill,
      iterations: animation.config.iterations,
      direction: animation.config.direction
    });
    
    animation.started = true;
    this.runningAnimations.add(animation.animation);
    
    animation.animation.onfinish = () => {
      this.runningAnimations.delete(animation.animation!);
    };
  }

  private updateProgressAnimation(animation: ScrollAnimation, progress: number): void {
    if (this.reducedMotion) return;
    
    if (!animation.animation) {
      const keyframes = this.getKeyframesForElement(animation.element);
      animation.animation = animation.element.animate(keyframes, {
        duration: 1000,
        fill: 'both'
      });
      animation.animation.pause();
    }
    
    animation.animation.currentTime = progress * 1000;
  }

  private getKeyframesForElement(element: Element): Keyframe[] {
    const type = element.getAttribute('data-animation') || 'fade';
    
    const animations: Record<string, Keyframe[]> = {
      fade: [
        { opacity: 0 },
        { opacity: 1 }
      ],
      slideUp: [
        { transform: 'translateY(50px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      slideDown: [
        { transform: 'translateY(-50px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      slideLeft: [
        { transform: 'translateX(50px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      slideRight: [
        { transform: 'translateX(-50px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      scale: [
        { transform: 'scale(0.8)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      rotate: [
        { transform: 'rotate(-180deg)', opacity: 0 },
        { transform: 'rotate(0)', opacity: 1 }
      ],
      flip: [
        { transform: 'rotateY(180deg)', opacity: 0 },
        { transform: 'rotateY(0)', opacity: 1 }
      ],
      bounce: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-30px)' },
        { transform: 'translateY(0)' },
        { transform: 'translateY(-15px)' },
        { transform: 'translateY(0)' }
      ],
      shake: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
      ],
      pulse: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ]
    };
    
    return animations[type] || animations.fade;
  }

  public addScrollAnimation(
    element: Element,
    config: Partial<AnimationConfig> = {},
    trigger: 'enter' | 'leave' | 'progress' = 'enter',
    threshold: number = 0.5
  ): void {
    const animation: ScrollAnimation = {
      element,
      animation: null,
      config: {
        duration: config.duration || 1000,
        delay: config.delay || 0,
        easing: config.easing || 'ease-out',
        fill: config.fill || 'forwards',
        iterations: config.iterations || 1,
        direction: config.direction || 'normal'
      },
      trigger,
      threshold,
      started: false
    };
    
    this.scrollAnimations.set(element, animation);
    this.observer?.observe(element);
  }

  public addStaggeredAnimation(
    elements: Element[],
    config: Partial<AnimationConfig> = {},
    staggerDelay: number = 100
  ): void {
    elements.forEach((element, index) => {
      this.addScrollAnimation(element, {
        ...config,
        delay: (config.delay || 0) + (index * staggerDelay)
      });
    });
  }

  public addGestureAnimation(
    element: Element,
    gesture: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'hold',
    animation: () => void
  ): void {
    if (!this.gestureAnimations.has(element)) {
      this.gestureAnimations.set(element, []);
    }
    
    this.gestureAnimations.get(element)!.push({ element, gesture, animation });
    this.setupGestureListener(element, gesture);
  }

  private setupGestureListener(element: Element, gesture: string): void {
    switch (gesture) {
      case 'swipe':
        this.setupSwipeGesture(element);
        break;
      case 'pinch':
        this.setupPinchGesture(element);
        break;
      case 'rotate':
        this.setupRotateGesture(element);
        break;
      case 'tap':
        this.setupTapGesture(element);
        break;
      case 'hold':
        this.setupHoldGesture(element);
        break;
    }
  }

  private setupSwipeGesture(element: Element): void {
    let startX = 0;
    let startY = 0;
    
    element.addEventListener('touchstart', (e) => {
      const touch = (e as TouchEvent).touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    });
    
    element.addEventListener('touchend', (e) => {
      const touch = (e as TouchEvent).changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
        this.triggerGestureAnimation(element, 'swipe');
      }
    });
  }

  private setupPinchGesture(element: Element): void {
    let initialDistance = 0;
    
    element.addEventListener('touchstart', (e) => {
      const event = e as TouchEvent;
      if (event.touches.length === 2) {
        initialDistance = this.getDistance(event.touches[0], event.touches[1]);
      }
    });
    
    element.addEventListener('touchmove', (e) => {
      const event = e as TouchEvent;
      if (event.touches.length === 2) {
        const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
        const scale = currentDistance / initialDistance;
        
        if (Math.abs(scale - 1) > 0.2) {
          this.triggerGestureAnimation(element, 'pinch');
        }
      }
    });
  }

  private setupRotateGesture(element: Element): void {
    let initialAngle = 0;
    
    element.addEventListener('touchstart', (e) => {
      const event = e as TouchEvent;
      if (event.touches.length === 2) {
        initialAngle = this.getAngle(event.touches[0], event.touches[1]);
      }
    });
    
    element.addEventListener('touchmove', (e) => {
      const event = e as TouchEvent;
      if (event.touches.length === 2) {
        const currentAngle = this.getAngle(event.touches[0], event.touches[1]);
        const rotation = currentAngle - initialAngle;
        
        if (Math.abs(rotation) > 30) {
          this.triggerGestureAnimation(element, 'rotate');
        }
      }
    });
  }

  private setupTapGesture(element: Element): void {
    element.addEventListener('click', () => {
      this.triggerGestureAnimation(element, 'tap');
    });
  }

  private setupHoldGesture(element: Element): void {
    let holdTimer: ReturnType<typeof setTimeout>;
    
    element.addEventListener('touchstart', () => {
      holdTimer = setTimeout(() => {
        this.triggerGestureAnimation(element, 'hold');
      }, 500);
    });
    
    element.addEventListener('touchend', () => {
      clearTimeout(holdTimer);
    });
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(touch1: Touch, touch2: Touch): number {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * (180 / Math.PI);
  }

  private triggerGestureAnimation(element: Element, gesture: string): void {
    const animations = this.gestureAnimations.get(element);
    if (!animations) return;
    
    animations
      .filter(a => a.gesture === gesture)
      .forEach(a => a.animation());
  }

  public addPhysicsAnimation(element: Element, config: PhysicsConfig): void {
    this.physics.addElement(element, config);
  }

  private startAnimationLoop(): void {
    const loop = () => {
      while (this.animationQueue.length > 0) {
        const animation = this.animationQueue.shift();
        animation?.();
      }
      
      this.physics.update();
      
      this.monitorPerformance();
      
      this.rafId = requestAnimationFrame(loop);
    };
    
    loop();
  }

  private monitorPerformance(): void {
    if (this.runningAnimations.size > 10 && this.performanceMode !== 'low') {
      this.performanceMode = 'low';
      this.degradeAnimations();
    }
  }

  private degradeAnimations(): void {
    this.runningAnimations.forEach(animation => {
      if (animation.playbackRate > 0.5) {
        animation.playbackRate = 2;
      }
    });
  }

  public stopAllAnimations(): void {
    this.runningAnimations.forEach(animation => {
      animation.cancel();
    });
    this.runningAnimations.clear();
  }

  public pauseAll(): void {
    this.runningAnimations.forEach(animation => {
      animation.pause();
    });
  }

  public resumeAll(): void {
    this.runningAnimations.forEach(animation => {
      animation.play();
    });
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.stopAllAnimations();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

class PhysicsEngine {
  private elements: Map<Element, PhysicsBody> = new Map();
  private gravity = { x: 0, y: 9.8 };
  private friction = 0.98;

  addElement(element: Element, config: PhysicsConfig): void {
    this.elements.set(element, {
      element,
      position: config.position || { x: 0, y: 0 },
      velocity: config.velocity || { x: 0, y: 0 },
      mass: config.mass || 1,
      elasticity: config.elasticity || 0.8
    });
  }

  update(): void {
    this.elements.forEach(body => {
      body.velocity.y += this.gravity.y * 0.016;
      
      body.velocity.x *= this.friction;
      body.velocity.y *= this.friction;
      
      body.position.x += body.velocity.x;
      body.position.y += body.velocity.y;
      
      (body.element as HTMLElement).style.transform = 
        `translate(${body.position.x}px, ${body.position.y}px)`;
      
      this.checkBoundaries(body);
    });
  }

  private checkBoundaries(body: PhysicsBody): void {
    const rect = body.element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    if (rect.bottom > viewportHeight) {
      body.position.y = viewportHeight - rect.height;
      body.velocity.y *= -body.elasticity;
    }
    
    if (rect.left < 0 || rect.right > viewportWidth) {
      body.velocity.x *= -body.elasticity;
    }
  }
}

export default AnimationOrchestrator;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    (window as any).animationOrchestrator = new AnimationOrchestrator();
  });
} else {
  (window as any).animationOrchestrator = new AnimationOrchestrator();
}
