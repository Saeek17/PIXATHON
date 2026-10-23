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
  // Draw the Paw Cursor / Trail
  drawPaw(ctx, x, y, radius = 20, isDown = false) {
    ctx.save();
    ctx.translate(x, y);

    // Glow effect if pressing
    if (isDown) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
    }

    // Main pad
    ctx.fillStyle = isDown ? '#f59e0b' : '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 4, radius * 0.7, radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 cute toe beans
    const toeAngles = [-0.65, -0.22, 0.22, 0.65];
    const toeDist = radius * 0.85;
    ctx.fillStyle = isDown ? '#d97706' : '#f59e0b';
    toeAngles.forEach(ang => {
      const tx = Math.sin(ang) * toeDist;
      const ty = -Math.cos(ang) * toeDist * 0.8;
      ctx.beginPath();
      ctx.ellipse(tx, ty, radius * 0.28, radius * 0.32, ang * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  },

  // Draw the Fish (Goal)
  drawFish(ctx, x, y, radius = 28, angle = 0, isHovered = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Golden glow
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = isHovered ? 20 : 10;

    // Fish body
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail fin
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(radius * 0.7, 0);
    ctx.lineTo(radius * 1.45, -radius * 0.6);
    ctx.lineTo(radius * 1.25, 0);
    ctx.lineTo(radius * 1.45, radius * 0.6);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-radius * 0.45, -radius * 0.15, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-radius * 0.48, -radius * 0.15, radius * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Cute gills and smile
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-radius * 0.1, 0, radius * 0.28, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    ctx.restore();
  },

  // Draw the Big Cat (Level 2: Petting, facing right: head on left, tail on right)
  drawPettingCat(ctx, x, y, width = 480, height = 260, mood = 'neutral', frameTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // Subtle breathing animation
    const breathOffset = Math.sin(frameTime * 0.003) * 3;

    // Body Color based on mood
    let bodyColor = '#f97316';       // Ginger orange
    let bellyColor = '#ffedd5';      // Soft cream
    let shadowColor = 'rgba(0,0,0,0.2)';

    // Drop shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.85, width * 0.46, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- TAIL (on right) ---
    ctx.lineWidth = 26;
    ctx.strokeStyle = bodyColor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const tailWave = mood === 'content' ? Math.sin(frameTime * 0.006) * 16 :
                     mood === 'annoyed' ? Math.sin(frameTime * 0.015) * 32 : Math.sin(frameTime * 0.002) * 8;
    ctx.moveTo(width * 0.78, height * 0.58);
    ctx.bezierCurveTo(width * 0.88, height * 0.52, width * 0.94 + tailWave, height * 0.35, width * 0.88 + tailWave * 1.3, height * 0.18);
    ctx.stroke();

    // --- MAIN BODY (facing right, head on left) ---
    // Body is an elongated rounded loaf
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(width * 0.54, height * 0.58 + breathOffset * 0.5, width * 0.34, height * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- BELLY (TRAP ZONE: lower-middle) ---
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(width * 0.52, height * 0.66 + breathOffset * 0.4, width * 0.24, height * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly subtle indicator / stripes
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)';
    ctx.lineWidth = 4;
    [-0.1, 0, 0.1].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(width * (0.52 + offset) - 15, height * 0.66);
      ctx.lineTo(width * (0.52 + offset) + 15, height * 0.66);
      ctx.stroke();
    });

    // --- HEAD (on left) ---
    const headX = width * 0.24;
    const headY = height * 0.46 + breathOffset;
    const headR = 74;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // --- EARS ---
    // Left ear (behind)
    ctx.beginPath();
    ctx.moveTo(headX - headR * 0.6, headY - headR * 0.65);
    ctx.lineTo(headX - headR * 0.85, headY - headR * 1.25);
    ctx.lineTo(headX - headR * 0.2, headY - headR * 0.85);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(headX - headR * 0.55, headY - headR * 0.7);
    ctx.lineTo(headX - headR * 0.75, headY - headR * 1.15);
    ctx.lineTo(headX - headR * 0.25, headY - headR * 0.85);
    ctx.closePath();
    ctx.fill();

    // Right ear (front)
    ctx.beginPath();
    ctx.moveTo(headX + headR * 0.05, headY - headR * 0.85);
    ctx.lineTo(headX + headR * 0.45, headY - headR * 1.3);
    ctx.lineTo(headX + headR * 0.7, headY - headR * 0.65);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(headX + headR * 0.12, headY - headR * 0.85);
    ctx.lineTo(headX + headR * 0.42, headY - headR * 1.2);
    ctx.lineTo(headX + headR * 0.62, headY - headR * 0.7);
    ctx.closePath();
    ctx.fill();

    // --- FACE & EXPRESSION BASED ON MOOD ---
    const eyeY = headY - 10;
    if (mood === 'content') {
      // Blissful curved eyes (purring ^_^)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(headX - 22, eyeY, 14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(headX + 22, eyeY, 14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Cute blush
      ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.arc(headX - 38, eyeY + 16, 12, 0, Math.PI * 2);
      ctx.arc(headX + 38, eyeY + 16, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'annoyed') {
      // Angled angry slit eyes (>_<)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headX - 35, eyeY - 8);
      ctx.lineTo(headX - 10, eyeY + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(headX + 35, eyeY - 8);
      ctx.lineTo(headX + 10, eyeY + 4);
      ctx.stroke();
    } else {
      // Neutral resting cat eyes
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(headX - 22, eyeY, 12, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(headX + 22, eyeY, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(headX - 22, eyeY, 4, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(headX + 22, eyeY, 4, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose (pink triangle)
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.moveTo(headX, headY + 14);
    ctx.lineTo(headX - 7, headY + 7);
    ctx.lineTo(headX + 7, headY + 7);
    ctx.closePath();
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (mood === 'annoyed') {
      ctx.arc(headX, headY + 28, 12, Math.PI * 1.1, Math.PI * 1.9); // Frown / hiss open mouth
    } else {
      ctx.arc(headX - 8, headY + 20, 8, 0, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(headX + 8, headY + 20, 8, Math.PI * 0.1, Math.PI);
    }
    ctx.stroke();

    // Whiskers
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    [-6, 6].forEach(dy => {
      // Left whiskers
      ctx.beginPath();
      ctx.moveTo(headX - 35, headY + 18 + dy);
      ctx.lineTo(headX - 75, headY + 16 + dy * 2);
      ctx.stroke();
      // Right whiskers
      ctx.beginPath();
      ctx.moveTo(headX + 35, headY + 18 + dy);
      ctx.lineTo(headX + 75, headY + 16 + dy * 2);
      ctx.stroke();
    });

    // Paws resting in front
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(width * 0.32, height * 0.82, 28, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.44, height * 0.82, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
