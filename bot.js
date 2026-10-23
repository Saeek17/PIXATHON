/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Scripted Bot Runner
 * 
 * Injects synthetic pointer events through the EXACT same InputManager pipeline.
 * Demonstrates how machine perfection (straight lines, constant velocity, 0ms reactions)
 * is systematically rejected by all 3 levels with humorous deadpan messages.
 */

class BotRunner {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.currentStepTimer = null;
    this.animFrameId = null;
  }

  start() {
    this.isActive = true;
    this.game.isBotMode = true;
    this.runLevel1Bot();
  }

  stop() {
    this.isActive = false;
    this.game.isBotMode = false;
    if (this.currentStepTimer) clearTimeout(this.currentStepTimer);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // ==========================================
  // LEVEL 1 BOT: Laser-Straight Constant Speed
  // ==========================================
  runLevel1Bot() {
    if (!this.isActive) return;

    // Wait for level 1 intro countdown to finish
    const checkReady = () => {
      if (this.game.gameState !== 'PLAYING' || this.game.currentLevelIndex !== 0) {
        this.currentStepTimer = setTimeout(checkReady, 100);
        return;
      }

      const input = this.game.input;
      const level = this.game.currentLevel;
      const startX = level.startPos.x;
      const startY = level.startPos.y;
      const endX = level.goalPos.x;
      const endY = level.goalPos.y;

      // Start drag at start circle
      input.simulateDown(startX, startY);

      // Move in a mathematically laser-straight line with zero wobble and constant speed
      const totalDuration = 1400; // ms
      const startTime = performance.now();

      const step = (now) => {
        if (!this.isActive || this.game.gameState !== 'PLAYING') return;
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / totalDuration);

        // Bot navigates with mathematical perfection along the exact centerline of the pipe:
        // Takes the paw all the way to the fish with 0 wall bumps and constant speed!
        const curX = startX + (endX - startX) * progress;
        const segment = level.getTunnelSegment(curX);
        const curY = segment.y;

        input.simulateMove(curX, curY, now);

        if (progress < 1.0) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          // Reached fish!
          input.simulateUp(curX, curY, now);
          // Wait for level flash, then transition to level 2
          this.currentStepTimer = setTimeout(() => {
            this.runLevel2Bot();
          }, 2400);
        }
      };

      this.animFrameId = requestAnimationFrame(step);
    };

    checkReady();
  }

  // ==========================================
  // LEVEL 2 BOT: Mechanical Linear Petting
  // ==========================================
  runLevel2Bot() {
    if (!this.isActive) return;

    const checkReady = () => {
      if (this.game.gameState !== 'PLAYING' || this.game.currentLevelIndex !== 1) {
        this.currentStepTimer = setTimeout(checkReady, 100);
        return;
      }

      const input = this.game.input;
      const level = this.game.currentLevel;

      // Scripted linear petting strokes:
      // Perfectly horizontal, identical speed, 0 angle variance
      let strokeCount = 0;
      const strokeStartX = level.catX + 50;
      const strokeEndX = level.catX + 280;
      const strokeY = level.catY + 110; // Back of cat, avoiding belly
      const strokeDuration = 380; // Constant speed

      const executeSingleStroke = () => {
        if (!this.isActive || this.game.gameState !== 'PLAYING') return;

        input.simulateDown(strokeStartX, strokeY);
        const startTime = performance.now();

        const step = (now) => {
          if (!this.isActive || this.game.gameState !== 'PLAYING') return;
          const elapsed = now - startTime;
          const progress = Math.min(1.0, elapsed / strokeDuration);

          const curX = strokeStartX + (strokeEndX - strokeStartX) * progress;
          input.simulateMove(curX, strokeY, now);

          if (progress < 1.0) {
            this.animFrameId = requestAnimationFrame(step);
          } else {
            input.simulateUp(strokeEndX, strokeY, now);
            strokeCount++;

            if (level.purrMeter < CONFIG.LEVEL_2.targetPurr && this.game.gameState === 'PLAYING') {
              this.currentStepTimer = setTimeout(executeSingleStroke, 60);
            } else {
              // Level 2 completed / rejected!
              this.currentStepTimer = setTimeout(() => {
                this.runLevel3Bot();
              }, 2400);
            }
          }
        };

        this.animFrameId = requestAnimationFrame(step);
      };

      executeSingleStroke();
    };

    checkReady();
  }

  // ==========================================
  // LEVEL 3 BOT: Inhuman 20ms Freeze Reaction
  // Moves at constant speed, stops exactly 20ms after TWITCH starts,
  // never gets caught, walks to the fish, and gets rejected by bot checks.
  // ==========================================
  runLevel3Bot() {
    if (!this.isActive) return;

    const checkReady = () => {
      if (this.game.gameState !== 'PLAYING' || this.game.currentLevelIndex !== 2) {
        this.currentStepTimer = setTimeout(checkReady, 100);
        return;
      }

      const input = this.game.input;
      const level = this.game.currentLevel;
      const startX = level.startPos.x;
      const startY = level.startPos.y;
      const goalX = level.goalPos.x;
      const goalY = level.goalPos.y;

      let curX = startX;
      let curY = startY;
      input.simulateDown(curX, curY);

      let lastTime = performance.now();
      const constantSpeed = 135; // px/sec constant speed

      const step = (now) => {
        if (!this.isActive || this.game.gameState !== 'PLAYING') return;
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        // BOT BEHAVIOR:
        // On TWITCH (real or fake): stop moving exactly 20ms after twitch starts
        if (level.state === 'twitch') {
          const timeSinceTwitch = now - level.twitchStartedAt;
          if (timeSinceTwitch < 20) {
            // Still moving for the first 20ms
            curX = Math.min(goalX, curX + constantSpeed * dt);
            input.simulateMove(curX, curY, now);
          } else {
            // Exactly 20ms: freeze completely!
            input.simulateMove(curX, curY, now);
          }
        } else if (level.state === 'eye_open') {
          // Eye is open: bot stays completely frozen, never gets caught!
          input.simulateMove(curX, curY, now);
        } else {
          // Cat is sleeping: move forward at constant speed
          curX = Math.min(goalX, curX + constantSpeed * dt);
          input.simulateMove(curX, curY, now);
        }

        const distToFish = Math.hypot(curX - goalX, curY - goalY);
        if (distToFish <= CONFIG.LEVEL_3.goalRadius) {
          input.simulateUp(curX, curY, now);
          // Bot rejected on level 3! Wait for fail flash and show final modal
          this.currentStepTimer = setTimeout(() => {
            this.finishBotDemo();
          }, 2400);
        } else {
          this.animFrameId = requestAnimationFrame(step);
        }
      };

      this.animFrameId = requestAnimationFrame(step);
    };

    checkReady();
  }

  finishBotDemo() {
    this.isActive = false;
    this.game.isBotMode = false;
    this.game.showBotRejectionSummary();
  }
}

window.BotRunner = BotRunner;
