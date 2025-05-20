// PIXI is provided globally by Foundry VTT, so do not import it as a module.
// @ts-ignore
const PIXI: any = (window as any).PIXI;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function getHPUncertaintyMap(): Map<string, { actual: number; percent: number }> {
  const w = window as any;
  if (!w._hpUncertaintyMap) w._hpUncertaintyMap = new Map();
  return w._hpUncertaintyMap;
}

// Draw health arc for a Foundry VTT token
export function drawHealthArc(token: any) {
  const actor = token.actor;
  const hp = actor?.system?.attributes?.hp;
  if (!hp) return;

  const currentHP = Number(hp.value) || 0;
  const maxHP = Number(hp.max) || 1;
  const tempHP = Number(hp.temp) || 0;
  const hpArcPercent = clamp(currentHP / maxHP, 0, 1);
  const tempHPArcPercent = tempHP > 0 && maxHP > 0 ? clamp(tempHP / maxHP, 0, 1) : 0;

  // Arc geometry
  const arcStroke = 4;
  const hpArcSpan = Math.PI / 4;
  const hpArcStart = 0;
  const hpArcEnd = hpArcStart - hpArcSpan;
  const tokenTextureWidth = token.texture?.width ?? token.w;
  const tokenScaleX = token.w / tokenTextureWidth;
  const adjustedArcStroke = arcStroke / tokenScaleX;
  const arcOffset = 40;
  const arcRadius = (tokenTextureWidth / 2) + (adjustedArcStroke / 2) + arcOffset;

  // Colour interpolation for health arc
  const t = hpArcPercent >= 0.1 ? (1 - hpArcPercent) / 0.9 : 1;
  const hpArcColour =
    (lerp(0x46, 0x6A, t) << 16) |
    (lerp(0x5C, 0x1A, t) << 8) |
    lerp(0x1A, 0x1A, t);

  // Container setup or reuse
  let container = token._healthArc as any | undefined;
  let hpArcBackground: any, hpArcForeground: any, tempHPArcForeground: any;
  if (container && container.children?.length === 3) {
    [hpArcBackground, hpArcForeground, tempHPArcForeground] = container.children as [any, any, any];
    hpArcBackground.clear(); hpArcForeground.clear(); tempHPArcForeground.clear();
  } else {
    if (container) removeHealthArc(token, false);
    container = new PIXI.Container();
    container.zIndex = 100;
    container.position.set(0, 0);
    hpArcBackground = new PIXI.Graphics();
    hpArcForeground = new PIXI.Graphics();
    tempHPArcForeground = new PIXI.Graphics();
    container.addChild(hpArcBackground, hpArcForeground, tempHPArcForeground);
    if (token.mesh?.addChild) token.mesh.addChild(container);
    else if (token.addChild) token.addChild(container);
    token._healthArc = container;
  }

  // Fade in if selected, hovered, or in combat
  container.alpha = (token.combatant || actor?.combatant || token.controlled || token.hover) ? 1.0 : 0.25;

  // Draw background HP arc
  hpArcBackground.lineStyle(adjustedArcStroke, 0x222222, 0.4);
  hpArcBackground.arc(0, 0, arcRadius, hpArcStart, hpArcEnd, true);

  // HP uncertainty for non-owners (persisted per token+user until HP changes)
  let displayHPArcPercent = hpArcPercent;
  const user = game?.user;
  const isGM = user?.isGM;
  const ownsToken = token.isOwner || actor?.isOwner;
  if (!isGM && !ownsToken && user) {
    const key = `${token.id}-${user.id}`;
    const hpUncertaintyMap = getHPUncertaintyMap();
    let previousHPUncertainty = hpUncertaintyMap.get(key);

    // Passive perception modsifier
    let passivePerception = 10;
    if (actor?.system?.skills?.prc?.passive != null) {
      passivePerception = +actor.system.skills.prc.passive || 10;
    } else if (actor?.system?.attributes?.perception?.passive != null) {
      passivePerception = +actor.system.attributes.perception.passive || 10;
    }
    // Clamp passivePerception to a reasonable range for performance
    passivePerception = clamp(passivePerception, 1, 30);
    let hpUncertaintyPercentageModifier = Math.max(0, 0.30 - ((passivePerception - 10) * 0.02));

    // Only recalculate if HP changed for this user+token
    if (!previousHPUncertainty || previousHPUncertainty.actual !== currentHP) {
      // Use a single random value for both performance and consistency
      const random = Math.random();
      let hpUncertaintyArcPercentage = hpArcPercent + (random * 2 - 1) * hpUncertaintyPercentageModifier;
      if (currentHP > 0) hpUncertaintyArcPercentage = Math.max(hpUncertaintyArcPercentage, 0.01);
      hpUncertaintyArcPercentage = Math.max(hpUncertaintyArcPercentage, 0);
      previousHPUncertainty = { actual: currentHP, percent: hpUncertaintyArcPercentage };
      hpUncertaintyMap.set(key, previousHPUncertainty);
    }
    displayHPArcPercent = previousHPUncertainty.percent;
  }

  // Draw HP arc
  hpArcForeground.lineStyle(adjustedArcStroke, hpArcColour, 1);
  const healthEnd = hpArcStart - hpArcSpan * displayHPArcPercent;
  hpArcForeground.arc(0, 0, arcRadius, hpArcStart, healthEnd, true);

  // Draw temp HP arc if present
  if (tempHPArcPercent > 0) {
    tempHPArcForeground.lineStyle(adjustedArcStroke, 0x2A4A6A, 1);
    const tempArcSpan = hpArcSpan * tempHPArcPercent;
    const tempArcStart = hpArcEnd;
    const tempArcEnd = tempArcStart - tempArcSpan;
    tempHPArcForeground.arc(0, 0, arcRadius, tempArcStart, tempArcEnd, true);
  }
}

// Remove HP arc from token
export function removeHealthArc(token: any, clearState = true) {
  if (token._healthArc) {
    if (token.mesh?.removeChild) token.mesh.removeChild(token._healthArc);
    else if (token.removeChild) token.removeChild(token._healthArc);
    token._healthArc.destroy();
    delete token._healthArc;
  }
}

// Draw bounding box and center dot for arc (not called by default)
export function drawHealthArcDebug(container: any, arcRadius: number) {
  const debugRect = new PIXI.Graphics();
  debugRect.lineStyle(2, 0x00ff00, 1);
  debugRect.drawRect(-arcRadius, -arcRadius, arcRadius * 2, arcRadius * 2);
  container.addChild(debugRect);

  const debugDot = new PIXI.Graphics();
  debugDot.beginFill(0x0000ff);
  debugDot.drawCircle(0, 0, 8);
  debugDot.endFill();
  container.addChild(debugDot);
}
