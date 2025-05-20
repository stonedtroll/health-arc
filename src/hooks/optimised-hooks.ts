/**
 * Optimised hook handlers for Health Arc module
 * Implements throttled callbacks and better event handling
 */

import { FoundryToken } from '../types/foundry';
import { Logger } from '../utils/logger';
import { HealthArcBatcher } from '../core/arc-batcher';
import { getTokenName } from '../ui/token-helpers';
import { 
  MODULE_ID, 
  HP_UPDATE_THROTTLE_MS, 
  HOVER_THROTTLE_MS,
  COMBAT_UPDATE_BATCH_SIZE,
  COMBAT_UPDATE_BATCH_DELAY_MS 
} from '../utils/constants';
import { getRendererFunctions } from '../core/renderer-functions';
import { getActiveAlpha, getInactiveAlpha } from '../settings/settings';

/**
 * Throttle helper to limit frequency of callback execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle = false;
  let lastResult: ReturnType<T>;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: number | null = null;
  
  // Function to execute after throttle period
  const executeThrottled = () => {
    if (lastArgs) {
      lastResult = func(...lastArgs);
      lastArgs = null;
    }
    inThrottle = false;
  };

  return function(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    // Store latest args
    lastArgs = args;
    
    // If we're not in throttle period, execute immediately
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);
      
      // Set up throttle timeout
      timeoutId = window.setTimeout(() => {
        if (inThrottle) {
          executeThrottled();
        }
      }, limit);
      
      return lastResult;
    }
    
    // If already in throttle, clear existing timeout and set a new one
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(executeThrottled, limit);
    }
    
    return lastResult;
  };
}

/**
 * Debounce helper to execute a function only after a specified delay
 * with no further invocations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(later, wait);
  };
}

// Throttled version of token update
const throttledTokenUpdate = throttle((token: FoundryToken) => {
  // Queue update in batcher instead of direct drawing
  HealthArcBatcher.instance.queueUpdate(token);
}, HP_UPDATE_THROTTLE_MS);

// Throttled version of hover handling
const throttledHoverHandler = throttle((token: FoundryToken, hovered: boolean) => {
  try {
    if (!token?._healthArc) return;
    
    // Update the arc visibility or appearance based on hover state
    if (hovered) {
      // Make arc more visible when hovered
      if (token._healthArc.alpha < 1.0) {
        token._healthArc.alpha = Math.min(1.0, token._healthArc.alpha * 1.5);
      }
    } else {
      // Reset to normal visibility
      const isSelected = token.controlled || token.hover;
      token._healthArc.alpha = isSelected ? getActiveAlpha() : getInactiveAlpha();
    }
  } catch (e) {
    Logger.error('Error handling token hover:', e);
  }
}, HOVER_THROTTLE_MS);

/**
 * Efficient handler for HP changes
 */
export function handleHPChange(_scene: any, tokenData: any, updateData: any, token: any): void {
  // Skip tokens without id
  if (!tokenData?._id) return;
  
  // Check if this update includes HP data that would affect our display
  const hpUpdated = 
    updateData?.actorData?.system?.attributes?.hp || 
    updateData?.system?.attributes?.hp || 
    updateData?.bar1 || 
    updateData?.bar2;
    
  // Skip if no HP data changed
  if (!hpUpdated) return;
  
  // Get token if not provided
  const activeToken = token || (window as any).canvas?.tokens?.get(tokenData._id);
  if (!activeToken) return;
  
  // Use throttled update to prevent too many rapid updates
  throttledTokenUpdate(activeToken);
}

/**
 * Handle token movement
 */
export function handleTokenMovement(_scene: any, tokenData: any, updateData: any, token: any): void {
  // Check if position changed
  if (updateData.x === undefined && updateData.y === undefined) return;
  
  // Get token if not provided
  const activeToken = token || (window as any).canvas?.tokens?.get(tokenData._id);
  if (!activeToken || !activeToken._healthArc) return;
  
  // Try to handle container positioning directly without redrawing
  try {
    const container = activeToken._healthArc;
    if (container && typeof container.updateTransform === 'function') {
      container.updateTransform();
      
      // If token is being dragged or in combat, ensure it renders with priority
      if (activeToken.controlled || activeToken.combatant) {
        HealthArcBatcher.instance.queueUpdate(activeToken);
      }
    }
  } catch (error) {
    Logger.warn(`Error updating transform for moving token ${getTokenName(activeToken)}:`, error);
    // Fall back to redrawing if needed
    throttledTokenUpdate(activeToken);
  }
}

/**
 * Handle token hover state change
 */
export function handleTokenHover(token: FoundryToken, hovered: boolean): void {
  throttledHoverHandler(token, hovered);
}

/**
 * Handle mass token updates for combat changes
 * Uses staggered updates to prevent lag spikes
 */
export function handleCombatChange(): void {
  // Get tokens in combat first for priority updates
  const combatTokenIds = new Set<string>();
  
  try {
    const combat = (window as any).game?.combat;
    if (combat?.combatants) {
      combat.combatants.forEach((combatant: any) => {
        if (combatant?.token?.id) {
          combatTokenIds.add(combatant.token.id);
        }
      });
    }
  } catch (error) {
    Logger.warn('Error getting combat tokens:', error);
  }
  
  // Process tokens in groups with delays to prevent lag
  try {
    const allTokens: FoundryToken[] = [];
    const canvas = (window as any).canvas;
    
    // Collect all tokens
    if (canvas?.tokens?.placeables) {
      canvas.tokens.placeables.forEach((token: FoundryToken) => {
        if (token && token.id) {
          allTokens.push(token);
        }
      });
    }
    
    // Sort tokens by priority - combat tokens first
    allTokens.sort((a, b) => {
      const aInCombat = combatTokenIds.has(a.id);
      const bInCombat = combatTokenIds.has(b.id);
      
      if (aInCombat && !bInCombat) return -1;
      if (!aInCombat && bInCombat) return 1;
      return 0;
    });
    
    // Process in batches with delays
    for (let i = 0; i < allTokens.length; i += COMBAT_UPDATE_BATCH_SIZE) {
      const batch = allTokens.slice(i, i + COMBAT_UPDATE_BATCH_SIZE);
      
      // Delay each batch to stagger processing
      setTimeout(() => {
        batch.forEach(token => {
          HealthArcBatcher.instance.queueUpdate(token);
        });
      }, Math.floor(i / COMBAT_UPDATE_BATCH_SIZE) * COMBAT_UPDATE_BATCH_DELAY_MS);
    }
  } catch (error) {
    Logger.error('Error updating tokens after combat change:', error);
  }
}

/**
 * Handle setting changes
 */
export function handleSettingChange(setting: any): void {
  // Only respond to our module's settings
  if (!setting || !setting.key || !setting.key.startsWith(`${MODULE_ID}.`)) return;
  
  // Special handling for debug mode
  if (setting.key === `${MODULE_ID}.debugMode`) {
    Logger.debug('Debug mode changed, refreshing all health arcs');
    handleCombatChange(); // Reuse the staggered update function
    
    // Show a notification to users
    const debugMode = setting.value;
    const message = debugMode      ? 'Debug visualisations enabled for health arcs'
      : 'Debug visualisations disabled for health arcs';
    
    if ((window as any).ui?.notifications?.info) {
      (window as any).ui.notifications.info(`Health Arc: ${message}`);
    }
  }
}

/**
 * Removes a health arc from a token
 */
export function removeHealthArc(token: FoundryToken, clearState = true): void {
  getRendererFunctions()
    .then(functions => functions.removeHealthArc(token, clearState))
    .catch(error => Logger.error('Error removing health arc:', error));
}
