/**
 * Health Arc Module - Type Guards
 * 
 * This module provides type guards and validation functions
 * to ensure objects match expected structures before use.
 */

import { FoundryToken, PIXIContainer } from '../types/foundry';
import { Logger } from './logger';

/**
 * Checks if a token is suitable for health arc operations
 * 
 * @param token - The token to validate
 * @returns True if the token can support health arcs
 */
export function isValidToken(token: any): token is FoundryToken {
  if (!token) {
    return false;
  }
  
  try {
    // Check for required properties
    if (typeof token.id !== 'string') {
      Logger.debug('Token validation failed: missing or invalid id');
      return false;
    }
    
    // Check if token has position data
    const hasPosition = 
      (typeof token.x === 'number' && typeof token.y === 'number') || 
      (token.position && typeof token.position.x === 'number' && typeof token.position.y === 'number');
    
    if (!hasPosition) {
      Logger.debug(`Token validation failed: missing position data for token ${token.id}`);
      return false;
    }
    
    // Check if token has dimension data
    if (typeof token.width !== 'number' || typeof token.height !== 'number') {
      Logger.debug(`Token validation failed: missing dimension data for token ${token.id}`);
      return false;
    }
    
    return true;
  } catch (error) {
    Logger.debug('Error validating token:', error);
    return false;
  }
}

/**
 * Checks if a PIXI container is valid for health arc operations
 * 
 * @param container - The container to validate
 * @param validateStructure - Whether to validate the full structure (optional, default: false)
 * @returns True if the container can be used for health arcs
 */
export function isValidContainer(container: any, validateStructure = false): container is PIXIContainer {
  if (!container) {
    Logger.debug('Container validation failed: container is null or undefined');
    return false;
  }
  
  try {
    // Check basic PIXI container properties
    if (typeof container.addChild !== 'function' || typeof container.removeChild !== 'function') {
      Logger.debug('Container validation failed: missing essential methods (addChild/removeChild)');
      return false;
    }
    
    // Check if container has position data
    const hasPosition = (
      (typeof container.x === 'number' && typeof container.y === 'number') ||
      (container.position && 
       ((typeof container.position.x === 'number' && typeof container.position.y === 'number') ||
        typeof container.position.set === 'function'))
    );
    
    if (!hasPosition) {
      Logger.debug('Container validation failed: missing valid position data');
      return false;
    }
    
    // Check if container has required methods and properties
    if (typeof container.destroy !== 'function') {
      Logger.debug('Container validation failed: missing destroy method');
      return false;
    }
    
    // Optional deeper validation
    if (validateStructure) {
      // Check children property
      if (!Array.isArray(container.children)) {
        Logger.debug('Container validation failed: children is not an array');
        return false;
      }
      
      // Check basic properties required for proper functioning
      if (typeof container.visible !== 'boolean') {
        Logger.debug('Container validation failed: missing visible property');
        return false;
      }
      
      if (typeof container.alpha !== 'number') {
        Logger.debug('Container validation failed: missing alpha property');
        return false;
      }
      
      // Check zIndex property which is important for rendering order
      if (typeof container.zIndex !== 'number') {
        Logger.debug('Container validation failed: missing zIndex property');
        return false;
      }
      
      // Check scale property for proper transformation
      if (!container.scale || 
          (typeof container.scale.x !== 'number' && typeof container.scale.y !== 'number')) {
        Logger.debug('Container validation failed: missing valid scale property');
        return false;
      }
      
      // Check if the container has a parent property (even if null)
      if (typeof container.parent === 'undefined') {
        Logger.debug('Container validation failed: missing parent property');
        return false;
      }
      
      // Check for interactive capability
      if (typeof container.interactive !== 'boolean') {
        Logger.debug('Container validation failed: missing interactive property');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    Logger.debug('Error validating container:', error);
    return false;
  }
}
