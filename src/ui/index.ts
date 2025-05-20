/**
 * Health Arc Module - UI Components
 * 
 * Re-exports all UI-related functionality from one central module.
 * This approach helps reduce circular dependencies and provides a clean API.
 * 
 * @module ui
 */

/**
 * Main rendering functions for health arcs
 * 
 * @function drawHealthArc - Draws a health arc for a token
 * @function removeHealthArc - Removes a health arc from a token * @function initialiseRenderer - Initialises the renderer components
 */
export { drawHealthArc, removeHealthArc, initialiseRenderer } from './arc-renderer';

/**
 * HP calculation functions
 * 
 * @function getTokenHP - Gets HP data from a token
 * @function calculateHPColour - Calculates HP colour based on percentage
 * @function getTempHPColourWithFallback - Gets temporary HP colour with fallback
 * @function getBackgroundColourWithFallback - Gets background colour with fallback
 */
export { 
  getTokenHP, 
  calculateHPColour,
  getTempHPColourWithFallback,
  getBackgroundColourWithFallback
} from './hp-calculation';

/**
 * Token helper functions
 * 
 * @function getTokenName - Gets a friendly display name for a token
 * @function getTokenPassivePerception - Calculates a token's passive perception
 * @function trackTokenRenderPerformance - Tracks token rendering performance in debug mode
 */
export {
  getTokenName,
  getTokenPassivePerception,
  trackTokenRenderPerformance
} from './token-helpers';

/**
 * Arc drawing functions
 * 
 * @function calculateArcGeometry - Calculates arc geometry for a token
 * @function drawMainArc - Draws the main health arc
 * @function drawBackgroundArc - Draws the background arc
 * @function drawTempHPArc - Draws the temporary HP arc
 */
export {
  calculateArcGeometry,
  drawMainArc,
  drawBackgroundArc,
  drawTempHPArc
} from './arc-drawing';

/**
 * Container management functions
 * 
 * @function setupArcContainer - Creates and sets up a PIXI container for a health arc
 * @function updateContainerParent - Updates the parent of a container based on token state
 * @function cleanupContainer - Cleans up and destroys a container's resources
 */
export {
  setupArcContainer,
  updateContainerParent,
  cleanupContainer
} from './container-manager';

/**
 * Container helper functions
 * 
 * @function findTokenFromContainer - Finds the token associated with a container
 */
export { findTokenFromContainer } from '../utils/container-helpers';

/** * Debug visualisation functions
 * 
 * @function drawHealthArcDebug - Draws debug visualisations for health arcs
 * @function cleanupDebugVisuals - Cleans up debug visualisations
 */
export {
  drawHealthArcDebug,
  cleanupDebugVisuals
} from './debug-visualisation';
