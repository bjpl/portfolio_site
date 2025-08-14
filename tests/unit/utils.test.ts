// tests/unit/utils.test.ts
import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
  it('should perform basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    const text = 'Hello World';
    expect(text).toContain('World');
    expect(text.toLowerCase()).toBe('hello world');
  });
});
