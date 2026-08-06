function tensionColor(p, config, tension) {
  const t = p.constrain(tension / config.rope.tensionVisualMax, 0, 1);
  const slack = p.color(config.rope.colorSlack);
  const taut = p.color(config.rope.colorTaut);
  const nearSnap = p.color(config.rope.colorNearSnap);

  if (t < 0.5) {
    return p.lerpColor(slack, taut, t / 0.5);
  }
  return p.lerpColor(taut, nearSnap, (t - 0.5) / 0.5);
}

function riverBandTop(config) {
  return config.river.topMargin;
}

function riverBandBottom(config) {
  return config.river.topMargin + config.canvas.height * config.river.heightFraction;
}

function vortexRadius(config) {
  return config.canvas.height * config.vortex.radiusFraction;
}

function vortexCenter(config) {
  const radius = vortexRadius(config);
  return {
    x: radius + config.vortex.marginLeft,
    y: config.canvas.height - radius - config.vortex.marginBottom,
  };
}

function drawRiverZone(p, config) {
  p.push();
  p.noStroke();
  p.fill(config.river.color[0], config.river.color[1], config.river.color[2], config.river.fillOpacity);
  p.rect(0, riverBandTop(config), config.canvas.width, riverBandBottom(config) - riverBandTop(config));
  p.pop();
}

function drawVortexZone(p, config) {
  const center = vortexCenter(config);
  const radius = vortexRadius(config);

  p.push();
  p.noStroke();
  p.fill(config.vortex.color[0], config.vortex.color[1], config.vortex.color[2], config.vortex.fillOpacity);
  p.circle(center.x, center.y, radius * 2);

  p.noFill();
  p.stroke(config.vortex.color[0], config.vortex.color[1], config.vortex.color[2], config.vortex.fillOpacity * 2);
  p.strokeWeight(1);
  p.circle(center.x, center.y, radius * 1.3);
  p.circle(center.x, center.y, radius * 0.6);
  p.pop();
}

function drawFlowObstacles(p, state, config) {
  p.push();
  p.rectMode(p.CENTER);
  p.noStroke();
  p.fill(config.flowObstacles.color);
  for (const obstacle of state.flowObstacles) {
    p.rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }
  p.pop();
}

function drawObstacles(p, state, config) {
  p.push();
  p.rectMode(p.CENTER);
  p.noStroke();
  for (const obstacle of state.obstacles) {
    p.fill(obstacle.color || '#4a4f57');
    p.rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }
  p.pop();
}

function drawRope(p, state, config) {
  p.push();
  p.strokeWeight(3);

  if (state.rope.attached) {
    const col = tensionColor(p, config, state.rope.tension);
    p.stroke(col);
    p.line(state.player.x, state.player.y, state.rope.attachX, state.rope.attachY);
  } else {
    p.stroke('#6a7280');
    p.drawingContext.setLineDash([5, 6]);

    const dx = state.rope.attachX - state.player.x;
    const dy = state.rope.attachY - state.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const fragLen = 20;

    p.line(
      state.player.x,
      state.player.y,
      state.player.x + (dx / dist) * fragLen,
      state.player.y + (dy / dist) * fragLen
    );
    p.line(
      state.rope.attachX,
      state.rope.attachY,
      state.rope.attachX - (dx / dist) * fragLen,
      state.rope.attachY - (dy / dist) * fragLen
    );

    p.drawingContext.setLineDash([]);
  }

  p.pop();
}

function drawPlayer(p, state, config) {
  p.push();
  p.noStroke();
  p.fill(config.player.color);
  p.circle(state.player.x, state.player.y, config.player.radius * 2);
  p.pop();
}

function drawTowed(p, state, config) {
  const bodyWidth = config.towed.bodyWidth;
  const bodyHeight = config.towed.bodyHeight;
  const roofHeight = config.towed.roofHeight;

  p.push();
  p.translate(state.towed.x, state.towed.y);
  p.rotate(state.towed.angle);
  p.noStroke();
  p.fill(config.towed.color);

  p.rectMode(p.CENTER);
  p.rect(0, 0, bodyWidth, bodyHeight);

  p.triangle(
    -bodyWidth / 2, -bodyHeight / 2,
    bodyWidth / 2, -bodyHeight / 2,
    0, -bodyHeight / 2 - roofHeight
  );

  p.pop();
}

function drawTargetMarker(p, state, config) {
  const target = state.input.target;
  p.push();
  p.noFill();
  p.stroke('#ffffff');
  p.strokeWeight(1.5);
  p.circle(target.x, target.y, 16);
  p.line(target.x - 10, target.y, target.x + 10, target.y);
  p.line(target.x, target.y - 10, target.x, target.y + 10);
  p.pop();
}

function percentToGaugeY(percent, gauge, config) {
  const clamped = Math.min(Math.max(percent, 0), config.rope.gaugeMaxPercent);
  const t = clamped / config.rope.gaugeMaxPercent;
  return gauge.y + gauge.height - t * gauge.height;
}

function drawTensionGauge(p, state, config) {
  const gauge = config.hud.gauge;

  p.push();
  p.rectMode(p.CORNER);
  p.noStroke();
  p.fill('#1a1f26');
  p.rect(gauge.x, gauge.y, gauge.width, gauge.height);

  p.stroke('#3a4048');
  p.strokeWeight(1);
  for (let percent = 0; percent <= config.rope.gaugeMaxPercent; percent += config.rope.gaugeTickIntervalPercent) {
    const y = percentToGaugeY(percent, gauge, config);
    const isHundred = percent === 100;
    p.strokeWeight(isHundred ? 2 : 1);
    p.stroke(isHundred ? '#c8cfd9' : '#3a4048');
    p.line(gauge.x, y, gauge.x + gauge.width, y);
  }

  const tensionPercent = (state.rope.tension / config.rope.tensionVisualMax) * 100;
  const thresholdPercent = (state.rope.snapThreshold / config.rope.tensionVisualMax) * 100;

  const thresholdY = percentToGaugeY(thresholdPercent, gauge, config);
  p.stroke('#c8cfd9');
  p.strokeWeight(1);
  p.line(gauge.x - 6, thresholdY, gauge.x, thresholdY);

  const peakPercent = (state.rope.peak / config.rope.tensionVisualMax) * 100;
  const peakY = percentToGaugeY(peakPercent, gauge, config);
  p.stroke(255, 255, 255, 190);
  p.strokeWeight(2);
  p.line(gauge.x, peakY, gauge.x + gauge.width, peakY);

  const tensionY = percentToGaugeY(tensionPercent, gauge, config);
  const arrowColor = tensionColor(p, config, state.rope.tension);
  p.noStroke();
  p.fill(arrowColor);
  p.triangle(
    gauge.x + gauge.width, tensionY,
    gauge.x + gauge.width + 10, tensionY - 5,
    gauge.x + gauge.width + 10, tensionY + 5
  );

  p.pop();
}

function renderFrame(p, state, config) {
  p.background(config.canvas.background);

  drawRiverZone(p, config);
  drawVortexZone(p, config);
  drawObstacles(p, state, config);
  drawFlowObstacles(p, state, config);
  drawRope(p, state, config);
  drawTowed(p, state, config);
  drawPlayer(p, state, config);

  if (config.debug.showTargetMarker && state.input.target) {
    drawTargetMarker(p, state, config);
  }

  drawTensionGauge(p, state, config);
}
