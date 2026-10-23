# CAPT-CHA: Prove You're Human (Cat Edition) 🐾🤖

A browser game parody of a CAPTCHA built for a hackathon. The player must prove they're human by passing 3 short cat-themed mini-games while a deadpan robot bouncer called **CAPT-CHA** monitors the test.

> *"This is a game, not real security."*

---

## 🎮 The Twist: Biological Kinematic Analysis
Traditional CAPTCHAs test *what* you click; this game secretly watches **how** you move your mouse or touch screen:
- **Humans** exhibit natural tremor, speed variance, micro-hesitations, and 150–400 ms reaction delays.
- **Bots** move with mechanical straightness, unvarying velocity, and instantaneous (0–50 ms) reactions.
- A bot that plays with mathematical perfection gets humorously rejected (*"Laser-straight. Toaster detected."*).

---

## 🕹️ The 3 Mini-Games

### 1. Steady Paw
- **Goal**: Guide the paw through the wavy pipe to the fish.
- **Human Twist**: Humans naturally shake and bump into walls. Touching walls does not fail you—it proves you are a clumsy, squishy human! At the end, your organic, curved trajectory is verified.
- **Bot Rejection**: Following the centerline with 0 wall touches or laser-straight precision triggers immediate rejection.

### 2. Pet the Cat
- **Goal**: Pet the cat until it purrs (discovered by feel, no instructions on screen).
- **Rules**:
  - Slow, gentle head-to-tail strokes fill the Purr Meter.
  - Chin and behind-the-ears sweet spots fill it $2\times$ faster.
  - The belly is a trap! Touching it makes the cat hiss and drops the meter.
  - Petting against the fur makes the cat flinch.
- **Bot Rejection**: Mechanical, linear, constant-speed petting triggers rejection (*"Cat says you're a toaster."*).

### 3. Sneak Past the Sleeping Cat
- **Goal**: Reach the fish while the cat cycles between sleeping, twitch warning, and opening its eye.
- **Cat Cycle**:
  - **SLEEP** (random 2000–5000 ms).
  - **TWITCH warning** (random 400–800 ms). About 1 in 3 twitches are **fake** (the cat doesn't open its eyes and falls back asleep with no penalty for moving).
  - **EYE_OPEN** (1000 ms). Moving more than 3px/frame (6px on touch) gets caught. 2 catches = *"The cat ate you."*
- **Reaction Latency Analysis**:
  - Measures the stop latency between twitch start and when movement ceases for at least 100 ms.
  - Flags superhuman reflexes (< 80 ms), eerie mechanical consistency (std dev < 15 ms), or psychic stops (*"You can't see the future, toaster"*).
- **Debug Overlay**: Press **`D`** at any time to inspect live reaction metrics, states, and samples!

---

## 🤖 Bot Mode Demonstration
Click **"Run Bot (Watch Rejection)"** on the start screen to watch an automated scripted bot attempt all 3 levels using the same input pipeline. Watch how mechanical perfection gets detected and eliminated on every test!

---

## 🚀 How to Run
This project runs directly in the browser with **no build step, no npm, and no dependencies**:
1. Double-click `index.html` or serve with any static server:
   ```bash
   python -m http.server 8080
   ```
2. Open `http://localhost:8080` in any modern web browser.
3. Fully compatible with both **Mouse** and **Touch** devices.

---

## ⚙️ Configuration & Customization
All tunable thresholds, timing limits, and detection tolerances are located with comments in [`config.js`](config.js).
