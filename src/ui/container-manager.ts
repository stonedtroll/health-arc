/**
 * Health Arc Module - Container Manager
 * Handles management of PIXI containers for health arc display
 * 
 * This module provides functions to create, manage, and clean up PIXI containers
 * used for rendering health arcs on tokens in Foundry VTT.
 */

// PIXI is provided globally by Foundry VTT, so do not import it as a module.
// Using type definitions from foundry.d.ts

import { FoundryToken, PIXIContainer, PIXIGraphics } from '../types/foundry';
import { Logger } from '../utils/logger';
import { HEALTH_ARC_Z_INDEX } from '../utils/constants';
import { getTokenName } from './token-helpers';
import { findTokenFromContainer } from '../utils/container-helpers';
import { 
  safeRemoveEventListener,
  safeRemoveFromParent,
  safeEmptyContainer,
  safeDeleteProperty,
  clearReferences,
  safeDestroyPIXI
} from '../utils/resource-management';

/**
 * Container setup result interface
 * Contains all the graphics objects needed for rendering health arcs
 */
interface ArcContainerSetup {
  container: PIXIContainer;
  background: PIXIGraphics;
  foreground: PIXIGraphics;
  tempForeground: PIXIGraphics;
}

/**
 * Setup arc container and graphics objects for a token
 * Creates and configures a PIXI container with all necessary graphics objects
 * 
 * @param token - The Foundry VTT token to create a container for
 * @returns Object containing the container and graphics objects
 * @throws Error if PIXI is not available or graphics creation fails
 */
export function setupArcContainer(token: FoundryToken): ArcContainerSetup {
  try {
    // Check if PIXI is available
    if (typeof PIXI === 'undefined') {
      Logger.error('PIXI not available yet');
      throw new Error('PIXI library not available - container setup failed');
    }
    
    // Create container
    const tokenName = getTokenName(token);
    Logger.debug(`Creating container for token ${tokenName} (${token.id})`);
    const container = new PIXI.Container();
    container.zIndex = HEALTH_ARC_Z_INDEX;
    container.position.set(0, 0);
    
    // Store metadata in the container for later reference
    container._healthArcData = {
      lastUpdate: Date.now(),
      tokenId: token.id
    };
    
    // Create graphics objects directly for now to bypass pool issues
    const background = new PIXI.Graphics();
    const foreground = new PIXI.Graphics();
    const tempForeground = new PIXI.Graphics();
    
    // Verify that the graphics objects were created correctly
    if (!background || !foreground || !tempForeground) {
      Logger.error('Failed to create valid graphics objects');
      throw new Error('Failed to create graphics objects - container setup failed');
    }
    
    // Add graphics to container
    container.addChild(background, foreground, tempForeground);
    
    // Simplify event handling - skip drag tracking for now to fix core display
    container._isDragging = false;
    
    // Store the container on the token
    token._healthArc = container;
    
    // Store a reference to the token in the container for easier access
    container._token = token;
    
    // Attach the container to the token
    attachContainerToToken(token, container);
    
    return { container, background, foreground, tempForeground };
  } catch (error) {
    // Enhanced error logging with token details
    const tokenInfo = token ? `${getTokenName(token)} (${token.id})` : 'unknown token';
    Logger.error(`Error setting up arc container for ${tokenInfo}:`, error);
    
    // Clean up any partially created resources to prevent memory leaks
    try {
      // If a container was created in the try block, it might be attached to the token already
      const containerToCleanup = token?._healthArc as PIXIContainer | undefined;
      
      if (containerToCleanup && typeof containerToCleanup.destroy === 'function') {
        containerToCleanup.destroy({ children: true, texture: true, baseTexture: true });
        
        // Clear the reference if we successfully destroyed it
        if (token) {
          delete token._healthArc;
        }
      }
    } catch (cleanupError) {
      Logger.error('Error during container cleanup:', cleanupError);
    }
    
    throw error; // Re-throw to prevent silently continuing with invalid objects
  }
}

/**
 * Attaches a container to a token, finding the best parent element
 * This is a common function used by both setupArcContainer and updateContainerParent
 * 
 * @param token - The token to attach the container to
 * @param container - The container to attach
 * @returns True if attachment was successful, false otherwise
 */
function attachContainerToToken(token: FoundryToken, container: PIXIContainer): boolean {
  try {
    // Remove from current parent, if any
    if (container.parent) {
      container.parent.removeChild(container);
    }
    
    // Foundry v13: Direct attachment to the mesh is most reliable
    if (token.mesh?.addChild) {
      token.mesh.addChild(container);
      Logger.debug(`Attached container to token.mesh for ${getTokenName(token)}`);
      return true;
    } else if (token.addChild) {
      token.addChild(container);
      Logger.debug(`Attached container directly to token for ${getTokenName(token)}`);
      return true;
    } else {
      Logger.error(`Failed to find a valid parent for token ${getTokenName(token)}`);
      return false;
    }
  } catch (error) {
    Logger.error(`Error attaching container to token ${getTokenName(token)}:`, error);
    return false;
  }
}

/**
 * Update the container's parent based on token state
 * Should be called when a token's drag state changes or when its parent structure changes
 * 
 * @param token - The token the container is attached to
 * @param container - The container to update
 */
export function updateContainerParent(token: FoundryToken, container: PIXIContainer): void {
  try {
    // Attempt to attach the container to the token
    const success = attachContainerToToken(token, container);
    
    // Update the container's timestamp to track when it was last modified
    if (success && container._healthArcData) {
      container._healthArcData.lastUpdate = Date.now();
    }
  } catch (error) {
    Logger.error(`Error updating container parent for token ${getTokenName(token)}:`, error);
  }
}

/**
 * Cleans up container resources and removes it from the display
 * Should be called when a container is no longer needed to prevent memory leaks
 * 
 * This function performs a comprehensive cleanup:
 * 1. Removes any debug visualisations attached to the container
 * 2. Finds the token associated with the container
 * 3. Removes event listeners from the token's interaction manager
 * 4. Detaches the container from its parent in the display hierarchy
 * 5. Empties the container of all children
 * 6. Removes references to the container from the token
 * 7. Clears all object references
 * 8. Properly destroys the container and its textures
 * 
 * Uses dynamic imports to prevent circular dependencies.
 * 
 * @param container - The container to clean up
 * @param removeFromToken - Whether to remove the container reference from its associated token
 * @returns True if cleanup was initiated successfully (actual cleanup happens asynchronously)
 */
export function cleanupContainer(container: PIXIContainer | null | undefined, removeFromToken = true): boolean {
  if (!container) return false;
  
  try {
    // First clean up any debug visualisations
    if (container._debugContainer) {
      try {
        // Use dynamic import to avoid circular dependency - keep this one as dynamic
        // since debug visualisations are rarely used and only in development
        import('./debug-visualisation').then(({ cleanupDebugVisuals }) => {
          cleanupDebugVisuals(container);
        }).catch(error => {
          Logger.error('Error importing debug visualisation module:', error);
        });
      } catch (debugError) {
        Logger.debug('Error cleaning up debug visualisations:', debugError);
      }
    }
    
    // Find the associated token
    const token = findTokenFromContainer(container);
    
    // Use the preloaded resource management utilities for better performance
    try {
      // Clean up token interaction listeners
      if (token?.interactionManager) {
        // Explicitly type container as any to allow dynamic property access
        const containerAny = container as any;
        
        // Helper function to safely remove a listener
        const safeRemoveListener = (eventName: string, listenerProp: string) => {
          if (containerAny[listenerProp]) {
            safeRemoveEventListener(token.interactionManager, eventName, containerAny[listenerProp]);
            safeDeleteProperty(containerAny, listenerProp);
          }
        };
        
        // Clean up standard event listeners
        safeRemoveListener('dragstart', '_dragStartListener');
        safeRemoveListener('dragend', '_dragEndListener');
        safeRemoveListener('mouseover', '_mouseOverListener');
        safeRemoveListener('mouseout', '_mouseOutListener');
      }
      
      // Remove from parent
      safeRemoveFromParent(container);
      
      // Clean up any child elements
      safeEmptyContainer(container);
      
      // Remove the container reference from the token
      if (removeFromToken && token) {
        // Use type assertion for token to safely remove properties
        const tokenAny = token as any;
        
        if (tokenAny._healthArc === container) {
          safeDeleteProperty(tokenAny, '_healthArc');
        }
        
        // Also clean up any additional token properties we might have set
        safeDeleteProperty(tokenAny, '_lastArcParentType');
        
        // Clean up other custom properties if they exist
        if (tokenAny._healthArcData) {
          safeDeleteProperty(tokenAny, '_healthArcData');
        }
      }
      
      // Clear all references
      clearReferences(container);
      
      // Finally destroy the container itself
      safeDestroyPIXI(container, { 
        children: true, 
        texture: true, 
        baseTexture: true 
      });
    } catch (error) {
      Logger.error('Error during resource cleanup operations:', error);
    }
    
    // Return true to indicate that cleanup was initiated
    // The actual cleanup happens asynchronously
    return true;
  } catch (error) {
    Logger.error('Error during container cleanup:', error);
    return false;
  }
}
