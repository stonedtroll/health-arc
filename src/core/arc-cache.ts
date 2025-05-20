/**
 * HealthArcCache - Manages caching for health arc data
 * Provides deterministic HP uncertainty values for non-owned tokens
 * 
 * This singleton class manages HP uncertainty for tokens that players don't own,
 * creating a consistent illusion of partial knowledge based on perception skills.
 * It uses deterministic randomization to ensure consistent values between renders.
 */

import { MODULE_ID } from '../utils/constants';
import { Logger } from '../utils/logger';
import { 
  getMaxPerception, 
  getMinPerception, 
  getBasePerception, 
  getMaxUncertainty, 
  getPerceptionScaling 
} from '../settings/settings';

/**
 * Represents HP uncertainty data for a token
 */
export interface HPUncertainty {
  /** The actual HP value (internal use only) */
  actual: number;
  
  /** The percentage to display (0-1) after uncertainty is applied */
  percent: number;
}

/**
 * Cache key for token-user combinations
 */
interface CacheKey {
  /** Token identifier */
  tokenId: string;
  
  /** User identifier */
  userId: string;
}

/**
 * Manages caching of HP uncertainty values to ensure consistent display
 */
export class HealthArcCache {
  private static _instance: HealthArcCache | null = null;
  private readonly _uncertaintyMap: Map<string, HPUncertainty> = new Map();
  private readonly _modulePrefix = `${MODULE_ID}:`;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialisation logic if needed
  }
  
  /**
   * Gets the singleton instance
   * @returns The singleton HealthArcCache instance
   */
  public static getInstance(): HealthArcCache {
    if (!HealthArcCache._instance) {
      HealthArcCache._instance = new HealthArcCache();
    }
    return HealthArcCache._instance;
  }
  
  /**
   * Gets the HP uncertainty for a token and user
   * @param tokenId - The token identifier
   * @param userId - The user identifier
   * @param currentHP - Current HP value
   * @param hpArcPercent - Current HP percentage (0-1)
   * @param passivePerception - User's passive perception score
   * @returns HPUncertainty object with actual value and displayed percentage
   */
  public getHPUncertainty(
    tokenId: string, 
    userId: string, 
    currentHP: number, 
    hpArcPercent: number,
    passivePerception: number
  ): HPUncertainty {
    try {      // Parameter validation
      if (!tokenId || !userId) {
        Logger.warn('Invalid token or user ID provided to getHPUncertainty');
        return { actual: currentHP, percent: hpArcPercent };
      }
      
      // Create a unique key for this token+user combination
      const key = this._createCacheKey({ tokenId, userId });
      
      // Use cached value if HP hasn't changed
      const previous = this._uncertaintyMap.get(key);
      if (previous && previous.actual === currentHP) {
        return previous;
      }
      
      // Calculate new uncertainty based on perception
      const uncertaintyModifier = this._calculateUncertaintyModifier(passivePerception);
      
      // Use deterministic randomness based on token and HP
      const uncertaintyArcPercentage = this._calculateUncertaintyPercentage(
        tokenId, 
        currentHP, 
        hpArcPercent, 
        uncertaintyModifier
      );
      
      // Create and cache the result
      const result: HPUncertainty = { 
        actual: currentHP, 
        percent: uncertaintyArcPercentage 
      };
      
      this._uncertaintyMap.set(key, result);      return result;
    } catch (error) {
      Logger.error('Error in getHPUncertainty:', error);
      // Fallback to original value
      return { actual: currentHP, percent: hpArcPercent };
    }
  }
  
  /**
   * Creates a cache key from token and user IDs
   * @param params - Object with tokenId and userId
   * @returns String key for caching
   * @private
   */
  private _createCacheKey(params: CacheKey): string {
    return `${params.tokenId}-${params.userId}`;
  }

  /**
   * Calculates the uncertainty modifier based on perception
   * @param passivePerception - User's passive perception score
   * @returns Uncertainty modifier value (0-0.3 typically)
   * @private
   */
  private _calculateUncertaintyModifier(passivePerception: number): number {
    try {
      // Get current settings
      const minPerception = getMinPerception();
      const maxPerception = getMaxPerception();
      const basePerception = getBasePerception();
      const maxUncertainty = getMaxUncertainty();
      const perceptionScaling = getPerceptionScaling();
      
      // Clamp perception to valid range
      const clampedPerception = Math.max(minPerception, 
                              Math.min(maxPerception, passivePerception));
      
      // Higher perception reduces uncertainty
      return Math.max(0, 
        maxUncertainty - ((clampedPerception - basePerception) * perceptionScaling)
      );
    } catch (error) {
      Logger.error('Error calculating uncertainty modifier:', error);
      // Fallback to a reasonable default
      return 0.2;
    }
  }
  
  /**
   * Calculates the final uncertainty percentage to display
   * @param tokenId - Token identifier for deterministic randomness
   * @param currentHP - Current HP value
   * @param basePercentage - Base percentage before uncertainty
   * @param uncertaintyModifier - How much uncertainty to apply
   * @returns Final percentage to display (0-1)
   * @private
   */
  private _calculateUncertaintyPercentage(
    tokenId: string,
    currentHP: number,
    basePercentage: number,
    uncertaintyModifier: number
  ): number {
    // Generate deterministic random offset
    const randomSeed = this._getRandomSeed(tokenId, currentHP.toString());
    const randomOffset = (randomSeed * 2 - 1) * uncertaintyModifier;
    
    // Apply randomness to the HP percentage
    let uncertaintyPercentage = basePercentage + randomOffset;
    
    // Ensure visibility rules
    if (currentHP > 0) {
      // Always show at least a sliver if the creature is alive
      uncertaintyPercentage = Math.max(uncertaintyPercentage, 0.01);
    }
    
    // Clamp final value
    return Math.max(0, Math.min(1, uncertaintyPercentage));
  }
  
  /**
   * Generates a deterministic pseudo-random number based on a string seed
   * @param tokenId - The token identifier
   * @param hpValue - The HP value as a string
   * @returns A number between 0 and 1
   * @private
   */
  private _getRandomSeed(tokenId: string, hpValue: string): number {
    const seed = tokenId + hpValue;
    let hash = 0;
    
    // Simple string hash algorithm
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return (Math.abs(hash) % 1000) / 1000; // Between 0 and 1
  }
  
  /**
   * Clears uncertainty data for a specific token
   * @param tokenId - The token identifier
   */
  public clearTokenUncertainty(tokenId: string): void {
    try {
      if (!tokenId) {
        return;
      }

      let deletedCount = 0;
      for (const key of this._uncertaintyMap.keys()) {
        if (key.startsWith(`${tokenId}-`)) {
          this._uncertaintyMap.delete(key);
          deletedCount++;
        }
      }      
      if (deletedCount > 0) {
        Logger.debug(`Cleared uncertainty data for token ${tokenId} (${deletedCount} entries)`);
      }
    } catch (error) {
      Logger.error('Error clearing token uncertainty:', error);
    }
  }
  
  /**
   * Clears all uncertainty data
   */
  public clearAll(): void {    try {
      const count = this._uncertaintyMap.size;
      this._uncertaintyMap.clear();
      Logger.debug(`Cleared all uncertainty data (${count} entries)`);
    } catch (error) {
      Logger.error('Error clearing all uncertainty data:', error);
    }
  }
}
