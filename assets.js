/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Asset Manifest, Placeholder Fallback Renderer, and Audio Hooks
 * 
 * If image/sound files exist in the assets/ directory, they are loaded.
 * If any file is missing, expressive procedural vector placeholders are rendered
 * so the game runs 100% reliably out of the box with zero external dependencies!
 */

// ==========================================
// ASSETS MANIFEST
// Drop in your own files matching these names!
// ==========================================
const ASSETS_MANIFEST = {
  images: {
    cat_idle: "assets/cat_idle.png",
    cat_content: "assets/cat_content.png",
    cat_annoyed: "assets/cat_annoyed.png",
    cat_sleeping: "assets/cat_sleeping.png",
    cat_twitch: "assets/cat_twitch.png",
    cat_alert: "assets/cat_alert.png",
    fish: "assets/fish.png",
    paw: "assets/paw.png",
    robot_bouncer: "assets/robot_bouncer.png"
  },
  sounds: {
    pass: "assets/pass.mp3",
    fail: "assets/fail.mp3",
    hiss: "assets/hiss.mp3",
    purr: "assets/purr.mp3",
    twitch_warning: "assets/twitch_warning.mp3",
    level_start: "assets/level_start.mp3"
  }
};

// ==========================================
// ASSET MANAGER & PLACEHOLDER LOADER
// ==========================================
class AssetManager {
  constructor() {
    this.images = {};
    this.audioElements = {};
    this.loadedImagesCount = 0;
    this.totalImagesCount = Object.keys(ASSETS_MANIFEST.images).length;
    this.soundMuted = false;
    this.audioCtx = null;

    this.initAudioContext();
    this.preloadAssets();
  }

  initAudioContext() {
    // Lazy web audio synth fallback for retro sound effects
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  preloadAssets() {
    // Attempt loading custom image files; fallback gracefully if missing
    for (const [key, path] of Object.entries(ASSETS_MANIFEST.images)) {
      const img = new Image();
      img.onload = () => {
        this.images[key] = { img: img, loaded: true };
        this.loadedImagesCount++;
      };
      img.onerror = () => {
        // Missing asset is completely normal for first version
        this.images[key] = { img: null, loaded: false };
        this.loadedImagesCount++;
      };
      img.src = path;
    }

    // Attempt loading custom audio files
    for (const [key, path] of Object.entries(ASSETS_MANIFEST.sounds)) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = path;
      this.audioElements[key] = audio;
    }
  }

  hasImage(key) {
    return this.images[key] && this.images[key].loaded && this.images[key].img;
  }

  getImage(key) {
    return this.hasImage(key) ? this.images[key].img : null;
  }
}

// Global Asset Manager instance
const assets = new AssetManager();

// ==========================================
// AUDIO HOOK FUNCTIONS
// As requested: empty audio functions called at the right moments
// (pass, fail, hiss, purr, twitch warning, level start)
// wired to manifest sounds, with procedural Web Audio fallback.
// ==========================================

function playPass() {
  if (assets.soundMuted) return;
  assets.resumeAudioContext();
  
  // 1. If custom MP3 file is placed, play it
  if (assets.audioElements.pass && assets.audioElements.pass.readyState >= 2) {
    assets.audioElements.pass.currentTime = 0;
    assets.audioElements.pass.play().catch(() => {});
    return;
  }

  // 2. Procedural Web Audio fallback (uplifting retro arpeggio)
  if (assets.audioCtx) {
    const ctx = assets.audioCtx;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }
}

function playFail() {
  if (assets.soundMuted) return;
  assets.resumeAudioContext();

  if (assets.audioElements.fail && assets.audioElements.fail.readyState >= 2) {
    assets.audioElements.fail.currentTime = 0;
    assets.audioElements.fail.play().catch(() => {});
    return;
  }

  // Procedural Web Audio fallback (deadpan robot buzz / low thud)
  if (assets.audioCtx) {
    const ctx = assets.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.35);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

function playHiss() {
  if (assets.soundMuted) return;
  assets.resumeAudioContext();

  if (assets.audioElements.hiss && assets.audioElements.hiss.readyState >= 2) {
    assets.audioElements.hiss.currentTime = 0;
    assets.audioElements.hiss.play().catch(() => {});
    return;
  }

  // Procedural Web Audio fallback (filtered noise hiss)
  if (assets.audioCtx) {
    const ctx = assets.audioCtx;
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2800;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }
}

function playPurr() {
  if (assets.soundMuted) return;
  assets.resumeAudioContext();

  if (assets.audioElements.purr && assets.audioElements.purr.readyState >= 2) {
    assets.audioElements.purr.currentTime = 0;
    assets.audioElements.purr.play().catch(() => {});
    return;
  }

  // Procedural Web Audio fallback (low rhythmic purr oscillator)
  if (assets.audioCtx) {
    const ctx = assets.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(26, now); // 26 Hz purr vibration
    lfoGain.gain.setValueAtTime(0.08, now);
    lfo.connect(lfoGain);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.2);
    lfo.stop(now + 0.2);
  }
}

function playTwitchWarning() {
  if (assets.soundMuted) return;
  assets.resumeAudioContext();

  if (assets.audioElements.twitch_warning && assets.audioElements.twitch_warning.readyState >= 2) {
    assets.audioElements.twitch_warning.currentTime = 0;
    assets.audioElements.twitch_warning.play().catch(() => {});
    return;
  }

  // Procedural Web Audio fallback (warning radar beep)
  if (assets.audioCtx) {
    const ctx = assets.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }
}

function playLevelStart() {
  if (assets.soundMuted) return;
  assets.resumeAudioContext();

  if (assets.audioElements.level_start && assets.audioElements.level_start.readyState >= 2) {
    assets.audioElements.level_start.currentTime = 0;
    assets.audioElements.level_start.play().catch(() => {});
    return;
  }

  // Procedural Web Audio fallback (retro synth blip)
  if (assets.audioCtx) {
    const ctx = assets.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// ==========================================
// PROCEDURAL PLACEHOLDER GRAPHICS
// If image files are not dropped in yet, these render
// crisp, expressive vector art so the game looks amazing immediately!
// ==========================================

const Placeholders = {
  // ==========================================
  // RETRO PIXEL ART ASSET RENDERERS (MATCHING SCREENSHOT AESTHETICS)
  // ==========================================

  // Draw Chunky Pixel Art Orange Tabby Cat (Level 2 & ID Badge)
  drawPixelTabbyCat(ctx, x, y, width = 360, height = 240, mood = 'content', frameTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // Pixel grid scaling (28 cols x 22 rows)
    const cols = 28;
    const rows = 22;
    const px = Math.floor(Math.min(width / cols, height / rows));
    
    // Center within bounding box
    const offsetX = Math.floor((width - cols * px) / 2);
    const offsetY = Math.floor((height - rows * px) / 2);
    ctx.translate(offsetX, offsetY);

    // Animations
    const breath = mood === 'content' ? (Math.sin(frameTime * 0.004) > 0 ? 1 : 0) : 0;
    const tailWag = mood === 'content' ? Math.round(Math.sin(frameTime * 0.006) * 1.5) :
                    mood === 'annoyed' ? Math.round(Math.sin(frameTime * 0.018) * 2.5) : 0;

    // Palette
    const cNavy = '#192238';      // Dark border
    const cOrange = '#f97316';    // Body orange
    const cStripe = '#9a3412';    // Rust tabby stripes
    const cWhite = '#ffffff';     // White bib/cheeks/paws
    const cPink = '#f472b6';      // Nose & inner ears
    const cPinkInner = '#fda4af';
    const cEyeYellow = '#facc15';

    // Helper: draw pixel block
    const dot = (col, row, color, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(col * px, row * px, w * px, h * px);
    };

    // --- 1. DROP SHADOW ---
    ctx.fillStyle = 'rgba(25, 34, 56, 0.2)';
    ctx.fillRect(4 * px, 19 * px, 20 * px, 2 * px);
    ctx.fillRect(6 * px, 20 * px, 16 * px, 1 * px);

    // --- 2. TAIL (Right side, waving) ---
    const tx = 21 + tailWag;
    dot(20, 14, cOrange, 2, 4);
    dot(tx, 10, cOrange, 2, 4);
    dot(tx + 1, 7, cOrange, 2, 3);
    dot(tx + 2, 5, cStripe, 2, 2); // Tail tip dark stripe
    dot(tx + 1, 4, cStripe, 2, 1);
    // Tail borders
    ctx.strokeStyle = cNavy;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20 * px, 14 * px, 2 * px, 4 * px);
    ctx.strokeRect(tx * px, 10 * px, 2 * px, 4 * px);
    ctx.strokeRect((tx + 1) * px, 7 * px, 2 * px, 3 * px);
    ctx.strokeRect((tx + 2) * px, 5 * px, 2 * px, 2 * px);

    // --- 3. MAIN BODY & LEGS ---
    dot(6, 11, cOrange, 15, 7);
    dot(5, 13, cOrange, 17, 5);

    // Tabby vertical stripes on body
    dot(11, 11, cStripe, 1, 5);
    dot(14, 11, cStripe, 1, 6);
    dot(17, 11, cStripe, 1, 6);
    dot(19, 12, cStripe, 1, 5);

    // White belly trap zone (cols 9 to 14, rows 14 to 17)
    dot(9, 14, cWhite, 6, 3);
    if (mood === 'annoyed') {
      dot(9, 14, '#fecdd3', 6, 3);
    }

    // Paws (bottom)
    dot(5, 18, cWhite, 3, 2);
    dot(10, 18, cWhite, 3, 2);
    dot(15, 18, cWhite, 3, 2);
    dot(19, 18, cWhite, 3, 2);

    // Body outer border outline
    ctx.strokeStyle = cNavy;
    ctx.lineWidth = 2;
    ctx.strokeRect(6 * px, 11 * px, 15 * px, 7 * px);
    ctx.strokeRect(5 * px, 18 * px, 3 * px, 2 * px);
    ctx.strokeRect(10 * px, 18 * px, 3 * px, 2 * px);
    ctx.strokeRect(15 * px, 18 * px, 3 * px, 2 * px);
    ctx.strokeRect(19 * px, 18 * px, 3 * px, 2 * px);

    // --- 4. HEAD (Rows 4 to 12, Cols 6 to 18, with breathing bob) ---
    const hy = breath;
    
    // Head main block
    dot(6, 5 + hy, cOrange, 12, 7);
    dot(5, 6 + hy, cOrange, 14, 5);

    // Left Ear
    dot(6, 2 + hy, cOrange, 3, 3);
    dot(7, 1 + hy, cOrange, 2, 2);
    dot(7, 0 + hy, cOrange, 1, 1);
    dot(7, 2 + hy, cPinkInner, 1, 2); // Pink inner ear

    // Right Ear
    dot(15, 2 + hy, cOrange, 3, 3);
    dot(15, 1 + hy, cOrange, 2, 2);
    dot(16, 0 + hy, cOrange, 1, 1);
    dot(16, 2 + hy, cPinkInner, 1, 2); // Pink inner ear

    // Ear outlines
    ctx.strokeRect(6 * px, (2 + hy) * px, 3 * px, 3 * px);
    ctx.strokeRect(7 * px, (0 + hy) * px, 2 * px, 2 * px);
    ctx.strokeRect(15 * px, (2 + hy) * px, 3 * px, 3 * px);
    ctx.strokeRect(15 * px, (0 + hy) * px, 2 * px, 2 * px);

    // Tabby forehead stripes
    dot(9, 5 + hy, cStripe, 1, 3);
    dot(11, 4 + hy, cStripe, 2, 4);
    dot(14, 5 + hy, cStripe, 1, 3);

    // Cheeks & Muzzle (White)
    dot(9, 9 + hy, cWhite, 6, 2);
    dot(10, 8 + hy, cWhite, 4, 1);

    // Nose
    dot(11, 8 + hy, cPink, 2, 1);

    // --- 5. EYES BASED ON MOOD ---
    if (mood === 'content') {
      // Blissful curved eyes (^_^)
      dot(7, 7 + hy, cNavy, 3, 1);
      dot(7, 6 + hy, cNavy, 1, 1);
      dot(9, 6 + hy, cNavy, 1, 1);

      dot(14, 7 + hy, cNavy, 3, 1);
      dot(14, 6 + hy, cNavy, 1, 1);
      dot(16, 6 + hy, cNavy, 1, 1);

      // Pink cheek blush
      dot(5, 8 + hy, '#fda4af', 2, 1);
      dot(17, 8 + hy, '#fda4af', 2, 1);
    } else if (mood === 'annoyed') {
      // Angry slit eyes (>_<)
      dot(7, 6 + hy, cNavy, 1, 1);
      dot(8, 7 + hy, cNavy, 2, 1);
      dot(7, 8 + hy, cNavy, 1, 1);

      dot(16, 6 + hy, cNavy, 1, 1);
      dot(14, 7 + hy, cNavy, 2, 1);
      dot(16, 8 + hy, cNavy, 1, 1);

      // Angry forehead mark
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${px * 2.5}px sans-serif`;
      ctx.fillText('💢', 17 * px, (5 + hy) * px);
    } else {
      // Neutral curious cat eyes
      dot(7, 6 + hy, cEyeYellow, 2, 2);
      dot(8, 6 + hy, cNavy, 1, 2);

      dot(15, 6 + hy, cEyeYellow, 2, 2);
      dot(15, 6 + hy, cNavy, 1, 2);
    }

    // Whiskers
    dot(2, 8 + hy, cNavy, 3, 1);
    dot(2, 10 + hy, cNavy, 3, 1);
    dot(19, 8 + hy, cNavy, 3, 1);
    dot(19, 10 + hy, cNavy, 3, 1);

    // Head border
    ctx.strokeRect(5 * px, (5 + hy) * px, 14 * px, 7 * px);

    ctx.restore();
  },

  // Draw Pixel Robot Bouncer (For Start Screen ID Badge & Header)
  drawPixelRobotBouncer(ctx, x, y, width = 120, height = 140, frameTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    const cols = 20;
    const rows = 24;
    const px = Math.floor(Math.min(width / cols, height / rows));
    const offsetX = Math.floor((width - cols * px) / 2);
    const offsetY = Math.floor((height - rows * px) / 2);
    ctx.translate(offsetX, offsetY);

    const cNavy = '#192238';
    const cMetal = '#cbd5e1';
    const cMetalDark = '#94a3b8';
    const cVisor = '#1e293b';
    const cEyeBlue = '#38bdf8';
    const cBadge = '#f59e0b';
    const cRed = '#ef4444';

    const dot = (col, row, color, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(col * px, row * px, w * px, h * px);
    };

    // Antenna
    dot(9, 1, cRed, 2, 2);
    dot(9, 3, cMetalDark, 2, 3);

    // Antenna blinking LED
    if (Math.sin(frameTime * 0.008) > 0) {
      dot(8, 0, '#fca5a5', 4, 1);
      dot(8, 1, '#fca5a5', 1, 2);
      dot(11, 1, '#fca5a5', 1, 2);
    }

    // Ears / Bolts
    dot(2, 9, cMetalDark, 2, 3);
    dot(16, 9, cMetalDark, 2, 3);

    // Head Box
    dot(4, 6, cMetal, 12, 9);
    // Visor
    dot(5, 8, cVisor, 10, 4);
    // Glowing Blue Eyes
    dot(7, 9, cEyeBlue, 2, 2);
    dot(11, 9, cEyeBlue, 2, 2);

    // Mouth / Grille
    dot(7, 13, cVisor, 6, 1);

    // Body
    dot(3, 16, cMetal, 14, 7);
    // Chest badge "CAPT"
    dot(6, 18, cBadge, 8, 3);
    dot(7, 19, cNavy, 6, 1);

    // Head and body outlines
    ctx.strokeStyle = cNavy;
    ctx.lineWidth = 2;
    ctx.strokeRect(4 * px, 6 * px, 12 * px, 9 * px);
    ctx.strokeRect(5 * px, 8 * px, 10 * px, 4 * px);
    ctx.strokeRect(3 * px, 16 * px, 14 * px, 7 * px);
    ctx.strokeRect(9 * px, 3 * px, 2 * px, 3 * px);
    ctx.strokeRect(9 * px, 1 * px, 2 * px, 2 * px);

    ctx.restore();
  },

  // Draw Pixel Gold Fish (Goal icon)
  drawPixelFish(ctx, x, y, size = 36, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const px = Math.floor(size / 10);
    const cNavy = '#192238';
    const cGold = '#f59e0b';
    const cGoldLight = '#fde047';
    const cEye = '#ffffff';

    const dot = (col, row, color, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect((col - 5) * px, (row - 4) * px, w * px, h * px);
    };

    // Body
    dot(2, 2, cGold, 5, 4);
    dot(1, 3, cGold, 7, 2);
    dot(3, 3, cGoldLight, 3, 2);

    // Tail Fin
    dot(7, 1, cGold, 2, 2);
    dot(8, 2, cGold, 2, 4);
    dot(7, 5, cGold, 2, 2);

    // Eye
    dot(2, 3, cEye, 1, 1);
    dot(2, 3, cNavy, 1, 1);

    // Border
    ctx.strokeStyle = cNavy;
    ctx.lineWidth = 1.5;
    ctx.strokeRect((2 - 5) * px, (2 - 4) * px, 5 * px, 4 * px);
    ctx.strokeRect((7 - 5) * px, (1 - 4) * px, 3 * px, 6 * px);

    ctx.restore();
  },

  // Draw Pixel Paw Icon
  drawPixelPaw(ctx, x, y, size = 28, isDown = false) {
    ctx.save();
    ctx.translate(x, y);

    const px = Math.max(2, Math.floor(size / 8));
    const cNavy = '#192238';
    const cPad = isDown ? '#ea580c' : '#f59e0b';
    const cPadLight = isDown ? '#f97316' : '#fbbf24';

    const dot = (col, row, color, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect((col - 4) * px, (row - 4) * px, w * px, h * px);
    };

    // Main Pad
    dot(2, 3, cPad, 4, 3);
    dot(3, 2, cPadLight, 2, 1);
    dot(2, 6, cPad, 4, 1);

    // Toe Beans
    dot(0, 2, cPad, 1, 2);
    dot(2, 0, cPad, 2, 1);
    dot(5, 0, cPad, 2, 1);
    dot(7, 2, cPad, 1, 2);

    // Border
    ctx.strokeStyle = cNavy;
    ctx.lineWidth = 1.5;
    ctx.strokeRect((2 - 4) * px, (3 - 4) * px, 4 * px, 3 * px);

    ctx.restore();
  },

  // Draw Pixel Heart
  drawPixelHeart(ctx, x, y, size = 16, color = '#f43f5e') {
    ctx.save();
    ctx.translate(x, y);

    const px = Math.max(1, Math.floor(size / 7));
    const cNavy = '#192238';

    const dot = (col, row, clr, w = 1, h = 1) => {
      ctx.fillStyle = clr;
      ctx.fillRect((col - 3) * px, (row - 3) * px, w * px, h * px);
    };

    dot(1, 0, color, 2, 1);
    dot(4, 0, color, 2, 1);
    dot(0, 1, color, 7, 2);
    dot(1, 3, color, 5, 1);
    dot(2, 4, color, 3, 1);
    dot(3, 5, color, 1, 1);

    // Outline
    ctx.strokeStyle = cNavy;
    ctx.lineWidth = 1;
    ctx.strokeRect((0 - 3) * px, (1 - 3) * px, 7 * px, 2 * px);

    ctx.restore();
  },

  // Fallback / legacy vector wrappers (calls pixel art for consistency)
  drawPaw(ctx, x, y, radius = 20, isDown = false) {
    this.drawPixelPaw(ctx, x, y, radius * 1.5, isDown);
  },

  drawFish(ctx, x, y, radius = 28, angle = 0, isHovered = false) {
    this.drawPixelFish(ctx, x, y, radius * 1.6, angle);
  },

  drawPettingCat(ctx, x, y, width = 480, height = 260, mood = 'neutral', frameTime = 0) {
    this.drawPixelTabbyCat(ctx, x, y, width, height, mood, frameTime);
  },



  // Draw CAPT-CHA Robot Bouncer Avatar
  drawRobotBouncer(ctx, x, y, size = 70) {
    ctx.save();
    ctx.translate(x, y);

    // Antenna
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.2);
    ctx.lineTo(size * 0.5, size * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.05, 5, 0, Math.PI * 2);
    ctx.fill();

    // Robot Head CRT
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(size * 0.1, size * 0.2, size * 0.8, size * 0.65, 8);
    ctx.fill();
    ctx.stroke();

    // CRT Screen
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(size * 0.18, size * 0.28, size * 0.64, size * 0.48, 5);
    ctx.fill();

    // Glowing Cyan Eyes (deadpan rectangular slits)
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 8;
    ctx.fillRect(size * 0.26, size * 0.42, size * 0.18, 6);
    ctx.fillRect(size * 0.56, size * 0.42, size * 0.18, 6);
    ctx.shadowBlur = 0;

    // Speaker mouth lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.35, size * 0.62);
    ctx.lineTo(size * 0.65, size * 0.62);
    ctx.stroke();

    ctx.restore();
  }
};

function playWarningCue() {
  playTwitchWarning();
}

window.ASSETS_MANIFEST = ASSETS_MANIFEST;
window.assets = assets;
window.Placeholders = Placeholders;
window.playPass = playPass;
window.playFail = playFail;
window.playHiss = playHiss;
window.playPurr = playPurr;
window.playTwitchWarning = playTwitchWarning;
window.playWarningCue = playWarningCue;
window.playLevelStart = playLevelStart;
