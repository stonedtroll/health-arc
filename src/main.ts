// Declare Foundry globals for TypeScript
// @ts-ignore
const Hooks: typeof globalThis.Hooks = (window as any).Hooks;

import { drawHealthArc, removeHealthArc } from "./health-arc";

function getCanvas(): any {
  return (window as any).canvas;
}

function forEachToken(fn: (token: any) => void) {
  const canvas = getCanvas();
  const tokens = canvas?.tokens?.placeables;
  if (!tokens) return;
  for (let i = 0, n = tokens.length; i < n; i++) fn(tokens[i]);
}

function getProperty(obj: any, path: string): any {
  if (!obj || typeof path !== "string") return undefined;
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
}

// Register Foundry hooks for health arc updates
Hooks.on("canvasReady", () => {
  forEachToken(drawHealthArc);
});

Hooks.on("updateToken", (_scene: any, tokenData: any, updateData: any, token: any) => {
  // Only update if HP or bar-relevant data changed
  const hpChanged =
    getProperty(updateData, "actorData.system.attributes.hp") ||
    getProperty(updateData, "system.attributes.hp") ||
    updateData?.bar1 ||
    updateData?.bar2;
  if (!hpChanged) return;
  const t = token || getCanvas()?.tokens?.get(tokenData._id);
  if (t) {
    removeHealthArc(t);
    drawHealthArc(t);
  }
});

Hooks.on("drawToken", (token: any) => {
  drawHealthArc(token);
});

Hooks.on("refreshToken", (token: any) => {
  removeHealthArc(token);
  drawHealthArc(token);
});
