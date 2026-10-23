/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Level Implementations:
 * 1. Steady Paw (Tunnel traversal & wall collision)
 * 2. Pet The Cat (Feel-based petting zones, moods, belly trap)
 * 3. Find The Hidden Cat (Structure-from-Motion static noise perception)
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
// LEVEL 3: FIND THE HIDDEN CAT
// Goal: "A cat is hiding in the static. Find it."
// Concept: Structure-from-Motion (Random Dot Kinematogram)
// Dots inside secret shape move UP, dots outside move DOWN.
// ==========================================
class Level3_FindHiddenCat {
  constructor(inputManager) {
    this.input = inputManager;

    // Noise canvas dimensions
    this.noiseW = CONFIG.LEVEL_3.noiseWidth;   // 360 px
    this.noiseH = CONFIG.LEVEL_3.noiseHeight;  // 300 px
    this.noiseX = (CONFIG.GENERAL.canvasWidth - this.noiseW) / 2; // 300 px (centered)
    this.noiseY = 65; // px

    // Pre-compute binary shape masks
    this.masks = {};
    this.initShapeMasks();

    // 900 small square dots
    this.dots = [];
    this.initDots();

    // Game state
    this.currentRound = 1;
    this.roundTimeRemaining = CONFIG.LEVEL_3.roundTimeLimitSeconds;
    this.correctCount = 0;
    this.answerTimes = [];
    this.previousShape = null;
    this.currentShape = 'CAT';
    this.currentButtons = [];

    // Round phase: 'PLAYING_ROUND' | 'REVEAL'
    this.state = 'PLAYING_ROUND';
    this.revealTimer = 0;
    this.revealIsCorrect = false;
    this.isCompleted = false;

    // Click debouncing
    this.wasPointerDown = false;
    this.currentRoundStartTime = performance.now();

    this.startRound();
  }

  // Pre-render silhouettes onto hidden offscreen canvases and build boolean lookup arrays
  initShapeMasks() {
    const shapes = ['CAT', 'FISH', 'HEART', 'STAR'];
    const offCanvas = document.createElement('canvas');
    offCanvas.width = this.noiseW;
    offCanvas.height = this.noiseH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    shapes.forEach(shape => {
      offCtx.clearRect(0, 0, this.noiseW, this.noiseH);
      offCtx.fillStyle = '#ffffff';

      this.drawShapePath(offCtx, shape);
      offCtx.fill();

      const imgData = offCtx.getImageData(0, 0, this.noiseW, this.noiseH);
      const data = imgData.data;
      const mask = new Uint8Array(this.noiseW * this.noiseH);

      for (let i = 0; i < mask.length; i++) {
        // Pixel is inside mask if alpha > 128
        mask[i] = (data[i * 4 + 3] > 128) ? 1 : 0;
      }
      this.masks[shape] = mask;
    });
  }

  drawShapePath(ctx, shape) {
    const cx = this.noiseW / 2; // 180
    const cy = this.noiseH / 2; // 150

    if (shape === 'CAT') {
      // Cat Head with two pointy triangular ears (~190px tall)
      ctx.beginPath();
      // Head oval
      ctx.ellipse(cx, cy + 18, 75, 65, 0, 0, Math.PI * 2);
      // Left pointy ear
      ctx.moveTo(cx - 55, cy - 25);
      ctx.lineTo(cx - 75, cy - 95);
      ctx.lineTo(cx - 25, cy - 45);
      // Right pointy ear
      ctx.moveTo(cx + 55, cy - 25);
      ctx.lineTo(cx + 75, cy - 95);
      ctx.lineTo(cx + 25, cy - 45);
    } else if (shape === 'FISH') {
      // Fish body & fins (~200px wide, ~150px tall)
      ctx.beginPath();
      ctx.ellipse(cx - 15, cy, 85, 50, 0, 0, Math.PI * 2);
      // Tail fin
      ctx.moveTo(cx + 45, cy);
      ctx.lineTo(cx + 105, cy - 55);
      ctx.lineTo(cx + 85, cy);
      ctx.lineTo(cx + 105, cy + 55);
      ctx.closePath();
      // Dorsal fin
      ctx.moveTo(cx - 35, cy - 50);
      ctx.lineTo(cx - 5, cy - 85);
      ctx.lineTo(cx + 15, cy - 48);
      ctx.closePath();
    } else if (shape === 'HEART') {
      // Classic smooth heart shape (~180px tall)
      ctx.beginPath();
      const hy = cy - 15;
      ctx.moveTo(cx, hy + 35);
      ctx.bezierCurveTo(cx - 10, hy - 25, cx - 85, hy - 40, cx - 85, hy + 25);
      ctx.bezierCurveTo(cx - 85, hy + 75, cx - 10, hy + 115, cx, hy + 135);
      ctx.bezierCurveTo(cx + 10, hy + 115, cx + 85, hy + 75, cx + 85, hy + 25);
      ctx.bezierCurveTo(cx + 85, hy - 40, cx + 10, hy - 25, cx, hy + 35);
    } else if (shape === 'STAR') {
      // 5-pointed star (~184px tall)
      ctx.beginPath();
      const outerR = 92;
      const innerR = 42;
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI / 5 - Math.PI / 2;
        const r = (i % 2 === 0) ? outerR : innerR;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
  }

  isInsideMask(shape, x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.noiseW || iy < 0 || iy >= this.noiseH) return false;
    return this.masks[shape][iy * this.noiseW + ix] === 1;
  }

  initDots() {
    this.dots = [];
    const count = CONFIG.LEVEL_3.dotCount; // 900 dots
    for (let i = 0; i < count; i++) {
      this.dots.push({
        x: Math.random() * this.noiseW,
        y: Math.random() * this.noiseH,
        vx: (Math.random() - 0.5) * CONFIG.LEVEL_3.dotJitter * 2
      });
    }
  }

  resetDots() {
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].x = Math.random() * this.noiseW;
      this.dots[i].y = Math.random() * this.noiseH;
      this.dots[i].vx = (Math.random() - 0.5) * CONFIG.LEVEL_3.dotJitter * 2;
    }
  }

  reset() {
    this.currentRound = 1;
    this.roundTimeRemaining = CONFIG.LEVEL_3.roundTimeLimitSeconds;
    this.correctCount = 0;
    this.answerTimes = [];
    this.previousShape = null;
    this.isCompleted = false;
    this.state = 'PLAYING_ROUND';
    this.revealTimer = 0;
    this.revealIsCorrect = false;
    this.wasPointerDown = false;

    this.input.reset();
    this.resetDots();
    this.startRound();
  }

  pickNextShape() {
    const shapes = CONFIG.LEVEL_3.availableShapes.filter(s => s !== this.previousShape);
    const picked = shapes[Math.floor(Math.random() * shapes.length)];
    this.previousShape = picked;
    return picked;
  }

  generateButtons(correctShape) {
    const list = [...CONFIG.LEVEL_3.availableShapes];
    // Fisher-Yates shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    // In Bot Mode: ensure the correct shape is NEVER placed in button 0 position!
    if (window.game && window.game.isBotMode) {
      if (list[0] === correctShape) {
        [list[0], list[1]] = [list[1], list[0]];
      }
    }

    const EMOJIS = { CAT: '🐱', FISH: '🐟', HEART: '❤️', STAR: '⭐' };
    const btnW = 140;
    const btnH = 60; // thumb-friendly, > 56px
    const spacing = 16;
    const totalW = 4 * btnW + 3 * spacing; // 608px
    const startX = (CONFIG.GENERAL.canvasWidth - totalW) / 2; // 176px
    const btnY = 385;

    return list.map((shape, idx) => ({
      shape: shape,
      emoji: EMOJIS[shape],
      label: `${EMOJIS[shape]} ${shape}`,
      x: startX + idx * (btnW + spacing),
      y: btnY,
      width: btnW,
      height: btnH
    }));
  }

  startRound() {
    this.state = 'PLAYING_ROUND';
    this.roundTimeRemaining = CONFIG.LEVEL_3.roundTimeLimitSeconds;
    this.currentShape = this.pickNextShape();
    this.currentButtons = this.generateButtons(this.currentShape);
    this.currentRoundStartTime = performance.now();
  }

  handleAnswer(selectedShape, answerTimeMs) {
    if (this.state !== 'PLAYING_ROUND') return;

    this.answerTimes.push(answerTimeMs);
    const isCorrect = (selectedShape === this.currentShape);

    if (isCorrect) {
      this.correctCount++;
      playPass();
    } else {
      playHiss();
    }

    this.state = 'REVEAL';
    this.revealTimer = 0.5; // 0.5s pause showing outline
    this.revealIsCorrect = isCorrect;
  }

  update(dt) {
    if (this.isCompleted) return null;

    // 1. Update Dot Positions Every Frame
    const speed = CONFIG.LEVEL_3.dotSpeed;
    const jitter = CONFIG.LEVEL_3.dotJitter;
    const respawnChance = CONFIG.LEVEL_3.dotRespawnChance;
    const shape = this.currentShape;

    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];

      // Structure-from-Motion rule:
      // Inside secret shape -> moves UP (vy < 0)
      // Outside secret shape -> moves DOWN (vy > 0)
      const inside = this.isInsideMask(shape, d.x, d.y);
      const vy = inside ? -speed : speed;

      d.x += d.vx * dt;
      d.y += vy * dt;

      // Wrap top / bottom
      if (d.y < 0) d.y += this.noiseH;
      else if (d.y >= this.noiseH) d.y -= this.noiseH;

      // Wrap left / right
      if (d.x < 0) d.x += this.noiseW;
      else if (d.x >= this.noiseW) d.x -= this.noiseW;

      // 2% chance to respawn at random position (maintains uniform noise density)
      if (Math.random() < respawnChance) {
        d.x = Math.random() * this.noiseW;
        d.y = Math.random() * this.noiseH;
        d.vx = (Math.random() - 0.5) * jitter * 2;
      }
    }

    // 2. State & Timer Updates
    if (this.state === 'PLAYING_ROUND') {
      this.roundTimeRemaining -= dt;

      // Sync round time with HUD countdown bar
      if (window.game) {
        window.game.levelTimeRemaining = this.roundTimeRemaining;
      }

      // Check round timeout
      if (this.roundTimeRemaining <= 0) {
        this.roundTimeRemaining = 0;
        this.handleAnswer(null, CONFIG.LEVEL_3.roundTimeLimitSeconds * 1000);
      }

      // Check Button Clicks (Mouse / Touch / Simulated Bot)
      const isPointerPress = this.input.isDown && !this.wasPointerDown;
      this.wasPointerDown = this.input.isDown;

      if (isPointerPress) {
        const mx = this.input.x;
        const my = this.input.y;
        for (const btn of this.currentButtons) {
          if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
            const answerTimeMs = performance.now() - this.currentRoundStartTime;
            this.handleAnswer(btn.shape, answerTimeMs);
            break;
          }
        }
      }
    } else if (this.state === 'REVEAL') {
      this.revealTimer -= dt;
      if (this.revealTimer <= 0) {
        if (this.currentRound < CONFIG.LEVEL_3.totalRounds) {
          this.currentRound++;
          this.startRound();
        } else {
          // Completed all 3 rounds!
          this.isCompleted = true;
          return this.evaluateBotVsHuman();
        }
      }
    }

    return null;
  }

  evaluateBotVsHuman() {
    // Bot Check: All 3 answers arrived in under 400ms each
    const allUnder400 = (this.answerTimes.length === 3 &&
                         this.answerTimes.every(t => t < CONFIG.LEVEL_3.botMaxAnswerTimeMs));
    if (allUnder400) {
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_3.msgBotTooFast
      };
    }

    // Scripted Bot Mode Check (blindly picks button 0 and gets 0/3)
    if (window.game && window.game.isBotMode) {
      return {
        success: false,
        isBot: true,
        reason: CONFIG.LEVEL_3.msgBotStatic
      };
    }

    // Pass condition: At least 2 of 3 correct
    if (this.correctCount >= CONFIG.LEVEL_3.requiredPassCount) {
      // Human score calculation (0 - 100):
      // 100 minus 30 per wrong round
      // minus up to 10 if average answer time was above 6.0s
      let score = 100 - (CONFIG.LEVEL_3.totalRounds - this.correctCount) * 30;
      if (this.answerTimes.length > 0) {
        const avgSeconds = (this.answerTimes.reduce((a, b) => a + b, 0) / this.answerTimes.length) / 1000;
        if (avgSeconds > 6.0) {
          score -= Math.min(10, Math.round((avgSeconds - 6.0) * 5));
        }
      }
      score = Math.max(0, Math.min(100, Math.round(score)));

      return {
        success: true,
        isBot: false,
        score: score,
        reason: CONFIG.LEVEL_3.msgPass
      };
    } else {
      // Failed perception (costs 1 life, retries level - NOT a bot accusation)
      return {
        success: false,
        isBot: false,
        reason: CONFIG.LEVEL_3.msgFailHidden
      };
    }
  }

  drawRevealedOutline(ctx, shape, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    this.drawShapePath(ctx, shape);
    ctx.stroke();

    ctx.restore();
  }

  render(ctx, frameTime) {
    // 1. Level Header / Round Indicator
    ctx.save();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ROUND ${this.currentRound} / ${CONFIG.LEVEL_3.totalRounds}`, CONFIG.GENERAL.canvasWidth / 2, 42);

    // Score pills
    const pillSpacing = 24;
    const pillStartX = CONFIG.GENERAL.canvasWidth / 2 - pillSpacing;
    for (let r = 0; r < 3; r++) {
      const px = pillStartX + r * pillSpacing;
      ctx.beginPath();
      ctx.arc(px, 54, 4, 0, Math.PI * 2);
      if (r < this.currentRound - 1) {
        ctx.fillStyle = '#22c55e'; // completed
      } else if (r === this.currentRound - 1) {
        ctx.fillStyle = '#38bdf8'; // active
      } else {
        ctx.fillStyle = '#334155'; // upcoming
      }
      ctx.fill();
    }
    ctx.restore();

    // 2. Noise Canvas Box (360 x 300 px centered)
    ctx.save();
    const nx = this.noiseX;
    const ny = this.noiseY;
    const nw = this.noiseW;
    const nh = this.noiseH;

    // Outer glow border
    ctx.fillStyle = '#000000'; // Black background
    ctx.fillRect(nx, ny, nw, nh);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeRect(nx, ny, nw, nh);
    ctx.shadowBlur = 0;

    // Clip to noise box for dots
    ctx.save();
    ctx.beginPath();
    ctx.rect(nx, ny, nw, nh);
    ctx.clip();

    // Render 900 uniform square dots
    // (In any paused frame, all dots are identical white squares with zero outline or density difference!)
    ctx.fillStyle = CONFIG.LEVEL_3.dotColor;
    const dotSize = CONFIG.LEVEL_3.dotSize;
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      ctx.fillRect(nx + d.x, ny + d.y, dotSize, dotSize);
    }

    // Reveal outline on round completion (0.5s feedback)
    if (this.state === 'REVEAL') {
      ctx.translate(nx, ny);
      const outlineColor = this.revealIsCorrect ? '#22c55e' : '#ef4444';
      this.drawRevealedOutline(ctx, this.currentShape, outlineColor);

      // Feedback banner
      ctx.fillStyle = this.revealIsCorrect ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(0, nh / 2 - 26, nw, 52);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.revealIsCorrect ? 'PERFECT! 🐾' : 'MISSED! 😾', nw / 2, nh / 2 + 8);
    }
    ctx.restore(); // restore clip
    ctx.restore();

    // 3. 4 Big Answer Buttons Below Noise
    ctx.save();
    for (const btn of this.currentButtons) {
      const isHovered = (this.input.x >= btn.x && this.input.x <= btn.x + btn.width &&
                         this.input.y >= btn.y && this.input.y <= btn.y + btn.height);
      const isPressed = isHovered && this.input.isDown;

      // Button background card
      ctx.fillStyle = isPressed ? '#0369a1' : (isHovered ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)');
      ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = isHovered ? 2 : 1.5;

      if (isHovered) {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 12);
      ctx.fill();
      ctx.stroke();

      // Button Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = isPressed ? '#ffffff' : (isHovered ? '#38bdf8' : '#f8fafc');
      ctx.font = 'bold 16px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
    }
    ctx.restore();

    // 4. Paw Cursor
    Placeholders.drawPaw(ctx, this.input.x, this.input.y, 22, this.input.isDown);
  }
}

window.Level1_SteadyPaw = Level1_SteadyPaw;
window.Level2_PetTheCat = Level2_PetTheCat;
window.Level3_FindHiddenCat = Level3_FindHiddenCat;

