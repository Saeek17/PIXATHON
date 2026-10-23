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
  // LEVEL 3 BOT: Blind Static Frame Guesser
  // The bot only sees a single static frame without motion perception,
  // so it picks the first button every round and fails.
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

      let hasAnsweredCurrentRound = false;
      let lastRoundAnswered = 0;

      const botLoop = () => {
        if (!this.isActive || this.game.gameState !== 'PLAYING' || this.game.currentLevelIndex !== 2) return;

        if (level.state === 'PLAYING_ROUND' && level.currentRound !== lastRoundAnswered && !hasAnsweredCurrentRound) {
          hasAnsweredCurrentRound = true;
          const roundNum = level.currentRound;

          // Wait 600ms (pretend to process static frame), then tap button 0
          this.currentStepTimer = setTimeout(() => {
            if (!this.isActive || this.game.gameState !== 'PLAYING' || level.state !== 'PLAYING_ROUND') return;

            if (level.currentButtons && level.currentButtons.length > 0) {
              const btn = level.currentButtons[0];
              const tapX = btn.x + btn.width / 2;
              const tapY = btn.y + btn.height / 2;

              input.simulateDown(tapX, tapY);
              setTimeout(() => {
                input.simulateUp(tapX, tapY);
                lastRoundAnswered = roundNum;
                hasAnsweredCurrentRound = false;
              }, 80);
            }
          }, 600);
        }

        if (level.isCompleted) {
          // Level 3 finished and rejected!
          this.currentStepTimer = setTimeout(() => {
            this.finishBotDemo();
          }, 2400);
          return;
        }

        this.animFrameId = requestAnimationFrame(botLoop);
      };

      this.animFrameId = requestAnimationFrame(botLoop);
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
