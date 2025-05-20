/**
 * Helper functions for token lookups
 * Provides utilities to find tokens from containers
 * Part of the Health Arc module's internal library
 */

import { FoundryToken, PIXIContainer } from '../types/foundry';
import { Logger } from '../utils/logger';

/**
 * Helper function to find the token from a container
 * Performs several checks to locate the token associated with a container
 * 
 * @param container - The PIXI container to find the token for
 * @returns The associated token or null if not found
 */
export function findTokenFromContainer(container: PIXIContainer): FoundryToken | null {
  if (!container) return null;
  
  try {
    // Basic validation helper function
    const isBasicallyValidToken = (token: any): token is FoundryToken => {
      return token && typeof token.id === 'string';
    };
    
    // First check if the container already has a valid token reference
    if (container._token && isBasicallyValidToken(container._token)) {
      return container._token;
    }
    
    // Try to find token directly from container properties
    if (container.token && isBasicallyValidToken(container.token)) {
      return container.token;
    }
    
    if (container.actor?.token && isBasicallyValidToken(container.actor.token)) {
      return container.actor.token;
    }
    
    // Look for token in parent chain
    let parent = container.parent;
    while (parent) {
      // Check if parent is a token object
      if (parent.document?.documentName === 'Token' && isBasicallyValidToken(parent as any)) {
        // Found the token - cache it for future use if it's valid
        const foundToken = parent as unknown as FoundryToken;
        if (isBasicallyValidToken(foundToken)) {
          container._token = foundToken;
          return foundToken;
        }
      }
      
      // Try different token properties based on Foundry version
      if (parent._token && isBasicallyValidToken(parent._token)) {
        container._token = parent._token;
        return parent._token;
      }
      
      if (parent.token && isBasicallyValidToken(parent.token)) {
        container._token = parent.token;
        return parent.token;
      }
      
      // Move up the parent chain
      parent = parent.parent;
    }
    
    // Could not find token
    return null;
  } catch (error) {
    Logger.debug('Error finding token from container:', error);
    return null;
  }
}
