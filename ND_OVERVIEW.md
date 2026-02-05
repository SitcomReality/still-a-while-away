# Night Drive - Technical Overview

## Purpose of This Document
We are looking to implement an ultra-performant lighting and shadow system that uses time-of-day and compass direction to determine shadow angles. We want feedback on the best approach given our rendering architecture.

**Shadow Requirements:**
- All objects treated as having rectangular silhouettes.
- All shadows are rectangles or composed of rectangles.
- Shadow direction determined by:
  - Time of day (sun position in sky).
  - Compass heading (road direction).
  - Object orientation relative to road tangent.

This document explains how our simulation works so you can suggest the most efficient implementation strategy.

---

## High-Level Architecture

Night Drive is a 2D pseudo-3D road driving simulation rendered on HTML5 Canvas. The game uses **layered canvases** with a **perspective projection** to create depth without a traditional 3D engine (like Three.js).

### Canvas Layers (back to front):
1. **Sky Layer**: Sky gradient, stars, hills, ground plane.
2. **Road Layer**: Road surface and lane markings.
3. **Environment Layer**: Trees, buildings, bushes (sorted with traffic).
4. **Traffic Layer**: Vehicles (sorted with environment).
5. **Weather Layer**: Rain particles, fog overlay.
6. **Windshield Layer**: Raindrops on glass, condensation.
7. **UI Layer**: Compass, HUD elements.
8. **Cabin Overlay**: Static PNG image of car interior.

---

## Coordinate Systems

### 1. World Space (Z-axis)
- The world is essentially an infinite scrolling tunnel.
- Objects exist at specific **distances** (Z) from the player.
- Player's current position: `road.distance`.
- Objects have absolute positions: `feature.distance = 1500`.
- **Relative distance** determines visibility: `relDist = feature.distance - road.distance`.

### 2. Road Space (Lateral X-axis)
- The road defines the center of the world.
- Objects are positioned relative to road edges:
  - `side`: 'left' or 'right'.
  - `offset`: Distance from road edge as a multiplier (e.g., 1.3 to 2.3).
  - `roadWidth`: Fraction of screen width at bottom (2.2).

### 3. Screen Space (Projection)
We map World (Z) and Road (X) to Screen (x, y) using a custom perspective projection in `road.getRoadPosAt(distance, w, h)`.

**The Projection Formula:**
1. **Perspective Scale**: `y ~ 1/z`.
   ```javascript
   const progress = PERSPECTIVE_K / (distance + PERSPECTIVE_K);
   const scale = progress;