const PhysicsRunner = (function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function wrapDelta(value, dimension) {
    if (value > dimension / 2) {
      return value - dimension;
    }
    if (value < -dimension / 2) {
      return value + dimension;
    }
    return value;
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

  function spawnFlowObstacle(config) {
    const bandTop = riverBandTop(config);
    const bandBottom = riverBandBottom(config);
    const halfHeight = config.flowObstacles.height / 2;
    const minY = bandTop + halfHeight + 4;
    const maxY = Math.max(minY, bandBottom - halfHeight - 4);
    const y = randomRange(minY, maxY);
    const speed = config.flowObstacles.baseSpeed + randomRange(-config.flowObstacles.speedVariance, config.flowObstacles.speedVariance);

    return {
      x: -config.flowObstacles.width,
      y,
      vx: speed,
      vy: 0,
      width: config.flowObstacles.width,
      height: config.flowObstacles.height,
      collisionRadius: config.flowObstacles.collisionRadius,
      mass: config.flowObstacles.mass,
    };
  }

  function buildFreshState(config) {
    const cx = config.canvas.width - config.spawn.marginRight;
    const cy = config.canvas.height - config.spawn.marginBottom;

    const towedMass = config.player.mass * config.towed.massRatio;
    const towedMomentOfInertia =
      (towedMass * (config.towed.bodyWidth * config.towed.bodyWidth + config.towed.bodyHeight * config.towed.bodyHeight)) / 12;

    return {
      player: {
        x: cx - config.rope.maxLength * 0.45,
        y: cy,
        vx: 0,
        vy: 0,
      },
      towed: {
        x: cx + config.rope.maxLength * 0.45,
        y: cy,
        vx: 0,
        vy: 0,
        angle: 0,
        angularVelocity: 0,
        mass: towedMass,
        momentOfInertia: towedMomentOfInertia,
      },
      rope: {
        attached: true,
        snapped: false,
        tension: 0,
        baseline: 0,
        snapThreshold: config.rope.snapFlatMin,
        overThresholdTimer: 0,
        attachX: 0,
        attachY: 0,
        peak: 0,
        peakHoldTimer: 0,
      },
      obstacles: config.obstacles.map((obstacle) => ({ ...obstacle })),
      flowObstacles: [],
      flowSpawnTimer: randomRange(config.flowObstacles.minSpawnIntervalSeconds, config.flowObstacles.maxSpawnIntervalSeconds),
      input: { target: null },
    };
  }

  function resetStateInPlace(state, config) {
    const fresh = buildFreshState(config);
    Object.assign(state, fresh);
  }

  function createState(config) {
    return buildFreshState(config);
  }

  function stepPlayerMovement(state, input, dt, config) {
    if (input.target) {
      const dx = input.target.x - state.player.x;
      const dy = input.target.y - state.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1e-6) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        state.player.vx += dirX * config.player.accel * dt;
        state.player.vy += dirY * config.player.accel * dt;
      }
    }
  }

  function computeAttachPoint(state, config) {
    const cosA = Math.cos(state.towed.angle);
    const sinA = Math.sin(state.towed.angle);
    const offX = config.towed.attachOffset.x;
    const offY = config.towed.attachOffset.y;
    const worldOffX = offX * cosA - offY * sinA;
    const worldOffY = offX * sinA + offY * cosA;
    return {
      worldOffX,
      worldOffY,
      x: state.towed.x + worldOffX,
      y: state.towed.y + worldOffY,
    };
  }

  function stepRope(state, dt, config) {
    const attach = computeAttachPoint(state, config);
    state.rope.attachX = attach.x;
    state.rope.attachY = attach.y;

    if (!state.rope.attached) {
      return;
    }

    const dx = wrapDelta(attach.x - state.player.x, config.canvas.width);
    const dy = wrapDelta(attach.y - state.player.y, config.canvas.height);
    const distance = Math.hypot(dx, dy);

    let tension = 0;

    if (distance > 1e-6) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      const overshoot = Math.max(0, distance - config.rope.maxLength);

      if (overshoot > 0) {
        const towedAttachVx = state.towed.vx - state.towed.angularVelocity * attach.worldOffY;
        const towedAttachVy = state.towed.vy + state.towed.angularVelocity * attach.worldOffX;
        const relVelX = towedAttachVx - state.player.vx;
        const relVelY = towedAttachVy - state.player.vy;
        const closingSpeed = relVelX * dirX + relVelY * dirY;

        tension = Math.max(0, overshoot * config.rope.stiffness + closingSpeed * config.rope.damping);
      }

      state.player.vx += ((dirX * tension) / config.player.mass) * dt;
      state.player.vy += ((dirY * tension) / config.player.mass) * dt;

      const fx = -dirX * tension;
      const fy = -dirY * tension;
      state.towed.vx += (fx / state.towed.mass) * dt;
      state.towed.vy += (fy / state.towed.mass) * dt;

      const torque = attach.worldOffX * fy - attach.worldOffY * fx;
      state.towed.angularVelocity += (torque / state.towed.momentOfInertia) * dt;
    }

    state.rope.tension = tension;

    state.rope.baseline += (tension - state.rope.baseline) * (dt / config.rope.snapBaselineTimeConstant);
    const snapThreshold = state.rope.baseline * (1 + config.rope.snapExtraPercent) + config.rope.snapFlatMin;
    state.rope.snapThreshold = snapThreshold;

    if (tension > snapThreshold) {
      state.rope.overThresholdTimer += dt;
    } else {
      state.rope.overThresholdTimer = 0;
    }

    if (state.rope.overThresholdTimer >= config.rope.snapSustainSeconds) {
      state.rope.attached = false;
      state.rope.snapped = true;
    }
  }

  function stepGaugePeak(state, dt, config) {
    if (state.rope.tension >= state.rope.peak) {
      state.rope.peak = state.rope.tension;
      state.rope.peakHoldTimer = 0;
    } else {
      state.rope.peakHoldTimer += dt;
      if (state.rope.peakHoldTimer > config.rope.gaugePeakHoldSeconds) {
        state.rope.peak = Math.max(state.rope.tension, state.rope.peak - config.rope.gaugePeakFallPerSecond * dt);
      }
    }
  }

  function applyZoneForces(body, mass, dt, config) {
    if (body.y >= riverBandTop(config) && body.y <= riverBandBottom(config)) {
      body.vx += (config.river.force.x / mass) * dt;
      body.vy += (config.river.force.y / mass) * dt;
    }

    const center = vortexCenter(config);
    const radius = vortexRadius(config);
    const dx = center.x - body.x;
    const dy = center.y - body.y;
    const dist = Math.hypot(dx, dy);

    if (dist < radius && dist > 1e-6) {
      const falloff = 1 - dist / radius;
      const nx = dx / dist;
      const ny = dy / dist;
      const tx = -ny;
      const ty = nx;
      const pull = config.vortex.pullStrength * falloff;
      const swirl = config.vortex.swirlStrength * falloff;
      body.vx += ((nx * pull + tx * swirl) / mass) * dt;
      body.vy += ((ny * pull + ty * swirl) / mass) * dt;
    }
  }

  function stepFlowObstacles(state, dt, config) {
    if (!config.flowObstacles.enabled) {
      return;
    }

    state.flowSpawnTimer -= dt;
    if (state.flowSpawnTimer <= 0) {
      state.flowObstacles.push(spawnFlowObstacle(config));
      state.flowSpawnTimer = randomRange(config.flowObstacles.minSpawnIntervalSeconds, config.flowObstacles.maxSpawnIntervalSeconds);
    }

    for (const obstacle of state.flowObstacles) {
      applyZoneForces(obstacle, obstacle.mass, dt, config);
      obstacle.x += obstacle.vx * dt;
      obstacle.y += obstacle.vy * dt;
    }

    const margin = 100;
    state.flowObstacles = state.flowObstacles.filter(
      (obstacle) =>
        obstacle.x > -margin &&
        obstacle.x < config.canvas.width + margin &&
        obstacle.y > -margin &&
        obstacle.y < config.canvas.height + margin
    );
  }

  function applyDragAndIntegrate(state, dt, config) {
    state.player.vx *= config.player.drag;
    state.player.vy *= config.player.drag;

    const speed = Math.hypot(state.player.vx, state.player.vy);
    if (speed > config.player.maxSpeed) {
      const scale = config.player.maxSpeed / speed;
      state.player.vx *= scale;
      state.player.vy *= scale;
    }

    state.towed.vx *= config.towed.linearDrag;
    state.towed.vy *= config.towed.linearDrag;
    state.towed.angularVelocity *= config.towed.angularDrag;

    state.player.x += state.player.vx * dt;
    state.player.y += state.player.vy * dt;

    state.towed.x += state.towed.vx * dt;
    state.towed.y += state.towed.vy * dt;
    state.towed.angle += state.towed.angularVelocity * dt;
  }

  function wrapEntity(body, config) {
    const width = config.canvas.width;
    const height = config.canvas.height;

    if (body.x < 0) {
      body.x += width;
    } else if (body.x > width) {
      body.x -= width;
    }

    if (body.y < 0) {
      body.y += height;
    } else if (body.y > height) {
      body.y -= height;
    }
  }

  function resolvePairCircleCircle(a, aRadius, aInvMass, b, bRadius, bInvMass, restitution) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = aRadius + bRadius;

    if (dist > 1e-6 && dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      const totalInvMass = aInvMass + bInvMass;

      a.x -= nx * overlap * (aInvMass / totalInvMass);
      a.y -= ny * overlap * (aInvMass / totalInvMass);
      b.x += nx * overlap * (bInvMass / totalInvMass);
      b.y += ny * overlap * (bInvMass / totalInvMass);

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      if (velAlongNormal < 0) {
        const j = (-(1 + restitution) * velAlongNormal) / totalInvMass;
        a.vx -= j * nx * aInvMass;
        a.vy -= j * ny * aInvMass;
        b.vx += j * nx * bInvMass;
        b.vy += j * ny * bInvMass;
      }
    }
  }

  function resolveCircleBox(body, radius, obstacle, config) {
    const minX = obstacle.x - obstacle.width / 2;
    const maxX = obstacle.x + obstacle.width / 2;
    const minY = obstacle.y - obstacle.height / 2;
    const maxY = obstacle.y + obstacle.height / 2;

    const closestX = clamp(body.x, minX, maxX);
    const closestY = clamp(body.y, minY, maxY);

    const dx = body.x - closestX;
    const dy = body.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= radius * radius) {
      return;
    }

    const dist = Math.sqrt(distSq);
    let nx;
    let ny;

    if (dist > 1e-6) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      const penLeft = body.x - minX;
      const penRight = maxX - body.x;
      const penTop = body.y - minY;
      const penBottom = maxY - body.y;
      const minPen = Math.min(penLeft, penRight, penTop, penBottom);
      if (minPen === penLeft) {
        nx = -1;
        ny = 0;
      } else if (minPen === penRight) {
        nx = 1;
        ny = 0;
      } else if (minPen === penTop) {
        nx = 0;
        ny = -1;
      } else {
        nx = 0;
        ny = 1;
      }
    }

    const overlap = radius - dist;
    body.x += nx * overlap;
    body.y += ny * overlap;

    const velAlongNormal = body.vx * nx + body.vy * ny;
    if (velAlongNormal < 0) {
      const j = -(1 + config.collision.restitution) * velAlongNormal;
      body.vx += j * nx;
      body.vy += j * ny;
    }
  }

  function resolveCollisions(state, config) {
    if (!config.collision.enabled) {
      return;
    }

    resolvePairCircleCircle(
      state.player, config.player.radius, 1 / config.player.mass,
      state.towed, config.towed.collisionRadius, 1 / state.towed.mass,
      config.collision.restitution
    );

    for (const obstacle of state.obstacles) {
      resolveCircleBox(state.player, config.player.radius, obstacle, config);
      resolveCircleBox(state.towed, config.towed.collisionRadius, obstacle, config);
    }

    for (const flowObstacle of state.flowObstacles) {
      resolvePairCircleCircle(
        state.player, config.player.radius, 1 / config.player.mass,
        flowObstacle, flowObstacle.collisionRadius, 1 / flowObstacle.mass,
        config.collision.restitution
      );
      resolvePairCircleCircle(
        state.towed, config.towed.collisionRadius, 1 / state.towed.mass,
        flowObstacle, flowObstacle.collisionRadius, 1 / flowObstacle.mass,
        config.collision.restitution
      );
    }
  }

  function refreshTowedMassProperties(state, config) {
    const mass = config.player.mass * config.towed.massRatio;
    state.towed.mass = mass;
    state.towed.momentOfInertia =
      (mass * (config.towed.bodyWidth * config.towed.bodyWidth + config.towed.bodyHeight * config.towed.bodyHeight)) / 12;
  }

  function step(state, input, dt, config) {
    state.input = { target: input.target };

    if (input.resetRequested) {
      resetStateInPlace(state, config);
      return;
    }

    refreshTowedMassProperties(state, config);
    stepPlayerMovement(state, input, dt, config);
    stepRope(state, dt, config);
    if (!state.rope.snapped) {
      stepGaugePeak(state, dt, config);
    }

    applyZoneForces(state.player, config.player.mass, dt, config);
    applyZoneForces(state.towed, state.towed.mass, dt, config);
    stepFlowObstacles(state, dt, config);

    applyDragAndIntegrate(state, dt, config);
    wrapEntity(state.player, config);
    wrapEntity(state.towed, config);
    resolveCollisions(state, config);
  }

  return { createState, step };
})();
