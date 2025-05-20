/**
 * Re-exports all type definitions for the Health Arc module
 */

// Re-export all types from foundry.d.ts
export * from './foundry';

/**
 * Represents the geometry of a health arc
 */
export interface ArcGeometry {
  /** Radius of the arc in pixels */
  arcRadius: number;
  /** Adjusted stroke width accounting for token scale */
  adjustedArcStroke: number;
  /** Starting angle of the arc in radians */
  arcStart: number;
  /** Ending angle of the arc in radians */
  arcEnd: number;
}

/**
 * Represents cached geometry data for a token
 */
export interface TokenGeometry {
  /** Token identifier */
  id: string;
  /** Token texture width */
  width: number;
  /** Token texture height */
  height: number;
  /** Token horizontal scale factor */
  scaleX: number;
  /** Token vertical scale factor */
  scaleY: number;
  /** Arc geometry data */
  arcGeometry: ArcGeometry;
  /** Timestamp when the geometry was last updated */
  lastUpdated: number;
}
