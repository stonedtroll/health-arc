/**
 * Health Arc Module - Main implementation
 * Optimised for Foundry VTT v13
 */

// PIXI is provided globally by Foundry VTT, so do not import it as a module.
// Using type definitions from foundry.d.ts

import { ARC_SPAN, MODULE_ID } from '../utils/constants';
import { FoundryToken, PIXIContainer, PIXIGraphics } from '../types/foundry';
import { HealthArcCache } from '../core/arc-cache';
import { HealthArcBatcher } from '../core/arc-batcher';
import { getActiveAlpha, getInactiveAlpha, getTempHPColour } from '../settings/settings';
import { Logger } from '../utils/logger';

// Import our refactored modules
import { getTokenHP, calculateHPColour, getTempHPColourWithFallback, getBackgroundColourWithFallback } from './hp-calculation';
import { getTokenName, getTokenPassivePerception } from './token-helpers';
import { calculateArcGeometry, drawMainArc, drawBackgroundArc, drawTempHPArc } from './arc-drawing';
import { setupArcContainer, cleanupContainer } from './container-manager';
import { drawHealthArcDebug, cleanupDebugVisuals } from './debug-visualisation';
import { PerformanceMonitor } from '../utils/performance';

// Cache commonly used settings to avoid repeated lookups
let _lastDebugMode: boolean | null = null;
let _lastSettingsCheck = 0;
const SETTINGS_CHECK_INTERVAL = 5000; // Only check settings every 5 seconds

/**
 * Get the current debug mode setting with caching
 */
function getDebugModeSetting(): boolean {
  const now = Date.now();
  if (_lastDebugMode === null || now - _lastSettingsCheck > SETTINGS_CHECK_INTERVAL) {
    try {
      _lastDebugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode') === true;
      _lastSettingsCheck = now;
    } catch (error) {
      return false;
    }
  }
  return _lastDebugMode || false;
}

/**
 * Track performance of a specific operation
 */
function trackPerformance<T>(operationName: string, callback: () => T): T {
  if (!getDebugModeSetting()) return callback();
  
  const start = performance.now();
  try {
    return callback();
  } finally {
    const duration = performance.now() - start;
    PerformanceMonitor.recordDuration(operationName, duration);
  }
}

/**
 * Draw health arc for a Foundry VTT token
 */
export function drawHealthArc(token: FoundryToken): void {
  try {
    // Check if PIXI is available
    if (typeof PIXI === 'undefined') {
      Logger.error('PIXI not available yet - skipping arc draw');
      return;
    }
    
    // Basic validation
    if (!token || !token.id) {
      Logger.error('Invalid token provided to drawHealthArc');
      return;
    }
    
    // Track the overall performance of drawing this token's arc
    trackPerformance(`draw:${token.id}`, () => {
      _drawHealthArcImpl(token);
    });
  } catch (error) {
    Logger.error('Error in drawHealthArc:', error);
  }
}

/**
 * Internal implementation of drawHealthArc
 * This function is called after token validation
 */
function _drawHealthArcImpl(token: FoundryToken): void {
  try {
    // Get token name for better logging
    const tokenName = token ? getTokenName(token) : 'Unknown';
    const isDebugMode = getDebugModeSetting();
    
    if (isDebugMode) {
      Logger.debug(`Drawing arc for token ${tokenName} (${token?.id})`);
    }
    
    // Get token HP data with proper error handling
    const hpData = trackPerformance('getHP', () => {
      try {
        const data = getTokenHP(token);
        if (!data && isDebugMode) {
          Logger.debug(`No HP data found for token ${tokenName} (${token.id})`);
        }
        return data;
      } catch (hpError) {
        Logger.error(`Error getting HP data for token ${tokenName}:`, hpError);
        return null;
      }
    });
    
    if (!hpData) return;
    
    const { current, max, temp, percent: hpArcPercent, tempPercent: tempHPArcPercent } = hpData;
    
    // Calculate arc geometry - this is performance sensitive
    const arcGeometry = trackPerformance('geometry', () => {
      try {
        return calculateArcGeometry(token);
      } catch (geometryError) {
        Logger.error(`Error calculating arc geometry for token ${tokenName}:`, geometryError);
        return null;
      }
    });
    
    if (!arcGeometry) return;
    
    const { arcRadius, adjustedArcStroke, arcStart, arcEnd } = arcGeometry;
    
    // Calculate HP colour - cache this value when possible
    const hpArcColour = trackPerformance('calculateColour', () => calculateHPColour(hpArcPercent));
    
    // Container setup - CRITICAL PART
    const containerSetup = trackPerformance('containerSetup', () => {
      let container = token._healthArc as PIXIContainer;
      let hpArcBackground: PIXIGraphics | undefined;
      let hpArcForeground: PIXIGraphics | undefined;
      let tempHPArcForeground: PIXIGraphics | undefined;
      
      // Remove any existing container with improved error handling
      if (container) {
        if (isDebugMode) {
          Logger.debug(`Removing existing container for token ${tokenName}`);
        }
        
        try {
          const removed = removeHealthArc(token, false);
          if (!removed && isDebugMode) {
            Logger.warn(`Failed to properly remove existing container for token ${tokenName}`);
          }
        } catch (error) {
          Logger.error(`Error removing existing container for token ${tokenName}:`, error);
        }
      }
      
      // Create a new container with improved error handling
      try {
        if (isDebugMode) {
          Logger.debug(`Setting up new container for token ${tokenName}`);
        }
        
        const setup = setupArcContainer(token);
        container = setup.container;
        hpArcBackground = setup.background;
        hpArcForeground = setup.foreground;
        tempHPArcForeground = setup.tempForeground;
        
        // Validate that we got valid graphics objects
        if (!container || !hpArcBackground || !hpArcForeground || !tempHPArcForeground) {
          throw new Error('Setup did not return valid container or graphics objects');
        }
        
        return { container, hpArcBackground, hpArcForeground, tempHPArcForeground };
      } catch (error) {
        Logger.error(`Failed to set up container for token ${tokenName}:`, error);
        return null;
      }
    });
    
    if (!containerSetup) return;
    
    const { container, hpArcBackground, hpArcForeground, tempHPArcForeground } = containerSetup;
    
    // Set alpha based on token state with null checking
    const actor = token.actor;
    const isActive = token.combatant || actor?.combatant || token.controlled || token.hover;
    
    try {
      container.alpha = isActive ? getActiveAlpha() : getInactiveAlpha();
    } catch (alphaError) {
      Logger.warn(`Error setting container alpha for token ${tokenName}:`, alphaError);
      // Use default values if function calls fail
      container.alpha = isActive ? 1.0 : 0.25;
    }
    
    // Draw background HP arc - use a private function to keep code clean
    trackPerformance('drawBackground', () => {
      try {        // Get background colour or use fallback
        const bgColour = getBackgroundColourWithFallback();          drawBackgroundArc(
            hpArcBackground, 
            arcRadius, 
            adjustedArcStroke, 
            arcStart, 
            arcEnd, 
            bgColour
        );
      } catch (error) {
        Logger.error(`Error drawing background arc for token ${tokenName}:`, error);
        
        // Last-ditch attempt with hardcoded values
        try {
          drawBackgroundArc(
            hpArcBackground, 
            arcRadius, 
            adjustedArcStroke, 
            arcStart, 
            arcEnd, 
            0x222222
          );
        } catch (fallbackError) {
          Logger.error('Even fallback background arc drawing failed:', fallbackError);
        }
      }
    });
    
    // Calculate displayed HP percentage (with uncertainty for non-owners)
    const displayHPArcPercent = trackPerformance('calculateDisplayHP', () => {
      let result = hpArcPercent;
      const user = (window as any).game?.user;
      const isGM = user?.isGM;
      const ownsToken = token.isOwner || actor?.isOwner;
      
      if (!isGM && !ownsToken && user) {
        // Apply HP uncertainty based on perception
        const passivePerception = getTokenPassivePerception(token);
        result = HealthArcCache.getInstance().getHPUncertainty(
          token.id,
          user.id,
          current,
          hpArcPercent,
          passivePerception
        ).percent;
      }
      
      return result;
    });
    
    // Draw main HP arc
    trackPerformance('drawMainArc', () => {
      try {
        drawMainArc(
          hpArcForeground,
          arcRadius,
          adjustedArcStroke,
          arcStart,
          displayHPArcPercent,
          hpArcColour
        );
      } catch (mainArcError) {
        Logger.error(`Error drawing main health arc for token ${tokenName}:`, mainArcError);
      }
    });
    
    // Draw temp HP arc if present
    if (tempHPArcPercent > 0) {
      trackPerformance('drawTempHPArc', () => {
        try {
          const tempHpColour = getTempHPColourWithFallback();
          
          drawTempHPArc(            tempHPArcForeground,
            arcRadius,
            adjustedArcStroke,
            arcEnd,
            tempHPArcPercent,
            tempHpColour
          );
        } catch (tempHpError) {
          Logger.error(`Error drawing temp HP arc for token ${tokenName}:`, tempHpError);
        }
      });
    }
    
    // Handle debug visuals
    if (isDebugMode) {
      try {
        // Always clean up any existing debug visuals first
        cleanupDebugVisuals(container);
        
        // Add debug visuals
        drawHealthArcDebug(container, arcRadius);
        
        // Record this successful render
        PerformanceMonitor.incrementCounter(`renders:${token.id}`);
      } catch (debugError) {
        Logger.warn('Error handling debug visuals:', debugError);
      }
    }
  } catch (error) {
    Logger.error('Error drawing health arc:', error);
  }
}

/**
 * Remove HP arc from token
 * Uses the cleanupContainer function to properly release resources
 * 
 * @param token - The token to remove the health arc from
 * @param clearState - Whether to clear state variables on the token
 * @returns True if the arc was successfully removed
 */
export function removeHealthArc(token: FoundryToken, clearState = true): boolean {
  try {
    // Basic validation first
    if (!token) {
      Logger.debug('Skipping arc removal: Token is null or undefined');
      return false;
    }
    
    // Check if token has a health arc
    if (!token._healthArc) {
      // No arc exists, so nothing to remove
      return true;
    }
    
    return trackPerformance(`remove:${token.id}`, () => {
      return _removeHealthArcImpl(token, clearState);
    });
  } catch (error) {
    Logger.error('Error in removeHealthArc:', error);
    return false;
  }
}

/**
 * Internal implementation of removeHealthArc
 * This function is called after token validation
 */
function _removeHealthArcImpl(token: FoundryToken, clearState = true): boolean {
  try {
    // Check if token has a health arc
    if (!token._healthArc) {
      // No arc exists, so nothing to remove
      return true;
    }
    
    const container = token._healthArc as PIXIContainer;
    
    // Log debug information about the removal if debug mode is enabled
    if (getDebugModeSetting()) {
      const tokenName = getTokenName(token);
      Logger.debug(`Removing health arc for token ${tokenName} (${token.id})`, {
        containerId: container.id,
        children: container.children?.length || 0
      });
    }
    
    // Clean up any debug visuals first
    try {
      cleanupDebugVisuals(container);
    } catch (visualError) {
      Logger.error('Error cleaning up debug visuals:', visualError);
    }
    
    // Use the centralized cleanup function imported at the top of the file
    try {
      const success = cleanupContainer(container, clearState);
      
      if (!success && clearState) {
        // Ensure token properties are cleared even if cleanup fails
        delete token._healthArc;
        delete token._lastArcParentType;
      }
      
      return success;
    } catch (cleanupError) {
      Logger.error('Error during container cleanup:', cleanupError);
      
      // Fallback to basic cleanup if the cleanup function fails
      if (clearState) {
        delete token._healthArc;
        delete token._lastArcParentType;
      }
      
      return false;
    }
  } catch (error) {
    Logger.error('Error removing health arc:', error);
    return false;
  }
}

/**
 * Initialises the renderer components
 * This should be called during module initialisation
 * 
 * @param attempts - Number of initialisation attempts made (for internal use)
 * @param maxAttempts - Maximum number of initialisation attempts to make
 * @returns True if initialisation was successful
 */
export function initialiseRenderer(attempts = 0, maxAttempts = 3): boolean {
  try {
    Logger.debug(`Initialising renderer (attempt ${attempts + 1} of ${maxAttempts})`);
    
    // Check if we've exceeded max attempts
    if (attempts >= maxAttempts) {
      Logger.error(`Renderer initialization failed after ${maxAttempts} attempts`);
      return false;
    }
    
    // Check if PIXI is available
    if (typeof PIXI === 'undefined') {
      Logger.error('PIXI not available - renderer initialization failed');
      return false;
    }
    
    // Check if canvas is ready
    if (!canvas || !canvas.tokens) {
      Logger.warn('Canvas or tokens layer not ready yet, will retry initialization');
      return false;
    }
    
    // Clear out any previous state
    try {
      // Reset batcher state if it exists
      if (HealthArcBatcher.instance) {
        HealthArcBatcher.instance.clear();
      }
      
      // Reset performance counters
      if (getDebugModeSetting()) {
        PerformanceMonitor.clear();
      }
    } catch (clearError) {
      Logger.warn('Error clearing existing state:', clearError);
    }
      // Initialise HealthArcBatcher with the drawHealthArc function
    HealthArcBatcher.instance.initialise((token: FoundryToken) => {
      _drawHealthArcImpl(token);
    });
        // Ensure HealthArcCache is initialised and cleared
    const cache = HealthArcCache.getInstance();
    cache.clearAll();
    
    Logger.info('Health Arc renderer initialised successfully');
    return true;
  } catch (error) {
    Logger.error('Failed to initialise Health Arc renderer:', error);
    return false;
  }
}
