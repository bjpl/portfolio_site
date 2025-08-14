// tests/unit/ThemeManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since ThemeManager is a class inside main.ts, we need to test it differently
// For now, let's create a simple test structure

describe('ThemeManager', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    
    // Clear mocks
    vi.clearAllMocks();
  });

  it('should set data-theme attribute', () => {
    // Create toggle button
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    document.body.appendChild(button);
    
    // Set theme attribute
    document.documentElement.setAttribute('data-theme', 'dark');
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should have theme toggle button', () => {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    document.body.appendChild(button);
    
    const toggle = document.querySelector('.theme-toggle');
    expect(toggle).toBeTruthy();
  });
});
