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
    // ==========================================
    // LEVEL 1: RETRO ARCADE STEADY PAW (MATCHING SCREENSHOT)
    // ==========================================

    // 1. Deep Navy Background (Out-of-bounds walls)
    ctx.save();
    ctx.fillStyle = '#162036';
    ctx.fillRect(0, 0, 960, 540);

    // 2. Carved White Tunnel Floor
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

    // Crisp White Tunnel Fill with solid dark navy border
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Center Guide Trail (Dotted line with mini paw footprints)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(this.tunnelPoints[0].x, this.tunnelPoints[0].y);
    for (let i = 1; i < this.tunnelPoints.length; i++) {
      ctx.lineTo(this.tunnelPoints[i].x, this.tunnelPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Mini paw footprint waypoints along center line
    for (let i = 2; i < this.tunnelPoints.length - 1; i += 3) {
      const pt = this.tunnelPoints[i];
      Placeholders.drawPixelPaw(ctx, pt.x, pt.y, 14, false);
    }

    // 4. In-Canvas Top Status Ribbon
    // Yellow/White ribbon across top
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 960, 36);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, 960, 36);

    ctx.fillStyle = '#16a34a'; // Green sensor dot
    ctx.beginPath();
    ctx.arc(24, 18, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 12px "Silkscreen", "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STATUS: SENSOR CALIBRATED', 38, 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Space Mono", monospace';
    ctx.fillText('DRAG PAW OR CURSOR OVER TRAIL', 936, 22);

    // 5. Slanted Orange Protocol Sticker
    ctx.save();
    ctx.translate(480, 52);
    ctx.rotate(-0.015);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-170, -12, 340, 24);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2;
    ctx.strokeRect(-170, -12, 340, 24);
    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🐾 TABBY DISTRACTION PROTOCOL ACTIVE', 0, 4);
    ctx.restore();

    // 6. Start Node Box (Matching Screenshot Box)
    const sx = this.startPos.x;
    const sy = this.startPos.y;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 36, sy - 42, 72, 84);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx - 36, sy - 42, 72, 84);
    ctx.strokeRect(sx - 32, sy - 38, 64, 76); // Double border

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('START', sx, sy - 24);

    // Paw icon inside start box
    Placeholders.drawPixelPaw(ctx, sx, sy, 26, this.hasStarted);

    ctx.font = 'bold 9px "Space Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('DRAG ME', sx, sy + 28);

    // 7. Goal Node Box (Matching Screenshot Box)
    const gx = this.goalPos.x;
    const gy = this.goalPos.y;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx - 38, gy - 42, 76, 84);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gx - 38, gy - 42, 76, 84);
    ctx.strokeRect(gx - 34, gy - 38, 68, 76); // Double border

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', gx, gy - 24);

    // Pixel gold fish inside goal box
    Placeholders.drawPixelFish(ctx, gx, gy, 32, Math.sin(frameTime * 0.005) * 0.15);

    ctx.font = 'bold 9px "Space Mono", monospace';
    ctx.fillStyle = '#d97706';
    ctx.fillText('GOLD FISH', gx, gy + 28);

    // 8. Player Trajectory Trail (Drawn as user moves paw)
    if (this.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.stroke();

      // Mini footprint points along player path
      for (let i = 0; i < this.trail.length; i += 5) {
        const pt = this.trail[i];
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 9. Wall Bump Markers & Live Feedback
    for (const b of this.bumpPositions) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💥 BUMP!', b.x, b.y - 12);
    }

    // 10. Bottom Action Strip (Matching Screenshot)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 500, 960, 40);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 500, 960, 40);

    // Reset Paw Button Box
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, 506, 110, 28);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 506, 110, 28);
    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RESET PAW', 71, 524);

    // Attempts Readout
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Space Mono", monospace';
    ctx.fillText(`ATTEMPTS: 01   |   WALL TOUCHES: ${this.wallBumps}`, 142, 524);

    // Pro-tip
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('TIP: MOVE SLOWLY THROUGH CHOKEPOINTS', 944, 524);

    // 11. Paw Cursor
    Placeholders.drawPixelPaw(ctx, this.input.x, this.input.y, 24, this.input.isDown);
    ctx.restore();
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
    // ==========================================
    // LEVEL 2: RETRO ARCADE PET THE CAT (MATCHING SCREENSHOT)
    // ==========================================

    // 1. Warm Cream Paper Canvas Background
    ctx.save();
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, 960, 540);

    // Subtle micro-grid
    ctx.strokeStyle = 'rgba(25, 34, 56, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 960; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke();
    }
    for (let y = 0; y < 540; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
    }

    // 2. In-Canvas Top Status Ribbon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 960, 34);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, 960, 34);

    ctx.fillStyle = this.mood === 'annoyed' ? '#ef4444' : '#16a34a';
    ctx.beginPath();
    ctx.arc(24, 17, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 11px "Silkscreen", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STATUS: TACTILE VERIFICATION SENSORS ARMED', 38, 21);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Space Mono", monospace';
    ctx.fillText('(PRESS & DRAG TO CHIN/HEAD — AVOID BELLY TRAP)', 936, 21);

    // 3. Left Section: Chunky Pixel Art Orange Tabby Cat
    Placeholders.drawPixelTabbyCat(ctx, 60, 80, 500, 320, this.mood, frameTime);

    // 4. Floating Pixel Hearts on Petting
    for (const p of this.particles) {
      Placeholders.drawPixelHeart(ctx, p.x, p.y, p.size, '#f43f5e');
    }

    // 5. Retro Sound Ticker Box Below Cat
    const tickY = 416;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, tickY, 460, 38);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(80, tickY, 460, 38);

    ctx.fillStyle = this.mood === 'annoyed' ? '#ef4444' : '#192238';
    ctx.font = 'bold 11px "Space Mono", monospace';
    ctx.textAlign = 'center';
    if (this.mood === 'annoyed') {
      ctx.fillText('[ 😾 HISS! ROUGH STROKE OR BELLY TRAP TRIGGERED! ]', 310, tickY + 23);
    } else if (this.mood === 'content') {
      ctx.fillText('[ 💖 PURRRRRRR... PURRRR... <PURR DETECTED> ]', 310, tickY + 23);
    } else {
      ctx.fillText('[ ... AWAITING GENTLE HEAD-TO-TAIL BIOMETRIC STROKES ... ]', 310, tickY + 23);
    }

    // 6. Right Section: Retro Vertical Purr Meter Panel (Matching Screenshot)
    const pxX = 630;
    const pxY = 50;
    const pxW = 250;
    const pxH = 415;

    // Hard drop shadow
    ctx.fillStyle = '#192238';
    ctx.fillRect(pxX + 4, pxY + 4, pxW, pxH);

    // Main Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pxX, pxY, pxW, pxH);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 3;
    ctx.strokeRect(pxX, pxY, pxW, pxH);

    // Panel Header
    ctx.fillStyle = '#192238';
    ctx.font = 'bold 12px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PURR METER', pxX + pxW / 2, pxY + 26);
    ctx.font = '10px "Space Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('(0 - 100)', pxX + pxW / 2, pxY + 40);

    // 10 Segmented Purr Levels (10 to 100)
    const segCount = 10;
    const segH = 20;
    const segStartY = pxY + 52;
    const segW = pxW - 40;
    const segX = pxX + 20;

    for (let i = 0; i < segCount; i++) {
      // Draw from top (100) to bottom (010)
      const levelVal = (10 - i) * 10;
      const curY = segStartY + i * (segH + 4);
      const isFilled = this.purrMeter >= levelVal;

      // Box
      ctx.fillStyle = isFilled ? '#fee2e2' : '#f8fafc';
      ctx.fillRect(segX, curY, segW, segH);
      ctx.strokeStyle = isFilled ? '#ef4444' : '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(segX, curY, segW, segH);

      // Label (e.g. 070)
      ctx.textAlign = 'left';
      ctx.fillStyle = isFilled ? '#dc2626' : '#94a3b8';
      ctx.font = 'bold 9px "Space Mono", monospace';
      ctx.fillText(levelVal < 100 ? `0${levelVal}` : `${levelVal}`, segX + 12, curY + 14);

      // Heart Icon if filled
      if (isFilled) {
        Placeholders.drawPixelHeart(ctx, segX + segW - 20, curY + 10, 12, '#ef4444');
      } else {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(segX + segW - 14, curY + 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Readout Box
    const readY = pxY + 300;
    ctx.fillStyle = '#192238';
    ctx.fillRect(segX, readY, segW, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.purrMeter)} / 100`, pxX + pxW / 2, readY + 24);

    // Action Badge (RAPID SCRATCH)
    const actY = pxY + 348;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(segX, actY, segW, 32);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2;
    ctx.strokeRect(segX, actY, segW, 32);

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", monospace';
    ctx.fillText('RAPID SCRATCH', pxX + pxW / 2, actY + 20);

    // 7. Bottom Proving Criteria Banner
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 495, 960, 45);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 495, 960, 45);

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ PROVING CRITERIA: MAINTAIN GENTLE HEAD-TO-TAIL STROKES TO REACH 100 PURR ]', 480, 522);

    // 8. Hand / Paw Cursor with Action Label
    if (this.input.isDown) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.input.x - 30, this.input.y + 14, 60, 18);
      ctx.strokeStyle = '#192238';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.input.x - 30, this.input.y + 14, 60, 18);
      ctx.fillStyle = '#192238';
      ctx.font = 'bold 8px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SCRATCH', this.input.x, this.input.y + 26);
    }
    Placeholders.drawPixelPaw(ctx, this.input.x, this.input.y, 24, this.input.isDown);
    ctx.restore();
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
    // ==========================================
    // LEVEL 3: RETRO ARCADE CRT STATIC FLUX (MATCHING SCREENSHOT)
    // ==========================================

    // 1. Warm Cream Paper Canvas Background
    ctx.save();
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, 960, 540);

    // Subtle micro-grid
    ctx.strokeStyle = 'rgba(25, 34, 56, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 960; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke();
    }
    for (let y = 0; y < 540; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
    }

    // 2. In-Canvas Top Status Ribbon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 960, 32);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, 960, 32);

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(24, 16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 11px "Silkscreen", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STATUS: OPTICAL FLUX CALIBRATED   ROUND: ${this.currentRound} / ${CONFIG.LEVEL_3.totalRounds}`, 38, 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Space Mono", monospace';
    ctx.fillText('SUB-GOAL: 2 / 3 IDENTIFIED', 936, 20);

    // 3. Centered Retro CRT Monitor Chassis
    const crtW = 390;
    const crtH = 320;
    const crtX = (960 - crtW) / 2;
    const crtY = 40;

    // Chassis hard shadow
    ctx.fillStyle = '#192238';
    ctx.fillRect(crtX + 4, crtY + 4, crtW, crtH);

    // Chassis bezel
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(crtX, crtY, crtW, crtH);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 3;
    ctx.strokeRect(crtX, crtY, crtW, crtH);

    // CRT Bezel Screws [+]
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('[+]', crtX + 10, crtY + 16);
    ctx.fillText('[+]', crtX + crtW - 24, crtY + 16);
    ctx.fillText('[+]', crtX + 10, crtY + crtH - 8);
    ctx.fillText('[+]', crtX + crtW - 24, crtY + crtH - 8);

    // CRT Top Camera Ribbon
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('● CAM_03 // KINETIC NOISE FLUX', 480, crtY + 16);

    // 4. Inner Black CRT Screen (360 x 275 px)
    const scrX = crtX + 15;
    const scrY = crtY + 22;
    const scrW = crtW - 30;
    const scrH = crtH - 34;

    ctx.fillStyle = '#000000';
    ctx.fillRect(scrX, scrY, scrW, scrH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(scrX, scrY, scrW, scrH);

    // Clip to screen for dots
    ctx.save();
    ctx.beginPath();
    ctx.rect(scrX, scrY, scrW, scrH);
    ctx.clip();

    // Render 900 uniform dots
    ctx.fillStyle = CONFIG.LEVEL_3.dotColor;
    const dotSize = CONFIG.LEVEL_3.dotSize;
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      ctx.fillRect(scrX + d.x, scrY + d.y, dotSize, dotSize);
    }

    // Reveal outline on round completion (0.5s feedback)
    if (this.state === 'REVEAL') {
      ctx.translate(scrX, scrY);
      const outlineColor = this.revealIsCorrect ? '#22c55e' : '#ef4444';
      this.drawRevealedOutline(ctx, this.currentShape, outlineColor);

      // Feedback Banner
      ctx.fillStyle = this.revealIsCorrect ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(0, scrH / 2 - 26, scrW, 52);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.revealIsCorrect ? 'PERFECT! 🐾' : 'MISSED! 😾', scrW / 2, scrH / 2 + 7);
    }
    ctx.restore(); // restore clip

    // CRT Screen Scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let sy = scrY; sy < scrY + scrH; sy += 4) {
      ctx.fillRect(scrX, sy, scrW, 1.5);
    }

    // 5. Ticker Box Below CRT Monitor
    const tickY = crtY + crtH + 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(crtX, tickY, crtW, 26);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2;
    ctx.strokeRect(crtX, tickY, crtW, 26);

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 9px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ SENSOR STATUS: TEMPORAL MOTION FLUX DETECTED ]', 480, tickY + 17);

    // 6. 4 Large Answer Buttons (Matching Neobrutalist Arcade Style)
    const btnY = 412;
    const btnW = 190;
    const btnH = 56;
    const gap = 20;
    const totalButtonsW = 4 * btnW + 3 * gap;
    const btnStartX = (960 - totalButtonsW) / 2;

    for (let i = 0; i < this.currentButtons.length; i++) {
      const btn = this.currentButtons[i];
      btn.x = btnStartX + i * (btnW + gap);
      btn.y = btnY;
      btn.width = btnW;
      btn.height = btnH;

      const isHovered = (this.input.x >= btn.x && this.input.x <= btn.x + btn.width &&
                         this.input.y >= btn.y && this.input.y <= btn.y + btn.height);
      const isPressed = isHovered && this.input.isDown;

      const offsetX = isPressed ? 2 : 0;
      const offsetY = isPressed ? 2 : 0;
      const shadowDist = isPressed ? 2 : 4;

      // Hard drop shadow
      ctx.fillStyle = '#192238';
      ctx.fillRect(btn.x + shadowDist, btn.y + shadowDist, btn.width, btn.height);

      // Button background card
      ctx.fillStyle = isPressed ? '#fef08a' : (isHovered ? '#fef9c3' : '#ffffff');
      ctx.fillRect(btn.x + offsetX, btn.y + offsetY, btn.width, btn.height);

      ctx.strokeStyle = '#192238';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(btn.x + offsetX, btn.y + offsetY, btn.width, btn.height);

      // Hotkey badge [1], [2], [3], [4]
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px "Space Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${i + 1}]`, btn.x + offsetX + 10, btn.y + offsetY + 18);

      // Label & Icon
      ctx.fillStyle = '#192238';
      ctx.font = 'bold 15px "Silkscreen", "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + offsetX + btn.width / 2, btn.y + offsetY + 34);
    }

    // 7. Bottom Proving Criteria Banner
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 495, 960, 45);
    ctx.strokeStyle = '#192238';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 495, 960, 45);

    ctx.fillStyle = '#192238';
    ctx.font = 'bold 10px "Silkscreen", "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ PROVING CRITERIA: IDENTIFY 2 OF 3 KINETIC SILHOUETTES IN STATIC NOISE ]', 480, 522);

    // 8. Paw Cursor
    Placeholders.drawPixelPaw(ctx, this.input.x, this.input.y, 24, this.input.isDown);
    ctx.restore();
  }
}

window.Level1_SteadyPaw = Level1_SteadyPaw;
window.Level2_PetTheCat = Level2_PetTheCat;
window.Level3_FindHiddenCat = Level3_FindHiddenCat;

