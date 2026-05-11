export type WindowMode = "windowed" | "fullscreen" | "borderless";

export type Action =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "jump"
  | "crouch"
  | "shoot"
  | "ads"
  | "reload"
  | "weaponWheel"
  | "slot1"
  | "slot2"
  | "slot3"
  | "slot4"
  | "slot5"
  | "slot6"
  | "slot7"
  | "slot8"
  | "knife"
  | "inspect"
  | "settings";

export interface SceneSettings {
  wallPalette: string;
  wallColor: string;
  ceilingColor: string;
  floorColor: string;
  trimColor: string;
  crystalColor: string;
  runeColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  wallRepeatX: number;
  wallRepeatY: number;
  cyanLight: string;
  violetLight: string;
  amberLight: string;
  lightIntensity: number;
  bloomStrength: number;
  bloomRadius: number;
}

export interface ModelSettings {
  weaponModelPath: string;
  weaponScale: number;
  weaponOffsetX: number;
  weaponOffsetY: number;
  weaponOffsetZ: number;
  weaponRotationY: number;
  weaponTint: string;
  targetModelPath: string;
  targetModelScale: number;
  targetModelOffsetY: number;
  targetModelRotationY: number;
  lockHitboxToModel: boolean;
  showProceduralTarget: boolean;
  targetSkin: string;
  targetShirt: string;
  targetPants: string;
  targetHair: string;
  targetBoots: string;
  targetScale: number;
}

export interface GameSettings {
  display: {
    resolution: string;
    windowMode: WindowMode;
    vsync: boolean;
    fpsCap: number;
    brightness: number;
    gamma: number;
    fov: number;
  };
  mouse: {
    sensitivity: number;
    invertY: boolean;
  };
  audio: {
    master: number;
    weapon: number;
    ui: number;
    ambient: number;
  };
  models: ModelSettings;
  scene: SceneSettings;
  crosshair: {
    color: string;
    thickness: number;
    length: number;
    centerDot: boolean;
    gap: number;
    opacity: number;
    outline: boolean;
  };
  keybinds: Record<Action, string>;
  equipped: string[];
}

export const ACTION_LABELS: Record<Action, string> = {
  forward: "Forward",
  backward: "Backward",
  left: "Left",
  right: "Right",
  jump: "Jump",
  crouch: "Crouch",
  shoot: "Shoot",
  ads: "Aim Down Sights",
  reload: "Reload",
  weaponWheel: "Weapon Wheel",
  slot1: "Weapon Slot 1",
  slot2: "Weapon Slot 2",
  slot3: "Weapon Slot 3",
  slot4: "Weapon Slot 4",
  slot5: "Weapon Slot 5",
  slot6: "Weapon Slot 6",
  slot7: "Weapon Slot 7",
  slot8: "Weapon Slot 8",
  knife: "Switch to Blade",
  inspect: "Inspect Weapon",
  settings: "Open Settings",
};

export const DEFAULT_SETTINGS: GameSettings = {
  display: {
    resolution: "2560x1440",
    windowMode: "windowed",
    vsync: true,
    fpsCap: 144,
    brightness: 1,
    gamma: 1,
    fov: 82,
  },
  mouse: {
    sensitivity: 0.9,
    invertY: false,
  },
  audio: {
    master: 0.75,
    weapon: 0.72,
    ui: 0.6,
    ambient: 0.35,
  },
  models: {
    weaponModelPath: "",
    weaponScale: 1,
    weaponOffsetX: 0,
    weaponOffsetY: 0,
    weaponOffsetZ: 0,
    weaponRotationY: 0,
    weaponTint: "#d8f7ff",
    targetModelPath: "",
    targetModelScale: 1,
    targetModelOffsetY: 0,
    targetModelRotationY: 0,
    lockHitboxToModel: true,
    showProceduralTarget: false,
    targetSkin: "#b98264",
    targetShirt: "#2d6d8f",
    targetPants: "#202b3a",
    targetHair: "#221711",
    targetBoots: "#11131a",
    targetScale: 1,
  },
  scene: {
    wallPalette: "tech",
    wallColor: "#dce8ff",
    ceilingColor: "#dce8ff",
    floorColor: "#1a2030",
    trimColor: "#29364c",
    crystalColor: "#bfc7ff",
    runeColor: "#44ffe1",
    fogColor: "#080b14",
    fogNear: 18,
    fogFar: 42,
    wallRepeatX: 3,
    wallRepeatY: 2,
    cyanLight: "#38ffe3",
    violetLight: "#9568ff",
    amberLight: "#ff9d4c",
    lightIntensity: 1,
    bloomStrength: 0.45,
    bloomRadius: 0.55,
  },
  crosshair: {
    color: "#9fffea",
    thickness: 2,
    length: 12,
    centerDot: true,
    gap: 6,
    opacity: 0.92,
    outline: true,
  },
  keybinds: {
    forward: "KeyW",
    backward: "KeyS",
    left: "KeyA",
    right: "KeyD",
    jump: "Space",
    crouch: "ControlLeft",
    shoot: "Mouse0",
    ads: "Mouse2",
    reload: "KeyR",
    weaponWheel: "KeyQ",
    slot1: "Digit1",
    slot2: "Digit2",
    slot3: "Digit3",
    slot4: "Digit4",
    slot5: "Digit5",
    slot6: "Digit6",
    slot7: "Digit7",
    slot8: "Digit8",
    knife: "KeyV",
    inspect: "KeyF",
    settings: "Escape",
  },
  equipped: ["lumen-pistol", "crystal-rifle", "nova-cannon", "arc-weaver", "veil-blade"],
};

const SAVE_KEY = "aether-range-settings-v1";

function mergeSettings(saved: Partial<GameSettings>): GameSettings {
  const merged = {
    display: { ...DEFAULT_SETTINGS.display, ...saved.display },
    mouse: { ...DEFAULT_SETTINGS.mouse, ...saved.mouse },
    audio: { ...DEFAULT_SETTINGS.audio, ...saved.audio },
    models: { ...DEFAULT_SETTINGS.models, ...saved.models },
    scene: { ...DEFAULT_SETTINGS.scene, ...saved.scene },
    crosshair: { ...DEFAULT_SETTINGS.crosshair, ...saved.crosshair },
    keybinds: { ...DEFAULT_SETTINGS.keybinds, ...saved.keybinds },
    equipped: Array.isArray(saved.equipped) ? saved.equipped : DEFAULT_SETTINGS.equipped,
  };
  if (!saved.keybinds?.ads || saved.keybinds.ads === "Mouse1") merged.keybinds.ads = "Mouse2";
  if (merged.models.weaponModelPath.startsWith("blob:")) merged.models.weaponModelPath = "";
  if (merged.models.targetModelPath.startsWith("blob:")) merged.models.targetModelPath = "";
  if (merged.models.targetModelPath.trim()) {
    merged.models.showProceduralTarget = false;
  }
  return merged;
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? mergeSettings(JSON.parse(raw) as Partial<GameSettings>) : structuredClone(DEFAULT_SETTINGS);
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(settings));
}

export function formatBinding(code: string) {
  const mouse: Record<string, string> = { Mouse0: "LMB", Mouse1: "MMB", Mouse2: "RMB" };
  if (mouse[code]) return mouse[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "Space";
  if (code === "ControlLeft") return "Ctrl";
  return code.replace("Left", "").replace("Right", "");
}
