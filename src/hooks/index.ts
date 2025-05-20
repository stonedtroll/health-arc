/**
 * Hook registrations and handlers for the Health Arc module
 */

import { HealthArcCache } from '../core/arc-cache';
import { GraphicsPool } from '../utils/graphics-pool';
import { HealthArcBatcher } from '../core/arc-batcher';
import { Logger } from '../utils/logger';
import { MODULE_ID } from '../utils/constants';
import { FoundryToken } from '../types/foundry';
import { forEachToken, getProperty } from '../utils/token-utils';
import { getRendererFunctions } from '../core/renderer-functions';
import { 
  handleHPChange,
  handleTokenMovement, 
  handleTokenHover, 
  handleCombatChange, 
  handleSettingChange,
  removeHealthArc as optimisedRemoveHealthArc
} from './optimised-hooks';

// Re-export the token utilities for convenience
export { forEachToken };

/**
 * Safe wrapper to draw health arc with async handling
 */
function safeDrawHealthArc(token: FoundryToken): void {
  // Directly queue update instead of immediately drawing
  HealthArcBatcher.instance.queueUpdate(token);
}

/**
 * Safe wrapper to remove health arc with async handling
 */
function safeRemoveHealthArc(token: FoundryToken, clearState = true): void {
  optimisedRemoveHealthArc(token, clearState);
}

/**
 * Clean up resources when module is disabled or uninstalled
 * This ensures proper resource cleanup to prevent memory leaks
 */
export function cleanUpResources(): void {
  // Clear token arcs with comprehensive cleanup
  forEachToken(safeRemoveHealthArc);
  
  // Clear caches
  HealthArcCache.getInstance().clearAll();
  GraphicsPool.clear();
  HealthArcBatcher.instance.clear();
  
  // Log cleanup completion
  Logger.info('Health Arc module resources cleaned up successfully');
}

/**
 * Register all hooks for the module
 */
export function registerHooks(): void {
  // Redraw all tokens when the canvas is ready
  Hooks.on("canvasReady", () => {
    // Stagger token rendering a bit to improve performance
    setTimeout(() => {
      forEachToken(safeDrawHealthArc);
    }, 100);
  });

  // Update token arcs when HP changes - use optimised handler
  Hooks.on("updateToken", handleHPChange);

  // Draw arc when token is first drawn
  Hooks.on("drawToken", (token: FoundryToken) => {
    safeDrawHealthArc(token);
  });

  // Refresh token arcs - throttled via batcher
  Hooks.on("refreshToken", (token: FoundryToken) => {
    HealthArcBatcher.instance.queueUpdate(token);
  });

  // Handle token movement - use optimised movement handler
  Hooks.on("updateToken", handleTokenMovement);

  // Handle module shutdown/disable
  Hooks.on('closeWorldSave', cleanUpResources);
  Hooks.on('shutdown', cleanUpResources);

  // Listen for changes to debug mode setting
  Hooks.on('updateSetting', handleSettingChange);
  
  // Updates arcs when combat status changes
  Hooks.on("updateCombat", handleCombatChange);

  // Updates arc visibility when a token is hovered
  Hooks.on("hoverToken", handleTokenHover);

  Logger.debug('Hooks registered with optimised handlers');
}
