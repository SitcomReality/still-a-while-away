/**
 * Global Constants for the Road and Environment
 */

// Road Physical Properties
export const ROAD_WIDTH = 2.0;       // Fraction of screen width at bottom
export const ROAD_TOP_WIDTH = 0.02;   // Road width at the horizon
export const ROAD_SPEED = 30;         // Base driving speed (meters per second)
export const ROAD_SEGMENTS = 70;      // Number of polygons used to draw the road
export const VIEW_DISTANCE = 350;     // How far ahead the road is rendered

// Perspective and Camera
export const PERSPECTIVE_K = 20;      // Projection constant (y ~ 1/z)
export const HORIZON_BASE_Y = 0.25;   // Base vertical position of horizon (0-1)
export const HORIZON_SLOPE_FACTOR = 0.05; // Influence of road slope on horizon position

// Curvature and Slope (Noise Parameters)
export const CURVE_NOISE_FREQ = 0.01;
export const CURVE_NOISE_AMP = 0.3;
export const SLOPE_NOISE_FREQ = 0.008;
export const SLOPE_NOISE_AMP = 0.15;

// Road Markings
export const MARKING_SPACING = 8;     // Distance between dashes
export const MARKING_BATCH_SIZE = 50; // Pre-generated marking count
export const MARKING_LENGTH_SCALE = 30; // Length multiplier based on perspective
export const MARKING_WIDTH_SCALE = 4;   // Width multiplier based on perspective
export const MARKING_RENDER_LIMIT = 250; // Distance beyond which markings aren't drawn

// Environment & World
export const ENV_VIEW_DISTANCE = 300;
export const ENV_REMOVAL_THRESHOLD = -20;
export const ENV_GLOBAL_SCALE = 10;   // Size multiplier for trees/buildings

// Traffic
export const TRAFFIC_RENDER_LIMIT = 500;
export const TRAFFIC_REMOVAL_THRESHOLD = -10;
export const TRAFFIC_SIZE_SCALE = 350;