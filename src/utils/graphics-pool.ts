/**
 * GraphicsPool - A PIXI.Graphics object pool to reduce garbage collection
 * 
 * This utility class manages a pool of PIXI.Graphics objects that can be reused,
 * which helps reduce garbage collection pauses by reusing objects instead of
 * creating and destroying them frequently.
 */

// Import constants and logger
import { MODULE_ID } from './constants';
import { Logger } from './logger';

// Import proper type definition
import { PIXIGraphics } from '../types/foundry';

/**
 * Manages a pool of PIXI.Graphics objects
 */
export class GraphicsPool {
  private static readonly _pool: PIXIGraphics[] = [];
  private static readonly MAX_POOL_SIZE = 100;
  private static readonly MODULE_PREFIX = `${MODULE_ID}:`;

  /**
   * Gets a PIXI.Graphics object from the pool or creates a new one
   * @returns A PIXI.Graphics object, or null if creation fails
   */  public static get(): PIXIGraphics | null {
    try {
      // Fast path - check if pool has items
      if (this._pool.length > 0) {
        // Get the last item (faster than shift/unshift)
        const graphics = this._pool.pop();
        
        // Quick validation and clear
        if (graphics && typeof graphics.clear === 'function') {
          graphics.clear();
          return graphics;
        }
      }
      
      // Create a new graphics object if none in pool or invalid
      return this._createNewGraphics();
    } catch (error) {
      this._logError('Error getting graphics from pool', error);
      return null;
    }
  }

  /**
   * Returns a graphics object to the pool for future reuse
   * @param graphics - The PIXI.Graphics object to return to the pool
   */
  public static release(graphics: PIXIGraphics | null): void {
    if (!graphics || typeof graphics.clear !== 'function' || this._pool.length >= this.MAX_POOL_SIZE) {
      return;
    }
    
    try {
      graphics.clear();
      this._pool.push(graphics);
    } catch (error) {
      this._logError('Error releasing graphics to pool', error);
    }
  }

  /**
   * Clears all objects from the pool
   */
  public static clear(): void {
    this._pool.length = 0;
  }
  
  /**
   * Creates a new PIXI.Graphics object
   * @returns A new PIXI.Graphics object or null if creation fails
   * @private
   */
  private static _createNewGraphics(): PIXIGraphics | null {
    const PIXI = (window as any).PIXI;
    
    if (!PIXI || typeof PIXI.Graphics !== 'function') {
      this._logError('PIXI not available yet or missing Graphics constructor');
      return null;
    }
    
    try {
      const graphics = new PIXI.Graphics();
      
      if (!graphics || typeof graphics.clear !== 'function') {
        this._logError('Created invalid PIXI.Graphics object');
        return null;
      }
      
      return graphics;
    } catch (error) {
      this._logError('Error creating new graphics object', error);
      return null;
    }
  }
    /**
   * Logs an error with module prefix
   * @param message - The error message
   * @param error - Optional error object
   * @private
   */
  private static _logError(message: string, error?: any): void {
    if (error) {
      Logger.error(message, error);
    } else {
      Logger.error(message);
    }
  }
}
