export type WeaponKind = "hitscan" | "arc" | "melee";

export interface WeaponDef {
  id: string;
  slot: number;
  name: string;
  kind: WeaponKind;
  damage: number;
  critMultiplier: number;
  fireRate: number;
  magSize: number;
  reloadTime: number;
  range: number;
  spread: number;
  recoil: number;
  color: string;
  accent: string;
  description: string;
  modelPath?: string;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: "lumen-pistol",
    slot: 1,
    name: "Lumen Needle",
    kind: "hitscan",
    damage: 24,
    critMultiplier: 1.65,
    fireRate: 4.8,
    magSize: 12,
    reloadTime: 1.05,
    range: 44,
    spread: 0.006,
    recoil: 0.012,
    color: "#d8f7ff",
    accent: "#62f1ff",
    description: "Light precision sidearm that rewards clean taps and fast reacquisition.",
  },
  {
    id: "crystal-rifle",
    slot: 2,
    name: "Prism Lancer",
    kind: "hitscan",
    damage: 18,
    critMultiplier: 1.5,
    fireRate: 8.5,
    magSize: 28,
    reloadTime: 1.45,
    range: 58,
    spread: 0.011,
    recoil: 0.018,
    color: "#b5f5d7",
    accent: "#35f096",
    description: "Balanced crystal rifle with stable rhythm and bright shard impacts.",
    modelPath: "/models/weapons/m4a1/M4A1/M4A1.obj",
  },
  {
    id: "nova-cannon",
    slot: 3,
    name: "Nova Maul",
    kind: "hitscan",
    damage: 68,
    critMultiplier: 1.35,
    fireRate: 1.35,
    magSize: 5,
    reloadTime: 2.1,
    range: 64,
    spread: 0.018,
    recoil: 0.05,
    color: "#ffe0a6",
    accent: "#ff8a3c",
    description: "Heavy energy cannon. Slow, loud, and excellent for damage timing drills.",
  },
  {
    id: "arc-weaver",
    slot: 4,
    name: "Arc Weaver",
    kind: "arc",
    damage: 9,
    critMultiplier: 1.25,
    fireRate: 13,
    magSize: 42,
    reloadTime: 1.35,
    range: 16,
    spread: 0.03,
    recoil: 0.008,
    color: "#e4c8ff",
    accent: "#b568ff",
    description: "Short-range energy sprayer for tracking and close flick control.",
  },
  {
    id: "pulse-smg",
    slot: 5,
    name: "Pulse Courier",
    kind: "hitscan",
    damage: 13,
    critMultiplier: 1.45,
    fireRate: 14.5,
    magSize: 36,
    reloadTime: 1.25,
    range: 38,
    spread: 0.018,
    recoil: 0.01,
    color: "#d8e8ff",
    accent: "#4ea0ff",
    description: "Fast compact SMG for close tracking, recoil control, and target transfers.",
  },
  {
    id: "anchor-dmr",
    slot: 6,
    name: "Anchor DMR",
    kind: "hitscan",
    damage: 42,
    critMultiplier: 1.75,
    fireRate: 2.9,
    magSize: 10,
    reloadTime: 1.7,
    range: 72,
    spread: 0.004,
    recoil: 0.03,
    color: "#e7f0e7",
    accent: "#c8ff7a",
    description: "Semi-auto marksman rifle with a narrow sight picture and high headshot value.",
  },
  {
    id: "scatter-frame",
    slot: 7,
    name: "Scatter Frame",
    kind: "hitscan",
    damage: 82,
    critMultiplier: 1.25,
    fireRate: 0.95,
    magSize: 6,
    reloadTime: 2.25,
    range: 28,
    spread: 0.04,
    recoil: 0.055,
    color: "#f6e2d0",
    accent: "#ff5f45",
    description: "Heavy close-range burst weapon for snap timing and recovery drills.",
  },
  {
    id: "veil-blade",
    slot: 8,
    name: "Veil Blade",
    kind: "melee",
    damage: 55,
    critMultiplier: 1,
    fireRate: 1.4,
    magSize: 0,
    reloadTime: 0,
    range: 3.0,
    spread: 0,
    recoil: 0.02,
    color: "#eaf8ff",
    accent: "#88a7ff",
    description: "A compact rune-edged blade for close target discipline.",
  },
];

export function weaponById(id: string) {
  return WEAPONS.find((weapon) => weapon.id === id) ?? WEAPONS[0];
}
