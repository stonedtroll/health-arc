/**
 * Health Arc Module - Renderer Functions
 * 
 * This module provides centralized access to renderer functions,
 * helping to avoid circular dependencies between UI and settings modules.
 */

import { Logger } from '../utils/logger';
import { FoundryToken } from '../types/foundry';

/**
 * Type definition for renderer functions
 */
export interface RenderFunctions {
  drawHealthArc: (token: FoundryToken) => void;
  removeHealthArc: (token: FoundryToken, clearState?: boolean) => void;
}

// Cached renderer functions
let rendererFunctions: RenderFunctions | null = null;

/**
 * Safely get renderer functions using dynamic imports
 */
export async function getRendererFunctions(): Promise<RenderFunctions> {
  if (!rendererFunctions) {
    try {
      const ui = await import('../ui');
      
      // Validate that the required functions exist
      if (typeof ui.drawHealthArc !== 'function' || typeof ui.removeHealthArc !== 'function') {
        throw new Error('Required renderer functions not found in UI module');
      }
      
      rendererFunctions = {
        drawHealthArc: ui.drawHealthArc,
        removeHealthArc: ui.removeHealthArc
      };
      
      Logger.debug('Successfully loaded renderer functions');
    } catch (error) {
      Logger.error('Failed to import arc renderer functions:', error);
      
      // Create fallback functions that log errors but don't crash
      const fallbackFn = (token: FoundryToken) => {
        Logger.error('Renderer function called before initialisation');
      };
      
      // Return temporary functions that will be replaced on next call
      rendererFunctions = null;
      return {
        drawHealthArc: fallbackFn,
        removeHealthArc: fallbackFn
      };
    }
  }
  return rendererFunctions;
}

/**
 * Reset renderer functions cache
 * Useful when modules need to be reinitialised
 */
export function resetRendererFunctions(): void {
  rendererFunctions = null;
  Logger.debug('Renderer functions cache reset');
}

/**
 * Set renderer functions directly
 * Primarily used for testing or when functions need to be injected
 */
export function setRendererFunctions(functions: RenderFunctions): void {
  rendererFunctions = functions;
  Logger.debug('Renderer functions set explicitly');
}
