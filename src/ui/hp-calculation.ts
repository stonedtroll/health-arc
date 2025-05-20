/**
 * Health Arc Module - HP Calculation Functions
 * Contains functions for calculating HP values and colours
 */

import { FoundryToken } from '../types/foundry';
import { Logger } from '../utils/logger';
import { 
  getHPHighColour, 
  getHPLowColour,
  getTempHPColour,
  getBackgroundColour
} from '../settings/settings';

/**
 * Clamp a value between a minimum and maximum
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * Gets the current HP, max HP, temp HP and percentages for a token
 */
export function getTokenHP(token: FoundryToken): { current: number, max: number, temp: number, percent: number, tempPercent: number } | null {
  const actor = token.actor;
  const hp = actor?.system?.attributes?.hp;
  if (!hp) return null;

  const current = Number(hp.value) || 0;
  const max = Number(hp.max) || 1;
  const temp = Number(hp.temp) || 0;
  const percent = clamp(current / max, 0, 1);
  const tempPercent = temp > 0 && max > 0 ? clamp(temp / max, 0, 1) : 0;

  return { current, max, temp, percent, tempPercent };
}

/**
 * Calculate the HP colour based on percentage
 */
export function calculateHPColour(hpPercent: number): number {
  try {
    const highColour = getHPHighColour();
    const lowColour = getHPLowColour();
    
    // Extract RGB components
    const highR = (highColour >> 16) & 0xFF;
    const highG = (highColour >> 8) & 0xFF;
    const highB = highColour & 0xFF;
    
    const lowR = (lowColour >> 16) & 0xFF;
    const lowG = (lowColour >> 8) & 0xFF;
    const lowB = lowColour & 0xFF;
    
    // Calculate interpolation factor
    const t = hpPercent >= 0.1 ? (1 - hpPercent) / 0.9 : 1;
    
    // Interpolate between colours
    return (lerp(highR, lowR, t) << 16) |
           (lerp(highG, lowG, t) << 8) |
           lerp(highB, lowB, t);
  } catch (error) {
    // Fallback to original hardcoded colour calculation
    const t = hpPercent >= 0.1 ? (1 - hpPercent) / 0.9 : 1;
    return (lerp(0x46, 0x6A, t) << 16) |
           (lerp(0x5C, 0x1A, t) << 8) |
           lerp(0x1A, 0x1A, t);
  }
}

/**
 * Get the background colour with fallback
 * 
 * This is a wrapped version of getBackgroundColour() from settings with error handling
 * that returns a default value if the settings function fails.
 */
export function getBackgroundColourWithFallback(): number {
  try {
    return getBackgroundColour();
  } catch (error) {
    Logger.error('Error getting background colour:', error);
    // Default fallback colour (dark grey)
    return 0x222222;
  }
}

/**
 * Get the temporary HP colour with fallback
 * 
 * This is a wrapped version of getTempHPColour() from settings with error handling
 * that returns a default value if the settings function fails.
 */
export function getTempHPColourWithFallback(): number {
  try {
    return getTempHPColour();
  } catch (error) {
    Logger.error('Error getting temp HP colour:', error);
    // Default fallback colour (light blue)
    return 0x3498DB;
  }
}
