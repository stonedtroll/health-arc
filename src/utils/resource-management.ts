/**
 * Health Arc Module - Resource Management
 * 
 * This module provides utilities for resource management and cleanup
 * to ensure proper disposal of PIXI resources and event listeners.
 * 
 * Key responsibilities:
 * 1. Safe removal of event listeners to prevent memory leaks
 * 2. Proper destruction of PIXI objects including containers, graphics, and text
 * 3. Clearing object references to prevent memory leaks
 * 4. Safe deletion of properties from objects
 * 5. Management of texture resources
 * 6. Batch resource disposal
 * 
 * @module utils/resource-management
 */

import { FoundryToken, PIXIContainer, PIXIGraphics, PIXIText } from '../types/foundry';
import { Logger } from './logger';

/**
 * Safely removes an event listener from a target
 * Handles null checks and catches errors
 * 
 * @param target - The event target
 * @param eventName - The event name
 * @param handler - The event handler function
 */
export function safeRemoveEventListener(
  target: any, 
  eventName: string, 
  handler: (...args: any[]) => void
): void {
  if (!target || !handler) return;
  
  try {
    if (typeof target.removeEventListener === 'function') {
      target.removeEventListener(eventName, handler);
    } else if (typeof target.off === 'function') {
      target.off(eventName, handler);
    }
  } catch (error) {
    Logger.debug(`Error removing event listener for ${eventName}:`, error);
  }
}

/**
 * Safely destroys a PIXI object
 * Includes checks for valid object and proper method existence
 * 
 * @param object - The PIXI object to destroy
 * @param options - Destroy options
 */
export function safeDestroyPIXI(
  object: PIXIContainer | PIXIGraphics | PIXIText | null | undefined,
  options: { children?: boolean; texture?: boolean; baseTexture?: boolean } = {}
): void {
  if (!object) return;
  
  try {
    if (typeof object.destroy === 'function') {
      object.destroy(options);
    }
  } catch (error) {
    Logger.debug('Error destroying PIXI object:', error);
  }
}

/**
 * Safely clears all children from a container and destroys them
 * 
 * @param container - The container to clear
 */
export function safeEmptyContainer(container: PIXIContainer | null | undefined): void {
  if (!container || !container.children) return;
  
  try {
    const childrenArray = [...container.children];
    for (const child of childrenArray) {
      if (child) {
        container.removeChild(child);
        safeDestroyPIXI(child as any);
      }
    }
  } catch (error) {
    Logger.debug('Error emptying container:', error);
  }
}

/**
 * Safely removes a container from its parent
 * 
 * @param container - The container to remove from parent
 */
export function safeRemoveFromParent(container: PIXIContainer | null | undefined): void {
  if (!container) return;
  
  try {
    const parent = container.parent;
    if (parent && typeof parent.removeChild === 'function') {
      parent.removeChild(container);
    }
  } catch (error) {
    Logger.debug('Error removing container from parent:', error);
  }
}

/**
 * Clear all references to prevent memory leaks
 * 
 * @param object - The object to clear references from
 */
export function clearReferences(object: any): void {
  if (!object) return;
  
  try {
    // Get all properties of the object
    for (const prop in object) {
      if (Object.prototype.hasOwnProperty.call(object, prop)) {
        // Skip properties that are explicitly meant to remain
        if (prop === 'id' || prop === 'name') continue;
        
        // Set each property to null to remove references
        try {
          object[prop] = null;
        } catch (error) {
          // Some properties may be read-only, ignore errors
        }
      }
    }
  } catch (error) {
    Logger.debug('Error clearing references:', error);
  }
}

/**
 * Safely removes a property from an object
 * Handles property deletions that might fail due to frozen or sealed objects
 * 
 * This function:
 * 1. Validates that the object and property name are valid
 * 2. Attempts to delete the property using the delete operator
 * 3. Verifies that the property is no longer accessible on the object
 * 4. Handles any errors that occur during deletion
 * 
 * This is especially useful for cleaning up properties on Foundry objects
 * that might have getters/setters or be defined on prototypes.
 * 
 * @param obj - The object to remove a property from
 * @param propName - The name of the property to remove
 * @returns True if property was removed successfully, false if the property couldn't be deleted or an error occurred
 */
export function safeDeleteProperty(obj: any, propName: string): boolean {
  if (!obj || typeof obj !== 'object' || !(propName in obj)) {
    return false;
  }
  
  try {
    delete obj[propName];
    return !(propName in obj);
  } catch (error) {
    Logger.debug(`Could not delete property ${propName}:`, error);
    return false;
  }
}

/**
 * Safely clears a PIXI graphics object
 * 
 * @param graphics - The graphics object to clear
 * @returns True if graphics was cleared successfully
 */
export function safeGraphicsClear(graphics: PIXIGraphics | null | undefined): boolean {
  if (!graphics || typeof graphics.clear !== 'function') {
    return false;
  }
  
  try {
    graphics.clear();
    return true;
  } catch (error) {
    Logger.debug('Could not clear graphics:', error);
    return false;
  }
}

/**
 * Detach and clean up all PIXI textures and resources from an object
 * Useful for deep cleaning before destroying objects
 * 
 * @param object - The object to clean textures from
 */
export function cleanupTextures(object: any): void {
  if (!object) return;
  
  try {
    // Handle texture property if it exists
    if (object.texture) {
      if (typeof object.texture.destroy === 'function') {
        object.texture.destroy(true); // true to destroy base texture as well
      }
      object.texture = null;
    }
    
    // Handle textures array if it exists
    if (Array.isArray(object.textures)) {
      for (const texture of object.textures) {
        if (texture && typeof texture.destroy === 'function') {
          texture.destroy(true);
        }
      }
      object.textures = [];
    }
    
    // Handle spritesheet if it exists
    if (object.spritesheet && typeof object.spritesheet.destroy === 'function') {
      object.spritesheet.destroy(true);
      object.spritesheet = null;
    }
  } catch (error) {
    Logger.debug('Error cleaning up textures:', error);
  }
}

/**
 * Safely disposes of a batch of resources
 * Useful for cleanup operations that involve multiple related objects
 * 
 * @param resources - Array of resources to dispose
 * @param disposeMethod - Method to call on each resource (default: 'dispose')
 */
export function disposeResourceBatch(
  resources: any[], 
  disposeMethod: string = 'dispose'
): void {
  if (!Array.isArray(resources)) return;
  
  for (const resource of resources) {
    try {
      if (resource && typeof resource[disposeMethod] === 'function') {
        resource[disposeMethod]();
      }
    } catch (error) {
      Logger.debug(`Error disposing resource using method ${disposeMethod}:`, error);
    }
  }
}

