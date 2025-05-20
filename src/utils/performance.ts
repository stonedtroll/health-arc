/**
 * Performance monitoring utility for Health Arc
 * Only active when debug mode is enabled
 * Uses Australian English spelling conventions
 */

import { MODULE_ID } from './constants';
import { Logger } from './logger';

/**
 * Simple performance monitoring utility for Health Arc
 * Only active when debug mode is enabled
 */
export class PerformanceMonitor {
  private static timers: Record<string, number> = {};
  private static measurements: Record<string, number[]> = {};
  private static counters: Record<string, number> = {};
  private static enabled: boolean = false;
  
  /**
   * Start monitoring performance
   */
  static enable(): void {
    this.enabled = true;
    this.timers = {};
    this.measurements = {};
    this.counters = {};
    Logger.debug('Performance monitoring enabled');
  }
  
  /**
   * Stop monitoring performance
   */
  static disable(): void {
    this.enabled = false;
    Logger.debug('Performance monitoring disabled');
  }
  
  /**
   * Start timing an operation
   * @param key - Unique identifier for the operation
   */
  static startTimer(key: string): void {
    if (!this.enabled) return;
    this.timers[key] = performance.now();
  }
  
  /**
   * End timing an operation and record its duration
   * @param key - Unique identifier for the operation
   * @param maxSamples - Maximum samples to keep (default: 100)
   */
  static endTimer(key: string, maxSamples: number = 100): number | null {
    if (!this.enabled || this.timers[key] === undefined) return null;
    
    const duration = performance.now() - this.timers[key];
    delete this.timers[key];
    
    this.recordDuration(key, duration, maxSamples);
    
    return duration;
  }
  
  /**
   * Record a duration measurement directly
   * @param key - Unique identifier for the operation
   * @param duration - Duration in milliseconds
   * @param maxSamples - Maximum samples to keep (default: 100)
   */
  static recordDuration(key: string, duration: number, maxSamples: number = 100): void {
    if (!this.enabled) return;
    
    if (!this.measurements[key]) {
      this.measurements[key] = [];
    }
    
    this.measurements[key].push(duration);
    
    // Keep only the most recent samples
    if (this.measurements[key].length > maxSamples) {
      this.measurements[key] = this.measurements[key].slice(-maxSamples);
    }
  }
  
  /**
   * Increment a named counter
   * @param key - Unique identifier for the counter
   * @param amount - Amount to increment by (default: 1)
   */
  static incrementCounter(key: string, amount: number = 1): void {
    if (!this.enabled) return;
    
    if (!this.counters[key]) {
      this.counters[key] = 0;
    }
    
    this.counters[key] += amount;
  }
  
  /**
   * Get the value of a counter
   * @param key - Unique identifier for the counter
   */
  static getCounter(key: string): number {
    return this.counters[key] || 0;
  }
  
  /**
   * Get all counter values
   */
  static getAllCounters(): Record<string, number> {
    return { ...this.counters };
  }
  
  /**
   * Get statistics for a specific operation
   * @param key - Unique identifier for the operation
   */
  static getStats(key: string): { avg: number, min: number, max: number, samples: number } | null {
    if (!this.measurements[key] || this.measurements[key].length === 0) {
      return null;
    }
    
    const samples = this.measurements[key];
    const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    
    return {
      avg,
      min,
      max,
      samples: samples.length
    };
  }
  
  /**
   * Get all performance statistics
   */
  static getAllStats(): Record<string, { avg: number, min: number, max: number, samples: number }> {
    const result: Record<string, { avg: number, min: number, max: number, samples: number }> = {};
    
    for (const key in this.measurements) {
      const stats = this.getStats(key);
      if (stats) {
        result[key] = stats;
      }
    }
    
    return result;
  }
  
  /**
   * Clear all performance measurements
   */
  static clear(): void {
    this.measurements = {};
    this.timers = {};
    this.counters = {};
    Logger.debug('Performance measurements cleared');
  }
  
  /**
   * Measure execution time of a function
   * @param key - Unique identifier for the operation
   * @param fn - Function to measure
   * @returns Result of the function
   */
  static measure<T>(key: string, fn: () => T): T {
    if (!this.enabled) return fn();
    
    this.startTimer(key);
    const result = fn();
    this.endTimer(key);
    
    return result;
  }
  
  /**
   * Create a debug overlay to display performance statistics
   */
  static createDebugOverlay(): void {
    // Only create overlay if debug mode is enabled
    const debugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode') === true;
    
    if (!debugMode) return;
    
    // Remove existing overlay
    this.removeDebugOverlay();
    
    // Create new overlay
    const overlay = document.createElement('div');
    overlay.id = 'health-arc-perf-overlay';
    overlay.style.position = 'absolute';
    overlay.style.zIndex = '1000';
    overlay.style.top = '10px';
    overlay.style.right = '10px';    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.padding = '10px';
    overlay.style.borderRadius = '5px';
    overlay.style.color = '#fff';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '12px';
    overlay.style.width = '300px';
    
    const title = document.createElement('div');
    title.textContent = 'Health Arc Performance';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '5px';
    overlay.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'health-arc-perf-content';
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
    
    // Make it draggable if Draggable exists
    if ((window as any).Draggable) {
      new (window as any).Draggable(overlay);
    }
    
    // Update stats periodically
    this._updateOverlay();
    this._overlayInterval = window.setInterval(() => this._updateOverlay(), 1000);
  }
  
  /**
   * Remove the debug overlay
   */
  static removeDebugOverlay(): void {
    const overlay = document.getElementById('health-arc-perf-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
    
    if (this._overlayInterval) {
      window.clearInterval(this._overlayInterval);
      this._overlayInterval = null;
    }
  }
  
  /**
   * Update the overlay with current stats
   * @private
   */
  private static _updateOverlay(): void {
    const content = document.getElementById('health-arc-perf-content');
    if (!content) return;
    
    const stats = this.getAllStats();
    const counters = this.getAllCounters();
    let html = '<div style="margin-bottom: 10px;"><strong>Performance Metrics:</strong></div>';
    
    // Add counters section if we have any
    if (Object.keys(counters).length > 0) {
      html += '<div style="margin-bottom: 5px;"><strong>Counters:</strong></div>';
      for (const key in counters) {
        html += `<div>${key}: ${counters[key]}</div>`;
      }
      html += '<hr style="opacity: 0.3; margin: 5px 0;">';
    }
    
    // Add timing stats
    for (const key in stats) {
      const stat = stats[key];
      html += `<div><strong>${key}</strong>: ${stat.avg.toFixed(2)}ms (min: ${stat.min.toFixed(2)}, max: ${stat.max.toFixed(2)})</div>`;
    }
    
    if (html === '') {
      html = '<div>No performance data available</div>';
    }
    
    content.innerHTML = html;
  }
  
  /**
   * Create a debug performance tracker for a specific token
   * @param tokenId - ID of the token to track
   * @returns PerformanceTracker object for the token
   */
  static createTokenPerformanceTracker(tokenId: string): {
    startTimer: (operation: string) => void;
    endTimer: (operation: string) => number | null;
    getStats: () => Record<string, { avg: number, min: number, max: number, samples: number }>;
    incrementCounter: (operation: string, amount?: number) => void;
  } {
    // Only enable if debug mode is on
    const debugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode') === true;
    if (!debugMode) {
      return {
        startTimer: () => {},
        endTimer: () => null,
        getStats: () => ({}),
        incrementCounter: () => {}
      };
    }
    
    // Create namespace for this token
    const tokenNamespace = `token:${tokenId}:`;
    
    return {
      startTimer: (operation: string) => {
        this.startTimer(`${tokenNamespace}${operation}`);
      },
      endTimer: (operation: string) => {
        return this.endTimer(`${tokenNamespace}${operation}`);
      },
      getStats: () => {
        const allStats = this.getAllStats();
        const tokenStats: Record<string, { avg: number, min: number, max: number, samples: number }> = {};
        
        // Filter stats for this token
        for (const key in allStats) {
          if (key.startsWith(tokenNamespace)) {
            const operation = key.slice(tokenNamespace.length);
            tokenStats[operation] = allStats[key];
          }
        }
        
        return tokenStats;
      },
      incrementCounter: (operation: string, amount: number = 1) => {
        this.incrementCounter(`${tokenNamespace}${operation}`, amount);
      }
    };
  }
  
  private static _overlayInterval: number | null = null;
}
