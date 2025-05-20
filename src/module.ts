/**
 * Healimport { drawHealthArc, removeHealthArc, initialiseRenderer } from './ui';h Arc Module - Main entry point
 * Optimised for Foundry VTT v13
 *  * This file initialises the module and serves as the entry point.
 * It registers settings, initialises the logger, and registers hooks.
 */

import { registerSettings, registerLogLevelSettings, registerDebugSettings, isDebugMode } from './settings/settings';
import { Logger } from './utils/logger';
import { MODULE_ID } from './utils/constants';
import { registerHooks, forEachToken } from './hooks';
import { HealthArcCache } from './core/arc-cache';
import { drawHealthArc, removeHealthArc, initialiseRenderer } from './ui';
import { setRendererFunctions, resetRendererFunctions } from './core/renderer-functions';
import { PerformanceMonitor } from './utils/performance';

// Cache commonly used values
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 200;
const INITIAL_DRAW_DELAY_MS = 300;

/**
 * Initialise the Health Arc module
 * First initialisation hook, runs before the game is fully ready
 */
Hooks.once('init', () => {
  Logger.info('Initialising Health Arc module');
  
  try {
    // Register settings
    registerSettings();
    Logger.updateDebugMode();
      // Initialise by loading the appropriate log level based on debug mode
    try {
      Logger.loadAppropriateLogLevel();
    } catch (error) {
      Logger.error('Error initialising log level:', error);
    }
    
    // Register debug settings if debug mode is enabled
    if (isDebugMode()) {
      registerDebugSettings();
        // Initialise performance monitoring if in debug mode
      PerformanceMonitor.enable();
      
      // Create overlay if setting is enabled
      if (game.settings.get(MODULE_ID, 'showPerfOverlay')) {
        PerformanceMonitor.createDebugOverlay();
      }
    }
    
    // Register all the hooks early
    registerHooks();
      Logger.debug('Module initialisation phase completed successfully');
  } catch (error) {
    Logger.error('Critical error during module initialisation:', error);
  }
});

/**
 * Ready hook - runs when Foundry is fully initialised
 * Initialises renderer components at this stage when PIXI is guaranteed to be available
 */
Hooks.once('ready', () => {
  Logger.info('Health Arc module ready phase starting');
  
  try {    // Initialise renderer components with retry logic
    const rendererInitialised = initialiseRendererWithRetry();
    
    // Setup debug helpers
    setupDebugHelpers();
    
    // Store API functions
    storeAPIFunctions();
    
    Logger.info('Health Arc module ready phase completed successfully');
  } catch (error) {
    Logger.error('Error during module ready phase:', error);
  }
});

/**
 * Update logger when settings change
 */
Hooks.on('updateSetting', (setting: any) => {
  const settingKey = setting.key?.split('.')[1];
  
  if (settingKey === 'debugMode') {
    Logger.updateDebugMode();
    
    // Handle debug mode changes
    const debugModeEnabled = setting.value === true;
    
    if (debugModeEnabled) {
      // Register debug settings
      registerDebugSettings();
        // Initialise performance monitoring
      PerformanceMonitor.enable();
    } else {
      // Disable performance monitoring
      PerformanceMonitor.disable();
      PerformanceMonitor.removeDebugOverlay();
    }
    
    // This is handled by the onChange in the settings registration
    // but we add it here as a fallback
    try {
      registerLogLevelSettings();
    } catch (error) {
      Logger.error('Error reregistering log level settings:', error);
    }
  } else if (settingKey === 'debugLogLevel' || settingKey === 'normalLogLevel') {
    const isDebugSetting = settingKey === 'debugLogLevel';
    const isDebugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode');
    
    // Only apply the setting if it matches the current debug mode
    if (isDebugSetting === isDebugMode) {
      Logger.setLogLevel(setting.value);
    }
  } else if (settingKey === 'showPerfOverlay') {
    if (setting.value) {
      PerformanceMonitor.createDebugOverlay();
    } else {
      PerformanceMonitor.removeDebugOverlay();
    }
  }
});

/**
 * Setup debugging helpers for developers
 * These are accessible via the browser console
 */
function setupDebugHelpers(): void {
  (window as any).healthArcDebug = {
    redrawAll: () => forEachToken(drawHealthArc),
    clearAll: () => forEachToken(removeHealthArc),
    cleanCache: () => HealthArcCache.getInstance().clearAll(),
    showVersion: () => console.log(`Health Arc Module v${(window as any).game?.modules?.get(MODULE_ID)?.data?.version || '?'}`),
    
    // Advanced debug functions
    togglePerformanceOverlay: async () => {
      try {
        const currentValue = (window as any).game.settings.get(MODULE_ID, 'showPerfOverlay');
        const newValue = !currentValue;
        
        await (window as any).game.settings.set(MODULE_ID, 'showPerfOverlay', newValue);
        
        if (newValue) {
          PerformanceMonitor.createDebugOverlay();
          return "Performance overlay enabled";
        } else {
          PerformanceMonitor.removeDebugOverlay();
          return "Performance overlay disabled";
        }
      } catch (err) {
        const error = err as Error;
        Logger.error('Error toggling performance overlay:', error);
        return `Error: ${error?.message || 'Unknown error'}`;
      }
    },
    
    // Inspect a specific token by ID
    inspectToken: (tokenId: string) => {
      const canvas = (window as any).canvas;
      const token = canvas?.tokens?.placeables?.find((t: any) => t.id === tokenId);
      if (!token) {
        return `Token with ID ${tokenId} not found`;
      }
      
      // Force redraw with debug info
      removeHealthArc(token);
      drawHealthArc(token);
      
      // Return token details
      return {
        id: token.id,
        name: token.name || "Unknown",
        hp: token.actor?.system?.attributes?.hp,
        position: { x: token.x, y: token.y },
        dimensions: { width: token.width, height: token.height }
      };
    },
    
    // Performance monitoring functions
    performance: () => {
      return {
        getStats: PerformanceMonitor.getAllStats(),
        getCounters: PerformanceMonitor.getAllCounters(),
        clear: () => PerformanceMonitor.clear()
      };
    }
  };
  
  Logger.debug('Debug helpers registered, access via: window.healthArcDebug');
}

/**
 * Store API functions for external access
 * Used for callbacks and hooks to access module functions
 */
function storeAPIFunctions(): void {
  // Create API storage on the module
  const moduleAPI = {
    registerLogLevelSettings,
    drawHealthArc,
    removeHealthArc
  };
  
  // Store the API on the module
  const module = (window as any).game?.modules?.get(MODULE_ID);
  if (module) {
    module.api = moduleAPI;
    Logger.debug('Module API registered');
  }
}

/**
 * Initialises the renderer components with automatic retry
 * Provides robust initialisation with fallback attempts if the first one fails
 * 
 * This function handles the initialisation of the rendering system with a robust retry mechanism.
 * Foundry's initialisation sequence doesn't guarantee that PIXI is fully ready when our module loads,
 * so we implement retry logic to handle cases where initial initialisation fails.
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Base delay between retries in milliseconds, increases with each retry (default: 200)
 * @returns True if renderer was successfully initialised on first attempt, false if retries are needed
 */
function initialiseRendererWithRetry(maxRetries = RETRY_MAX_ATTEMPTS, delayMs = RETRY_BASE_DELAY_MS): boolean {  Logger.debug(`Attempting to initialise renderer (max attempts: ${maxRetries})`);
  
  // Try immediate initialisation first
  const initialSuccess = initialiseRenderer();  if (initialSuccess) {
    Logger.info('Health Arc renderer initialised successfully on first attempt');
    setRendererFunctions({
      drawHealthArc,
      removeHealthArc
    });
    
    // Draw initial arcs with a small delay to ensure canvas is ready
    setTimeout(() => {
      try {
        forEachToken(drawHealthArc);
        Logger.debug('Initial health arcs drawn for all tokens');
      } catch (error) {
        Logger.error('Error drawing initial health arcs:', error);
      }
    }, INITIAL_DRAW_DELAY_MS);
    
    return true;
  }
    // If failed, set up a retry mechanism
  if (maxRetries <= 0) {
    Logger.error('Failed to initialise renderer and no retries requested');
    return false;
  }
  
  // Set up retry attempts with increasing delays
  let retryCount = 0;
  
  const attemptRetry = () => {
    retryCount++;
    const currentDelay = delayMs * retryCount;
      Logger.debug(`Scheduling renderer initialisation retry ${retryCount}/${maxRetries} in ${currentDelay}ms`);
    
    setTimeout(() => {
      Logger.debug(`Attempting renderer initialisation retry ${retryCount}/${maxRetries}`);
      
      const success = initialiseRenderer();      if (success) {
        Logger.info(`Health Arc renderer initialised successfully on retry ${retryCount}`);
        setRendererFunctions({
          drawHealthArc,
          removeHealthArc
        });
        
        // Draw health arcs for all tokens now that renderer is ready
        setTimeout(() => {
          try {
            forEachToken(drawHealthArc);
            Logger.debug('Initial health arcs drawn for all tokens');
          } catch (error) {
            Logger.error('Error drawing initial health arcs:', error);
          }
        }, INITIAL_DRAW_DELAY_MS);
        
        return;
      }
        if (retryCount < maxRetries) {
        attemptRetry();
      } else {
        Logger.error(`Failed to initialise renderer after ${maxRetries} retries`);
      }
    }, currentDelay);
  };
  
  // Start the retry sequence
  attemptRetry();
  
  // Return false for the initial call as initialization is pending
  return false;
}

/**
 * Module cleanup hook - runs when the game is shutting down
 * Cleans up resources to prevent memory leaks
 */
Hooks.once('shutdown', () => {
  Logger.info('Health Arc module shutting down, cleaning up resources');
  
  try {
    // Reset renderer functions to prevent callbacks after unload
    resetRendererFunctions();
    
    // Clean up all token health arcs
    forEachToken((token) => {
      try {
        removeHealthArc(token, true);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    
    // Clear the health arc cache
    HealthArcCache.getInstance().clearAll();
    
    // Disable performance monitoring if active
    PerformanceMonitor.disable();
    PerformanceMonitor.removeDebugOverlay();
    
    Logger.info('Health Arc module cleanup completed');
  } catch (error) {
    Logger.error('Error during module cleanup:', error);
  }
});
