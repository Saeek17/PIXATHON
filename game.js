/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Main Game Controller & State Machine
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // High-DPI Canvas Rendering
    this.setupCanvasResolution();

    // Unified Input Manager
    this.input = new InputManager(this.canvas);

    // Levels
    this.levels = [
      new Level1_SteadyPaw(this.input),
      new Level2_PetTheCat(this.input),
      new Level3_SneakPastCat(this.input)
    ];

    this.levelMetadata = [
      {
        id: 1,
        name: "STEADY PAW",
        instruction: "Guide the paw to the fish. (Organic shakiness & wall bumps expected!)",
        introDialogue: CONFIG.CAPT_CHA_LINES.level1Intro
      },
      {
        id: 2,
        name: "PET THE CAT",
        instruction: "Pet the cat until it purrs. Gently.",
        introDialogue: CONFIG.CAPT_CHA_LINES.level2Intro
      },
      {
        id: 3,
        name: "SNEAK PAST THE SLEEPING CAT",
        instruction: "Reach the fish. Freeze when the cat opens an eye.",
        introDialogue: CONFIG.CAPT_CHA_LINES.level3Intro
      }
    ];

    // State Variables
    this.gameState = 'START'; // 'START', 'INTRO', 'PLAYING', 'FLASH', 'GAMEOVER', 'CERTIFICATE'
    this.currentLevelIndex = 0;
    this.lives = CONFIG.GENERAL.maxLives;
    this.levelTimeRemaining = CONFIG.GENERAL.levelTimeLimitSeconds;
    this.levelScores = [];
    this.isBotMode = false;

    // Intro Countdown
    this.countdownTimer = 3;
    this.countdownInterval = null;

    // Scripted Bot Runner
    this.botRunner = new BotRunner(this);

    // UI Elements Cache
    this.cacheDomElements();
    this.bindUiEvents();

    // Start 60fps Loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));

    // Initial Welcome Dialogue
    this.setDialogue(CONFIG.CAPT_CHA_LINES.welcome);
    this.renderHud();
  }

  setupCanvasResolution() {
    // Virtual game canvas resolution: 960 x 540
    this.canvas.width = CONFIG.GENERAL.canvasWidth;
    this.canvas.height = CONFIG.GENERAL.canvasHeight;
  }

  cacheDomElements() {
    this.ui = {
      dialogueText: document.getElementById('dialogueText'),
      heartsContainer: document.getElementById('heartsContainer'),
      levelPill: document.getElementById('levelPill'),
      timerBar: document.getElementById('timerBar'),
      timerText: document.getElementById('timerText'),
      wobbleFill: document.getElementById('wobbleFill'),
      wobbleText: document.getElementById('wobbleText'),
      
      // Screens / Modals
      startScreen: document.getElementById('startScreen'),
      introCard: document.getElementById('introCard'),
      introLevelName: document.getElementById('introLevelName'),
      introInstruction: document.getElementById('introInstruction'),
      introCountdown: document.getElementById('introCountdown'),
      
      flashOverlay: document.getElementById('flashOverlay'),
      flashBadge: document.getElementById('flashBadge'),
      flashReason: document.getElementById('flashReason'),
      
      gameOverScreen: document.getElementById('gameOverScreen'),
      gameOverReason: document.getElementById('gameOverReason'),
      
      certificateScreen: document.getElementById('certificateScreen'),
      certScoreVal: document.getElementById('certScoreVal'),
      certL1Score: document.getElementById('certL1Score'),
      certL2Score: document.getElementById('certL2Score'),
      certL3Score: document.getElementById('certL3Score'),

      botModal: document.getElementById('botModal'),
      botSummaryList: document.getElementById('botSummaryList'),

      // Buttons
      btnStartHuman: document.getElementById('btnStartHuman'),
      btnRunBot: document.getElementById('btnRunBot'),
      btnGameOverRestart: document.getElementById('btnGameOverRestart'),
      btnCertRestart: document.getElementById('btnCertRestart'),
      btnBotTryHuman: document.getElementById('btnBotTryHuman'),
      btnSoundToggle: document.getElementById('btnSoundToggle')
    };
  }

  bindUiEvents() {
    this.ui.btnStartHuman.addEventListener('click', () => {
      this.isBotMode = false;
      this.startFreshGame();
    });

    this.ui.btnRunBot.addEventListener('click', () => {
      this.startBotDemo();
    });

    this.ui.btnGameOverRestart.addEventListener('click', () => {
      this.restartGame();
    });

    this.ui.btnCertRestart.addEventListener('click', () => {
      this.restartGame();
    });

    this.ui.btnBotTryHuman.addEventListener('click', () => {
      this.hideAllOverlays();
      this.startFreshGame();
    });

    if (this.ui.btnSoundToggle) {
      this.ui.btnSoundToggle.addEventListener('click', () => {
        assets.soundMuted = !assets.soundMuted;
        this.ui.btnSoundToggle.textContent = assets.soundMuted ? '🔇 Audio Off' : '🔊 Audio On';
      });
    }

    // Responsive Canvas resizing
    window.addEventListener('resize', () => {
      this.setupCanvasResolution();
    });
  }

  setDialogue(text) {
    if (this.ui.dialogueText) {
      this.ui.dialogueText.textContent = text;
    }
  }

  get currentLevel() {
    return this.levels[this.currentLevelIndex];
  }

  // ==========================================
  // GAME STATE TRANSITIONS
  // ==========================================

  startFreshGame() {
    this.lives = CONFIG.GENERAL.maxLives;
    this.currentLevelIndex = 0;
    this.levelScores = [];
    this.hideAllOverlays();
    this.startLevelIntro(0);
  }

  startBotDemo() {
    this.lives = CONFIG.GENERAL.maxLives;
    this.currentLevelIndex = 0;
    this.levelScores = [];
    this.hideAllOverlays();
    this.setDialogue(CONFIG.CAPT_CHA_LINES.botDemoStart);
    this.startLevelIntro(0);
    this.botRunner.start();
  }

  startLevelIntro(levelIdx) {
    this.gameState = 'INTRO';
    this.currentLevelIndex = levelIdx;
    const meta = this.levelMetadata[levelIdx];

    this.setDialogue(meta.introDialogue);
    this.currentLevel.reset();
    this.renderHud();

    // Show Intro Card
    this.ui.introLevelName.textContent = `LEVEL ${meta.id}: ${meta.name}`;
    this.ui.introInstruction.textContent = meta.instruction;
    this.ui.introCard.classList.remove('hidden');

    this.countdownTimer = CONFIG.GENERAL.countdownSeconds;
    this.ui.introCountdown.textContent = this.countdownTimer;

    playLevelStart();

    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.countdownTimer--;
      if (this.countdownTimer > 0) {
        this.ui.introCountdown.textContent = this.countdownTimer;
        playLevelStart();
      } else {
        clearInterval(this.countdownInterval);
        this.ui.introCard.classList.add('hidden');
        this.startLevelGameplay();
      }
    }, 900);
  }

  startLevelGameplay() {
    this.gameState = 'PLAYING';
    this.levelTimeRemaining = CONFIG.GENERAL.levelTimeLimitSeconds;
    this.currentLevel.reset();
  }

  handleLevelResult(result) {
    this.gameState = 'FLASH';

    if (result.success) {
      // Level Passed!
      playPass();
      this.setDialogue(CONFIG.CAPT_CHA_LINES.passLevel);
      this.levelScores[this.currentLevelIndex] = result.score || 88;
      this.showResultFlash(true, result.reason || "Human verified.");

      setTimeout(() => {
        this.hideResultFlash();
        if (this.currentLevelIndex < this.levels.length - 1) {
          this.startLevelIntro(this.currentLevelIndex + 1);
        } else {
          this.showCertificateScreen();
        }
      }, 2000);
    } else {
      // Level Failed!
      playFail();
      this.showResultFlash(false, result.reason || "Verification failed.");

      if (result.isBot) {
        if (this.currentLevelIndex === 0) this.setDialogue(CONFIG.CAPT_CHA_LINES.level1FailBot);
        else if (this.currentLevelIndex === 1) this.setDialogue(CONFIG.CAPT_CHA_LINES.level2FailBot);
        else this.setDialogue(CONFIG.CAPT_CHA_LINES.level3FailBot);
      } else {
        if (this.currentLevelIndex === 0) this.setDialogue(CONFIG.CAPT_CHA_LINES.level1FailWall);
        else if (this.currentLevelIndex === 1) this.setDialogue(CONFIG.CAPT_CHA_LINES.level2FailHiss);
        else this.setDialogue(CONFIG.CAPT_CHA_LINES.level3FailCaught);
      }

      // Deduct life only in human mode
      if (!this.isBotMode) {
        this.lives--;
        this.renderHud();
      }

      setTimeout(() => {
        this.hideResultFlash();

        if (this.isBotMode) {
          // In Bot Mode, it automatically advances to demo next level
          if (this.currentLevelIndex < this.levels.length - 1) {
            this.startLevelIntro(this.currentLevelIndex + 1);
          } else {
            this.showBotRejectionSummary();
          }
        } else {
          // Human Mode: Retry if lives > 0, else Game Over
          if (this.lives > 0) {
            this.startLevelIntro(this.currentLevelIndex);
          } else {
            this.showGameOver(result.reason);
          }
        }
      }, 2200);
    }
  }

  showResultFlash(isPass, reasonText) {
    this.ui.flashOverlay.classList.remove('hidden');
    if (isPass) {
      this.ui.flashBadge.textContent = "PASS";
      this.ui.flashBadge.className = "flash-badge pass";
    } else {
      this.ui.flashBadge.textContent = "FAIL";
      this.ui.flashBadge.className = "flash-badge fail";
    }
    this.ui.flashReason.textContent = reasonText;
  }

  hideResultFlash() {
    this.ui.flashOverlay.classList.add('hidden');
  }

  showGameOver(reason) {
    this.gameState = 'GAMEOVER';
    this.setDialogue(CONFIG.CAPT_CHA_LINES.gameOver);
    this.ui.gameOverReason.textContent = reason || "Depleted biological integrity.";
    this.ui.gameOverScreen.classList.remove('hidden');
  }

  showCertificateScreen() {
    this.gameState = 'CERTIFICATE';
    this.setDialogue(CONFIG.CAPT_CHA_LINES.certificate);

    const s1 = this.levelScores[0] || 85;
    const s2 = this.levelScores[1] || 88;
    const s3 = this.levelScores[2] || 90;
    const avgScore = Math.round((s1 + s2 + s3) / 3);

    this.ui.certScoreVal.textContent = `${avgScore} / 100`;
    this.ui.certL1Score.textContent = `Steady Paw Tremor: ${s1}%`;
    this.ui.certL2Score.textContent = `Organic Petting Warmth: ${s2}%`;
    this.ui.certL3Score.textContent = `Hesitant Human Stealth: ${s3}%`;

    this.ui.certificateScreen.classList.remove('hidden');
  }

  showBotRejectionSummary() {
    this.gameState = 'START';
    this.setDialogue(CONFIG.CAPT_CHA_LINES.botDemoEnd);
    this.ui.botModal.classList.remove('hidden');
  }

  restartGame() {
    this.botRunner.stop();
    this.hideAllOverlays();
    this.lives = CONFIG.GENERAL.maxLives;
    this.currentLevelIndex = 0;
    this.levelScores = [];
    this.isBotMode = false;
    this.renderHud();
    this.setDialogue(CONFIG.CAPT_CHA_LINES.welcome);
    this.ui.startScreen.classList.remove('hidden');
    this.gameState = 'START';
  }

  hideAllOverlays() {
    this.ui.startScreen.classList.add('hidden');
    this.ui.introCard.classList.add('hidden');
    this.ui.flashOverlay.classList.add('hidden');
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.certificateScreen.classList.add('hidden');
    this.ui.botModal.classList.add('hidden');
  }

  // ==========================================
  // HUD RENDERING
  // ==========================================
  renderHud() {
    // 1. Hearts (Lives)
    let heartsHtml = '';
    for (let i = 0; i < CONFIG.GENERAL.maxLives; i++) {
      if (i < this.lives) {
        heartsHtml += '<span class="heart active">❤️</span>';
      } else {
        heartsHtml += '<span class="heart lost">🖤</span>';
      }
    }
    this.ui.heartsContainer.innerHTML = heartsHtml;

    // 2. Level Pill
    const lvlNum = this.currentLevelIndex + 1;
    this.ui.levelPill.textContent = `TEST ${lvlNum} / 3`;

    // 3. Timer Bar
    const timerRatio = Math.max(0, this.levelTimeRemaining / CONFIG.GENERAL.levelTimeLimitSeconds);
    this.ui.timerBar.style.width = `${timerRatio * 100}%`;
    this.ui.timerText.textContent = `${Math.ceil(this.levelTimeRemaining)}s`;

    if (timerRatio < 0.25) {
      this.ui.timerBar.style.background = '#ef4444'; // Warning red
    } else {
      this.ui.timerBar.style.background = 'linear-gradient(90deg, #38bdf8, #818cf8)';
    }

    // 4. Human Wobble Meter
    const wobble = this.input.getWobbleScore();
    const wobblePct = Math.min(100, Math.round(wobble * 100));
    this.ui.wobbleFill.style.width = `${wobblePct}%`;
    this.ui.wobbleText.textContent = `Human Wobble: ${wobblePct}%`;
  }

  // ==========================================
  // MAIN LOOP
  // ==========================================
  loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000); // delta in seconds
    this.lastFrameTime = currentTime;

    // Clear Canvas
    this.ctx.fillStyle = '#0f172a'; // Deep cyber slate
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle background grid
    this.drawBackgroundGrid();

    // Game Logic Update
    if (this.gameState === 'PLAYING') {
      // Countdown Level Timer
      this.levelTimeRemaining -= dt;
      if (this.levelTimeRemaining <= 0) {
        this.levelTimeRemaining = 0;
        this.handleLevelResult({
          success: false,
          isBot: false,
          reason: "Time expired. Even snails move faster."
        });
      } else {
        const result = this.currentLevel.update(dt);
        if (result) {
          this.handleLevelResult(result);
        }
      }
    }

    // Render Current Level
    if (this.gameState === 'PLAYING' || this.gameState === 'FLASH' || this.gameState === 'INTRO') {
      this.currentLevel.render(this.ctx, currentTime);
    } else {
      // Start / idle screen canvas animation: cute resting cat + wandering paw
      Placeholders.drawPettingCat(this.ctx, 240, 150, 480, 260, 'content', currentTime);
      Placeholders.drawPaw(this.ctx, this.input.x || 480, this.input.y || 270, 22, this.input.isDown);
    }

    // Update HUD
    this.renderHud();

    requestAnimationFrame((t) => this.loop(t));
  }

  drawBackgroundGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Instantiate and start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
