import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  exp: number; // Expiration timestamp in seconds
  iat: number; // Issued at timestamp in seconds
}

/**
 * Decode a JWT token
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token - The JWT token string
 * @returns true if expired, false if still valid
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true; // If we can't decode or no expiration, consider it expired
    }

    // exp is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    
    // Add a 60 second buffer to account for clock skew
    return decoded.exp < (currentTime + 60);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // If there's an error, treat as expired for safety
  }
}

/**
 * Get the expiration date from a token
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Get time remaining until token expires (in milliseconds)
 */
export function getTokenTimeRemaining(token: string): number {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const currentTime = Date.now() / 1000;
    const timeRemaining = decoded.exp - currentTime;
    
    return timeRemaining > 0 ? timeRemaining * 1000 : 0;
  } catch (error) {
    return 0;
  }
}
