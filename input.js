/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Unified Input Manager & Kinematic Analyzer
 * 
 * Supports Mouse, Touch, and Synthetic Bot input through the EXACT same pipeline.
 * Tracks velocity, jitter, linearity, acceleration, and reaction times for human verification.
 */

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.isDown = false;
    this.lastTime = performance.now();

    // Movement History Buffer for Kinematic Analysis
    this.history = [];
    this.maxHistorySize = 300;

    // Running metrics for live HUD & level verification
    this.currentSpeed = 0;
    this.speedSamples = [];
    this.curvatureSamples = [];
    this.totalSamples = 0;
    this.teleportDetected = false;
    this.lastReactionTimeMs = 0;

    // Subscribed event callbacks
    this.onDownCallbacks = [];
    this.onMoveCallbacks = [];
    this.onUpCallbacks = [];

    this.isTouch = false;
    this.bindEvents();
  }

  reset() {
    this.history = [];
    this.speedSamples = [];
    this.curvatureSamples = [];
    this.totalSamples = 0;
    this.teleportDetected = false;
    this.currentSpeed = 0;
    this.isDown = false;
  }

  // Convert client viewport coordinates to canvas virtual resolution (960x540)
  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CONFIG.GENERAL.canvasWidth / rect.width;
    const scaleY = CONFIG.GENERAL.canvasHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  bindEvents() {
    // Standard Pointer Events (covers mouse, pen, and touch)
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'touch') this.isTouch = true;
      else if (e.pointerType === 'mouse') this.isTouch = false;
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.handlePointerDown(coords.x, coords.y, performance.now());
    });

    window.addEventListener('pointermove', (e) => {
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.handlePointerMove(coords.x, coords.y, performance.now());
    });

    window.addEventListener('pointerup', (e) => {
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      this.handlePointerUp(coords.x, coords.y, performance.now());
    });

    // Touch fallback / extra safety for touch screens
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isTouch = true;
      if (e.touches.length > 0) {
        const coords = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.handlePointerDown(coords.x, coords.y, performance.now());
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const coords = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.handlePointerMove(coords.x, coords.y, performance.now());
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      this.handlePointerUp(this.x, this.y, performance.now());
    });
  }

  // ==========================================
  // UNIFIED DISPATCH HANDLERS
  // Both real human pointers AND simulated bot pointers call these!
  // ==========================================
  handlePointerDown(x, y, time = performance.now()) {
    this.x = x;
    this.y = y;
    this.isDown = true;
    this.lastTime = time;

    this.history.push({ x, y, time, speed: 0, dt: 16 });
    this.totalSamples++;

    this.onDownCallbacks.forEach(cb => cb(x, y, time));
  }

  handlePointerMove(x, y, time = performance.now()) {
    const prevX = this.x;
    const prevY = this.y;
    const dt = Math.max(1, time - this.lastTime); // ms

    this.x = x;
    this.y = y;
    this.lastTime = time;

    const dx = x - prevX;
    const dy = y - prevY;
    const dist = Math.hypot(dx, dy);

    // Instantaneous speed (pixels per second)
    const speed = (dist / dt) * 1000;
    this.currentSpeed = speed;

    // Check for quantum teleportation
    if (this.isDown && speed > CONFIG.LEVEL_1.maxTeleportSpeed && dt < 40) {
      this.teleportDetected = true;
    }

    if (this.isDown) {
      this.totalSamples++;
      this.speedSamples.push(speed);

      // Store trajectory sample
      this.history.push({ x, y, dx, dy, time, speed, dt });
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }

      // Compute curvature / turning angle if enough history
      if (this.history.length >= 3) {
        const p1 = this.history[this.history.length - 3];
        const p2 = this.history[this.history.length - 2];
        const p3 = this.history[this.history.length - 1];
        const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        let dAngle = Math.abs(angle2 - angle1);
        if (dAngle > Math.PI) dAngle = 2 * Math.PI - dAngle;
        this.curvatureSamples.push(dAngle);
      }
    }

    this.onMoveCallbacks.forEach(cb => cb(x, y, time, speed));
  }

  handlePointerUp(x, y, time = performance.now()) {
    this.isDown = false;
    this.currentSpeed = 0;
    this.onUpCallbacks.forEach(cb => cb(x, y, time));
  }

  // ==========================================
  // SYNTHETIC BOT INPUT INJECTION
  // Drives the exact same event listeners
  // ==========================================
  simulateDown(x, y, time = performance.now()) {
    this.handlePointerDown(x, y, time);
  }

  simulateMove(x, y, time = performance.now()) {
    this.handlePointerMove(x, y, time);
  }

  simulateUp(x, y, time = performance.now()) {
    this.handlePointerUp(x, y, time);
  }

  // Subscription helpers
  onDown(cb) { this.onDownCallbacks.push(cb); }
  onMove(cb) { this.onMoveCallbacks.push(cb); }
  onUp(cb) { this.onUpCallbacks.push(cb); }

  // ==========================================
  // KINEMATIC & STATISTICAL METRIC CALCULATORS
  // ==========================================

  // Speed variance: coefficient of variation (sigma / mu)
  getSpeedCoefficientOfVariation() {
    if (this.speedSamples.length < 5) return 0;
    const mean = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;
    if (mean === 0) return 0;
    const variance = this.speedSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.speedSamples.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }

  // Path straightness / linearity correlation R² (0 = chaotic, 1 = laser straight line)
  getPathLinearity() {
    if (this.history.length < 5) return 1.0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const n = this.history.length;
    for (const p of this.history) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
      sumY2 += p.y * p.y;
    }
    const num = (n * sumXY - sumX * sumY);
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (den === 0) return 1.0;
    const r = Math.abs(num / den);
    return r; // Linear correlation coefficient
  }

  // Wobble metric: measures micro-tremor lateral oscillation
  getWobbleScore() {
    if (this.history.length < 8) return 0;
    // Calculate lateral deviation of points from the straight line connecting start and end
    const pStart = this.history[0];
    const pEnd = this.history[this.history.length - 1];
    const totalDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
    if (totalDist < 10) return 0;

    let totalDeviation = 0;
    for (let i = 1; i < this.history.length - 1; i++) {
      const p = this.history[i];
      // Distance from point p to line (pStart, pEnd)
      const num = Math.abs((pEnd.y - pStart.y) * p.x - (pEnd.x - pStart.x) * p.y + pEnd.x * pStart.y - pEnd.y * pStart.x);
      const distToLine = num / totalDist;
      totalDeviation += distToLine;
    }

    const avgDeviation = totalDeviation / (this.history.length - 2);
    // Normalized wobble ratio
    return Math.min(1.0, avgDeviation / 14);
  }

  // Stroke curvature variance (used in Level 2 Petting)
  getCurvatureVariance() {
    if (this.curvatureSamples.length < 4) return 0;
    const mean = this.curvatureSamples.reduce((a, b) => a + b, 0) / this.curvatureSamples.length;
    const variance = this.curvatureSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.curvatureSamples.length;
    return Math.sqrt(variance);
  }
}

window.InputManager = InputManager;
