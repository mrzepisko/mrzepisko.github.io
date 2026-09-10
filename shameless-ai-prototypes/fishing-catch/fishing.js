const FishingRunner = (function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function pickWeighted(list, weightOf = (item) => item.weight) {
    const total = list.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = Math.random() * total;
    for (const item of list) {
      const weight = weightOf(item);
      if (roll < weight) {
        return item;
      }
      roll -= weight;
    }
    return list[list.length - 1];
  }

  const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'extreme'];

  // Every tier has 3 difficulty levels (1-12 overall). A school's pool is
  // its own tier's 3 levels plus a one-level overlap borrowed from each
  // neighboring tier (the neighbor's edge closest to this tier) - own
  // levels dominate, borrowed levels are rarer.
  function buildLevelPool(school, config) {
    const tierIndex = DIFFICULTY_ORDER.indexOf(school.difficulty);
    const ownStart = tierIndex * 3 + 1;
    const ownEnd = ownStart + 2;

    const entries = [];
    for (let level = ownStart; level <= ownEnd; level++) {
      entries.push({ level, weight: 1 });
    }
    if (tierIndex > 0) {
      entries.push({ level: ownStart - 1, weight: config.schools.levelOverlapWeight });
    }
    if (tierIndex < DIFFICULTY_ORDER.length - 1) {
      entries.push({ level: ownEnd + 1, weight: config.schools.levelOverlapWeight });
    }
    return entries;
  }

  // A level's name is intrinsic to the level itself, not the school it was
  // caught in - level 4 is always "Medium I", whether hooked in the Medium
  // school or borrowed as the Easy school's hardest overlap.
  function levelInfo(level, config) {
    const tierIndex = Math.floor((level - 1) / 3);
    const withinTier = (level - 1) % 3;
    const tier = config.schools.difficultyTiers[DIFFICULTY_ORDER[tierIndex]];
    return {
      level,
      name: `${tier.label} ${config.schools.levelNames[withinTier]}`,
      color: tier.color,
    };
  }

  function pickCatchLevelForSchool(school, config) {
    const pool = buildLevelPool(school, config);
    const picked = pickWeighted(pool, (entry) => entry.weight);
    return levelInfo(picked.level, config);
  }

  function roundsRequiredForLevel(level, config) {
    return config.qte.roundsByLevel[level - 1];
  }

  function buildSchoolFish(school, config) {
    const fish = [];
    for (let i = 0; i < config.schools.fishPerSchool; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * school.wanderRadius;
      const heading = Math.random() * Math.PI * 2;
      fish.push({
        x: school.x + Math.cos(angle) * radius,
        y: school.y + Math.sin(angle) * radius,
        angle: heading,
        targetAngle: heading,
        turnTimer: randomRange(0.5, 1.5),
      });
    }
    return fish;
  }

  // Turns partway from `current` toward `target` at up to `maxDelta` radians,
  // taking the shorter way around - a real fish's rendered heading changes
  // smoothly, this is what stops it from snapping to face a new direction.
  function stepTowardAngle(current, target, maxDelta) {
    let diff = target - current;
    while (diff > Math.PI) {
      diff -= Math.PI * 2;
    }
    while (diff < -Math.PI) {
      diff += Math.PI * 2;
    }
    if (Math.abs(diff) <= maxDelta) {
      return target;
    }
    return current + Math.sign(diff) * maxDelta;
  }

  function buildFreshState(config) {
    return {
      mode: 'idle',
      boat: { x: config.canvas.width / 2, y: config.canvas.height / 2 },
      schools: config.schools.points.map((school) => ({
        ...school,
        fish: buildSchoolFish(school, config),
      })),
      aim: null,
      bobber: null,
      landing: null,
      landingMarker: null,
      biteFish: null,
      biteFishSpeed: 0,
      hookedFish: null,
      waitTimer: 0,
      biteCueTimer: 0,
      qte: null,
      result: null,
      resultTimer: 0,
      catchCount: 0,
      trashCount: 0,
      escapedCount: 0,
      castElapsed: 0,
      qteElapsed: 0,
      stats: {
        catchDurationTotal: 0,
        catchDurationCount: 0,
        roundTimeTotal: 0,
        roundCountTotal: 0,
      },
      catchLog: {},
    };
  }

  function resetStateInPlace(state, config) {
    Object.assign(state, buildFreshState(config));
  }

  function createState(config) {
    return buildFreshState(config);
  }

  function stepFishWander(state, dt, config) {
    for (const school of state.schools) {
      for (const fish of school.fish) {
        if (fish === state.biteFish || fish === state.hookedFish) {
          // Either chasing the bobber (own steering below) or already
          // hooked and holding still through the reel - it only rejoins
          // ambient wandering if the fight is lost (removed outright on a
          // successful catch instead, see beginResult).
          continue;
        }

        fish.turnTimer -= dt;
        if (fish.turnTimer <= 0) {
          fish.targetAngle += randomRange(-1, 1);
          fish.turnTimer = randomRange(0.5, 1.5);
        }

        if (distance(fish.x, fish.y, school.x, school.y) > school.wanderRadius) {
          fish.targetAngle = Math.atan2(school.y - fish.y, school.x - fish.x);
        }

        fish.angle = stepTowardAngle(fish.angle, fish.targetAngle, config.schools.fishTurnRate * dt);

        const speed = config.schools.fishSpeed;
        fish.x += Math.cos(fish.angle) * speed * dt;
        fish.y += Math.sin(fish.angle) * speed * dt;
      }
    }
  }

  // The fish that noticed the bait beelines for the bobber - faster than
  // ambient wandering, so it's likely to actually arrive within the bite
  // delay rather than still be crossing open water when the bite fires.
  function stepBiteFishChase(state, dt, config) {
    if (!state.biteFish || !state.bobber) {
      return;
    }

    const fish = state.biteFish;
    const dx = state.bobber.x - fish.x;
    const dy = state.bobber.y - fish.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= config.schools.biteChaseArrivalRadius) {
      return;
    }

    fish.angle = stepTowardAngle(fish.angle, Math.atan2(dy, dx), config.schools.fishTurnRate * dt);
    const speed = state.biteFishSpeed || config.schools.biteChaseSpeed;
    fish.x += Math.cos(fish.angle) * speed * dt;
    fish.y += Math.sin(fish.angle) * speed * dt;
  }

  function classifyLanding(x, y, schools, config) {
    let best = null;
    let bestDist = Infinity;
    for (const school of schools) {
      const d = distance(x, y, school.x, school.y);
      if (d < bestDist) {
        bestDist = d;
        best = school;
      }
    }

    if (!best) {
      return { zone: 'open' };
    }
    if (bestDist <= best.innerRadius) {
      return { zone: 'inside', school: best, dist: bestDist };
    }
    if (bestDist <= best.outerRadius) {
      return { zone: 'outside', school: best, dist: bestDist };
    }
    return { zone: 'open' };
  }

  function computeBiteDelay(landing, config) {
    if (landing.zone === 'inside') {
      return randomRange(config.bite.innerMinSeconds, config.bite.innerMaxSeconds);
    }
    if (landing.zone === 'outside') {
      const school = landing.school;
      const t = clamp((landing.dist - school.innerRadius) / (school.outerRadius - school.innerRadius), 0, 1);
      return lerp(config.bite.innerMaxSeconds, config.bite.outerMaxSeconds, t);
    }
    return 0;
  }

  function launchCast(state, aim, config) {
    state.castElapsed = 0;

    const targetX = state.boat.x + Math.cos(aim.angle) * aim.distance;
    const targetY = state.boat.y + Math.sin(aim.angle) * aim.distance;

    // Even a well-aimed cast doesn't land pixel-perfect - scatter it a
    // little within a small radius of the intended spot (uniform over the
    // disc, not just the radius, so it doesn't cluster near the center).
    const scatterAngle = Math.random() * Math.PI * 2;
    const scatterDist = Math.sqrt(Math.random()) * config.cast.landingScatterRadius;
    const landX = targetX + Math.cos(scatterAngle) * scatterDist;
    const landY = targetY + Math.sin(scatterAngle) * scatterDist;

    state.bobber = {
      startX: state.boat.x,
      startY: state.boat.y,
      x: state.boat.x,
      y: state.boat.y,
      targetX: landX,
      targetY: landY,
      t: 0,
      duration: config.cast.flightSeconds,
      arc: 0,
    };

    // Shows the possible scatter range (circle, around the intended spot)
    // and exactly where it's actually going to land (cross) - stays fully
    // visible through the flight, then fades once the bobber lands.
    state.landingMarker = {
      targetX,
      targetY,
      landX,
      landY,
      fadeTimer: null,
    };

    state.mode = 'flying';
  }

  function stepLandingMarkerFade(state, dt, config) {
    const marker = state.landingMarker;
    if (!marker || marker.fadeTimer === null) {
      return;
    }
    marker.fadeTimer -= dt;
    if (marker.fadeTimer <= 0) {
      state.landingMarker = null;
    }
  }

  // Two-point drag: direction and strength come from the difference between
  // where the drag started and where the cursor is now - not from the
  // boat's position, and not inverted. The cast still launches from the
  // boat itself; this vector is just translated there.
  // Aim math always runs in world space - startX/dragX etc. are world
  // coordinates, not screen pixels, so this stays correct regardless of
  // which projection is currently drawing the world (top-down or iso).
  function updateAimVector(state, input, config) {
    const dx = input.worldMouseX - state.aim.startX;
    const dy = input.worldMouseY - state.aim.startY;
    const rawDistance = Math.hypot(dx, dy);
    state.aim.dragX = input.worldMouseX;
    state.aim.dragY = input.worldMouseY;
    // Slingshot-style: the cast fires opposite the drag - pull away from
    // where you want to throw, same start/current-point tracking as before.
    state.aim.angle = Math.atan2(-dy, -dx);
    state.aim.rawDistance = rawDistance;
    state.aim.distance = clamp(rawDistance * config.cast.powerMultiplier, 0, config.cast.maxDistance);
  }

  // Idle only reacts to a fresh press edge, never a held-down button - this is
  // what stops a cancel (which drops into idle) from also starting a new drag
  // on the same press that caused it. The player must release first.
  function stepIdle(state, input, dt, config) {
    if (input.pressEdge) {
      input.pressEdge = false;
      state.aim = {
        startX: input.worldMouseX,
        startY: input.worldMouseY,
        dragX: input.worldMouseX,
        dragY: input.worldMouseY,
        angle: 0,
        rawDistance: 0,
        distance: 0,
      };
      state.mode = 'aiming';
    }
  }

  function stepAiming(state, input, dt, config) {
    if (input.aimActive) {
      updateAimVector(state, input, config);
    }

    if (input.justReleased) {
      input.justReleased = false;
      const aim = state.aim;
      state.aim = null;
      if (aim && aim.rawDistance >= config.cast.minDragDistance) {
        launchCast(state, aim, config);
      } else {
        state.mode = 'idle';
      }
    }
  }

  const CANCELABLE_MODES = { flying: true, waiting: true, trashCooldown: true };

  function cancelCast(state) {
    state.bobber = null;
    state.landing = null;
    state.biteFish = null;
    state.landingMarker = null;
    state.waitTimer = 0;
    state.biteCueTimer = 0;
    state.mode = 'idle';
  }

  function resolveLanding(state, config) {
    const landing = classifyLanding(state.bobber.x, state.bobber.y, state.schools, config);
    state.landing = landing;

    if (state.landingMarker) {
      state.landingMarker.fadeTimer = config.cast.landingMarkerFadeSeconds;
    }

    if (landing.zone === 'open') {
      state.waitTimer = randomRange(config.trash.cooldownMinSeconds, config.trash.cooldownMaxSeconds);
      state.mode = 'trashCooldown';
      return;
    }

    state.waitTimer = computeBiteDelay(landing, config);
    state.biteFish = landing.school.fish[Math.floor(Math.random() * landing.school.fish.length)];

    // Pace the chase so it arrives right around when the bite actually
    // fires, whether that's a fast inside-zone bite or a slow outer one -
    // not an arbitrary constant speed that arrives early or too late.
    const chaseDistance = distance(state.biteFish.x, state.biteFish.y, state.bobber.x, state.bobber.y);
    const rawSpeed = chaseDistance / Math.max(state.waitTimer, 0.1);
    state.biteFishSpeed = clamp(rawSpeed, config.schools.biteChaseSpeed * 0.5, config.schools.biteChaseSpeed * 5);

    state.mode = 'waiting';
  }

  function stepFlying(state, input, dt, config) {
    const bobber = state.bobber;
    bobber.t += dt;
    const t = clamp(bobber.t / bobber.duration, 0, 1);
    bobber.x = lerp(bobber.startX, bobber.targetX, t);
    bobber.y = lerp(bobber.startY, bobber.targetY, t);
    bobber.arc = Math.sin(t * Math.PI);

    if (t >= 1) {
      resolveLanding(state, config);
    }
  }

  function stepWaiting(state, input, dt, config) {
    state.waitTimer -= dt;
    if (state.waitTimer <= 0) {
      state.biteCueTimer = config.bite.cueSeconds;
      state.mode = 'biteCue';
    }
  }

  function stepTrashCooldown(state, input, dt, config) {
    state.waitTimer -= dt;
    if (state.waitTimer <= 0) {
      beginResult(state, 'trash', null, 0, config);
    }
  }

  function stepBiteCue(state, input, dt, config) {
    state.biteCueTimer -= dt;
    if (state.biteCueTimer <= 0) {
      beginQte(state, config);
    }
  }

  // Difficulty now also compresses the width curve itself, not just the
  // round count: level 1 (Easy I) keeps today's per-round widths as-is,
  // while level 12 (Extreme III) is scaled down so its first round is as
  // narrow as today's Extreme III last round - every level in between
  // interpolates linearly.
  function levelWidthScale(level, config) {
    const rounds = config.qte.rounds;
    const targetScale = rounds[rounds.length - 1].zoneWidthFraction / rounds[0].zoneWidthFraction;
    return lerp(1, targetScale, (level - 1) / 11);
  }

  function roundPreset(index, level, config) {
    const rounds = config.qte.rounds;
    const preset = rounds[Math.min(index, rounds.length - 1)];
    const scale = levelWidthScale(level, config);
    return { zoneWidthFraction: preset.zoneWidthFraction * scale, barSpeed: preset.barSpeed };
  }

  // The whole reel is timed at a flat seconds-per-round budget - easy fish
  // (fewer rounds) get 3s per round, the toughest fights tighten to 2s per
  // round, scaled linearly in between.
  function computeReelTimeLimit(roundsRequired, config) {
    const t = clamp((roundsRequired - 3) / 3, 0, 1);
    const secondsPerStep = lerp(config.qte.reelSecondsPerStepEasy, config.qte.reelSecondsPerStepHard, t);
    return roundsRequired * secondsPerStep;
  }

  // Places the thinner quality zone somewhere on the bar that does not
  // overlap the basic hit zone (plus a small gap), preferring whichever side
  // has room. Falls back to shrinking the quality zone into whatever space
  // is left if the basic zone leaves no full-width segment free.
  function placeQualityZone(zoneCenter, zoneWidth, qualityWidth, config) {
    const gap = config.qte.qualityZoneGap;
    const basicLeft = zoneCenter - zoneWidth / 2;
    const basicRight = zoneCenter + zoneWidth / 2;

    const segments = [];
    const leftSpan = basicLeft - gap;
    if (leftSpan >= qualityWidth) {
      segments.push({ min: qualityWidth / 2, max: leftSpan - qualityWidth / 2 });
    }
    const rightStart = basicRight + gap;
    const rightSpan = 1 - rightStart;
    if (rightSpan >= qualityWidth) {
      segments.push({ min: rightStart + qualityWidth / 2, max: 1 - qualityWidth / 2 });
    }

    if (segments.length === 0) {
      const leftAvail = Math.max(0, basicLeft - gap);
      const rightAvail = Math.max(0, 1 - (basicRight + gap));
      if (leftAvail >= rightAvail) {
        const width = Math.max(0, Math.min(qualityWidth, leftAvail));
        return { center: width / 2, width };
      }
      const width = Math.max(0, Math.min(qualityWidth, rightAvail));
      return { center: 1 - width / 2, width };
    }

    const segment = segments[Math.floor(Math.random() * segments.length)];
    const center = segment.min >= segment.max ? (segment.min + segment.max) / 2 : randomRange(segment.min, segment.max);
    return { center, width: qualityWidth };
  }

  // Which rounds ever get a quality zone is decided once, up front, for the
  // whole fight - a fixed set of `maxQualityStars` rounds (fewer if the fish
  // needs fewer rounds than that). Missing one is final: it's not reoffered
  // in a later round, so the fight can end with fewer than max stars even if
  // every basic hit landed.
  function pickQualityRoundIndices(roundsRequired, config) {
    const count = Math.min(config.qte.maxQualityStars, roundsRequired);
    const pool = [];
    for (let i = 0; i < roundsRequired; i++) {
      pool.push(i);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count).sort((a, b) => a - b);
  }

  // Only the target zones (position, width) and speed change between rounds -
  // the marker itself keeps moving without any reset, so round transitions
  // feel like one continuous reel rather than a series of restarts.
  function configureRoundDifficulty(qte, index, config) {
    const preset = roundPreset(index, qte.catchLevel.level, config);
    qte.zoneWidth = preset.zoneWidthFraction;
    qte.baseSpeed = preset.barSpeed;
    qte.slowTimer = 0;
    qte.zoneCenter = randomRange(qte.zoneWidth / 2, 1 - qte.zoneWidth / 2);

    qte.hasQualityZone = qte.qualityRoundIndices.includes(index);
    if (qte.hasQualityZone) {
      const quality = placeQualityZone(qte.zoneCenter, qte.zoneWidth, qte.zoneWidth * config.qte.qualityWidthRatio, config);
      qte.qualityCenter = quality.center;
      qte.qualityWidth = quality.width;
    } else {
      qte.qualityCenter = 0;
      qte.qualityWidth = 0;
    }
    qte.qualityConsumed = false;
  }

  function beginQte(state, config) {
    const catchLevel = pickCatchLevelForSchool(state.landing.school, config);
    const roundsRequired = roundsRequiredForLevel(catchLevel.level, config);
    const timeLimit = computeReelTimeLimit(roundsRequired, config);

    // The bite is resolved - the chase animation is done, but keep a
    // reference to which fish actually got hooked (hookedFish) so it can be
    // permanently removed from its school if the reel lands the catch.
    state.hookedFish = state.biteFish;
    state.biteFish = null;
    state.qteElapsed = 0;

    const qte = {
      catchLevel,
      roundIndex: 0,
      roundsRequired,
      quality: 0,
      qualityRoundIndices: pickQualityRoundIndices(roundsRequired, config),
      starPipIndices: [],
      lives: config.qte.startingLives,
      timeLimit,
      timeRemaining: timeLimit,
      timeWarningThreshold: timeLimit * config.qte.reelTimeWarningFraction,
      barPos: 0,
      barDir: 1,
      zoneCenter: 0,
      zoneWidth: 0,
      qualityCenter: 0,
      qualityWidth: 0,
      hasQualityZone: true,
      qualityConsumed: false,
      baseSpeed: 0,
      slowTimer: 0,
      flashTimer: 0,
      flashText: '',
      caught: false,
      caughtDelayTimer: 0,
      failed: false,
      failDelayTimer: 0,
      pressMarks: [],
    };
    configureRoundDifficulty(qte, 0, config);

    state.qte = qte;
    state.mode = 'qte';
  }

  function stepQte(state, input, dt, config) {
    const qte = state.qte;
    state.qteElapsed += dt;

    // A short freeze-frame once the fish is landed: the bar stays up, all
    // pips lit, so the player actually registers "that's it, I caught it"
    // before the result banner cuts in.
    if (qte.caught) {
      qte.caughtDelayTimer -= dt;
      if (qte.caughtDelayTimer <= 0) {
        beginResult(state, 'catch', qte.catchLevel, qte.quality, config);
      }
      return;
    }

    // Same freeze-frame idea as a catch, but for running out of lives: the
    // last skull and the MISS flash need to actually register before the
    // bar disappears into the result banner.
    if (qte.failed) {
      qte.failDelayTimer -= dt;
      if (qte.failDelayTimer <= 0) {
        beginResult(state, 'escaped', qte.catchLevel, qte.quality, config);
      }
      return;
    }

    qte.timeRemaining -= dt;
    if (qte.timeRemaining <= 0) {
      beginResult(state, 'escaped', qte.catchLevel, qte.quality, config);
      return;
    }

    if (qte.flashTimer > 0) {
      qte.flashTimer -= dt;
    }
    if (qte.slowTimer > 0) {
      qte.slowTimer -= dt;
    }

    for (const mark of qte.pressMarks) {
      mark.fade -= dt;
    }
    qte.pressMarks = qte.pressMarks.filter((mark) => mark.fade > 0);

    const speed = qte.baseSpeed * (qte.slowTimer > 0 ? config.qte.missSlowMultiplier : 1);
    qte.barPos += qte.barDir * speed * dt;
    if (qte.barPos >= 1) {
      qte.barPos = 1;
      qte.barDir = -1;
    } else if (qte.barPos <= 0) {
      qte.barPos = 0;
      qte.barDir = 1;
    }

    if (input.hitPressed) {
      // Consume the edge now: the fixed-timestep loop can run step() more
      // than once for a single rendered frame, and without this the same
      // physical press would get re-checked against the marker's
      // slightly-moved position on the next sub-step - occasionally turning
      // one press into a phantom second one (e.g. a quality hit immediately
      // "missed" a moment later because the zone had just been consumed).
      input.hitPressed = false;

      const inBasicZone = Math.abs(qte.barPos - qte.zoneCenter) <= qte.zoneWidth / 2;
      const inQualityZone = qte.hasQualityZone && Math.abs(qte.barPos - qte.qualityCenter) <= qte.qualityWidth / 2;

      // Leaves a fading trace at the exact press position, colored by what
      // it actually was - proof a miss really was a miss, not a dropped
      // input.
      qte.pressMarks.push({
        pos: qte.barPos,
        kind: inBasicZone ? 'hit' : inQualityZone && !qte.qualityConsumed ? 'quality' : 'miss',
        fade: config.qte.pressMarkFadeSeconds,
      });

      if (inBasicZone) {
        qte.roundIndex += 1;
        qte.flashText = 'HIT';
        qte.flashTimer = config.qte.flashSeconds;

        if (qte.roundIndex >= qte.roundsRequired) {
          qte.caught = true;
          qte.caughtDelayTimer = config.qte.caughtDelaySeconds;
          qte.flashText = 'CAUGHT!';
          qte.flashTimer = config.qte.caughtDelaySeconds;
          return;
        }

        configureRoundDifficulty(qte, qte.roundIndex, config);
      } else if (inQualityZone && !qte.qualityConsumed) {
        // Bonus target: never penalized, just an optional upside for good
        // timing. Consumed on use so it can't be farmed on repeat passes
        // within the same round.
        qte.quality = Math.min(qte.quality + 1, config.qte.maxQualityStars);
        qte.qualityConsumed = true;
        qte.starPipIndices.push(qte.roundIndex);
        qte.flashText = 'QUALITY +1';
        qte.flashTimer = config.qte.flashSeconds;
      } else {
        // Also reached for a press on an already-consumed quality zone -
        // once it's spent, that spot is just water like anywhere else.
        qte.slowTimer = config.qte.missSlowSeconds;
        qte.flashText = 'MISS';
        qte.flashTimer = config.qte.flashSeconds;
        qte.lives -= 1;

        if (qte.lives <= 0) {
          qte.failed = true;
          qte.failDelayTimer = config.qte.failDelaySeconds;
          return;
        }
      }
    }
  }

  // A fish actually landed leaves its school for good - one of the
  // survivors splits in two to keep the population steady, drifting apart
  // at a slight angle rather than just popping into existence.
  function removeFishFromSchools(schools, fish) {
    for (const school of schools) {
      const index = school.fish.indexOf(fish);
      if (index !== -1) {
        school.fish.splice(index, 1);
        return school;
      }
    }
    return null;
  }

  function splitFishToReplenish(school, config) {
    if (school.fish.length === 0) {
      return;
    }

    const source = school.fish[Math.floor(Math.random() * school.fish.length)];
    const halfSpread = ((config.schools.splitAngleDegrees * Math.PI) / 180) / 2;

    const clone = {
      x: source.x,
      y: source.y,
      angle: source.angle + halfSpread,
      targetAngle: source.angle + halfSpread,
      turnTimer: randomRange(0.5, 1.5),
    };
    source.angle -= halfSpread;
    source.turnTimer = randomRange(0.5, 1.5);

    school.fish.push(clone);
  }

  function beginResult(state, kind, catchLevel, quality, config) {
    if (kind === 'catch' && state.qte) {
      state.stats.catchDurationTotal += state.castElapsed;
      state.stats.catchDurationCount += 1;
      state.stats.roundTimeTotal += state.qteElapsed;
      state.stats.roundCountTotal += state.qte.roundsRequired;
    }

    state.bobber = null;
    state.qte = null;

    if (kind === 'catch') {
      state.catchCount += 1;
      state.result = { kind: 'catch', catchLevel, quality };
      state.resultTimer = config.result.catchSeconds;

      const bestSoFar = state.catchLog[catchLevel.level];
      state.catchLog[catchLevel.level] = bestSoFar === undefined ? quality : Math.max(bestSoFar, quality);

      if (state.hookedFish) {
        const school = removeFishFromSchools(state.schools, state.hookedFish);
        if (school) {
          splitFishToReplenish(school, config);
        }
      }
    } else if (kind === 'escaped') {
      state.escapedCount += 1;
      state.result = { kind: 'escaped', catchLevel };
      state.resultTimer = config.result.escapedSeconds;
    } else {
      state.trashCount += 1;
      const label = config.trash.items[Math.floor(Math.random() * config.trash.items.length)];
      state.result = { kind: 'trash', label };
      state.resultTimer = config.result.trashSeconds;
    }

    state.hookedFish = null;
    state.mode = 'result';
  }

  function stepResult(state, input, dt, config) {
    state.resultTimer -= dt;
    if (state.resultTimer <= 0) {
      state.result = null;
      state.landing = null;
      state.mode = 'idle';
    }
  }

  const STATE_HANDLERS = {
    idle: stepIdle,
    aiming: stepAiming,
    flying: stepFlying,
    waiting: stepWaiting,
    trashCooldown: stepTrashCooldown,
    biteCue: stepBiteCue,
    qte: stepQte,
    result: stepResult,
  };

  function step(state, input, dt, config) {
    if (input.resetRequested) {
      input.resetRequested = false;
      resetStateInPlace(state, config);
      return;
    }

    stepFishWander(state, dt, config);
    stepBiteFishChase(state, dt, config);
    stepLandingMarkerFade(state, dt, config);

    if (state.mode !== 'idle' && state.mode !== 'aiming') {
      state.castElapsed += dt;
    }

    if (input.pressEdge && CANCELABLE_MODES[state.mode]) {
      input.pressEdge = false;
      cancelCast(state);
      return;
    }

    STATE_HANDLERS[state.mode](state, input, dt, config);
  }

  return { createState, step, classifyLanding };
})();
