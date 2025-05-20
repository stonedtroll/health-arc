/**
 * Health Arc Module - Arc Drawing Functions
 * Contains functions for drawing arcs and managing arc geometry
 */

import { FoundryToken, PIXIGraphics } from '../types/foundry';
import { ArcGeometry } from '../types';
import { TokenGeometryManager } from '../core/arc-geometry';
import { ARC_SPAN } from '../utils/constants';

/**
 * Calculate token's arc geometry
 */
export function calculateArcGeometry(token: FoundryToken): ArcGeometry {  
  // Use the token geometry manager for caching
  const cachedGeometry = TokenGeometryManager.instance.getTokenGeometry(token);
  return cachedGeometry.arcGeometry;
}

/**
 * Draw the main health arc
 */
export function drawMainArc(
  graphics: PIXIGraphics, 
  arcRadius: number, 
  adjustedArcStroke: number, 
  arcStart: number, 
  displayPercent: number, 
  colour: number
): void {
  graphics.lineStyle(adjustedArcStroke, colour, 1);
  const healthEnd = arcStart - ARC_SPAN * displayPercent;
  graphics.arc(0, 0, arcRadius, arcStart, healthEnd, true);
}

/**
 * Draw the background arc
 */
export function drawBackgroundArc(
  graphics: PIXIGraphics, 
  arcRadius: number, 
  adjustedArcStroke: number, 
  arcStart: number, 
  arcEnd: number, 
  colour: number
): void {
  graphics.lineStyle(adjustedArcStroke, colour, 0.4);
  graphics.arc(0, 0, arcRadius, arcStart, arcEnd, true);
}

/**
 * Draw the temporary HP arc
 */
export function drawTempHPArc(
  graphics: PIXIGraphics, 
  arcRadius: number, 
  adjustedArcStroke: number, 
  arcEnd: number, 
  tempPercent: number, 
  colour: number
): void {
  graphics.lineStyle(adjustedArcStroke, colour, 1);
  const tempArcSpan = ARC_SPAN * tempPercent;
  const tempArcStart = arcEnd;
  const tempArcEnd = tempArcStart - tempArcSpan;
  graphics.arc(0, 0, arcRadius, tempArcStart, tempArcEnd, true);
}
