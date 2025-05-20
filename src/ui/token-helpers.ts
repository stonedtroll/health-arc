/**
 * Health Arc Module - Token Helper Functions
 * Contains utility functions for working with Foundry VTT tokens
 */

import { FoundryToken } from '../types/foundry';
import { Logger } from '../utils/logger';
import { MODULE_ID } from '../utils/constants';
import { PerformanceMonitor } from '../utils/performance';

/**
 * Calculate the token's passive perception
 */
export function getTokenPassivePerception(token: FoundryToken): number {
  const actor = token.actor;
  if (!actor) return 10;
  
  let passivePerception = 10;
    // Use type assertion to access potential properties not in the type definition
  const systemAny = actor?.system as any;
  
  if (systemAny?.skills?.prc?.passive != null) {
    passivePerception = +systemAny.skills.prc.passive || 10;
  } else if (systemAny?.attributes?.perception?.passive != null) {
    passivePerception = +systemAny.attributes.perception.passive || 10;
  }
  
  return passivePerception;
}

/**
 * Get a friendly name for a token for debugging/logging purposes
 */
export function getTokenName(token: FoundryToken): string {
  try {
    if (!token) return 'Unknown';
    
    // Try document name first (most reliable in Foundry v10+)
    if (token.document?.name) return token.document.name;
    
    // Fall back to direct name or actor name
    if (token.name) return token.name;
    if (token.actor?.name) return token.actor.name;
    
    // If all else fails, use a portion of the ID
    return `Token: ${token.id?.substring(0, 6) || 'Unknown'}`;
  } catch (error) {
    Logger.debug('Error getting token name:', error);
    return 'Unknown';
  }
}

/**
 * Helper function to track token rendering performance
 */
export function trackTokenRenderPerformance(token: FoundryToken, action: 'start' | 'end'): void {
  if (!token?.id) return;
  
  const isDebugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode') === true;
  if (!isDebugMode) return;
  
  // Use direct call instead of dynamic import for better performance
  try {
    if (action === 'start') {
      PerformanceMonitor.startTimer(`render:${token.id}`);
    } else {
      PerformanceMonitor.endTimer(`render:${token.id}`);
    }
  } catch (error) {
    Logger.debug(`Error ${action}ing performance timer for ${getTokenName(token)} (${token.id}):`, error);
  }
}
