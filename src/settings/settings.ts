/**
 * Health Arc Module Settings
 * Manages the settings for the Health Arc module
 * Uses Australian English spelling conventions
 */

import { 
  MODULE_ID, 
  MAX_PERCEPTION_VALUE as DEFAULT_MAX_PERCEPTION, 
  MIN_PERCEPTION_VALUE as DEFAULT_MIN_PERCEPTION,
  BASE_PERCEPTION_VALUE as DEFAULT_BASE_PERCEPTION,
  MAX_UNCERTAINTY_MODIFIER as DEFAULT_UNCERTAINTY_MODIFIER,
  PERCEPTION_SCALING_FACTOR as DEFAULT_PERCEPTION_SCALING,
  ACTIVE_ALPHA as DEFAULT_ACTIVE_ALPHA,
  INACTIVE_ALPHA as DEFAULT_INACTIVE_ALPHA
} from '../utils/constants';
import { localize } from '../utils/i18n';
import { LogLevel, Logger } from '../utils/logger';
import { HealthArcCache } from '../core/arc-cache';
import { FoundryToken } from '../types/foundry';

// Import the renderer functions from core module instead of defining them here
// This helps avoid circular dependencies
import { getRendererFunctions } from '../core/renderer-functions';

/**
 * Settings keys for the module
 */
export const SETTINGS = {
  DEBUG_MODE: 'debugMode',
  DEBUG_LOG_LEVEL: 'debugLogLevel',  // Log level when debug mode is ON
  NORMAL_LOG_LEVEL: 'normalLogLevel', // Log level when debug mode is OFF
  DEBUG_FEATURES: 'debugFeatures', // Debug visualisation features
  SHOW_PERF_OVERLAY: 'showPerfOverlay', // Show performance overlay
  HP_HIGH_COLOUR: 'hpHighColour',
  HP_LOW_COLOUR: 'hpLowColour',
  TEMP_HP_COLOUR: 'tempHpColour',
  BACKGROUND_COLOUR: 'backgroundColour',
  ACTIVE_ALPHA: 'activeAlpha',
  INACTIVE_ALPHA: 'inactiveAlpha',
  MAX_PERCEPTION: 'maxPerception',
  MIN_PERCEPTION: 'minPerception',
  BASE_PERCEPTION: 'basePerception',
  MAX_UNCERTAINTY: 'maxUncertainty',
  PERCEPTION_SCALING: 'perceptionScaling'
  // Removed deprecated LOG_LEVEL setting
};

/**
 * Initialises the module settings
 */
export function registerSettings(): void {
  // -------------------------
  // Colour Settings
  // -------------------------
  
  // HP High Colour (Full health)
  game.settings.register(MODULE_ID, SETTINGS.HP_HIGH_COLOUR, {
    name: localize("settings.hpHighColour.name", "HP Full Colour"),
    hint: localize("settings.hpHighColour.hint", "The colour shown when a token is at full health"),
    scope: 'world',
    config: true,
    type: String,
    default: '#465C1A',
    onChange: () => refreshAllHealthArcs()
  });
  
  // HP Low Colour (Low health)
  game.settings.register(MODULE_ID, SETTINGS.HP_LOW_COLOUR, {
    name: localize("settings.hpLowColour.name", "HP Low Colour"),
    hint: localize("settings.hpLowColour.hint", "The colour shown when a token is at low health"),
    scope: 'world',
    config: true,
    type: String,
    default: '#6A1A1A',
    onChange: () => refreshAllHealthArcs()
  });
  
  // Temporary HP Colour
  game.settings.register(MODULE_ID, SETTINGS.TEMP_HP_COLOUR, {
    name: localize("settings.tempHpColour.name", "Temporary HP Colour"),
    hint: localize("settings.tempHpColour.hint", "The colour shown for temporary hit points"),
    scope: 'world',
    config: true,
    type: String,
    default: '#2A4A6A',
    onChange: () => refreshAllHealthArcs()
  });
  
  // Background Arc Colour
  game.settings.register(MODULE_ID, SETTINGS.BACKGROUND_COLOUR, {
    name: localize("settings.backgroundColour.name", "Background Arc Colour"),
    hint: localize("settings.backgroundColour.hint", "The colour of the background arc"),
    scope: 'world',
    config: true,
    type: String,
    default: '#222222',
    onChange: () => refreshAllHealthArcs()
  });
  
  // -------------------------
  // Perception Settings
  // -------------------------
  
  // Maximum Perception Value
  game.settings.register(MODULE_ID, SETTINGS.MAX_PERCEPTION, {
    name: localize("settings.maxPerception.name", "Maximum Perception Value"),
    hint: localize("settings.maxPerception.hint", "The highest perception score that will be considered for uncertainty calculations (Default: 30)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 15,
      max: 50,
      step: 1
    },
    default: DEFAULT_MAX_PERCEPTION,
    onChange: () => refreshAllHealthArcs()
  });
  
  // Minimum Perception Value
  game.settings.register(MODULE_ID, SETTINGS.MIN_PERCEPTION, {
    name: localize("settings.minPerception.name", "Minimum Perception Value"),
    hint: localize("settings.minPerception.hint", "The lowest perception score that will be considered for uncertainty calculations (Default: 1)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 1,
      max: 10,
      step: 1
    },
    default: DEFAULT_MIN_PERCEPTION,
    onChange: () => refreshAllHealthArcs()
  });
  
  // Base Perception Value
  game.settings.register(MODULE_ID, SETTINGS.BASE_PERCEPTION, {
    name: localize("settings.basePerception.name", "Base Perception Value"),
    hint: localize("settings.basePerception.hint", "The baseline perception score from which uncertainty is calculated (Default: 10)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 5,
      max: 15,
      step: 1
    },
    default: DEFAULT_BASE_PERCEPTION,
    onChange: () => refreshAllHealthArcs()
  });
  
  // -------------------------
  // Uncertainty Modifiers
  // -------------------------
  
  // Maximum Uncertainty
  game.settings.register(MODULE_ID, SETTINGS.MAX_UNCERTAINTY, {
    name: localize("settings.maxUncertainty.name", "Maximum Uncertainty"),
    hint: localize("settings.maxUncertainty.hint", "The maximum amount that HP display can vary (Default: 30%)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 10,
      max: 50,
      step: 5
    },
    default: DEFAULT_UNCERTAINTY_MODIFIER * 100,
    onChange: () => refreshAllHealthArcs()
  });
  
  // Perception Scaling Factor
  game.settings.register(MODULE_ID, SETTINGS.PERCEPTION_SCALING, {
    name: localize("settings.perceptionScaling.name", "Perception Scaling Factor"),
    hint: localize("settings.perceptionScaling.hint", "How much each point of perception reduces uncertainty (Default: 2%, higher values = perception matters more)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 1,
      max: 5,
      step: 0.5
    },
    default: DEFAULT_PERCEPTION_SCALING * 100,
    onChange: () => refreshAllHealthArcs()
  });

  // -------------------------
  // Alpha Settings
  // -------------------------
  
  // Active Alpha - Opacity of the health arc when the token is selected/active
  game.settings.register(MODULE_ID, SETTINGS.ACTIVE_ALPHA, {
    name: localize("settings.activeAlpha.name", "Active Alpha"),
    hint: localize("settings.activeAlpha.hint", "The opacity of the health arc when a token is active or selected (Default: 1.0)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 0.1,
      max: 1.0,
      step: 0.1
    },
    default: DEFAULT_ACTIVE_ALPHA,
    onChange: () => refreshAllHealthArcs()
  });

  // Inactive Alpha - Opacity of the health arc when the token is not selected
  game.settings.register(MODULE_ID, SETTINGS.INACTIVE_ALPHA, {
    name: localize("settings.inactiveAlpha.name", "Inactive Alpha"),
    hint: localize("settings.inactiveAlpha.hint", "The opacity of the health arc when a token is inactive/not selected (Default: 0.25)"),
    scope: 'world',
    config: true,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.05
    },
    default: DEFAULT_INACTIVE_ALPHA,
    onChange: () => refreshAllHealthArcs()
  });
  
  // -------------------------
  // Debug Settings
  // -------------------------
  // Debug Mode - When enabled, shows additional console logging
  game.settings.register(MODULE_ID, SETTINGS.DEBUG_MODE, {
    name: localize("settings.debugMode.name", "Debug Mode"),
    hint: localize("settings.debugMode.hint", "Controls which log messages appear in the console. When ON, TRACE and DEBUG messages are shown. When OFF, only INFO, WARN and ERROR messages are shown."),
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value: boolean) => {
      // Update the logger's debug mode
      Logger.updateDebugMode();
      
      // Register debug settings when debug mode is enabled, or refresh if disabled
      if (value) {
        registerDebugSettings();
      }
      
      // Refresh all health arcs to toggle debug visuals
      refreshAllHealthArcs();
    }
  });
  // Register log level settings
  registerLogLevelSettings();
  
  // Register debug settings if debug mode is enabled
  if (isDebugMode()) {
    registerDebugSettings();
  }
}

/**
 * Registers the Debug and Normal Log Level settings
 */
export function registerLogLevelSettings(): void {
  // Debug Log Level - Used when debug mode is ON
  game.settings.register(MODULE_ID, SETTINGS.DEBUG_LOG_LEVEL, {
    name: localize("settings.debugLogLevel.name", "Debug Log Level"),
    hint: localize("settings.debugLogLevel.hint", "Controls how detailed the logs are when debug mode is ON. Only used when debug mode is enabled."),
    scope: 'client',
    config: true,
    type: Number,
    choices: Logger.getAvailableLogLevels(true),
    default: LogLevel.DEBUG,
    onChange: (value: number) => {
      if (isDebugMode()) {
        Logger.setLogLevel(value as LogLevel);
      }
    }
  });
    // Normal Log Level - Used when debug mode is OFF
  game.settings.register(MODULE_ID, SETTINGS.NORMAL_LOG_LEVEL, {
    name: localize("settings.normalLogLevel.name", "Normal Log Level"),
    hint: localize("settings.normalLogLevel.hint", "Controls how detailed the logs are when debug mode is OFF. Only used when debug mode is disabled."),
    scope: 'client',
    config: true,
    type: Number,
    choices: Logger.getAvailableLogLevels(false),
    default: LogLevel.ERROR,
    onChange: (value: number) => {
      if (!isDebugMode()) {
        Logger.setLogLevel(value as LogLevel);
      }
    }
  });
}

/**
 * Registers additional debug settings when debug mode is enabled
 */
export function registerDebugSettings(): void {
  // Performance overlay setting
  game.settings.register(MODULE_ID, SETTINGS.SHOW_PERF_OVERLAY, {
    name: localize("settings.showPerfOverlay.name", "Show Performance Overlay"),
    hint: localize("settings.showPerfOverlay.hint", "Shows a draggable overlay with performance statistics."),
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value: boolean) => {
      // Trigger the performance overlay based on the setting
      if (value) {
        // Import dynamically to avoid circular dependencies
        import('../utils/performance').then(({ PerformanceMonitor }) => {
          PerformanceMonitor.createDebugOverlay();
        });
      } else {
        import('../utils/performance').then(({ PerformanceMonitor }) => {
          PerformanceMonitor.removeDebugOverlay();
        });
      }
    }
  });
  
  // Debug features configuration
  game.settings.register(MODULE_ID, SETTINGS.DEBUG_FEATURES, {
    name: localize("settings.debugFeatures.name", "Debug Visualisation Features"),
    hint: localize("settings.debugFeatures.hint", "Configure which debug visualisations are shown when debug mode is enabled."),
    scope: 'client',
    config: true,
    type: Object,
    default: {
      showBoundingBox: true,
      showCentreDot: true,
      showArcRadius: true,
      showTokenInfo: true,
      showUncertaintyInfo: true,
      showPerformanceInfo: true
    },
    onChange: () => refreshAllHealthArcs()
  });
  
  Logger.debug("Debug settings registered successfully");
}

/**
 * Refreshes the settings UI by closing and reopening it if open
 * This ensures the log level choices are updated when debug mode changes
 */
function refreshSettingsUI(): void {
  try {
    // Check if settings app is open and if so close and reopen it
    const settingsApp = Object.values((window as any).ui.windows || {})
      .find((app: any) => app.constructor?.name === 'SettingsConfig') as any;
    
    if (settingsApp && typeof settingsApp.close === 'function') {
      const position = settingsApp.position ? { ...settingsApp.position } : {};
      settingsApp.close();
      
      // Reopen after a brief delay to ensure it's fully closed
      setTimeout(() => {
        if ((window as any).game?.settings?.sheet?.render) {
          (window as any).game.settings.sheet.render(true, position);
        }
      }, 100);
      
      Logger.debug('Settings UI refreshed to reflect debug mode change');
    }
  } catch (e) {
    Logger.error('Error refreshing settings UI:', e);
  }
}

/**
 * Checks whether debug mode is enabled
 * @returns True if debug logging is enabled
 */
export function isDebugMode(): boolean {
  return game.settings.get(MODULE_ID, SETTINGS.DEBUG_MODE) as boolean;
}

/**
 * Gets the colour for full HP (RGB format)
 * @returns RGB colour value for high HP
 */
export function getHPHighColour(): number {
  return hexToRGB(game.settings.get(MODULE_ID, SETTINGS.HP_HIGH_COLOUR) as string);
}

/**
 * Gets the colour for low HP (RGB format)
 * @returns RGB colour value for low HP
 */
export function getHPLowColour(): number {
  return hexToRGB(game.settings.get(MODULE_ID, SETTINGS.HP_LOW_COLOUR) as string);
}

/**
 * Gets the colour for temporary HP (RGB format)
 * @returns RGB colour value for temp HP
 */
export function getTempHPColour(): number {
  return hexToRGB(game.settings.get(MODULE_ID, SETTINGS.TEMP_HP_COLOUR) as string);
}

/**
 * Gets the colour for background arc (RGB format)
 * @returns RGB colour value for the background arc
 */
export function getBackgroundColour(): number {
  return hexToRGB(game.settings.get(MODULE_ID, SETTINGS.BACKGROUND_COLOUR) as string);
}

/**
 * Gets the maximum perception value
 * @returns Maximum perception value
 */
export function getMaxPerception(): number {
  return game.settings.get(MODULE_ID, SETTINGS.MAX_PERCEPTION) as number;
}

/**
 * Gets the minimum perception value
 * @returns Minimum perception value
 */
export function getMinPerception(): number {
  return game.settings.get(MODULE_ID, SETTINGS.MIN_PERCEPTION) as number;
}

/**
 * Gets the base perception value
 * @returns Base perception value
 */
export function getBasePerception(): number {
  return game.settings.get(MODULE_ID, SETTINGS.BASE_PERCEPTION) as number;
}

/**
 * Gets the maximum uncertainty modifier
 * @returns Maximum uncertainty modifier as a decimal (percentage/100)
 */
export function getMaxUncertainty(): number {
  return (game.settings.get(MODULE_ID, SETTINGS.MAX_UNCERTAINTY) as number) / 100;
}

/**
 * Gets the perception scaling factor
 * @returns Perception scaling factor as a decimal (percentage/100)
 */
export function getPerceptionScaling(): number {
  return (game.settings.get(MODULE_ID, SETTINGS.PERCEPTION_SCALING) as number) / 100;
}

/**
 * Gets the active alpha value
 * @returns Active alpha opacity (0.0-1.0)
 */
export function getActiveAlpha(): number {
  return game.settings.get(MODULE_ID, SETTINGS.ACTIVE_ALPHA) as number;
}

/**
 * Gets the inactive alpha value
 * @returns Inactive alpha opacity (0.0-1.0)
 */
export function getInactiveAlpha(): number {
  return game.settings.get(MODULE_ID, SETTINGS.INACTIVE_ALPHA) as number;
}

/**
 * Refreshes all health arcs on the canvas
 * Used when settings change
 */
function refreshAllHealthArcs(): void {
  try {
    const canvas = (window as any).canvas;
    if (!canvas?.tokens?.placeables) return;
    
    // Clear the HP uncertainty cache to force recalculation
    HealthArcCache.getInstance().clearAll();
    
    // Get renderer functions from our centralized module and refresh all tokens
    getRendererFunctions()
      .then(functions => {
        for (const token of canvas.tokens.placeables) {
          functions.removeHealthArc(token);
          functions.drawHealthArc(token);
        }
      })
      .catch(error => {
        Logger.error('Failed to refresh health arcs:', error);
      });
  } catch (error) {
    console.error(`${MODULE_ID}: Error refreshing health arcs:`, error);
  }
}

/**
 * Converts a hex colour string to RGB format
 * @param hex Hex colour code (e.g., "#465C1A")
 * @returns RGB colour value as number
 */
function hexToRGB(hex: string): number {
  // Remove # if present
  if (hex.startsWith('#')) {
    hex = hex.substring(1);
  }
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  
  // Combine into a single number (PIXI format)
  return (r << 16) | (g << 8) | b;
}
