/**
 * TokenGeometryManager - Manages and caches token geometry calculations
 * 
 * This utility handles calculating and caching geometric properties of tokens
 * to avoid redundant calculations and improve performance.
 */

import { 
  ARC_SPAN, 
  DEFAULT_ARC_OFFSET, 
  DEFAULT_STROKE_WIDTH, 
  MODULE_ID,
  TOKEN_GEOMETRY_CACHE_TTL_MS 
} from '../utils/constants';
import { Logger } from '../utils/logger';
import { FoundryToken, ArcGeometry, TokenGeometry } from '../types';

/**
 * Manages token geometry calculations and caching
 */
export class TokenGeometryManager {
  private static _instance: TokenGeometryManager | null = null;
  private readonly _tokenGeometryMap: Map<string, TokenGeometry> = new Map();
  private readonly _CACHE_TTL = TOKEN_GEOMETRY_CACHE_TTL_MS; // TTL for cache entries
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance
   */
  public static get instance(): TokenGeometryManager {
    if (!TokenGeometryManager._instance) {
      TokenGeometryManager._instance = new TokenGeometryManager();
    }
    return TokenGeometryManager._instance;
  }

  /**
   * Gets the geometry for a token, calculating if needed
   * @param token - The token to get geometry for
   * @returns The token's geometry information
   */
  public getTokenGeometry(token: FoundryToken): TokenGeometry {
    try {
      if (!token?.id) {
        throw new Error('Invalid token provided');
      }
      
      return this._calculateTokenGeometry(token);
    } catch (error) {
      this._logError('Error calculating token geometry', error);
      
      // Return fallback geometry if calculation fails
      return this._createFallbackGeometry(token);
    }
  }
  
  /**
   * Calculates the geometry for a token
   * @param token - The token to calculate geometry for
   * @returns The calculated token geometry
   * @private
   */
  private _calculateTokenGeometry(token: FoundryToken): TokenGeometry {
    const now = Date.now();
    
    // Get token dimensions
    const tokenTextureWidth = token.texture?.width ?? token.w;
    const tokenTextureHeight = token.texture?.height ?? token.h;
    const tokenScaleX = token.w / tokenTextureWidth;
    const tokenScaleY = token.h / tokenTextureHeight;
    const adjustedArcStroke = DEFAULT_STROKE_WIDTH / tokenScaleX;
    
    // Calculate arc radius - ensure it's visible around token
    const arcRadius = Math.max(
      (tokenTextureWidth / 2) + (adjustedArcStroke / 2) + DEFAULT_ARC_OFFSET,
      token.w * 0.75 // Ensures arc is at least 75% of token width from centre
    );
    
    // Create arc geometry
    const arcGeometry: ArcGeometry = {
      arcRadius,
      adjustedArcStroke,
      arcStart: 0,
      arcEnd: -ARC_SPAN,
    };
    
    // Create token geometry
    const tokenGeometry: TokenGeometry = {
      id: token.id,
      width: tokenTextureWidth,
      height: tokenTextureHeight,
      scaleX: tokenScaleX,
      scaleY: tokenScaleY,
      arcGeometry,
      lastUpdated: now,
    };
      // Cache the geometry
    this._tokenGeometryMap.set(token.id, tokenGeometry);
    
    // Periodically clean up old cache entries - use a cheaper condition check
    // Only clean up once every 100 calls on average, and only if we have a significant number of entries
    if (this._tokenGeometryMap.size > 50 && Math.random() < 0.01) {
      this._cleanupCache(now);
    }
    
    return tokenGeometry;
  }
  
  /**
   * Creates fallback geometry for a token when calculation fails
   * @param token - The token to create fallback geometry for
   * @returns Basic token geometry
   * @private
   */
  private _createFallbackGeometry(token: FoundryToken): TokenGeometry {
    const now = Date.now();
    const tokenWidth = token?.w || 100;
    const tokenHeight = token?.h || 100;
    
    // Safe fallback values
    const arcGeometry: ArcGeometry = {
      arcRadius: tokenWidth + DEFAULT_ARC_OFFSET,
      adjustedArcStroke: DEFAULT_STROKE_WIDTH,
      arcStart: 0,
      arcEnd: -ARC_SPAN,
    };
    
    return {
      id: token?.id || 'unknown',
      width: tokenWidth,
      height: tokenHeight,
      scaleX: 1,
      scaleY: 1,
      arcGeometry,
      lastUpdated: now,
    };
  }

  /**
   * Cleans up expired cache entries
   * @param now - Current timestamp
   * @private
   */
  private _cleanupCache(now: number): void {
    // Only clean if we have enough entries to make it worthwhile
    if (this._tokenGeometryMap.size < 10) return;
    
    // Use a more efficient approach by collecting keys first then deleting
    const keysToDelete: string[] = [];
    const cutoffTime = now - this._CACHE_TTL;
    
    // First pass: identify expired entries (avoids modification during iteration)
    this._tokenGeometryMap.forEach((geometry, id) => {
      if (geometry.lastUpdated < cutoffTime) {
        keysToDelete.push(id);
      }
    });
    
    // If we found a significant number of expired entries, log it
    if (keysToDelete.length > 0) {
      Logger.debug(`Cleaning up ${keysToDelete.length} expired geometry cache entries`);
      
      // Second pass: delete the expired entries
      for (const id of keysToDelete) {
        this._tokenGeometryMap.delete(id);
      }
    }
  }
  
  /**
   * Clears all cached geometry
   */
  public clearCache(): void {
    this._tokenGeometryMap.clear();
  }
  
  /**
   * Logs an error with module prefix
   * @param message - The error message
   * @param error - Optional error object
   * @private
   */
  private _logError(message: string, error?: any): void {
    if (error) {
      Logger.error(message, error);
    } else {
      Logger.error(message);
    }
  }
}
