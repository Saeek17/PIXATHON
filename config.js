/**
 * CAPT-CHA: Prove You're Human (Cat Edition)
 * Master Configuration File
 * 
 * Tunable numbers for all 3 levels, human detection thresholds, and bot rejection criteria.
 * NOTE: Values are tuned to be slightly lenient towards humans:
 * it is much worse to falsely reject a real human than to let a bot through!
 */

const CONFIG = {
  // ==========================================
  // GENERAL GAMEPLAY CONFIGURATION
  // ==========================================
  GENERAL: {
    // Number of player lives (hearts)
    maxLives: 3,
    
    // Time limit for each level in seconds (running out = fail)
    levelTimeLimitSeconds: 30,
    
    // Countdown duration on level intro card (3 seconds: 3, 2, 1)
    countdownSeconds: 3,
    
    // Target virtual canvas resolution (rendered sharply on all displays)
    canvasWidth: 960,
    canvasHeight: 540,
    
    // Base human score calculation (0 - 100)
    baseHumanScore: 88,
  },

  // ==========================================
  // LEVEL 1: STEADY PAW
  // "Guide the paw to the fish without touching the walls."
  // ==========================================
  LEVEL_1: {
    // Tunnel physical geometry
    startTunnelWidth: 68,   // Initial tunnel width in pixels at start
    endTunnelWidth: 48,     // Narrowing tunnel width in pixels near the fish
    startPadRadius: 36,     // Radius of the start green circle
    fishPadRadius: 40,      // Radius of the fish goal area
    wallCollisionTolerance: 2, // Extra pixel grace distance for wall collisions
    
    // Paw trail visual parameters
    trailMaxPoints: 120,
    pawPrintSpacing: 18,
    
    // ------------------------------------------
    // HUMAN DETECTION THRESHOLDS (LEVEL 1)
    // ------------------------------------------
    // Minimum number of position samples required to reach the fish.
    // Bots that jump/teleport across in 1-5 samples are rejected.
    // TIGHTEN: Increase to 30. LOOSEN: Decrease to 12.
    minSamplesRequired: 18,

    // Maximum speed allowed between any two consecutive frames (pixels/second).
    // Humans moving quickly hit ~600-1200 px/s. Teleports exceed 2500 px/s.
    // TIGHTEN: Decrease to 1800. LOOSEN: Increase to 3500.
    maxTeleportSpeed: 2500,

    // Wobble metric: standard deviation of lateral distance from the smoothed path.
    // Humans naturally have micro-tremors (wobble > 0.08).
    // A bot with perfectly straight or mathematically smoothed lines scores < 0.04.
    // TIGHTEN: Increase to 0.10. LOOSEN: Decrease to 0.03.
    minWobbleThreshold: 0.05,

    // Speed variation metric: coefficient of variation (std dev / mean speed).
    // Humans accelerate and decelerate (speed variance > 0.15).
    // A bot with constant velocity has speed variance near 0.00 - 0.05.
    // TIGHTEN: Increase to 0.20. LOOSEN: Decrease to 0.08.
    minSpeedVariance: 0.10,

    // Bot straightness threshold (R² or linearity correlation, 0 to 1).
    // If the path is a perfectly straight line (> 0.994), it's rejected.
    // TIGHTEN: Decrease to 0.985. LOOSEN: Increase to 0.998.
    botStraightnessThreshold: 0.994,

    // Failure / Rejection messages
    msgWallHit: "Ouch. Walls exist.",
    msgTimeout: "Time expired. Even snails move faster.",
    msgBotStraight: "Laser-straight. Toaster detected.",
    msgBotTeleport: "Instant teleportation. Quantum toaster detected.",
    msgBotNoSamples: "Zero organic movement samples. Bot rejected.",
    msgPass: "Passable clumsiness. Human verified."
  },

  // ==========================================
  // LEVEL 2: PET THE CAT
  // "Pet the cat until it purrs. Gently."
  // Rules are discovered by the player by feel.
  // ==========================================
  LEVEL_2: {
    // Purr target meter (0 to 100)
    targetPurr: 100,
    
    // Base purr meter fill rate per pixel stroked in the correct direction (head-to-tail)
    purrFillRate: 0.075,

    // Sweet spot bonus multiplier: Chin and behind-the-ears fill 2x faster!
    bonusMultiplier: 2.0,

    // Belly trap penalty: touching the belly drops the purr meter
    bellyPenalty: 20,

    // Speed limits for petting:
    // Stroke must be slow & gentle (speed between minStrokeSpeed and maxStrokeSpeed)
    minStrokeSpeed: 20,    // Below this is just resting the cursor (px/sec)
    maxStrokeSpeed: 1100,  // Above this is rubbing too frantically / aggressive (px/sec)
    pokingSpeedThreshold: 1400, // Sudden aggressive pokes / clicks

    // Poking / rough petting penalty
    roughPettingPenalty: 8,

    // Cat moods & thresholds
    moodContentPurrThreshold: 60, // Purr >= 60 triggers 'content' mood
    annoyedDurationSeconds: 1.5,  // Cat stays annoyed for 1.5 seconds after a hiss

    // ------------------------------------------
    // HUMAN DETECTION THRESHOLDS (LEVEL 2)
    // ------------------------------------------
    // Speed variance during petting:
    // Humans vary their stroke speed constantly (speed variance > 0.12).
    // Scripted bots pet at identical, unvarying speed (< 0.06).
    // TIGHTEN: Increase to 0.16. LOOSEN: Decrease to 0.06.
    minPettingSpeedVariance: 0.08,

    // Stroke trajectory curvature / angle variance:
    // Humans pet in slight natural arcs (angle std dev > 0.08 radians).
    // Bots stroke in exact horizontal lines (y = const, angle std dev near 0).
    // TIGHTEN: Increase to 0.10. LOOSEN: Decrease to 0.04.
    minStrokeCurvatureVariance: 0.05,

    // Failure / Rejection messages
    msgBotRobotic: "Cat says you're a toaster.",
    msgTimeout: "The cat grew bored of your hesitation.",
    msgPass: "Cat approved your warm, squishy petting."
  },

  // ==========================================
  // LEVEL 3: FIND THE HIDDEN CAT
  // Goal: "A cat is hiding in the static. Find it."
  // Concept: Structure-from-Motion (Random Dot Kinematogram)
  // Dots inside secret shape move UP, dots outside move DOWN.
  // ==========================================
  LEVEL_3: {
    // ------------------------------------------
    // ROUND SETTINGS
    // ------------------------------------------
    totalRounds: 3,                // 3 rounds
    roundTimeLimitSeconds: 8.0,    // 8 seconds each round
    requiredPassCount: 2,          // At least 2 of 3 correct to pass

    // ------------------------------------------
    // NOISE AREA GEOMETRY & DOT PARAMETERS
    // ------------------------------------------
    noiseWidth: 360,               // Rectangle width (px)
    noiseHeight: 300,              // Rectangle height (px)
    dotCount: 900,                 // 900 small square dots
    dotSize: 2.5,                  // Small square dots (2.5 px)
    dotColor: '#f8fafc',           // All dots same brightness (pure noise)

    // Motion parameters (dots inside move UP, dots outside move DOWN)
    // TUNE: If too hard to see, raise to 90-110. If too easy, lower to 60-70.
    dotSpeed: 80,                  // Speed in pixels/second
    dotJitter: 10,                 // Small horizontal jitter (+/-10 px/s)
    dotRespawnChance: 0.02,        // 2% chance per frame to respawn at random

    // Shapes pool (never repeat consecutive rounds)
    availableShapes: ['CAT', 'FISH', 'HEART', 'STAR'],

    // ------------------------------------------
    // BOT DETECTION THRESHOLDS
    // ------------------------------------------
    // Bot answering too fast (< 400ms on all 3 rounds)
    botMaxAnswerTimeMs: 400,
    msgBotTooFast: "Answered before the dots even moved. Toaster detected.",
    msgBotStatic: "Static. All I see is static. Toaster detected.",

    // Messages
    msgFailHidden: "The cat stays hidden. Try again.",
    msgPass: "Motion perceived. Human optical cortex verified."
  },

  // ==========================================
  // CAPT-CHA ROBOT BOUNCER DIALOGUES
  // Deadpan, funny lines for speech box
  // ==========================================
  CAPT_CHA_LINES: {
    welcome: "Greetings, biological entity. Prove your squishy, inefficient, warm-blooded existence by passing 3 cat tests. Toasters will be recycled.",
    botDemoStart: "Initiating Bot Simulation. Observe how machine perfection gets righteously rejected.",
    botDemoEnd: "Bot rejected. Now you try, warm-blood.",
    level1Intro: "Test 1: Steady Paw. Guide the paw to the fish. Humans shake and bump walls. Show me your organic tremor.",
    level2Intro: "Test 2: Pet The Cat. Cats despise mechanical hands. Pet gently until satisfied.",
    level3Intro: "Test 3: Find The Hidden Cat. Look closely. Or don't. I'm a robot.",
    level1FailWall: "Ouch. Walls are solid matter. Please navigate around them.",
    level1FailBot: "Laser-smooth centerline and zero wall bumps. Toasters belong in the kitchen.",
    level2FailHiss: "The cat hissed at your crude technique. Learn some biological empathy.",
    level2FailBot: "Cat sensed cold metal. Cat says you're a toaster.",
    level3FailHidden: "The cat stays hidden. Try again.",
    level3FailBot: "Static. All I see is static. Toaster detected.",
    passLevel: "Adequately clumsy. You may proceed.",
    gameOver: "Human test failed. You have been classified as a Household Microwave.",
    certificate: "Congratulations. You have proven you possess genuine, clumsy human biology."
  }
};

// Make CONFIG globally accessible
window.CONFIG = CONFIG;
