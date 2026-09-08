function drawNeedleEndpoints(p, state, config) {
  p.push();
  p.strokeWeight(config.needle.strokeWeight);
  p.stroke(config.needle.color);
  p.point(state.p0.x, state.p0.y);
  p.stroke(config.needle.tipColor);
  p.point(state.p3.x, state.p3.y);
  p.pop();
}

function drawHelpers(p, state, config) {
  p.push();
  p.strokeWeight(1);
  p.stroke(config.debug.helperLineColor);
  p.line(state.p0.x, state.p0.y, state.p1.x, state.p1.y);
  p.line(state.p1.x, state.p1.y, state.p2.x, state.p2.y);
  p.line(state.p3.x, state.p3.y, state.p2.x, state.p2.y);
  p.strokeWeight(3);
  p.stroke(config.debug.helperColor);
  p.point(state.p1.x, state.p1.y);
  p.point(state.p2.x, state.p2.y);
  p.pop();

  drawPointLabel(p, state.p0, 'p0', config);
  drawPointLabel(p, state.p1, 'p1', config);
  drawPointLabel(p, state.p2, 'p2', config);
  drawPointLabel(p, state.p3, 'p3', config);
}

function drawPointLabel(p, point, label, config) {
  p.push();
  p.noStroke();
  p.fill(config.debug.labelColor);
  p.textSize(7);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text(label, point.x + 4, point.y - 3);
  p.pop();
}

function drawCurve(p, state, config) {
  p.push();
  p.noFill();
  p.stroke(config.curve.color);
  p.strokeWeight(config.curve.strokeWeight);
  p.bezier(
    state.p0.x, state.p0.y,
    state.p1.x, state.p1.y,
    state.p2.x, state.p2.y,
    state.p3.x, state.p3.y
  );
  p.pop();
}

function drawScene(p, config) {
  p.push();
  p.noStroke();
  p.fill(config.surface.color);
  const y = p.height - config.surface.marginBottom - config.surface.thickness;
  p.rect(0, y, p.width, config.surface.thickness);
  p.pop();
}

function drawHandle(p, state, config) {
  p.push();
  p.noStroke();
  p.fill(config.handle.color);
  p.rectMode(p.CENTER);
  p.rect(state.p0.x, state.p0.y - config.handle.height / 2, config.handle.width, config.handle.height);
  p.pop();
}

function drawTool(p, state, config) {
  p.push();
  p.translate(state.anchor.x, state.anchor.y);
  p.rotate(state.rotation);
  p.scale(config.scene.scale);

  if (config.debug.showHelpers) {
    drawNeedleEndpoints(p, state, config);
    drawHelpers(p, state, config);
  }
  drawCurve(p, state, config);

  p.push();
  p.rotate(state.handleRotation);
  drawHandle(p, state, config);
  p.pop();

  p.pop();
}

function renderFrame(p, state, config) {
  p.background(config.canvas.background);
  drawScene(p, config);
  drawTool(p, state, config);
}
