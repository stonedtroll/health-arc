/**
 * Type definitions for Foundry VTT objects and interfaces
 * These are simplified versions focused on what the Health Arc module needs
 */

/**
 * Represents a Foundry VTT token
 */
export interface FoundryToken {
  /** Token identifier */
  id: string;
  /** Token name */
  name?: string;
  /** Token document data */
  document?: {
    name?: string;
    id?: string;
    documentName?: string;
    /** Actor reference */
    actor?: any;
    /** Token disposition (friendly, neutral, hostile) */
    disposition?: number;
    [key: string]: any;
  };
  /** Associated actor data */
  actor?: {
    /** Actor health data */
    system?: {
      attributes?: {
        hp?: {
          value?: number;
          max?: number;
          temp?: number;
        };
      };
      [key: string]: any;
    };
    /** Character passive perception */
    flags?: {
      core?: {
        passivePerception?: number;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  /** Token mesh for rendering */
  mesh?: {
    addChild?: (child: any) => void;
    removeChild?: (child: any) => void;
    children?: any[];
    [key: string]: any;
  };
  /** Token object data */
  object?: any;
  /** Token texture data */
  texture?: {
    width: number;
    height: number;
    [key: string]: any;
  };
  /** Token width on canvas */
  w: number;
  /** Token height on canvas */
  h: number;
  /** Token x position */
  x?: number;
  /** Token y position */
  y?: number;
  /** Token position */
  position?: {
    x: number;
    y: number;
    [key: string]: any;
  };
  /** Token dimensions */
  width?: number;
  /** Token dimensions */
  height?: number;
  /** Reference to health arc container */
  _healthArc?: PIXIContainer;
  /** Tracks the current parent type of the health arc */
  _lastArcParentType?: string;
  /** Whether the token is currently being dragged */
  _dragging?: boolean;
  /** Whether the token is in combat */
  combatant?: boolean;
  /** Whether the token is currently selected */
  controlled?: boolean;
  /** Whether the token is being hovered over */
  hover?: boolean;
  /** Whether the current user owns this token */
  isOwner?: boolean;
  /** Token's interaction manager */
  interactionManager?: any;
  /** Add child method (for legacy support) */
  addChild?: (child: any) => void;
  /** Remove child method (for legacy support) */
  removeChild?: (child: any) => void;
  
  /** Interaction manager for handling events */
  interactionManager?: any;
  
  /** Custom property to store the health arc container */
  _healthArc?: any;
  
  /** Custom property to track the last parent type */
  _lastArcParentType?: string;
}

declare global {
  const game: Game;
  const canvas: Canvas;
  const Hooks: Hooks;
  
  /**
   * PIXI global namespace
   * Basic type declarations for PIXI properties used in this module
   */
  const PIXI: {
    Container: new () => PIXIContainer;
    Graphics: new () => PIXIGraphics;
    Text: new (text: string, style?: any) => PIXIText;
    TextStyle: new (style: any) => any;
    Sprite: new (texture: any) => any;
  };
}

/**
 * Type definition for a Foundry VTT hook event
 */
export type HookEvent = string;

/**
 * Type definition for a Foundry VTT hook callback
 */
export type HookCallback = (...args: any[]) => void | boolean;

/**
 * Global Hooks API interface
 */
export interface Hooks {
  on(event: HookEvent, callback: HookCallback): number;
  once(event: HookEvent, callback: HookCallback): number;
  off(event: HookEvent, callbackId: number): void;
}

/**
 * Global Game object interface
 */
export interface Game {
  /** Game settings manager */
  settings: {
    register: (module: string, key: string, data: any) => void;
    get: (module: string, key: string) => any;
    settings: Map<string, any>;
    has: (key: string) => boolean;
  };
  
  /** Current user */
  user: {
    id: string;
    isGM: boolean;
  };
  
  /** Internationalization API */
  i18n: {
    localize: (key: string) => string;
    format: (key: string, data: Record<string, any>) => string;
  };
}

/**
 * Global Canvas object interface
 */
export interface Canvas {
  /** Whether canvas is ready */
  ready: boolean;
  
  /** App dimensions */
  dimensions: {
    width: number;
    height: number;
    sceneWidth: number;
    sceneHeight: number;
    size: number;
    [key: string]: any;
  };
  
  /** Stage for rendering */
  stage?: PIXIContainer;
  
  /** Tokens layer */
  tokens: {
    /** Array of token objects */
    placeables: FoundryToken[];
    /** Get a token by ID */
    get: (id: string) => FoundryToken | undefined;
    /** Layer element containing tokens */
    layer?: PIXIContainer;
    /** Whether layer is visible */
    visible: boolean;
  };
  
  /** Interface for accessing other layers */
  [key: string]: any;
}

/**
 * Basic PIXI Container interface for the module's needs
 * Includes custom properties used by the Health Arc module
 */
export interface PIXIContainer {
  id?: string;
  name?: string;
  zIndex: number;
  position: {
    set: (x: number, y: number) => void;
    x?: number;
    y?: number;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: {
    x: number;
    y: number;
    set: (x: number, y: number) => void;
  };
  visible: boolean;
  alpha: number;
  children: (PIXIContainer | PIXIGraphics | PIXIText | any)[];
  parent: PIXIContainer | null;
  eventMode?: string;
  cursor?: string;
  rotation?: number;
  addChild: (...children: (PIXIContainer | PIXIGraphics | PIXIText | any)[]) => PIXIContainer;
  removeChild: (child: PIXIContainer | PIXIGraphics | PIXIText | any) => PIXIContainer;
  parent?: PIXIContainer;
  children?: (PIXIContainer | PIXIGraphics | PIXIText | any)[];
  visible: boolean;
  alpha: number;
  destroy: (options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void;
  updateTransform?: () => void;
    // Custom properties added by the Health Arc module
  _token?: FoundryToken;
  token?: FoundryToken;
  _healthArc?: PIXIContainer;
  _lastArcParentType?: string;
  _healthArcData?: {
    lastUpdate: number;
    tokenId: string;
    [key: string]: any;
  };
  _debugContainer?: PIXIContainer;
  _isDragging?: boolean;
  _dragStartListener?: (event: any) => void;
  _dragEndListener?: (event: any) => void;
  
  // Common properties from different token implementations
  actor?: {
    token?: FoundryToken;
    isOwner?: boolean;
    [key: string]: any;
  };
  document?: {
    documentName?: string;
    [key: string]: any;
  };
}

/**
 * Basic PIXI Graphics interface for the module's needs
 */
export interface PIXIGraphics {
  clear: () => PIXIGraphics;
  beginFill: (color: number, alpha?: number) => PIXIGraphics;
  lineStyle: (width: number, color: number, alpha?: number) => PIXIGraphics;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean) => PIXIGraphics;
  arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => PIXIGraphics;
  drawCircle: (x: number, y: number, radius: number) => PIXIGraphics;
  drawRect: (x: number, y: number, width: number, height: number) => PIXIGraphics;
  moveTo: (x: number, y: number) => PIXIGraphics;
  lineTo: (x: number, y: number) => PIXIGraphics;
  closePath: () => PIXIGraphics;
  endFill: () => PIXIGraphics;
  position: {
    set: (x: number, y: number) => void;
    x?: number;
    y?: number;
  };
  x: number;
  y: number;
  visible: boolean;
  alpha: number;
  tint?: number;
  zIndex?: number;
  name?: string;
  parent?: PIXIContainer;
  destroy: (options?: { children?: boolean; texture?: boolean }) => void;
  
  // Custom properties used by Health Arc
  _healthArcData?: {
    type: 'main' | 'temp' | 'background';
    lastUpdate: number;
    tokenId: string;
    [key: string]: any;
  };
}

/**
 * Basic PIXI Text interface for the module's needs
 */
export interface PIXIText {
  text: string;
  style: any;
  position: {
    set: (x: number, y: number) => void;
    x?: number;
    y?: number;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  anchor?: {
    set: (x: number, y: number) => void;
    x: number;
    y: number;
  };
  scale?: {
    set: (x: number, y: number) => void;
    x: number;
    y: number;
  };
  alpha: number;
  visible: boolean;
  zIndex?: number;
  name?: string;
  parent?: PIXIContainer;
  destroy: (options?: { children?: boolean; texture?: boolean }) => void;
  
  // Custom properties used by Health Arc
  _healthArcType?: string;
}

export {};
