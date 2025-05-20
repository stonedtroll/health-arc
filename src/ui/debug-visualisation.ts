/** 
 * Health Arc Module - Debug Visualisation
 * Handles debug visualisations for the health arc module
 */

// PIXI is provided globally by Foundry VTT, so do not import it as a module.
// Using type definitions from foundry.d.ts

import { FoundryToken, PIXIContainer, PIXIGraphics, PIXIText } from '../types/foundry';
import { Logger } from '../utils/logger';
import { MODULE_ID } from '../utils/constants';
import { GraphicsPool } from '../utils/graphics-pool';
import { HealthArcCache } from '../core/arc-cache';
import { getTokenName, getTokenPassivePerception } from './token-helpers';
import { getTokenHP } from './hp-calculation';
import { findTokenFromContainer } from '../utils/container-helpers';

/**
 * Draw bounding box and centre dot for arc when debug mode is enabled
 */
export function drawHealthArcDebug(container: PIXIContainer, arcRadius: number): void {
  try {
    // Skip if container is invalid
    if (!container) {
      Logger.warn('Cannot draw debug visuals: invalid container');
      return;
    }
    
    // Find the associated token
    const token = findTokenFromContainer(container);
    
    // Clean up any existing debug visuals
    cleanupDebugVisuals(container);
    
    // Store debug elements in a separate container for easy cleanup
    const debugContainer = new PIXI.Container();
    debugContainer.name = "healthArcDebug";
    container._debugContainer = debugContainer;
    container.addChild(debugContainer);
    
    // Get debug feature settings - use defaults if settings not available
    const debugFeatures = getDebugFeaturesFromSettings();
    
    // Draw the bounding rectangle if enabled
    if (debugFeatures.showBoundingBox) {
      const debugRect = GraphicsPool.get();
      if (debugRect) {
        debugRect.clear();
        debugRect.lineStyle(2, 0x00ff00, 1);
        debugRect.drawRect(-arcRadius, -arcRadius, arcRadius * 2, arcRadius * 2);
        debugContainer.addChild(debugRect);
      }
    }    // Draw the centre dot if enabled
    if (debugFeatures.showCentreDot) {
      const debugDot = GraphicsPool.get();
      if (debugDot) {
        debugDot.clear();
        debugDot.beginFill(0x00ff00);
        debugDot.drawCircle(0, 0, 8);
        debugDot.endFill();
        debugContainer.addChild(debugDot);
      }
    }
    
    // If we have a token and token info is enabled, show enhanced debug info
    if (token && (debugFeatures.showTokenInfo || debugFeatures.showUncertaintyInfo)) {
      // Get HP data for additional debugging
      const hpData = getTokenHP(token);
      const actor = token.actor;
      
      // Build debug info
      let debugInfo = '';
      
      if (debugFeatures.showTokenInfo) {
        // Use our helper function to get the token name reliably
        const tokenName = getTokenName(token);
        // Add token name and ID
        debugInfo += `${tokenName}\nID: ${token.id?.substring(0, 8) || 'unknown'}`;
        
        // Add HP information if available
        if (hpData) {
          debugInfo += `\nHP: ${hpData.current}/${hpData.max}`;
          if (hpData.temp > 0) debugInfo += ` +${hpData.temp} temp`;
        }
      }
      
      // Add uncertainty information if enabled
      if (debugFeatures.showUncertaintyInfo && actor) {
        const passivePerception = getTokenPassivePerception(token);
        
        if (passivePerception) {
          debugInfo += `\nPerception: ${passivePerception}`;
        }
        
        // Get uncertainty if we have HP data
        if (hpData) {
          const uncertainty = HealthArcCache.getInstance().getHPUncertainty(
            token.id,
            (window as any).game?.user?.id,
            hpData.current,
            hpData.percent,
            passivePerception
          );
          
          if (uncertainty) {
            // Calculate accuracy based on how close the displayed percent is to the actual percent
            const displayPercent = uncertainty.percent;
            const actualPercent = hpData.percent; 
            const difference = Math.abs(displayPercent - actualPercent);
            const accuracyPercent = Math.round((1 - (difference / actualPercent)) * 100);
            const uncertaintyPercent = Math.round(Math.abs(displayPercent - actualPercent) * 100);
            
            // Show more detailed uncertainty information
            debugInfo += `\nUncertainty: ${uncertaintyPercent}%`;
            debugInfo += `\nAccuracy: ${accuracyPercent}%`;
            debugInfo += `\nDisplay HP: ${Math.round(displayPercent * 100)}%`;
            debugInfo += `\nActual HP: ${Math.round(actualPercent * 100)}%`;
          }
        }
      }
      
      // Always show radius if enabled
      if (debugFeatures.showArcRadius) {
        debugInfo += debugInfo ? `\nr: ${Math.round(arcRadius)}` : `r: ${Math.round(arcRadius)}`;
      }
      
      // If we have debug info to show, create the text
      if (debugInfo) {
        const debugTextStyle = {
          fontFamily: 'Arial',
          fontSize: 14,
          fill: 0xffff00,
          stroke: 0x000000,
          strokeThickness: 3,
          align: 'left',
          wordWrap: true,
          wordWrapWidth: arcRadius * 3
        };
        
        const debugText = new PIXI.Text(debugInfo, debugTextStyle);
        
        // Position based on token size - try to keep it above the token where possible
        const textHeight = debugText.height;
        const textY = Math.max(-arcRadius - textHeight - 10, -arcRadius * 2);
        debugText.position.set(-arcRadius, textY);
        
        // Add a semi-transparent background for better readability
        const padding = 5;
        const background = new PIXI.Graphics();
        background.beginFill(0x000000, 0.5);
        background.drawRect(
          debugText.x - padding, 
          debugText.y - padding, 
          debugText.width + padding * 2, 
          debugText.height + padding * 2
        );
        background.endFill();
        
        debugContainer.addChild(background);
        debugContainer.addChild(debugText);
      }
    } else if (debugFeatures.showArcRadius) {
      // Simple radius text if token not available
      const debugTextStyle = {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffff00,
        stroke: 0x000000,
        strokeThickness: 3,
        align: 'centre'
      };
      
      const debugText = new PIXI.Text(`r: ${Math.round(arcRadius)}`, debugTextStyle);
      
      // Position text and add background
      debugText.position.set(-20, -arcRadius - 20);
      
      // Add background for better readability
      const padding = 5;
      const background = new PIXI.Graphics();
      background.beginFill(0x000000, 0.5);
      background.drawRect(
        debugText.x - padding, 
        debugText.y - padding, 
        debugText.width + padding * 2, 
        debugText.height + padding * 2
      );
      background.endFill();
      
      debugContainer.addChild(background);
      debugContainer.addChild(debugText);
    }
    
    // Add performance information to debug container
    addPerformanceDebugInfo(debugContainer, token, arcRadius);
    
    Logger.debug('Debug visuals added to health arc', { radius: arcRadius });
  } catch (error) {
    Logger.error('Error drawing debug visuals:', error);
  }
}

/**
 * Add performance information to debug container
 */
function addPerformanceDebugInfo(debugContainer: any, token: FoundryToken | null, arcRadius: number): void {
  try {
    if (!token || !token.id) return;
    
    // Dynamically import performance monitor to avoid circular dependencies
    import('../utils/performance').then(({ PerformanceMonitor }) => {
      // Get stats for this token
      const tokenPerformanceStats = PerformanceMonitor.getStats(`render:${token.id}`);
      if (!tokenPerformanceStats) return;
      
      // Format stats as text
      const statsText = `Render: ${tokenPerformanceStats.avg?.toFixed(2) || 'N/A'} ms`;
      
      // Create text in a distinct colour
      const perfText = new PIXI.Text(statsText, {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x00ffff, // Cyan colour
        stroke: 0x000000,
        strokeThickness: 2,
        align: 'left'
      });
      
      // Position in a different location than the main debug text
      perfText.position.set(arcRadius / 2, -arcRadius - 20);
      
      // Add background
      const padding = 3;
      const background = new PIXI.Graphics();
      background.beginFill(0x000000, 0.5);
      background.drawRect(
        perfText.x - padding, 
        perfText.y - padding, 
        perfText.width + padding * 2, 
        perfText.height + padding * 2
      );
      background.endFill();
      
      // Add to container
      debugContainer.addChild(background);
      debugContainer.addChild(perfText);
    }).catch(error => {
      Logger.debug('Error adding performance debug info:', error);
    });
  } catch (error) {
    Logger.debug('Error in addPerformanceDebugInfo:', error);
  }
}

/**
 * Helper function to clean up debug visuals
 */
export function cleanupDebugVisuals(container: PIXIContainer): void {
  if (!container) return;
  
  try {
    if (container._debugContainer) {
      // First remove from parent
      if (container._debugContainer.parent === container) {
        container.removeChild(container._debugContainer);
      }
      
      // Then destroy the container and its children
      if (typeof container._debugContainer.destroy === 'function') {
        container._debugContainer.destroy({ children: true });
      }
      
      // Clear the reference
      delete container._debugContainer;
      
      Logger.debug('Cleaned up debug visuals');
    }
  } catch (error) {
    Logger.debug('Error cleaning up debug visuals:', error);
  }
}

/**
 * Helper function to get debug feature settings with fallbacks
 */
function getDebugFeaturesFromSettings(): {  showBoundingBox: boolean;
  showCentreDot: boolean;
  showArcRadius: boolean;
  showTokenInfo: boolean;
  showUncertaintyInfo: boolean;
  showPerformanceInfo: boolean;
} {
  try {
    // First check if the setting is registered
    const isRegistered = (window as any).game?.settings?.settings?.has(`${MODULE_ID}.debugFeatures`);
    
    if (isRegistered) {
      // Setting is registered, so we can safely get it
      const moduleSettings = (window as any).game?.settings?.get(MODULE_ID, 'debugFeatures');
      if (moduleSettings) {        return {
          showBoundingBox: moduleSettings.showBoundingBox !== false, // Default to true
          showCentreDot: moduleSettings.showCentreDot !== false,
          showArcRadius: moduleSettings.showArcRadius !== false,
          showTokenInfo: moduleSettings.showTokenInfo !== false,
          showUncertaintyInfo: moduleSettings.showUncertaintyInfo !== false,
          showPerformanceInfo: moduleSettings.showPerformanceInfo !== false
        };
      }
    } else {
      Logger.debug('Debug features setting not registered yet, using defaults');
    }
  } catch (error) {
    Logger.debug('Error getting debug features from settings:', error);
  }
    // Default values if settings aren't available
  return {
    showBoundingBox: true,
    showCentreDot: true,
    showArcRadius: true,
    showTokenInfo: true,
    showUncertaintyInfo: true,
    showPerformanceInfo: true
  };
}
