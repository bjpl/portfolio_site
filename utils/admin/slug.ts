// Utility functions for generating and validating URL slugs

/**
 * Generate a URL-friendly slug from a given string
 * @param text - The input text to convert to a slug
 * @param options - Configuration options for slug generation
 * @returns A URL-friendly slug
 */
export const generateSlug = (
  text: string,
  options: {
    maxLength?: number;
    separator?: string;
    preserveCase?: boolean;
    allowUnicode?: boolean;
    replacements?: Record<string, string>;
  } = {}
): string => {
  const {
    maxLength = 100,
    separator = '-',
    preserveCase = false,
    allowUnicode = false,
    replacements = {}
  } = options;

  if (!text) return '';

  let slug = text.trim();

  // Apply custom replacements first
  Object.entries(replacements).forEach(([from, to]) => {
    slug = slug.replace(new RegExp(from, 'gi'), to);
  });

  // Convert to lowercase unless preserveCase is true
  if (!preserveCase) {
    slug = slug.toLowerCase();
  }

  if (allowUnicode) {
    // Keep unicode characters but still clean up
    slug = slug
      .replace(/\s+/g, separator) // Replace spaces with separator
      .replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '') // Keep letters, numbers, accented chars, spaces, hyphens
      .replace(new RegExp(`[${separator}]+`, 'g'), separator) // Replace multiple separators with single
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); // Remove leading/trailing separators
  } else {
    // Standard ASCII-only slug
    slug = slug
      .normalize('NFD') // Normalize unicode
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '') // Keep only alphanumeric, spaces, hyphens
      .replace(/\s+/g, separator) // Replace spaces with separator
      .replace(new RegExp(`[${separator}]+`, 'g'), separator) // Replace multiple separators with single
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); // Remove leading/trailing separators
  }

  // Truncate to max length if specified
  if (maxLength > 0 && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    
    // Don't end with separator
    if (slug.endsWith(separator)) {
      slug = slug.slice(0, -1);
    }
    
    // Try to break at word boundary if possible
    const lastSeparator = slug.lastIndexOf(separator);
    if (lastSeparator > maxLength * 0.8) {
      slug = slug.substring(0, lastSeparator);
    }
  }

  return slug;
};

/**
 * Validate if a string is a valid slug
 * @param slug - The slug to validate
 * @param options - Validation options
 * @returns True if the slug is valid
 */
export const isValidSlug = (
  slug: string,
  options: {
    maxLength?: number;
    minLength?: number;
    separator?: string;
    allowUnicode?: boolean;
    allowNumbers?: boolean;
  } = {}
): boolean => {
  const {
    maxLength = 100,
    minLength = 1,
    separator = '-',
    allowUnicode = false,
    allowNumbers = true
  } = options;

  if (!slug || typeof slug !== 'string') return false;
  if (slug.length < minLength || slug.length > maxLength) return false;
  
  // Check for leading/trailing separators
  if (slug.startsWith(separator) || slug.endsWith(separator)) return false;
  
  // Check for consecutive separators
  if (slug.includes(separator + separator)) return false;

  if (allowUnicode) {
    // Allow unicode letters and specified characters
    const pattern = allowNumbers 
      ? new RegExp(`^[\\w\\u00C0-\\u024F\\u1E00-\\u1EFF${separator}]+$`)
      : new RegExp(`^[a-zA-Z\\u00C0-\\u024F\\u1E00-\\u1EFF${separator}]+$`);
    return pattern.test(slug);
  } else {
    // ASCII only
    const pattern = allowNumbers
      ? new RegExp(`^[a-z0-9${separator}]+$`)
      : new RegExp(`^[a-z${separator}]+$`);
    return pattern.test(slug);
  }
};

/**
 * Generate a unique slug by appending numbers if needed
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @param options - Options for uniqueness generation
 * @returns A unique slug
 */
export const generateUniqueSlug = (
  baseSlug: string,
  existingSlugs: string[],
  options: {
    separator?: string;
    startNumber?: number;
    maxAttempts?: number;
  } = {}
): string => {
  const {
    separator = '-',
    startNumber = 2,
    maxAttempts = 1000
  } = options;

  let uniqueSlug = baseSlug;
  let attempts = 0;
  let counter = startNumber;

  while (existingSlugs.includes(uniqueSlug) && attempts < maxAttempts) {
    uniqueSlug = `${baseSlug}${separator}${counter}`;
    counter++;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    // Fallback: add timestamp
    uniqueSlug = `${baseSlug}${separator}${Date.now()}`;
  }

  return uniqueSlug;
};

/**
 * Extract slug from a URL or path
 * @param url - The URL or path to extract slug from
 * @returns The extracted slug
 */
export const extractSlugFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(segment => segment.length > 0);
    return segments[segments.length - 1] || '';
  } catch {
    // If URL parsing fails, treat as path
    const segments = url.split('/').filter(segment => segment.length > 0);
    return segments[segments.length - 1] || '';
  }
};

/**
 * Convert a slug back to a human-readable title
 * @param slug - The slug to convert
 * @param options - Conversion options
 * @returns A human-readable title
 */
export const slugToTitle = (
  slug: string,
  options: {
    separator?: string;
    capitalizeWords?: boolean;
    replacements?: Record<string, string>;
  } = {}
): string => {
  const {
    separator = '-',
    capitalizeWords = true,
    replacements = {}
  } = options;

  if (!slug) return '';

  let title = slug.replace(new RegExp(separator, 'g'), ' ');

  // Apply custom replacements
  Object.entries(replacements).forEach(([from, to]) => {
    title = title.replace(new RegExp(from, 'gi'), to);
  });

  if (capitalizeWords) {
    title = title.replace(/\b\w/g, char => char.toUpperCase());
  }

  return title.trim();
};

/**
 * Suggest alternative slugs based on a base slug
 * @param baseSlug - The base slug to generate alternatives for
 * @param count - Number of alternatives to generate
 * @returns Array of alternative slug suggestions
 */
export const suggestAlternativeSlugs = (
  baseSlug: string,
  count: number = 5
): string[] => {
  const alternatives: string[] = [];
  const words = baseSlug.split('-');

  if (words.length > 1) {
    // Variations with different word orders
    for (let i = 0; i < Math.min(count, words.length - 1); i++) {
      const shuffled = [...words];
      const temp = shuffled[i];
      shuffled[i] = shuffled[i + 1];
      shuffled[i + 1] = temp;
      alternatives.push(shuffled.join('-'));
    }
  }

  // Add numbered variations
  for (let i = alternatives.length; i < count; i++) {
    alternatives.push(`${baseSlug}-${i + 2}`);
  }

  // Add variations with common prefixes/suffixes
  const prefixes = ['new', 'the', 'my'];
  const suffixes = ['page', 'post', 'article', 'guide'];

  for (const prefix of prefixes) {
    if (alternatives.length < count && !baseSlug.startsWith(prefix)) {
      alternatives.push(`${prefix}-${baseSlug}`);
    }
  }

  for (const suffix of suffixes) {
    if (alternatives.length < count && !baseSlug.endsWith(suffix)) {
      alternatives.push(`${baseSlug}-${suffix}`);
    }
  }

  return alternatives.slice(0, count);
};

/**
 * Batch generate slugs for multiple texts
 * @param texts - Array of texts to convert to slugs
 * @param options - Options for slug generation
 * @returns Array of generated slugs
 */
export const batchGenerateSlugs = (
  texts: string[],
  options: Parameters<typeof generateSlug>[1] & {
    ensureUnique?: boolean;
  } = {}
): string[] => {
  const { ensureUnique = true, ...slugOptions } = options;
  const slugs: string[] = [];
  const usedSlugs = new Set<string>();

  for (const text of texts) {
    let slug = generateSlug(text, slugOptions);
    
    if (ensureUnique && usedSlugs.has(slug)) {
      slug = generateUniqueSlug(slug, Array.from(usedSlugs));
    }
    
    slugs.push(slug);
    usedSlugs.add(slug);
  }

  return slugs;
};

export default {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
  extractSlugFromUrl,
  slugToTitle,
  suggestAlternativeSlugs,
  batchGenerateSlugs,
};