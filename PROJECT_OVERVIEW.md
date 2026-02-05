# Night Drive - Project Overview

## Purpose of This Document
We're looking to implement an ultra-performant lighting and shadow system that uses time-of-day and compass direction to determine shadow angles. We want feedback on the best approach given our rendering architecture.

**Shadow Requirements:**
- All objects treated as having rectangular silhouettes
- All shadows are rectangles or composed of rectangles
- Shadow direction determined by:
  - Time of day (sun position in sky)
  - Compass heading (road direction)
  - Object orientation relative to road tangent

This document explains how our simulation works so you can suggest the most efficient implementation strategy.

---

## High-Level Architecture

Night Drive is a 2D pseudo-3D road driving simulation rendered on HTML5 Canvas. The game uses **layered canvases** with a **perspective projection** to create depth.

### Canvas Layers (back to front):
1. **Sky Layer** - Sky gradient, stars, hills, ground plane
2. **Road Layer** - Road surface and lane markings
3. **Environment Layer** - Trees, buildings, bushes
4. **Traffic Layer** - Vehicles (depth-sorted with environment)
5. **Weather Layer** - Rain, fog effects
6. **Windshield Layer** - Raindrops on glass
7. **UI Layer** - Compass, HUD elements
8. **Cabin Overlay** - Static PNG image of car interior

---

## Coordinate Systems

### 1. World Space (Z-axis)
- Objects exist at specific **distances** from the player (measured in arbitrary units, think meters)
- Player's current position: `road.distance`
- Objects have absolute positions like `feature.distance = 1500`
- Relative distance: `relDist = feature.distance - road.distance`

### 2. Road Space (X-axis offsets)
- Road has a **width** (fraction of screen width at bottom: `ROAD_WIDTH = 2.2`)
- Objects positioned relative to road edges:
  - `side: 'left' | 'right'`
  - `offset: 1.3 to 2.3` (distance from road edge as multiplier)

### 3. Screen Space (pixels)
The projection happens in `road.getRoadPosAt(distance, w, h)`:

```javascript
// Perspective projection: closer = larger, farther = smaller
const progress = PERSPECTIVE_K / (distance + PERSPECTIVE_K);

// Y position (vertical)
const horizon = h * (HORIZON_BASE_Y + slope * HORIZON_SLOPE_FACTOR);
const y = horizon + (h - horizon) * progress;

// X position (horizontal) - includes curve influence
const straightX = w * 0.5 + (w * 0.48) * progress;
const curveOffset = (futureCurve - currentCurve) * w * 2.5;
const x = straightX + curveOffset * curveFade;

// Scale (for sizing objects)
const scale = progress;