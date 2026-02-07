/**
 * Global Constants for the Road and Environment
 */

// Road Physical Properties
export const ROAD_WIDTH = 8.0;       // Physical width in meters
export const CAMERA_X_OFFSET = -2.0;  // Camera offset from center (-2.0 = left lane center)
export const ROAD_TOP_WIDTH = 0.02;   // Road width at the horizon (fractional)
export const ROAD_SPEED = 20;         // Base driving speed (meters per second)
export const ROAD_SEGMENTS = 70;      // Number of polygons used to draw the road
export const VIEW_DISTANCE = 500;     // How far ahead the road is rendered

// Perspective and Camera
export const PERSPECTIVE_K = 8;      // Projection constant (y ~ 1/z)
export const HORIZON_BASE_Y = 0.25;   // Base vertical position of horizon (0-1)
export const HORIZON_SLOPE_FACTOR = 0.1; // Influence of road slope on horizon position

// Curvature and Slope (Noise Parameters)
export const CURVE_NOISE_FREQ = 0.005;
export const CURVE_NOISE_AMP = 0.08;
export const SLOPE_NOISE_FREQ = 0.025;
export const SLOPE_NOISE_AMP = 0.1;

// Road Markings
export const MARKING_SPACING = 32;     // Distance between dashes
export const MARKING_BATCH_SIZE = 50; // Pre-generated marking count
export const MARKING_DASH_LENGTH = 8;    // Physical length of the dash in world space
export const MARKING_WIDTH_SCALE = 40;   // Width multiplier based on perspective
export const MARKING_RENDER_LIMIT = 350; // Distance beyond which markings aren't drawn

// Environment & World
export const ENV_VIEW_DISTANCE = 500;
export const ENV_REMOVAL_THRESHOLD = -20;
export const ENV_GLOBAL_SCALE = 160;  // Pixels per meter at perspective scale 1.0
export const FADE_IN_DISTANCE = 50;   // Distance over which objects "grow" in

// Traffic
export const TRAFFIC_RENDER_LIMIT = 500;
export const TRAFFIC_REMOVAL_THRESHOLD = -10;

// Heading and UI
export const HEADING_SENSITIVITY = 2;
export const COMPASS_WIDTH = 300;
export const COMPASS_HEIGHT = 40;