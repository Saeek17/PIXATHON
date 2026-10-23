/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Main Game Controller & State Machine
 * Retro Arcade Neobrutalist Theme Coordination
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // High-DPI Canvas Resolution: 960 x 540 virtual
    this.setupCanvasResolution();

    // Unified Input Manager
    this.input = new InputManager(this.canvas);

    // Levels
    this.levels = [
      new Level1_SteadyPaw(this.input),
      new Level2_PetTheCat(this.input),
      new Level3_FindHiddenCat(this.input)
    ];

    this.levelMetadata = [
      {
        id: 1,
        badge: "TEST 01",
        name: "STEADY PAW",
        instruction: "Guide the paw to the fish without touching the walls.",
        objective: "OBJECTIVE: GUIDE THE PAW TO THE GOLD FISH WITHOUT CLIPPING",
        goalTag: "ROUNDS",
        introDialogue: CONFIG.CAPT_CHA_LINES.level1Intro
      },
      {
        id: 2,
        badge: "LEVEL 02",
        name: "PET THE CAT",
        instruction: "Pet the cat until it purrs. Gently.",
        objective: "PROTOCOL: TACTILE VERIFICATION",
        goalTag: "SUB-GOAL: 100 PURR",
        introDialogue: CONFIG.CAPT_CHA_LINES.level2Intro
      },
      {
        id: 3,
        badge: "LEVEL 03",
        name: "FIND THE HIDDEN CAT",
        instruction: "A cat is hiding in the static. Find it.",
        objective: "PROTOCOL: OPTICAL STATIC DISCRIMINATION",
        goalTag: "SUB-GOAL: 2/3 IDENTIFIED",
        introDialogue: "Look closely. Or don't. I'm a robot."
      }
    ];

    // State Variables
    this.gameState = 'START'; // 'START', 'INTRO', 'PLAYING', 'FLASH', 'GAMEOVER', 'CERTIFICATE', 'PAUSED'
    this.currentLevelIndex = 0;
    this.lives = CONFIG.GENERAL.maxLives;
    this.levelTimeRemaining = CONFIG.GENERAL.levelTimeLimitSeconds;
    this.levelScores = [];
    this.isBotMode = false;
    this.isPaused = false;

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
    this.drawBadgePreview();
  }

  setupCanvasResolution() {
    this.canvas.width = CONFIG.GENERAL.canvasWidth;
    this.canvas.height = CONFIG.GENERAL.canvasHeight;
  }

  cacheDomElements() {
    this.ui = {
      dialogueText: document.getElementById('dialogueText'),
      livesHearts: document.getElementById('livesHearts'),
      creditsVal: document.getElementById('creditsVal'),
      timerBar: document.getElementById('timerBar'),
      timerText: document.getElementById('timerText'),
      
      // Subheader elements
      subLevelBadge: document.getElementById('subLevelBadge'),
      subLevelTitle: document.getElementById('subLevelTitle'),
      subObjectiveText: document.getElementById('subObjectiveText'),
      subGoalTag: document.getElementById('subGoalTag'),

      // Screens / Modals
      startScreen: document.getElementById('startScreen'),
      introCard: document.getElementById('introCard'),
      introBadge: document.getElementById('introBadge'),
      introLevelName: document.getElementById('introLevelName'),
      introInstruction: document.getElementById('introInstruction'),
      introCountdown: document.getElementById('introCountdown'),
      badgeCanvas: document.getElementById('badgePreviewCanvas'),
      progBlocksTrack: document.getElementById('progBlocksTrack'),
      progIndexText: document.getElementById('progIndexText'),

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

      // Stage Tabs & Calculation Meter
      tabStage1: document.getElementById('tabStage1'),
      tabStage2: document.getElementById('tabStage2'),
      tabStage3: document.getElementById('tabStage3'),
      tabStageVerify: document.getElementById('tabStageVerify'),
      meterBlocks: document.getElementById('meterBlocks'),
      meterPctText: document.getElementById('meterPctText'),

      // Buttons
      btnStartHuman: document.getElementById('btnStartHuman'),
      btnRunBot: document.getElementById('btnRunBot'),
      btnStartNow: document.getElementById('btnStartNow'),
      btnGameOverRestart: document.getElementById('btnGameOverRestart'),
      btnCertRestart: document.getElementById('btnCertRestart'),
      btnBotTryHuman: document.getElementById('btnBotTryHuman'),
      btnSoundToggle: document.getElementById('btnSoundToggle'),
      btnPause: document.getElementById('btnPause'),
      btnRestartHeader: document.getElementById('btnRestartHeader')
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

    if (this.ui.btnStartNow) {
      this.ui.btnStartNow.addEventListener('click', () => {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.ui.introCard.classList.add('hidden');
        this.startLevelGameplay();
      });
    }

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
        this.ui.btnSoundToggle.textContent = assets.soundMuted ? '🔇' : '🔊';
      });
    }

    if (this.ui.btnPause) {
      this.ui.btnPause.addEventListener('click', () => {
        this.togglePause();
      });
    }

    if (this.ui.btnRestartHeader) {
      this.ui.btnRestartHeader.addEventListener('click', () => {
        this.restartGame();
      });
    }

    // Spacebar to start or commence
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (this.gameState === 'START') {
          this.startFreshGame();
        } else if (this.gameState === 'INTRO') {
          if (this.countdownInterval) clearInterval(this.countdownInterval);
          this.ui.introCard.classList.add('hidden');
          this.startLevelGameplay();
        }
      }
    });

    // Responsive Canvas resizing
    window.addEventListener('resize', () => {
      this.setupCanvasResolution();
    });
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.ui.btnPause.textContent = '▶';
      this.setDialogue("SECURITY PAUSED. TAKE A BREATH, ORGANIC.");
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.ui.btnPause.textContent = '⏸';
      this.setDialogue("SECURITY RESUMED.");
    }
  }

  setDialogue(text) {
    if (this.ui.dialogueText) {
      this.ui.dialogueText.textContent = text.startsWith('"') ? text : `"${text}"`;
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

    // Show Retro Intro Card Modal
    if (this.ui.introBadge) this.ui.introBadge.textContent = `[ ${meta.id} ]`;
    if (this.ui.introLevelName) this.ui.introLevelName.textContent = meta.name;
    if (this.ui.introInstruction) this.ui.introInstruction.textContent = meta.instruction;
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
    this.levelTimeRemaining = (this.currentLevelIndex === 2)
      ? CONFIG.LEVEL_3.roundTimeLimitSeconds
      : CONFIG.GENERAL.levelTimeLimitSeconds;
    this.input.resetMetrics();
    this.renderHud();
  }

  handleLevelResult(result) {
    if (this.gameState === 'FLASH') return; // Debounce
    this.gameState = 'FLASH';

    if (result.success) {
      playPass();
      this.levelScores[this.currentLevelIndex] = result.score || 90;
      this.showResultFlash(true, result.reason || "Human clumsiness verified.");

      if (this.currentLevelIndex === 0) this.setDialogue(CONFIG.CAPT_CHA_LINES.level1Pass);
      else if (this.currentLevelIndex === 1) this.setDialogue(CONFIG.CAPT_CHA_LINES.level2Pass);
      else this.setDialogue(CONFIG.CAPT_CHA_LINES.level3Pass);

      setTimeout(() => {
        this.hideResultFlash();
        if (this.currentLevelIndex < this.levels.length - 1) {
          this.startLevelIntro(this.currentLevelIndex + 1);
        } else {
          this.showCertificateScreen();
        }
      }, 1800);

    } else {
      playFail();
      this.showResultFlash(false, result.reason || "Verification failed.");

      if (result.isBot) {
        if (this.currentLevelIndex === 0) this.setDialogue(CONFIG.CAPT_CHA_LINES.level1FailBot);
        else if (this.currentLevelIndex === 1) this.setDialogue(CONFIG.CAPT_CHA_LINES.level2FailBot);
        else this.setDialogue(CONFIG.CAPT_CHA_LINES.level3FailBot);
      } else {
        if (this.currentLevelIndex === 0) this.setDialogue(CONFIG.CAPT_CHA_LINES.level1FailWall);
        else if (this.currentLevelIndex === 1) this.setDialogue(CONFIG.CAPT_CHA_LINES.level2FailHiss);
        else this.setDialogue(CONFIG.CAPT_CHA_LINES.level3FailHidden);
      }

      // Deduct life only in human mode
      if (!this.isBotMode) {
        this.lives--;
        this.renderHud();
      }

      setTimeout(() => {
        this.hideResultFlash();

        if (this.isBotMode) {
          if (this.currentLevelIndex < this.levels.length - 1) {
            this.startLevelIntro(this.currentLevelIndex + 1);
          } else {
            this.showBotRejectionSummary();
          }
        } else {
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
      this.ui.flashBadge.className = "flash-badge-retro pass";
    } else {
      this.ui.flashBadge.textContent = "FAIL";
      this.ui.flashBadge.className = "flash-badge-retro fail";
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
    this.ui.certL3Score.textContent = `Static Motion Perception: ${s3}%`;

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
    this.isPaused = false;
    if (this.ui.btnPause) this.ui.btnPause.textContent = '⏸';
    this.renderHud();
    this.setDialogue(CONFIG.CAPT_CHA_LINES.welcome);
    this.ui.startScreen.classList.remove('hidden');
    this.gameState = 'START';
    this.drawBadgePreview();
  }

  hideAllOverlays() {
    this.ui.startScreen.classList.add('hidden');
    this.ui.introCard.classList.add('hidden');
    this.ui.flashOverlay.classList.add('hidden');
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.certificateScreen.classList.add('hidden');
    this.ui.botModal.classList.add('hidden');
  }

  // Draw Robot Bouncer beside Cute Orange Tabby Cat on Start Screen ID Badge
  drawBadgePreview() {
    if (!this.ui.badgeCanvas) return;
    const ctx = this.ui.badgeCanvas.getContext('2d');
    const w = this.ui.badgeCanvas.width;
    const h = this.ui.badgeCanvas.height;

    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, w, h);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(25, 34, 56, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Robot Bouncer on left
    Placeholders.drawPixelRobotBouncer(ctx, 14, 10, 95, 130, performance.now());

    // Cute Tabby Cat on right
    Placeholders.drawPixelTabbyCat(ctx, 115, 30, 125, 110, 'content', performance.now());
  }

  // ==========================================
  // HUD RENDERING (MATCHING SCREENSHOT METRICS)
  // ==========================================
  renderHud() {
    // 1. Lives Hearts
    let heartsStr = '';
    for (let i = 0; i < CONFIG.GENERAL.maxLives; i++) {
      heartsStr += (i < this.lives) ? '❤️' : '🖤';
    }
    if (this.ui.livesHearts) {
      this.ui.livesHearts.textContent = `${this.lives} ${heartsStr}`;
    }

    // 2. Credits
    if (this.ui.creditsVal) {
      this.ui.creditsVal.textContent = '02';
    }

    // 3. Subheader Bar Metadata
    const meta = this.levelMetadata[this.currentLevelIndex] || this.levelMetadata[0];
    if (this.ui.subLevelBadge) this.ui.subLevelBadge.textContent = meta.badge;
    if (this.ui.subLevelTitle) this.ui.subLevelTitle.textContent = meta.name;
    if (this.ui.subObjectiveText) this.ui.subObjectiveText.textContent = meta.objective;
    if (this.ui.subGoalTag) this.ui.subGoalTag.textContent = meta.goalTag;

    // 4. Timer Bar (Hazard Caution Stripes)
    const timeLimit = (this.currentLevelIndex === 2)
      ? CONFIG.LEVEL_3.roundTimeLimitSeconds
      : CONFIG.GENERAL.levelTimeLimitSeconds;
    const timerRatio = Math.max(0, this.levelTimeRemaining / timeLimit);
    if (this.ui.timerBar) {
      this.ui.timerBar.style.width = `${timerRatio * 100}%`;
    }
    if (this.ui.timerText) {
      this.ui.timerText.textContent = `TIME REMAINING: ${this.levelTimeRemaining.toFixed(1)}s`;
    }

    // 5. Stage Navigation Tabs
    const tabs = [this.ui.tabStage1, this.ui.tabStage2, this.ui.tabStage3, this.ui.tabStageVerify];
    tabs.forEach((tab, idx) => {
      if (!tab) return;
      if (this.gameState === 'CERTIFICATE') {
        tab.className = (idx === 3) ? 'stage-tab active' : 'stage-tab';
      } else {
        tab.className = (idx === this.currentLevelIndex) ? 'stage-tab active' : 'stage-tab';
      }
    });

    // 6. Humanity Verification Meter & Progress Blocks
    const passedLevels = this.levelScores.filter(s => s != null).length;
    const wobble = this.input.getWobbleScore();
    const biologicalPct = Math.min(100, Math.round(passedLevels * 30 + wobble * 10 + 5));

    if (this.ui.meterPctText) {
      this.ui.meterPctText.textContent = `${biologicalPct}% BIOLOGICAL`;
    }

    // Render 10 blocks in footer
    if (this.ui.meterBlocks) {
      const activeBlocks = Math.round((biologicalPct / 100) * 10);
      let blkHtml = '';
      for (let i = 0; i < 10; i++) {
        blkHtml += `<div class="meter-blk ${i < activeBlocks ? 'on' : ''}"></div>`;
      }
      this.ui.meterBlocks.innerHTML = blkHtml;
    }

    // Render 10 blocks in Start Screen
    if (this.ui.progBlocksTrack) {
      const progCount = passedLevels * 3;
      let progHtml = '';
      for (let i = 0; i < 10; i++) {
        progHtml += `<div class="prog-block ${i < progCount ? 'filled' : ''}"></div>`;
      }
      this.ui.progBlocksTrack.innerHTML = progHtml;
    }
    if (this.ui.progIndexText) {
      this.ui.progIndexText.textContent = `${passedLevels * 3} / 10 BLOCKS PROVEN`;
    }
  }

  // ==========================================
  // MAIN LOOP
  // ==========================================
  loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000);
    this.lastFrameTime = currentTime;

    // Game Logic Update
    if (this.gameState === 'PLAYING') {
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
      // Start / idle screen canvas animation
      this.ctx.fillStyle = '#fbf7ee';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      Placeholders.drawPixelTabbyCat(this.ctx, 240, 120, 480, 280, 'content', currentTime);
      Placeholders.drawPixelPaw(this.ctx, this.input.x || 480, this.input.y || 270, 24, this.input.isDown);
      this.drawBadgePreview();
    }

    // Update HUD
    this.renderHud();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate and start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
