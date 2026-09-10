function drawLabelAt(p, x, y, text, config, align = 'above', colorOverride = null) {
  const cfg = config.labels;
  const paddingX = 6;
  const paddingY = 3;

  p.push();
  p.textSize(cfg.fontSize);
  p.textAlign(p.CENTER, p.CENTER);

  const boxW = p.textWidth(text) + paddingX * 2;
  const boxH = cfg.fontSize + paddingY * 2;

  let centerX = x;
  let centerY = y;
  if (align === 'above') {
    centerY = y - boxH / 2;
  } else if (align === 'right') {
    centerX = x + boxW / 2;
  } else if (align === 'left') {
    centerX = x - boxW / 2;
  }

  const edgeMargin = 4;
  centerX = p.constrain(centerX, boxW / 2 + edgeMargin, config.canvas.width - boxW / 2 - edgeMargin);
  centerY = p.constrain(centerY, boxH / 2 + edgeMargin, config.canvas.height - boxH / 2 - edgeMargin);

  p.rectMode(p.CENTER);
  if (colorOverride) {
    p.stroke(colorOverride);
  } else {
    p.stroke(cfg.borderColor[0], cfg.borderColor[1], cfg.borderColor[2], cfg.borderColor[3]);
  }
  p.strokeWeight(1);
  p.fill(cfg.backgroundColor[0], cfg.backgroundColor[1], cfg.backgroundColor[2], cfg.backgroundColor[3]);
  p.rect(centerX, centerY, boxW, boxH, 3);

  p.noStroke();
  p.fill(colorOverride || cfg.textColor);
  p.text(text, centerX, centerY + 1);
  p.pop();
}

// World-space drawing helpers: gameplay math (fishing.js) never touches
// these, they only affect where things end up on screen.
function worldCircle(p, config, x, y, r) {
  const c = Projection.worldToScreen(x, y, config);
  const size = Projection.worldRadiusToScreenSize(r, config);
  p.ellipse(c.x, c.y, size.w, size.h);
}

function worldPoint(config, x, y) {
  return Projection.worldToScreen(x, y, config);
}

function worldLine(p, config, x1, y1, x2, y2) {
  const a = Projection.worldToScreen(x1, y1, config);
  const b = Projection.worldToScreen(x2, y2, config);
  p.line(a.x, a.y, b.x, b.y);
}

// A world-space heading doesn't project to the same screen angle once the
// iso skew is applied (e.g. world 90deg lands around screen 151deg) - a
// sprite rotated by the raw world angle would visibly face the wrong way.
// Project a short step in that heading and measure the resulting screen
// angle instead. In top-down mode this is a no-op (returns the same angle).
function worldAngleToScreenAngle(config, x, y, angle) {
  const a = Projection.worldToScreen(x, y, config);
  const b = Projection.worldToScreen(x + Math.cos(angle), y + Math.sin(angle), config);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

// A flat top-down view reads fine on its own, but the same positions
// projected isometric with nothing else to anchor them just look scattered.
// A faint ground-plane grid gives the eye a plane to read the tilt against.
// The world rectangle that actually needs to be drawn to cover every screen
// pixel - identity in top-down (screen == world), but a larger world span
// under the iso squash, since that compresses world space onto screen space.
function computeWorldGridBounds(config) {
  const w = config.canvas.width;
  const h = config.canvas.height;
  const corners = [
    Projection.screenToWorld(0, 0, config),
    Projection.screenToWorld(w, 0, config),
    Projection.screenToWorld(0, h, config),
    Projection.screenToWorld(w, h, config),
  ];
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

function drawWorldGrid(p, config) {
  const spacing = config.iso.gridSpacing;
  const cx = config.canvas.width / 2;
  const cy = config.canvas.height / 2;
  const c = config.iso.gridColor;
  const bounds = computeWorldGridBounds(config);

  const minXk = Math.floor((bounds.minX - cx) / spacing);
  const maxXk = Math.ceil((bounds.maxX - cx) / spacing);
  const minYk = Math.floor((bounds.minY - cy) / spacing);
  const maxYk = Math.ceil((bounds.maxY - cy) / spacing);

  p.push();
  p.stroke(c[0], c[1], c[2], c[3]);
  p.strokeWeight(1);
  for (let k = minXk; k <= maxXk; k++) {
    if (k === 0) {
      continue; // the center line is the axis, drawn thicker below
    }
    const gx = cx + k * spacing;
    worldLine(p, config, gx, bounds.minY, gx, bounds.maxY);
  }
  for (let k = minYk; k <= maxYk; k++) {
    if (k === 0) {
      continue;
    }
    const gy = cy + k * spacing;
    worldLine(p, config, bounds.minX, gy, bounds.maxX, gy);
  }
  p.pop();

  // The two axes through the center (world x = cx, world y = cy) stand out
  // from the rest of the grid - in top-down this is the only cue for which
  // screen direction is "world up"; in iso it's what makes the tilt read.
  p.push();
  p.stroke(c[0], c[1], c[2], Math.min(255, c[3] * 2.5));
  p.strokeWeight(config.iso.axisStrokeWeight);
  worldLine(p, config, cx, bounds.minY, cx, bounds.maxY);
  worldLine(p, config, bounds.minX, cy, bounds.maxX, cy);
  p.pop();
}

function drawAxisArrow(p, anchorX, anchorY, ux, uy, armLength, label, config) {
  const tipX = anchorX + ux * armLength;
  const tipY = anchorY + uy * armLength;
  const headAngle = Math.atan2(uy, ux);
  const headLen = 7;

  p.push();
  p.stroke(config.iso.compassColor);
  p.strokeWeight(2);
  p.line(anchorX, anchorY, tipX, tipY);
  p.line(tipX, tipY, tipX - headLen * Math.cos(headAngle - Math.PI / 6), tipY - headLen * Math.sin(headAngle - Math.PI / 6));
  p.line(tipX, tipY, tipX - headLen * Math.cos(headAngle + Math.PI / 6), tipY - headLen * Math.sin(headAngle + Math.PI / 6));
  p.pop();

  p.push();
  p.noStroke();
  p.fill(config.iso.compassColor);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(11);
  p.text(label, tipX + ux * 12, tipY + uy * 12);
  p.pop();
}

// Rotating the world for the iso view also rotates which screen direction
// is "world up" - this points where it actually went, rather than making
// the player guess. Height is a separate, third axis that the ground
// rotation never touches, so it always draws as a plain vertical line -
// unlike the ground arrow, it doesn't need to be derived from Projection.
function drawCompass(p, config) {
  if (!config.debug.isometric) {
    return;
  }

  const origin = Projection.worldToScreen(0, 0, config);
  const up = Projection.worldToScreen(0, -1, config);
  const len = Math.hypot(up.x - origin.x, up.y - origin.y) || 1;
  const ux = (up.x - origin.x) / len;
  const uy = (up.y - origin.y) / len;

  const anchorX = config.canvas.width - 60;
  const anchorY = config.canvas.height - 60;
  const armLength = 22;

  drawAxisArrow(p, anchorX, anchorY, ux, uy, armLength, 'N', config);
  drawAxisArrow(p, anchorX, anchorY, 0, -1, armLength, 'Z', config);
}

function drawSchools(p, state, config) {
  const cfg = config.schools;

  for (const school of state.schools) {
    const tier = cfg.difficultyTiers[school.difficulty];

    if (config.debug.showSchoolRadii) {
      p.push();
      p.noStroke();
      p.fill(tier.color);
      p.drawingContext.globalAlpha = cfg.outerFillOpacity / 255;
      worldCircle(p, config, school.x, school.y, school.outerRadius);
      p.drawingContext.globalAlpha = cfg.innerFillOpacity / 255;
      worldCircle(p, config, school.x, school.y, school.innerRadius);
      p.drawingContext.globalAlpha = 1;
      p.pop();
    }

    const fishSprite = config.debug.isometric ? Iso3D.getFishSprite() : null;

    p.push();
    p.noStroke();
    p.fill(tier.color);
    for (const fish of school.fish) {
      const pos = worldPoint(config, fish.x, fish.y);
      p.push();
      p.translate(pos.x, pos.y);
      if (fishSprite) {
        // The sprite was baked top-down and needs the heading re-projected
        // through the same skew as its position - the raw world angle only
        // happens to match the screen angle in flat top-down mode.
        p.rotate(worldAngleToScreenAngle(config, fish.x, fish.y, fish.angle));
        p.imageMode(p.CENTER);
        p.image(fishSprite, 0, 0, config.iso.fishSpriteSize, config.iso.fishSpriteSize);
      } else {
        p.rotate(fish.angle);
        p.triangle(6, 0, -5, -4, -5, 4);
      }
      p.pop();
    }
    p.pop();

    if (state.mode === 'waiting' && state.biteFish && school.fish.includes(state.biteFish)) {
      const pos = worldPoint(config, state.biteFish.x, state.biteFish.y);
      p.push();
      p.noStroke();
      p.fill('#ffffff');
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(11);
      p.text(`${Math.max(0, state.waitTimer).toFixed(2)}s`, pos.x, pos.y - 14);
      p.pop();
    }

    const labelAnchor = worldPoint(config, school.x, school.y - school.outerRadius);
    drawLabelAt(p, labelAnchor.x, labelAnchor.y - config.labels.offset, tier.label, config, 'above', tier.color);
  }
}

function drawBoat(p, state, config) {
  const cfg = config.boat;
  const boat = state.boat;
  const pos = worldPoint(config, boat.x, boat.y);
  const boatSprite = config.debug.isometric ? Iso3D.getBoatSprite() : null;

  p.push();
  p.translate(pos.x, pos.y);
  p.noStroke();

  if (boatSprite) {
    p.imageMode(p.CENTER);
    p.image(boatSprite, 0, 0, config.iso.boatSpriteSize, config.iso.boatSpriteSize);
  } else {
    p.fill(cfg.hullOutline);
    p.ellipse(0, 0, cfg.radius * 2.2, cfg.radius * 1.5);
    p.fill(cfg.hullColor);
    p.ellipse(0, 0, cfg.radius * 1.9, cfg.radius * 1.2);
    p.fill(cfg.cabinColor);
    p.rect(-cfg.radius * 0.3, -cfg.radius * 0.35, cfg.radius * 0.6, cfg.radius * 0.7, 3);
  }
  p.pop();

  if (config.debug.showLabels) {
    drawLabelAt(p, pos.x, pos.y - cfg.radius - config.labels.offset, 'Boat', config);
  }
}

function drawLandingMarker(p, state, config) {
  const marker = state.landingMarker;
  if (!marker) {
    return;
  }

  const alpha = marker.fadeTimer === null ? 1 : clampAlpha(marker.fadeTimer / config.cast.landingMarkerFadeSeconds);

  p.push();
  p.noFill();
  p.stroke(216, 222, 232, 120 * alpha);
  p.strokeWeight(1.5);
  p.drawingContext.setLineDash([4, 4]);
  worldCircle(p, config, marker.targetX, marker.targetY, config.cast.landingScatterRadius);
  p.drawingContext.setLineDash([]);
  p.pop();

  const [r, g, b] = config_color(config.cast.landingMarkerCrossColor);
  const cross = worldPoint(config, marker.landX, marker.landY);
  p.push();
  p.stroke(r, g, b, 220 * alpha);
  p.strokeWeight(2);
  const s = 7;
  p.line(cross.x - s, cross.y - s, cross.x + s, cross.y + s);
  p.line(cross.x - s, cross.y + s, cross.x + s, cross.y - s);
  p.pop();
}

function drawAimGuide(p, state, config) {
  if (!state.aim) {
    return;
  }

  const boat = state.boat;
  const aim = state.aim;
  const endX = boat.x + Math.cos(aim.angle) * aim.distance;
  const endY = boat.y + Math.sin(aim.angle) * aim.distance;
  const boatPos = worldPoint(config, boat.x, boat.y);
  const endPos = worldPoint(config, endX, endY);

  p.push();
  p.noFill();
  p.stroke(config.cast.rangeRingColor);
  p.strokeWeight(1);
  p.drawingContext.setLineDash([4, 6]);
  worldCircle(p, config, boat.x, boat.y, config.cast.maxDistance);
  p.drawingContext.setLineDash([]);
  p.pop();

  // Raw drag indicator: literally the line from where you first pressed to
  // where the cursor is now - the cast fires the opposite way this points.
  const startPos = worldPoint(config, aim.startX, aim.startY);
  const dragPos = worldPoint(config, aim.dragX, aim.dragY);
  p.push();
  p.stroke(140, 148, 158, 160);
  p.strokeWeight(1.5);
  p.drawingContext.setLineDash([3, 5]);
  p.line(startPos.x, startPos.y, dragPos.x, dragPos.y);
  p.drawingContext.setLineDash([]);
  p.noStroke();
  p.fill(140, 148, 158, 200);
  p.circle(startPos.x, startPos.y, 6);
  p.circle(dragPos.x, dragPos.y, 8);
  p.pop();

  // Predicted trajectory: the same vector reversed, launched from the boat.
  let lineColor = config.aimColors.open;
  if (config.debug.showAimPrediction) {
    const landing = FishingRunner.classifyLanding(endX, endY, state.schools, config);
    lineColor = config.aimColors[landing.zone === 'inside' ? 'inside' : landing.zone === 'outside' ? 'outside' : 'open'];
  }

  p.push();
  p.stroke(lineColor);
  p.strokeWeight(2);
  p.line(boatPos.x, boatPos.y, endPos.x, endPos.y);
  p.noStroke();
  p.fill(lineColor);
  p.circle(endPos.x, endPos.y, 10);
  p.pop();
}

function drawBobber(p, state, config) {
  if (!state.bobber) {
    return;
  }

  const bobber = state.bobber;
  p.push();
  p.stroke(config.cast.lineColor);
  p.strokeWeight(1.5);
  worldLine(p, config, state.boat.x, state.boat.y, bobber.x, bobber.y);
  p.pop();

  const bob = state.mode === 'waiting' || state.mode === 'qte' || state.mode === 'trashCooldown' ? Math.sin(p.frameCount * 0.12) * 2 : 0;
  const hop = state.mode === 'flying' ? -bobber.arc * 30 : 0;
  const groundPos = worldPoint(config, bobber.x, bobber.y);
  const x = groundPos.x;
  const y = groundPos.y + hop + bob;

  if (state.mode === 'waiting' || state.mode === 'trashCooldown') {
    p.push();
    p.noFill();
    p.stroke(255, 255, 255, 70);
    p.strokeWeight(1);
    const ripple = (p.frameCount % 60) / 60;
    worldCircle(p, config, bobber.x, bobber.y, 5 + ripple * 13);
    p.pop();
  }

  p.push();
  p.noStroke();
  p.fill(config.cast.bobberColor);
  p.circle(x, y, 9);
  p.fill(state.mode === 'trashCooldown' ? config.trash.color : '#ff5f3a');
  p.circle(x, y - 4, 4);
  p.pop();

  if (state.mode === 'biteCue') {
    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(22);
    p.fill('#ffd23f');
    p.text('!', x, y - 24 + Math.sin(p.frameCount * 0.4) * 3);
    p.pop();
  }
}

function starsFor(quality, config) {
  return config.qte.starChar.repeat(Math.max(0, quality));
}

function drawQte(p, state, config) {
  if (!state.qte) {
    return;
  }

  const qte = state.qte;
  const bar = config.qte.bar;
  const stars = starsFor(qte.quality, config);
  const label = stars ? `Reeling in: ${qte.catchLevel.name} ${stars}` : `Reeling in: ${qte.catchLevel.name}`;

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(13);
  p.fill('#d8dee8');
  p.text(label, bar.x + bar.width / 2, bar.y - 34);
  p.pop();

  const pipRadius = 5;
  const pipGap = 16;
  const pipsWidth = (qte.roundsRequired - 1) * pipGap;
  const pipsStartX = bar.x + bar.width / 2 - pipsWidth / 2;
  p.push();
  p.noStroke();
  for (let i = 0; i < qte.roundsRequired; i++) {
    const filled = i < qte.roundIndex;
    const cx = pipsStartX + i * pipGap;
    const cy = bar.y - 14;
    const gotStar = qte.starPipIndices.includes(i);

    if (gotStar) {
      // Shape changes the instant the quality zone is collected; color only
      // follows once the round is actually completed.
      drawPipStar(p, cx, cy, pipRadius + 2, pipRadius - 2, filled ? config.qte.qualityColor : 'rgba(216,222,232,0.35)');
    } else if (filled) {
      p.fill('#3fbf5f');
      p.circle(cx, cy, pipRadius * 2);
    } else {
      p.fill('rgba(216,222,232,0.25)');
      p.circle(cx, cy, pipRadius * 2);
    }
  }
  p.pop();

  p.push();
  p.textAlign(p.LEFT, p.CENTER);
  p.textSize(14);
  for (let i = 0; i < config.qte.startingLives; i++) {
    p.fill(i < qte.lives ? '#ff5f5f' : 'rgba(216,222,232,0.2)');
    p.text(config.qte.skullChar, bar.x + i * 18, bar.y - 14);
  }
  p.pop();

  p.push();
  p.rectMode(p.CORNER);
  p.noStroke();
  p.fill('#1a1f26');
  p.rect(bar.x, bar.y, bar.width, bar.height, 4);

  const markColors = { hit: config.qte.hitMarkColor, quality: config.qte.qualityColor, miss: config.qte.missMarkColor };
  for (const mark of qte.pressMarks) {
    const alpha = clampAlpha(mark.fade / config.qte.pressMarkFadeSeconds) * config.qte.pressMarkOpacity;
    const markX = bar.x + mark.pos * bar.width;
    const [r, g, b] = config_color(markColors[mark.kind]);
    p.fill(r, g, b, alpha);
    p.rect(markX - 2, bar.y - 3, 4, bar.height + 6, 2);
  }

  if (qte.hasQualityZone) {
    const qualityX = bar.x + (qte.qualityCenter - qte.qualityWidth / 2) * bar.width;
    const qualityW = qte.qualityWidth * bar.width;
    p.fill(qte.qualityConsumed ? 'rgba(216,222,232,0.12)' : config.qte.qualityColor);
    p.rect(qualityX, bar.y, qualityW, bar.height, 4);
  }

  const zoneX = bar.x + (qte.zoneCenter - qte.zoneWidth / 2) * bar.width;
  const zoneW = qte.zoneWidth * bar.width;
  p.fill(qte.slowTimer > 0 ? '#5a8fae' : '#3aa0ff');
  p.rect(zoneX, bar.y, zoneW, bar.height, 4);

  const markerX = bar.x + qte.barPos * bar.width;
  const markerPulse = qte.caught ? 1 + 0.3 * Math.abs(Math.sin(p.frameCount * 0.3)) : 1;
  p.fill(qte.caught ? config.qte.caughtColor : '#ffffff');
  p.triangle(
    markerX - 6 * markerPulse, bar.y - 6 * markerPulse,
    markerX + 6 * markerPulse, bar.y - 6 * markerPulse,
    markerX, bar.y + 2 * markerPulse
  );
  p.pop();

  // Catch timer: a thin depleting line below the bar, so the time pressure
  // reads as a shrinking bar rather than a number you have to parse.
  const timerY = bar.y + bar.height + 6;
  const timerHeight = 3;
  const timerFraction = clampAlpha(qte.timeRemaining / qte.timeLimit);
  p.push();
  p.rectMode(p.CORNER);
  p.noStroke();
  p.fill('#1a1f26');
  p.rect(bar.x, timerY, bar.width, timerHeight, 2);
  p.fill(qte.timeRemaining <= qte.timeWarningThreshold ? '#ff5f5f' : '#d8dee8');
  p.rect(bar.x, timerY, bar.width * timerFraction, timerHeight, 2);
  p.pop();

  if (qte.flashTimer > 0) {
    const isCaught = qte.flashText === 'CAUGHT!';
    const flashDuration = isCaught ? config.qte.caughtDelaySeconds : config.qte.flashSeconds;
    const alpha = clampAlpha(qte.flashTimer / flashDuration);

    let flashColor = [63, 191, 95];
    if (qte.flashText === 'MISS') {
      flashColor = [255, 95, 95];
    } else if (qte.flashText === 'QUALITY +1') {
      flashColor = config_color(config.qte.qualityColor);
    } else if (isCaught) {
      flashColor = config_color(config.qte.caughtColor);
    }

    const pulse = isCaught ? 1 + 0.08 * Math.sin(p.frameCount * 0.3) : 1;

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize((isCaught ? 24 : 16) * pulse);
    p.fill(flashColor[0], flashColor[1], flashColor[2], alpha * 255);
    p.text(qte.flashText, bar.x + bar.width / 2, bar.y + bar.height + 26);
    p.pop();
  }
}

// A simple 5-point star, used to mark a round pip that also landed the
// quality zone.
function drawPipStar(p, cx, cy, outerRadius, innerRadius, color) {
  p.push();
  p.fill(color);
  p.beginShape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    p.vertex(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  p.endShape(p.CLOSE);
  p.pop();
}

function clampAlpha(v) {
  return Math.min(Math.max(v, 0), 1);
}

function drawResult(p, state, config) {
  if (!state.result) {
    return;
  }

  const totalSecondsByKind = {
    catch: config.result.catchSeconds,
    escaped: config.result.escapedSeconds,
    trash: config.result.trashSeconds,
  };
  const totalSeconds = totalSecondsByKind[state.result.kind];
  const alpha = clampAlpha(state.resultTimer / totalSeconds) * 0.5 + 0.5;
  let text;
  let color;
  if (state.result.kind === 'catch') {
    const stars = starsFor(state.result.quality, config);
    text = stars ? `Caught a ${state.result.catchLevel.name} ${stars}!` : `Caught a ${state.result.catchLevel.name}!`;
    color = [63, 191, 95];
  } else if (state.result.kind === 'escaped') {
    text = `The ${state.result.catchLevel.name} got away...`;
    color = [255, 95, 95];
  } else {
    text = `Junk: ${state.result.label}`;
    color = config_color(config.trash.color);
  }

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(28);
  p.fill(color[0], color[1], color[2], alpha * 255);
  p.text(text, config.canvas.width / 2, config.canvas.height / 2 - 120);
  p.pop();
}

function config_color(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return [r, g, b];
}

function drawHint(p, state, config) {
  if (state.mode !== 'idle') {
    return;
  }

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(13);
  p.fill(216, 222, 232, 160);
  p.text('Drag back like a slingshot, release to cast', config.canvas.width / 2, 40);
  p.pop();
}

function renderFrame(p, state, config) {
  p.background(config.canvas.background);

  if (config.debug.isometric) {
    Iso3D.ensureBaked(p, config);
  }

  drawWorldGrid(p, config);
  drawSchools(p, state, config);
  drawAimGuide(p, state, config);
  drawLandingMarker(p, state, config);
  drawBobber(p, state, config);
  drawBoat(p, state, config);
  drawQte(p, state, config);
  drawResult(p, state, config);
  drawHint(p, state, config);
  drawCompass(p, config);
}
