import * as THREE from "three";
import type { SceneSettings } from "./settings";

export class RangeSceneController {
  constructor(
    private readonly scene: THREE.Scene,
    private readonly wallTexture: THREE.CanvasTexture,
    private readonly floorMat: THREE.MeshStandardMaterial,
    private readonly wallMat: THREE.MeshStandardMaterial,
    private readonly ceilingMat: THREE.MeshStandardMaterial,
    private readonly trimMat: THREE.MeshStandardMaterial,
    private readonly crystalMat: THREE.MeshStandardMaterial,
    private readonly runeMats: THREE.MeshBasicMaterial[],
    private readonly cyan: THREE.PointLight,
    private readonly violet: THREE.PointLight,
    private readonly amber: THREE.PointLight,
  ) {}

  apply(settings: SceneSettings) {
    const fogColor = new THREE.Color(settings.fogColor);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.Fog(fogColor, settings.fogNear, settings.fogFar);
    this.floorMat.color.set(settings.floorColor);
    this.wallMat.color.set(settings.wallColor);
    this.ceilingMat.color.set(settings.ceilingColor);
    this.trimMat.color.set(settings.trimColor);
    this.crystalMat.color.set(settings.crystalColor);
    this.crystalMat.emissive.set(settings.crystalColor);
    this.wallTexture.repeat.set(settings.wallRepeatX, settings.wallRepeatY);
    for (const mat of this.runeMats) {
      mat.color.set(settings.runeColor);
    }
    this.cyan.color.set(settings.cyanLight);
    this.violet.color.set(settings.violetLight);
    this.amber.color.set(settings.amberLight);
    this.cyan.intensity = 3.8 * settings.lightIntensity;
    this.violet.intensity = 3.4 * settings.lightIntensity;
    this.amber.intensity = 2.5 * settings.lightIntensity;
    repaintWallTexture(this.wallTexture, settings.wallPalette, settings.runeColor);
  }
}

export function createRangeScene(scene: THREE.Scene, settings: SceneSettings) {
  scene.background = new THREE.Color(settings.fogColor);
  scene.fog = new THREE.Fog(settings.fogColor, settings.fogNear, settings.fogFar);
  const wallTexture = createWallTexture(settings.wallPalette, settings.runeColor);
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(settings.wallRepeatX, settings.wallRepeatY);

  const floorMat = new THREE.MeshStandardMaterial({
    color: settings.floorColor,
    roughness: 0.45,
    metalness: 0.28,
    emissive: "#070a12",
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: settings.wallColor,
    map: wallTexture,
    roughness: 0.5,
    metalness: 0.25,
    emissive: "#070a15",
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: settings.ceilingColor,
    map: wallTexture,
    roughness: 0.5,
    metalness: 0.25,
    emissive: "#070a15",
  });
  const runeMats: THREE.MeshBasicMaterial[] = [];
  const makeRuneMat = () => {
    const mat = new THREE.MeshBasicMaterial({ color: settings.runeColor, transparent: true, opacity: 0.75 });
    runeMats.push(mat);
    return mat;
  };
  const trimMat = new THREE.MeshStandardMaterial({
    color: settings.trimColor,
    metalness: 0.75,
    roughness: 0.18,
    emissive: "#111a2b",
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 24), floorMat);
  floor.position.set(0, -0.13, -6);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 24), ceilingMat);
  ceiling.position.set(0, 5.1, -6);
  scene.add(ceiling);

  const walls = [
    { size: [16, 5.2, 0.28], pos: [0, 2.45, -18] },
    { size: [0.28, 5.2, 24], pos: [-8, 2.45, -6] },
    { size: [0.28, 5.2, 24], pos: [8, 2.45, -6] },
    { size: [16, 5.2, 0.28], pos: [0, 2.45, 6] },
  ];
  for (const wall of walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...(wall.size as [number, number, number])), wallMat);
    mesh.position.set(...(wall.pos as [number, number, number]));
    scene.add(mesh);
  }

  for (let z = -16; z <= 4; z += 4) {
    for (const x of [-7.88, 7.88]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.2, 0.32), trimMat);
      pillar.position.set(x, 2.05, z);
      scene.add(pillar);
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 2.4), makeRuneMat());
      rune.position.set(x * 0.995, 2.15, z);
      rune.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(rune);
    }
  }

  for (let i = 0; i < 14; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.25 + (i % 3) * 0.05, 0.01, 8, 30),
      makeRuneMat(),
    );
    ring.position.set(-6 + (i % 7) * 2, 0.02, -16 + Math.floor(i / 7) * 18);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
  }

  const crystalMat = new THREE.MeshStandardMaterial({
    color: settings.crystalColor,
    emissive: settings.crystalColor,
    emissiveIntensity: 1.4,
    roughness: 0.12,
    metalness: 0.2,
  });
  for (const x of [-5.5, 5.5, -2.8, 2.8]) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), crystalMat);
    crystal.position.set(x, 3.6 + Math.random() * 0.5, -11 + Math.random() * 5);
    scene.add(crystal);
  }

  scene.add(new THREE.HemisphereLight("#b8fff3", "#15102a", 1.4));
  const main = new THREE.DirectionalLight("#fff4da", 2.2);
  main.position.set(4, 7, 5);
  scene.add(main);
  const cyan = new THREE.PointLight(settings.cyanLight, 3.8 * settings.lightIntensity, 16);
  cyan.position.set(-5, 2.7, -8);
  scene.add(cyan);
  const violet = new THREE.PointLight(settings.violetLight, 3.4 * settings.lightIntensity, 16);
  violet.position.set(5, 3, -12);
  scene.add(violet);
  const amber = new THREE.PointLight(settings.amberLight, 2.5 * settings.lightIntensity, 14);
  amber.position.set(0, 3.2, 3);
  scene.add(amber);
  return new RangeSceneController(scene, wallTexture, floorMat, wallMat, ceilingMat, trimMat, crystalMat, runeMats, cyan, violet, amber);
}

function createWallTexture(palette: string, runeColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  repaintWallTexture(texture, palette, runeColor);
  return texture;
}

function repaintWallTexture(texture: THREE.CanvasTexture, palette: string, runeColor: string) {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const palettes: Record<string, [string, string, string]> = {
    tech: ["#1b2638", "#24334b", "#151c2c"],
    concrete: ["#2d3238", "#4a5157", "#191d22"],
    warm: ["#302922", "#514334", "#1b1714"],
    lab: ["#d8e1e8", "#9faeba", "#586572"],
  };
  const colors = palettes[palette] ?? palettes.tech;
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.48, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = toRgba(runeColor, 0.18);
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + 18);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(200, 222, 255, 0.14)";
  ctx.lineWidth = 1;
  for (let y = 32; y < 512; y += 96) {
    for (let x = 32; x < 512; x += 128) {
      ctx.strokeRect(x, y, 72, 44);
      ctx.beginPath();
      ctx.arc(x + 36, y + 22, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = toRgba(runeColor, 0.2);
  for (let i = 0; i < 36; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillRect(-1, -14, 2, 28);
    ctx.fillRect(-10, -1, 20, 2);
    ctx.restore();
  }
  texture.needsUpdate = true;
}

function toRgba(hex: string, alpha: number) {
  const color = new THREE.Color(hex);
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
}
