// tests/unit/main.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('Main Entry Point', () => {
  it('should have required environment', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    expect(IntersectionObserver).toBeDefined();
  });

  it('should have mocked localStorage', () => {
    expect(window.localStorage).toBeDefined();
    expect(window.localStorage.getItem).toBeDefined();
    expect(window.localStorage.setItem).toBeDefined();
  });

  it('should have mocked matchMedia', () => {
    expect(window.matchMedia).toBeDefined();
    const result = window.matchMedia('(prefers-color-scheme: dark)');
    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
  });
});
