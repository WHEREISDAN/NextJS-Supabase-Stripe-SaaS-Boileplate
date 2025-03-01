/**
 * Utilities for implementing PKCE (Proof Key for Code Exchange) for OAuth
 */

// Generate a random string of specified length
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  
  // Use crypto API for secure random generation
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(randomValues[i] % charset.length);
  }
  
  return result;
}

// Base64 URL encode a string (different from standard base64)
export function base64UrlEncode(str: string): string {
  // Convert string to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // Convert ArrayBuffer to Base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  
  // Make Base64 URL safe
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate SHA-256 hash of a string
export async function sha256(str: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return await crypto.subtle.digest('SHA-256', data);
}

// Convert ArrayBuffer to Base64URL-encoded string
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  
  // Make Base64 URL safe
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate a code verifier
export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

// Create a code challenge from a code verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashedVerifier = await sha256(verifier);
  return arrayBufferToBase64Url(hashedVerifier);
}

// Store the code verifier in session storage
export function storeCodeVerifier(verifier: string): void {
  sessionStorage.setItem('pkce_code_verifier', verifier);
}

// Retrieve the code verifier from session storage
export function getStoredCodeVerifier(): string | null {
  return sessionStorage.getItem('pkce_code_verifier');
}

// Clear the code verifier from session storage
export function clearCodeVerifier(): void {
  sessionStorage.removeItem('pkce_code_verifier');
} 