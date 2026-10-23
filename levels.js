/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Level Implementations:
 * 1. Steady Paw (Tunnel traversal & wall collision)
 * 2. Pet The Cat (Feel-based petting zones, moods, belly trap)
 * 3. Sneak Past Sleeping Cat (Red-light/green-light stealth, reaction timing)
 */

// ==========================================
// LEVEL 1: STEADY PAW
// ==========================================
class Level1_SteadyPaw {
  constructor(inputManager) {
    this.input = inputManager;
    this.trail = [];
    this.hasStarted = false;
    this.isCompleted = false;
    this.wobbleScore = 0;
    this.wallBumps = 0;
    this.bumpCooldown = 0;
    this.bumpPositions = [];

    // Generate Tunnel Geometry
    this.generateTunnel();
  }

  generateTunnel() {
    this.tunnelPoints = [];
    const numPoints = 40;
    // Short, compact pipe length centered on 960px screen
    const startX = 250;
    const endX = 710;
    const stepX = (endX - startX) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const x = startX + i * stepX;
      const progress = i / numPoints;

      // Smooth wave shape (gentle sine wave)
      const y = 270 + Math.sin(progress * Math.PI * 2.2) * 65;

      // Tunnel comfortable width from 68px narrowing to 52px
      const halfWidth = (68 * (1 - progress) + 52 * progress) * 0.5;

      this.tunnelPoints.push({ x, y, halfWidth, progress });
    }

    this.startPos = { x: this.tunnelPoints[0].x, y: this.tunnelPoints[0].y };
    const lastP = this.tunnelPoints[this.tunnelPoints.length - 1];
    this.goalPos = { x: lastP.x, y: lastP.y };
  }

  reset() {
    this.trail = [];
    this.hasStarted = false;
    this.isCompleted = false;
    this.wobbleScore = 0;
    this.wallBumps = 0;
    this.bumpCooldown = 0;
    this.bumpPositions = [];
    this.input.reset();
  }

  // Get closest tunnel center point and half-width for a given x coordinate
  getTunnelSegment(x) {
    if (x <= this.tunnelPoints[0].x) {
      return this.tunnelPoints[0];
    }
    const last = this.tunnelPoints[this.tunnelPoints.length - 1];
    if (x >= last.x) {
      return last;
    }

    for (let i = 0; i < this.tunnelPoints.length - 1; i++) {
      const p1 = this.tunnelPoints[i];
      const p2 = this.tunnelPoints[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return {
          x: x,
          y: p1.y + (p2.y - p1.y) * t,
          halfWidth: p1.halfWidth + (p2.halfWidth - p1.halfWidth) * t
        };
      }
    }
    return this.tunnelPoints[0];
  }

  update(dt) {
    if (this.isCompleted) return null;

    if (this.bumpCooldown > 0) {
      this.bumpCooldown -= dt;
    }

    const x = this.input.x;
    const y = this.input.y;

    // Check if player clicked / touched in the start zone
    if (!this.hasStarted) {
      const distToStart = Math.hypot(x - this.startPos.x, y - this.startPos.y);
      if (this.input.isDown && distToStart <= CONFIG.LEVEL_1.startPadRadius) {
        this.hasStarted = true;
        this.trail.push({ x, y, time: performance.now() });
      }
      return null;
    }

    // Player is actively guiding paw
    if (this.hasStarted && this.input.isDown) {
      this.trail.push({ x, y, time: performance.now() });
      if (this.trail.length > CONFIG.LEVEL_1.trailMaxPoints) {
        this.trail.shift();
      }

      // Check wall collision: distance from tunnel center
      const segment = this.getTunnelSegment(x);
      const distFromCenter = Math.abs(y - segment.y);

      // Touching the wall does NOT fail the player!
      // Humans naturally bump walls — it proves you are human!
      if (distFromCenter > segment.halfWidth) {
        if (this.bumpCooldown <= 0) {
          this.wallBumps++;
          this.bumpCooldown = 0.25; // debounce bumps
          this.bumpPositions.push({ x, y, timer: 0.6 });
          playHiss(); // soft bump feedback
        }
      }

      // Update live wobble score for HUD
      this.wobbleScore = this.input.getWobbleScore();

      // Check if reached fish goal
      const distToGoal = Math.hypot(x - this.goalPos.x, y - this.goalPos.y);
      if (distToGoal <= CONFIG.LEVEL_1.fishPadRadius) {
        this.isCompleted = true;
        return this.evaluateBotVsHuman();
      }
    }

    return null;
  }

  evaluateBotVsHuman() {
    const samplesCount = this.input.totalSamples;
    const speedVariance = this.input.getSpeedCoefficientOfVariation();
    const wobble = this.input.getWobbleScore();
    const teleported = this.input.teleportDetected;
    const wallBumps = this.wallBumps;

    // 1. Quantum Teleportation Check
    if (teleported) {
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_1.msgBotTeleport
      };
    }

    // 2. Minimum samples check (jumped across in < 12 samples)
    if (samplesCount < 12) {
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_1.msgBotNoSamples
      };
    }

    // 3. Bot Check: Machine perfection
    // A bot navigates with 0 wall bumps, 0 wobble, and constant speed
    const isBot = (wallBumps === 0 && wobble < 0.04 && speedVariance < 0.08) ||
                  (wallBumps === 0 && wobble < 0.03);

    if (isBot) {
      return {
        success: false,
        isBot: true,
        reason: "Laser precision. 0 wall bumps. Toaster detected."
      };
    }

    // Human passed! Wall bumps and natural curved tremor prove humanity
    const humanScore = Math.min(99, Math.round(84 + Math.min(10, wallBumps * 2) + wobble * 6));
    const bumpDesc = wallBumps > 0 ? `${wallBumps} wall bumps` : "organic tremor";
    return {
      success: true,
      isBot: false,
      score: humanScore,
      reason: `Trajectory Verified: Curved path & ${bumpDesc}. Human confirmed!`
    };
  }

  render(ctx, frameTime) {
    // 1. Draw Tunnel Floor & Glowing Neon Boundaries
    ctx.save();

    // Top & Bottom boundary paths
    ctx.beginPath();
    // Top boundary
    for (let i = 0; i < this.tunnelPoints.length; i++) {
      const p = this.tunnelPoints[i];
      const px = p.x;
      const py = p.y - p.halfWidth;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    // Bottom boundary (in reverse)
    for (let i = this.tunnelPoints.length - 1; i >= 0; i--) {
      const p = this.tunnelPoints[i];
      const px = p.x;
      const py = p.y + p.halfWidth;
      ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Tunnel interior fill
    const tunnelGrad = ctx.createLinearGradient(0, 0, 960, 0);
    tunnelGrad.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
    tunnelGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = tunnelGrad;
    ctx.fill();

    // Glowing Neon Wall Borders
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // 2. Start Pad (Green Circle)
    ctx.save();
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = this.hasStarted ? 4 : 14;
    ctx.fillStyle = this.hasStarted ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.45)';
    ctx.beginPath();
    ctx.arc(this.startPos.x, this.startPos.y, CONFIG.LEVEL_1.startPadRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (!this.hasStarted) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS HERE', this.startPos.x, this.startPos.y + 5);
    }
    ctx.restore();

    // 3. Goal Pad & Fish
    ctx.save();
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
    ctx.beginPath();
    ctx.arc(this.goalPos.x, this.goalPos.y, CONFIG.LEVEL_1.fishPadRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Render Fish
    Placeholders.drawFish(ctx, this.goalPos.x, this.goalPos.y, 28, Math.sin(frameTime * 0.004) * 0.15);
    ctx.restore();

    // 4. Paw Trajectory Trail (Full visible path)
    if (this.trail.length > 1) {
      ctx.save();
      // Connect line
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.stroke();

      // Cute paw prints along the curved path
      for (let i = 0; i < this.trail.length; i += 4) {
        const pt = this.trail[i];
        ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Wall Bump Markers & Live Clumsiness Indicator
    ctx.save();
    for (const b of this.bumpPositions) {
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 12px "Space Grotesk", sans-serif';
      ctx.fillText('💥 bump', b.x, b.y - 8);
    }

    // Live bump counter badge
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Wall Touches: ${this.wallBumps} (Natural human shakiness)`, 480, 480);
    ctx.restore();

    // 6. Active Cursor Paw
  }
}

// ==========================================
// LEVEL 2: PET THE CAT
// ==========================================
class Level2_PetTheCat {
  constructor(inputManager) {
    this.input = inputManager;
    this.purrMeter = 0;
    this.mood = 'neutral'; // 'neutral', 'content', 'annoyed'
    this.annoyedTimer = 0;
    this.isCompleted = false;

    // Cat geometry & Hit zones (centered on screen)
    this.catX = 240;
    this.catY = 160;
    this.catWidth = 480;
    this.catHeight = 260;

    // Particles for hearts / purr effects
    this.particles = [];

    // Track strokes for human verification
    this.strokeDistances = [];
    this.strokeDirections = [];
  }

  reset() {
    this.purrMeter = 0;
    this.mood = 'neutral';
    this.annoyedTimer = 0;
    this.isCompleted = false;
    this.particles = [];
    this.strokeDistances = [];
    this.strokeDirections = [];
    this.input.reset();
  }

  spawnHeart(x, y) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vy: -1.2 - Math.random() * 1.5,
      alpha: 1.0,
      size: 14 + Math.random() * 8
    });
  }

  update(dt) {
    if (this.isCompleted) return null;

    // Update annoyed timer
    if (this.annoyedTimer > 0) {
      this.annoyedTimer -= dt;
      if (this.annoyedTimer <= 0) {
        this.mood = this.purrMeter >= CONFIG.LEVEL_2.moodContentPurrThreshold ? 'content' : 'neutral';
      }
    }

    // Update floating heart particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy;
      p.alpha -= dt * 1.2;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    const x = this.input.x;
    const y = this.input.y;
    const speed = this.input.currentSpeed;

    // Check if player is stroking with pointer down
    if (this.input.isDown && this.input.history.length >= 2) {
      const pPrev = this.input.history[this.input.history.length - 2];
      const dx = x - pPrev.x;
      const dy = y - pPrev.y;
      const dist = Math.hypot(dx, dy);

      // Check if inside cat bounding box
      const relX = x - this.catX;
      const relY = y - this.catY;

      if (relX >= 0 && relX <= this.catWidth && relY >= 0 && relY <= this.catHeight) {
        // --- ZONE 1: BELLY TRAP (Lower middle: width 0.38 to 0.65, height 0.55 to 0.85) ---
        const isBelly = (relX >= this.catWidth * 0.38 && relX <= this.catWidth * 0.65 &&
                         relY >= this.catHeight * 0.55 && relY <= this.catHeight * 0.85);

        if (isBelly) {
          // Touching belly makes cat hiss and drops meter!
          playHiss();
          this.mood = 'annoyed';
          this.annoyedTimer = CONFIG.LEVEL_2.annoyedDurationSeconds;
          this.purrMeter = Math.max(0, this.purrMeter - CONFIG.LEVEL_2.bellyPenalty * dt * 3);
          return null;
        }

        // --- POKING / MOVING TOO FAST ---
        if (speed > CONFIG.LEVEL_2.maxStrokeSpeed) {
          playHiss();
          this.mood = 'annoyed';
          this.annoyedTimer = CONFIG.LEVEL_2.annoyedDurationSeconds;
          this.purrMeter = Math.max(0, this.purrMeter - CONFIG.LEVEL_2.roughPettingPenalty * dt);
          return null;
        }

        // --- STROKING DIRECTION ---
        // Cat faces right: head on left, tail on right.
        // Head-to-tail stroke means dx > 0.
        // Tail-to-head stroke means dx < -2 (against fur -> flinch, fills nothing).
        if (dx < -3) {
          // Petting against fur: cat flinches, fills 0
          return null;
        }

        // Gentle head-to-tail stroke
        if (dx > 1 && speed >= CONFIG.LEVEL_2.minStrokeSpeed) {
          // Bonus sweet spots: Chin and Behind-the-Ears (Left head area)
          const isChinOrEars = (relX <= this.catWidth * 0.38);
          const multiplier = isChinOrEars ? CONFIG.LEVEL_2.bonusMultiplier : 1.0;

          const gain = dist * CONFIG.LEVEL_2.purrFillRate * multiplier;
          this.purrMeter = Math.min(CONFIG.LEVEL_2.targetPurr, this.purrMeter + gain);

          // Update mood
          if (this.annoyedTimer <= 0) {
            this.mood = this.purrMeter >= CONFIG.LEVEL_2.moodContentPurrThreshold ? 'content' : 'neutral';
          }

          // Sound and particles
          if (Math.random() < 0.2) {
            playPurr();
            this.spawnHeart(x, y);
          }
        }
      }
    }

    // Check if purr meter reached 100%
    if (this.purrMeter >= CONFIG.LEVEL_2.targetPurr) {
      this.isCompleted = true;
      return this.evaluateBotVsHuman();
    }

    return null;
  }

  evaluateBotVsHuman() {
    const speedVariance = this.input.getSpeedCoefficientOfVariation();
    const curvatureVariance = this.input.getCurvatureVariance();
    const linearity = this.input.getPathLinearity();

    // Bot check: perfectly straight horizontal strokes and constant robotic speed
    const isBot = (speedVariance < CONFIG.LEVEL_2.minPettingSpeedVariance &&
                   curvatureVariance < CONFIG.LEVEL_2.minStrokeCurvatureVariance) ||
                  (linearity > 0.995 && speedVariance < 0.09);

    if (isBot) {
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_2.msgBotRobotic
      };
    }

    // Human passed!
    const humanScore = Math.min(99, Math.round(85 + Math.random() * 10));
    return {
      success: true,
      isBot: false,
      score: humanScore,
      reason: CONFIG.LEVEL_2.msgPass
    };
  }

  render(ctx, frameTime) {
    // 1. Cat Body
    Placeholders.drawPettingCat(ctx, this.catX, this.catY, this.catWidth, this.catHeight, this.mood, frameTime);

    // 2. Floating Hearts / Purr Particles
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(244, 63, 94, ${p.alpha})`;
      ctx.font = `${p.size}px sans-serif`;
      ctx.fillText('💖', p.x, p.y);
    }
    ctx.restore();

    // 3. Purr Meter Bar (Rendered on Canvas for high visibility)
    ctx.save();
    const meterX = 280;
    const meterY = 460;
    const meterW = 400;
    const meterH = 26;

    // Background track
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, meterW, meterH, 13);
    ctx.fill();
    ctx.stroke();

    // Filled portion
    const fillW = Math.max(0, (this.purrMeter / CONFIG.LEVEL_2.targetPurr) * meterW);
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#fb7185');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(meterX, meterY, fillW, meterH, 13);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PURR METER: ${Math.round(this.purrMeter)}%`, meterX + meterW * 0.5, meterY + 18);

    // Mood Badge
    let moodEmoji = this.mood === 'content' ? '😸 Content' :
                     this.mood === 'annoyed' ? '😾 Annoyed (Hiss!)' : '😐 Neutral';
    ctx.font = '14px "Space Grotesk", sans-serif';
    ctx.fillStyle = this.mood === 'annoyed' ? '#ef4444' : '#facc15';
    ctx.fillText(`Cat Mood: ${moodEmoji}`, meterX + meterW * 0.5, meterY - 14);

    ctx.restore();

    // 4. Cursor Paw
    Placeholders.drawPaw(ctx, this.input.x, this.input.y, 22, this.input.isDown);
  }
}

// ==========================================
// LEVEL 3: SNEAK PAST THE SLEEPING CAT
// ==========================================
class Level3_SneakPastCat {
  constructor(inputManager) {
    this.input = inputManager;
    this.state = 'sleeping'; // 'sleeping', 'twitch', 'eye_open'
    this.stateTimer = 0;
    this.isFakeTwitch = false;
    this.twitchStartedAt = 0;

    this.caughtCount = 0;
    this.isCompleted = false;

    // Movement history buffer of recent frames: { time, dist, isMoving }
    this.movementHistory = [];
    this.movedEarlierInSleepPhase = false;

    // Recorded stop latency samples: { stopLatency, preStopped, wasFake }
    this.samples = [];

    // Active measurement during twitch / eye_open
    this.currentTwitchMeasurement = null;

    // Start on the left, Fish on the right next to Sleeping Cat
    this.startPos = { x: 90, y: 340 };
    this.pawPos = { x: 90, y: 340 };
    this.goalPos = { x: 860, y: 340 };
    this.catPos = { x: 700, y: 220 };

    this.lastPointerX = this.startPos.x;
    this.lastPointerY = this.startPos.y;

    // Debug Overlay (toggle with 'D' key)
    this.showDebug = false;
    this.lastDebugCheckFired = "None yet";
    this.bindDebugKey();

    this.scheduleNextSleep();
  }

  bindDebugKey() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        this.showDebug = !this.showDebug;
      }
    });
  }

  scheduleNextSleep() {
    this.state = 'sleeping';
    this.isFakeTwitch = false;
    this.movedEarlierInSleepPhase = false;
    this.currentTwitchMeasurement = null;

    // SLEEP duration: random 2000-5000 ms, re-rolled every cycle
    const minMs = CONFIG.LEVEL_3.sleepDurationMinMs;
    const maxMs = CONFIG.LEVEL_3.sleepDurationMaxMs;
    this.stateTimer = (minMs + Math.random() * (maxMs - minMs)) / 1000;
  }

  reset() {
    this.state = 'sleeping';
    this.stateTimer = 0;
    this.isFakeTwitch = false;
    this.twitchStartedAt = 0;
    this.caughtCount = 0;
    this.isCompleted = false;
    this.movementHistory = [];
    this.movedEarlierInSleepPhase = false;
    this.samples = [];
    this.currentTwitchMeasurement = null;
    this.lastDebugCheckFired = "None yet";

    this.pawPos = { x: this.startPos.x, y: this.startPos.y };
    this.lastPointerX = this.startPos.x;
    this.lastPointerY = this.startPos.y;

    this.input.reset();
    this.scheduleNextSleep();
  }

  update(dt) {
    if (this.isCompleted) return null;

    const now = performance.now();

    // 1. Calculate per-frame pointer movement
    const curX = this.input.x;
    const curY = this.input.y;
    const frameDx = curX - this.lastPointerX;
    const frameDy = curY - this.lastPointerY;
    const frameDist = Math.hypot(frameDx, frameDy);
    this.lastPointerX = curX;
    this.lastPointerY = curY;

    // Movement threshold: 3px/frame for mouse, 6px/frame for touch
    const isTouch = this.input.isTouch;
    const moveThreshold = isTouch ? CONFIG.LEVEL_3.TOUCH.moveThresholdPxPerFrame : CONFIG.LEVEL_3.moveThresholdPxPerFrame;
    const isMovingThisFrame = (this.input.isDown && frameDist > moveThreshold);

    // Continuous movement history buffer (pruned to last 2500 ms)
    this.movementHistory.push({ time: now, dist: frameDist, isMoving: isMovingThisFrame });
    while (this.movementHistory.length > 0 && this.movementHistory[0].time < now - 2500) {
      this.movementHistory.shift();
    }

    // Record if player moved at some point earlier in this sleep phase
    if (this.state === 'sleeping' && isMovingThisFrame) {
      this.movedEarlierInSleepPhase = true;
    }

    // Follow pointer position when holding down
    if (this.input.isDown) {
      this.pawPos.x = curX;
      this.pawPos.y = curY;
    }

    // 2. Advance Cat State Machine
    this.stateTimer -= dt;

    // SLEEPING -> TWITCH
    if (this.state === 'sleeping' && this.stateTimer <= 0) {
      this.state = 'twitch';
      this.twitchStartedAt = now;

      // 1 in 3 twitches is fake (about 0.333)
      this.isFakeTwitch = Math.random() < CONFIG.LEVEL_3.fakeTwitchChance;

      // TWITCH duration: random 400-800 ms, re-rolled every cycle
      const tMin = CONFIG.LEVEL_3.twitchDurationMinMs;
      const tMax = CONFIG.LEVEL_3.twitchDurationMaxMs;
      this.stateTimer = (tMin + Math.random() * (tMax - tMin)) / 1000;

      // Call playWarningCue() on every twitch, real or fake!
      playWarningCue();

      // --- STOP-LATENCY MEASUREMENT ---
      // Only record samples when player was moving at some point in the 1000 ms before twitch
      const movedInLast1000 = this.movementHistory.some(m =>
        m.time >= now - CONFIG.LEVEL_3.recentMovementWindowMs && m.time < now && m.isMoving
      );

      if (movedInLast1000) {
        // Was the player already still in the 150 ms before twitch?
        const movedInLast150 = this.movementHistory.some(m =>
          m.time >= now - CONFIG.LEVEL_3.preStopWindowMs && m.time < now && m.isMoving
        );
        const stillInLast150 = !movedInLast150;
        const preStopped = stillInLast150 && this.movedEarlierInSleepPhase;

        if (preStopped) {
          // Already still at t_twitch: stopLatency clamped to 0
          this.samples.push({
            stopLatency: 0,
            preStopped: true,
            wasFake: this.isFakeTwitch
          });
          this.currentTwitchMeasurement = null;
        } else {
          // Actively moving: start measuring when cursor movement falls below threshold for 100 ms
          this.currentTwitchMeasurement = {
            t_twitch: now,
            wasFake: this.isFakeTwitch,
            stillCandidateStartTime: null
          };
        }
      } else {
        // Standing still at the start or hasn't moved in 1000 ms: do not record
        this.currentTwitchMeasurement = null;
      }
    }

    // TWITCH -> EYE_OPEN (or back to SLEEP if fake)
    else if (this.state === 'twitch' && this.stateTimer <= 0) {
      if (this.isFakeTwitch) {
        // Fake twitch: goes straight back to SLEEP without opening eye. No penalty for moving!
        this.currentTwitchMeasurement = null;
        this.scheduleNextSleep();
      } else {
        // Real twitch -> EYE_OPEN
        this.state = 'eye_open';
        this.stateTimer = CONFIG.LEVEL_3.eyeOpenDurationMs / 1000; // 1.0 second
      }
    }

    // EYE_OPEN -> SLEEPING
    else if (this.state === 'eye_open' && this.stateTimer <= 0) {
      this.currentTwitchMeasurement = null;
      this.scheduleNextSleep();
    }

    // 3. Process Active Stop-Latency Measurement (during twitch or eye_open)
    if (this.currentTwitchMeasurement) {
      if (frameDist <= moveThreshold) {
        // Cursor movement is below threshold
        if (this.currentTwitchMeasurement.stillCandidateStartTime === null) {
          this.currentTwitchMeasurement.stillCandidateStartTime = now;
        } else if (now - this.currentTwitchMeasurement.stillCandidateStartTime >= CONFIG.LEVEL_3.stillConfirmationDurationMs) {
          // Held below threshold for 100 ms!
          const t_stop = this.currentTwitchMeasurement.stillCandidateStartTime;
          const stopLatency = Math.max(0, Math.round(t_stop - this.currentTwitchMeasurement.t_twitch));
          this.samples.push({
            stopLatency,
            preStopped: false,
            wasFake: this.currentTwitchMeasurement.wasFake
          });
          this.currentTwitchMeasurement = null; // Measurement complete
        }
      } else {
        // Movement broke the 100ms streak
        this.currentTwitchMeasurement.stillCandidateStartTime = null;
      }
    }

    // 4. Catch Rule (Game Rule Only, while EYE_OPEN - NEVER bot evidence)
    if (this.state === 'eye_open') {
      if (isMovingThisFrame) {
        // CAUGHT: Cat hisses, returns to start, caught counter +1
        playHiss();
        this.caughtCount++;
        this.pawPos = { x: this.startPos.x, y: this.startPos.y };
        this.lastPointerX = this.startPos.x;
        this.lastPointerY = this.startPos.y;

        // 2 catches = level FAIL
        if (this.caughtCount >= CONFIG.LEVEL_3.maxCatchesAllowed) {
          this.isCompleted = true;
          return {
            success: false,
            isBot: false, // Never bot evidence!
            reason: CONFIG.LEVEL_3.msgCaughtFail // "The cat ate you."
          };
        }
      }
    }

    // 5. Check if reached fish goal
    const distToFish = Math.hypot(this.pawPos.x - this.goalPos.x, this.pawPos.y - this.goalPos.y);
    if (distToFish <= CONFIG.LEVEL_3.goalRadius) {
      this.isCompleted = true;
      return this.evaluateBotVsHuman();
    }

    return null;
  }

  evaluateBotVsHuman() {
    const isTouch = this.input.isTouch;
    const tooFastThresh = isTouch ? CONFIG.LEVEL_3.TOUCH.tooFastAvgMs : CONFIG.LEVEL_3.tooFastAvgMs;
    const tooConsistentThresh = isTouch ? CONFIG.LEVEL_3.TOUCH.tooConsistentStdDevMs : CONFIG.LEVEL_3.tooConsistentStdDevMs;
    const minSpeedVar = isTouch ? CONFIG.LEVEL_3.TOUCH.minSpeedVariance : CONFIG.LEVEL_3.minSpeedVariance;
    const maxPreStopped = CONFIG.LEVEL_3.maxPreStoppedCount;

    const validSamples = this.samples.filter(s => !s.preStopped);
    const preStoppedCount = this.samples.filter(s => s.preStopped).length;
    const totalSamplesCount = this.samples.length;

    // Check (c) SEES THE FUTURE: if preStopped is true on 2 or more twitches (requires >= 2 samples)
    if (totalSamplesCount >= 2 && preStoppedCount >= maxPreStopped) {
      this.lastDebugCheckFired = `Check (c): Sees the future (${preStoppedCount} pre-stops)`;
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_3.msgSeesTheFuture
      };
    }

    // Check (a) TOO FAST: with 2+ samples, if average stopLatency (excluding preStopped ones) is under 80 ms
    if (validSamples.length >= 2) {
      const avgLatency = validSamples.reduce((sum, s) => sum + s.stopLatency, 0) / validSamples.length;
      if (avgLatency < tooFastThresh) {
        this.lastDebugCheckFired = `Check (a): Too fast (avg: ${Math.round(avgLatency)}ms < ${tooFastThresh}ms)`;
        return {
          success: false,
          isBot: true,
          reason: CONFIG.LEVEL_3.msgTooFast
        };
      }
    }

    // Check (b) TOO CONSISTENT: with 3+ samples, if standard deviation of stopLatency is under 15 ms
    if (validSamples.length >= 3) {
      const avgLatency = validSamples.reduce((sum, s) => sum + s.stopLatency, 0) / validSamples.length;
      const variance = validSamples.reduce((sum, s) => sum + Math.pow(s.stopLatency - avgLatency, 2), 0) / validSamples.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < tooConsistentThresh) {
        this.lastDebugCheckFired = `Check (b): Too consistent (stdDev: ${stdDev.toFixed(1)}ms < ${tooConsistentThresh}ms)`;
        return {
          success: false,
          isBot: true,
          reason: CONFIG.LEVEL_3.msgTooConsistent
        };
      }
    }

    // Check (d) ROBOTIC PACING: if cursor speed variance across the whole run is extremely low
    const speedVariance = this.input.getSpeedCoefficientOfVariation();
    if (speedVariance < minSpeedVar) {
      this.lastDebugCheckFired = `Check (d): Robotic pacing (${speedVariance.toFixed(3)} < ${minSpeedVar})`;
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_3.msgRoboticPacing
      };
    }

    // (e) If fewer than 3 samples exist, skip check (b). If fewer than 2 samples exist, skip (a) and (c).
    // Never fail a human on missing data!

    // ------------------------------------------
    // HUMAN SCORE FOR LEVEL 3 (0-100)
    // Start at 100.
    // Subtract 15 per catch.
    // Subtract up to 20 if average stop latency is outside 120-600 ms.
    // Add nothing for speed. Clamp 0-100.
    // ------------------------------------------
    let humanScore = 100;
    humanScore -= this.caughtCount * 15;

    if (validSamples.length > 0) {
      const avgLatency = validSamples.reduce((sum, s) => sum + s.stopLatency, 0) / validSamples.length;
      if (avgLatency < 120) {
        // Latency under 120 ms: subtract up to 20 points
        const penalty = Math.min(20, Math.round(((120 - avgLatency) / 120) * 20));
        humanScore -= penalty;
      } else if (avgLatency > 600) {
        // Latency over 600 ms: subtract up to 20 points
        const penalty = Math.min(20, Math.round(((avgLatency - 600) / 400) * 20));
        humanScore -= penalty;
      }
    }

    humanScore = Math.max(0, Math.min(100, Math.round(humanScore)));
    this.lastDebugCheckFired = "None (Human Verified)";

    return {
      success: true,
      isBot: false,
      score: humanScore,
      reason: CONFIG.LEVEL_3.msgPass
    };
  }

  render(ctx, frameTime) {
    // 1. Floor & Stealth Path
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.fillRect(40, 260, 880, 160);

    // Dotted guide line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.startPos.x, this.startPos.y);
    ctx.lineTo(this.goalPos.x, this.goalPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 2. Start Line
    ctx.save();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.fillRect(40, 270, 90, 140);
    ctx.strokeStyle = '#22c55e';
    ctx.strokeRect(40, 270, 90, 140);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', 85, 345);
    ctx.restore();

    // 3. Fish Goal
    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(this.goalPos.x, this.goalPos.y, CONFIG.LEVEL_3.goalRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    Placeholders.drawFish(ctx, this.goalPos.x, this.goalPos.y, 28, 0);
    ctx.restore();

    // 4. Sleeping / Alert Cat
    Placeholders.drawSneakCat(ctx, this.catPos.x, this.catPos.y, 190, this.state, frameTime);

    // 5. Caught Strikes Indicator
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 15px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Cat Strikes: ${this.caughtCount} / ${CONFIG.LEVEL_3.maxCatchesAllowed}`, 70, 480);

    // Debug hint
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`[D] Toggle Debug Overlay`, 900, 480);
    ctx.restore();

    // 6. Paw Cursor
    Placeholders.drawPaw(ctx, this.pawPos.x, this.pawPos.y, 22, this.input.isDown);

    // 7. Debug Overlay (Toggle with 'D' key)
    if (this.showDebug) {
      ctx.save();
      const dbgX = 30;
      const dbgY = 30;
      const dbgW = 440;
      const dbgH = 210;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(dbgX, dbgY, dbgW, dbgH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('[DEBUG OVERLAY: LEVEL 3] (Press D to close)', dbgX + 14, dbgY + 22);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px "Space Grotesk", monospace';

      const stateLabel = `${this.state.toUpperCase()} (${this.stateTimer.toFixed(1)}s left)${this.isFakeTwitch ? ' [FAKE TWITCH]' : ''}`;
      ctx.fillText(`Cat State: ${stateLabel}`, dbgX + 14, dbgY + 44);

      const samplesStr = this.samples.length > 0
        ? this.samples.map(s => `${s.stopLatency}ms${s.preStopped ? '(pre)' : ''}${s.wasFake ? '(F)' : ''}`).join(', ')
        : 'None';
      ctx.fillText(`Samples: ${samplesStr}`, dbgX + 14, dbgY + 68);

      const nonPre = this.samples.filter(s => !s.preStopped);
      let avgStr = 'N/A';
      let stdStr = 'N/A';
      if (nonPre.length > 0) {
        const avg = nonPre.reduce((sum, s) => sum + s.stopLatency, 0) / nonPre.length;
        avgStr = `${Math.round(avg)} ms`;
        if (nonPre.length > 1) {
          const v = nonPre.reduce((sum, s) => sum + Math.pow(s.stopLatency - avg, 2), 0) / nonPre.length;
          stdStr = `${Math.sqrt(v).toFixed(1)} ms`;
        }
      }
      ctx.fillText(`Avg Stop Latency: ${avgStr}`, dbgX + 14, dbgY + 92);
      ctx.fillText(`Std Dev: ${stdStr}`, dbgX + 14, dbgY + 114);

      const preCount = this.samples.filter(s => s.preStopped).length;
      ctx.fillText(`Pre-stopped Count: ${preCount} / ${CONFIG.LEVEL_3.maxPreStoppedCount} max`, dbgX + 14, dbgY + 136);

      ctx.fillText(`Input Mode: ${this.input.isTouch ? 'TOUCH (lenient)' : 'MOUSE'}`, dbgX + 14, dbgY + 158);

      ctx.fillStyle = this.lastDebugCheckFired.startsWith('None') ? '#4ade80' : '#f87171';
      ctx.fillText(`Check Status: ${this.lastDebugCheckFired}`, dbgX + 14, dbgY + 184);

      ctx.restore();
    }
  }
}

window.Level1_SteadyPaw = Level1_SteadyPaw;
window.Level2_PetTheCat = Level2_PetTheCat;
window.Level3_SneakPastCat = Level3_SneakPastCat;
