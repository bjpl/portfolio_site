/**
 * Calculate reading time for text content
 * @param {string} text - The text content to analyze
 * @param {number} wordsPerMinute - Average words per minute (default: 200)
 * @returns {number} Reading time in minutes
 */
export function calculateReadingTime(text, wordsPerMinute = 200) {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  // Count words (split by whitespace and filter out empty strings)
  const wordCount = cleanText.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  // Calculate reading time in minutes, minimum 1 minute
  const readingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  
  return readingTime;
}

/**
 * Format reading time for display
 * @param {number} minutes - Reading time in minutes
 * @returns {string} Formatted reading time string
 */
export function formatReadingTime(minutes) {
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

/**
 * Calculate and format reading time from text
 * @param {string} text - The text content to analyze
 * @param {number} wordsPerMinute - Average words per minute (default: 200)
 * @returns {string} Formatted reading time string
 */
export function getReadingTime(text, wordsPerMinute = 200) {
  const minutes = calculateReadingTime(text, wordsPerMinute);
  return formatReadingTime(minutes);
}