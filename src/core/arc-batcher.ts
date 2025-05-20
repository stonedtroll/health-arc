/**
 * HealthArcBatcher - Batches arc drawing operations for better performance
 */

import { FoundryToken } from '../types';
import { 
  MOVEMENT_THROTTLE_MS, 
  BATCH_BASE_SIZE,
  MAX_TIME_PER_FRAME_MS 
} from '../utils/constants';
import { Logger } from '../utils/logger';

type ArcUpdateFunction = (token: FoundryToken) => void;

// Token priority types for rendering
export enum TokenPriority {
  CRITICAL = 0,  // Currently selected tokens or tokens in combat
  HIGH = 1,      // Hovered or recently moved tokens
  NORMAL = 2,    // Visible tokens in scene
  LOW = 3        // Background tokens
}

interface QueuedToken {
  token: FoundryToken;
  priority: TokenPriority;
  timestamp: number;
}

export class HealthArcBatcher {
  private static _instance: HealthArcBatcher;
  private updateQueue: Map<string, QueuedToken> = new Map();
  private updateFunction: ArcUpdateFunction | null = null;
  private isProcessing: boolean = false;
  private processingTimer: number = 0;
  private lastProcessTime: number = 0;
  
  public static get instance(): HealthArcBatcher {
    if (!HealthArcBatcher._instance) {
      HealthArcBatcher._instance = new HealthArcBatcher();
    }
    return HealthArcBatcher._instance;
  }   
  
  /**
   * Initialise the batcher with an update function
   */
  public initialise(updateFunction: ArcUpdateFunction): void {
    this.updateFunction = updateFunction;
  }
  
  /**
   * Queue a token for arc update with priority calculation
   */
  public queueUpdate(token: FoundryToken): void {
    if (!token?.id) return;
    
    // Calculate token priority
    const priority = this._calculateTokenPriority(token);
    
    // Add to queue with priority and timestamp
    this.updateQueue.set(token.id, {
      token,
      priority,
      timestamp: Date.now()
    });
    
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.processBatch();
    }
  }

  /**
   * Calculate the priority of a token for rendering
   * Lower numbers = higher priority
   */
  private _calculateTokenPriority(token: FoundryToken): TokenPriority {
    if (!token) return TokenPriority.LOW;
    
    // Selected tokens get highest priority
    if (token.controlled) return TokenPriority.CRITICAL;
    
    // Tokens in combat get critical priority
    if (token.combatant || token.actor?.combatant) return TokenPriority.CRITICAL;
    
    // Hovered tokens get high priority
    if (token.hover) return TokenPriority.HIGH;
    
    // Default to normal priority
    return TokenPriority.NORMAL;
  }
    
  /**
   * Process the batch of queued updates with priority-based ordering
   * Uses a faster algorithm with priority processing
   */
  private processBatch(): void {
    if (this.processingTimer) {
      window.clearTimeout(this.processingTimer);
    }
    
    this.processingTimer = window.setTimeout(() => {
      try {
        this.lastProcessTime = Date.now();
        
        if (this.updateFunction && this.updateQueue.size > 0) {
          // Convert to array and sort by priority
          const tokensToProcess = Array.from(this.updateQueue.values())
            .sort((a, b) => {
              // First by priority (critical, high, normal, low)
              if (a.priority !== b.priority) {
                return a.priority - b.priority;
              }
              
              // Then by timestamp (newest first for same priority)
              return b.timestamp - a.timestamp;
            })
            .map(queuedToken => queuedToken.token);
          
          // Process in batches with adaptive batch sizing
          // Use smaller batches for more tokens to maintain responsiveness
          const totalTokens = tokensToProcess.length;
          const batchSize = Math.max(1, Math.min(
            BATCH_BASE_SIZE, 
            Math.floor(BATCH_BASE_SIZE * (30 / Math.max(10, totalTokens)))
          ));
          
          Logger.debug(`Processing ${totalTokens} tokens in batches of ${batchSize}`);
          
          let frameStartTime = performance.now();
          let processedCount = 0;
          
          const processNextBatch = (startIndex: number) => {
            const endIndex = Math.min(startIndex + batchSize, tokensToProcess.length);
            const batchStartTime = performance.now();
            
            for (let i = startIndex; i < endIndex; i++) {
              if (this.updateFunction) {
                this.updateFunction(tokensToProcess[i]);
                processedCount++;
              }
              
              // Check time every few tokens to avoid performance hit from checking too often
              if ((i - startIndex) % 5 === 0 && performance.now() - frameStartTime > MAX_TIME_PER_FRAME_MS) {
                // If we've spent too long on this frame, defer to next frame
                requestAnimationFrame(() => processNextBatch(i + 1));
                return;
              }
            }
            
            // If we've processed everything, we're done
            if (endIndex >= tokensToProcess.length) {
              const totalTime = performance.now() - frameStartTime;
              if (processedCount > 5) {
                Logger.debug(`Processed ${processedCount} tokens in ${totalTime.toFixed(2)}ms`);
              }
              this.updateQueue.clear();
              this.isProcessing = false;
              return;
            }
            
            // If more tokens to process, schedule next batch for next frame
            requestAnimationFrame(() => processNextBatch(endIndex));
          };
          
          // Start processing the first batch
          processNextBatch(0);
          return; // Early return to avoid clearing the queue if processing asynchronously
        }
      } catch (error) {
        Logger.error('Error processing health arc batch:', error);
      }
      
      // Cleanup if we're not doing async processing
      this.updateQueue.clear();
      this.isProcessing = false;
    }, MOVEMENT_THROTTLE_MS);
  }
  
  /**
   * Clear the queue and cancel any pending updates
   */
  public clear(): void {
    if (this.processingTimer) {
      window.clearTimeout(this.processingTimer);
    }
    this.updateQueue.clear();
    this.isProcessing = false;
  }
}
