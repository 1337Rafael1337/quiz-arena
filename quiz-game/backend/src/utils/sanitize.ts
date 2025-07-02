import { encode } from 'html-entities'

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Remove any HTML tags and encode special characters
  return encode(input.trim())
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .substring(0, 1000) // Limit length
}

/**
 * Sanitize question text with more lenient rules
 */
export function sanitizeQuestionText(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return encode(input.trim())
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .substring(0, 2000) // Longer limit for questions
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  // Allow letters, numbers, underscores, hyphens. 3-30 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
  return usernameRegex.test(username)
}

/**
 * Sanitize and validate category name
 */
export function sanitizeCategoryName(name: string): string {
  if (!name || typeof name !== 'string') {
    return ''
  }
  
  return encode(name.trim())
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 100)
}