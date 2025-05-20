/**
 * Health Arc module constants
 */

export const MODULE_ID = 'health-arc';

// Display settings
export const HEALTH_ARC_Z_INDEX = 100;
export const DEFAULT_STROKE_WIDTH = 4;
export const DEFAULT_ARC_OFFSET = 40;
export const ARC_SPAN = Math.PI / 4;
export const ACTIVE_ALPHA = 1.0;
export const INACTIVE_ALPHA = 0.25;

// HP uncertainty settings
export const MAX_PERCEPTION_VALUE = 30;
export const MIN_PERCEPTION_VALUE = 1;
export const BASE_PERCEPTION_VALUE = 10;
export const MAX_UNCERTAINTY_MODIFIER = 0.30;
export const PERCEPTION_SCALING_FACTOR = 0.02;

// Performance settings
export const ENHANCED_MOVEMENT_STABILITY_KEY = 'enhancedMovementStability';
export const MOVEMENT_THROTTLE_MS = 33; // ~30fps

// Additional performance optimization constants
export const BATCH_BASE_SIZE = 12;            // Base batch size for token processing
export const MAX_TIME_PER_FRAME_MS = 16;      // ~60fps target
export const HP_UPDATE_THROTTLE_MS = 50;      // Throttle time for HP updates
export const HOVER_THROTTLE_MS = 20;          // Throttle time for hover events
export const COMBAT_UPDATE_BATCH_SIZE = 10;   // Batch size for combat updates
export const COMBAT_UPDATE_BATCH_DELAY_MS = 50; // Delay between combat update batches
export const SETTINGS_CACHE_TTL_MS = 5000;    // Time to live for cached settings
export const TOKEN_GEOMETRY_CACHE_TTL_MS = 10000; // Time to live for token geometry cache
