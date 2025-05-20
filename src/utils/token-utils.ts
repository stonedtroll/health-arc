/**
 * Token-related utility functions for the Health Arc module
 */
import { Logger } from './logger';
import { FoundryToken } from '../types/foundry';

/**
 * Utility function to apply a function to all tokens
 */
export function forEachToken(fn: (token: FoundryToken) => void): void {
  try {
    // Skip if PIXI isn't ready
    if (!isPIXIReady()) {
      Logger.warn('PIXI not ready, skipping token operations');
      return;
    }
    
    const canvas = (window as any).canvas;
    const tokens = canvas?.tokens?.placeables;
    if (!tokens) return;
    for (let i = 0, n = tokens.length; i < n; i++) {
      fn(tokens[i]);
    }
  } catch (error) {
    Logger.error('Error in forEachToken:', error);
  }
}

/**
 * Checks if PIXI library is ready
 */
export function isPIXIReady(): boolean {
  // Check if PIXI is available and has required components
  const PIXI = (window as any).PIXI;
  return !!(PIXI && PIXI.Container && PIXI.Graphics);
}

/**
 * Helper function to get a property from a nested object path
 */
export function getProperty(obj: any, path: string): any {
  if (!obj || typeof path !== "string") return undefined;
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
}
