import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import "./styles.css";
import { AudioBus } from "./audio";
import { FxSystem } from "./fx";
import { InputManager } from "./input";
import { PlayerController } from "./player";
import { loadSettings, saveSettings } from "./settings";
import { createStats } from "./stats";
import { TargetSystem } from "./targets";
import { UiSystem } from "./ui";
import { WEAPONS } from "./weapons";
import { WeaponSystem } from "./weaponSystem";
import { createRangeScene } from "./world";

type GameMode = "menu" | "playing" | "paused";

const settings = loadSettings();
const WEAPON_COUNT = WEAPONS.length;
const stats = createStats();
const scene = new THREE.Scene();
const rangeScene = createRangeScene(scene, settings.scene);

const camera = new THREE.PerspectiveCamera(settings.display.fov, window.innerWidth / window.innerHeight, 0.05, 120);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = settings.display.brightness;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.55, 0.28);
composer.addPass(bloom);

const input = new InputManager(renderer.domElement, settings);
const audio = new AudioBus(settings);
const player = new PlayerController(camera, input, settings);
const targets = new TargetSystem(scene, settings.models);
const fx = new FxSystem(scene, camera, document.createElement("div"));
const weapons = new WeaponSystem(camera, player, targets, fx, audio, stats, settings);
const ui = new UiSystem(settings, stats, weapons);
fx.setOverlay(ui.overlay);

let mode: GameMode = "menu";
let last = performance.now();
let frameAccumulator = 0;
let wheelOpen = false;
let wheelIndex = 0;
const wheelAim = new THREE.Vector2(0, -1);

function startTraining() {
  audio.resume();
  mode = "playing";
  applySettings();
  ui.setPlayingHud(true);
  requestGamePointerLock();
}

function pauseGame() {
  if (mode !== "playing") return;
  mode = "paused";
  document.exitPointerLock();
  input.clearTransient();
  ui.showPause();
}

function resumeGame() {
  mode = "playing";
  applySettings();
  ui.setPlayingHud(true);
  requestGamePointerLock();
}

function requestGamePointerLock() {
  input.prepareForPointerLock();
  const lock = renderer.domElement.requestPointerLock as (options?: { unadjustedMovement?: boolean }) => Promise<void> | void;
  const requestBasicLock = () => {
    const request = renderer.domElement.requestPointerLock() as Promise<void> | void;
    if (request && "catch" in request) request.catch(() => recoverPausedPointer());
  };
  try {
    const request = lock.call(renderer.domElement, { unadjustedMovement: true });
    if (request && "catch" in request) {
      request.catch(requestBasicLock);
    }
  } catch {
    requestBasicLock();
  }
  window.setTimeout(() => {
    if (mode === "playing" && document.pointerLockElement !== renderer.domElement) recoverPausedPointer();
  }, 260);
}

function recoverPausedPointer() {
  if (mode !== "playing") return;
  mode = "paused";
  input.clearTransient();
  ui.showPause();
}

function returnMainMenu() {
  mode = "menu";
  document.exitPointerLock();
  input.clearTransient();
  ui.showMain();
}

ui.onStart = startTraining;
ui.onResume = resumeGame;
ui.onMainMenu = returnMainMenu;
ui.onSettingsChanged = () => {
  applySettings();
  audio.applySettings(settings);
};
ui.onModelsChanged = () => {
  weapons.applyModelSettings();
  targets.applyModelSettings();
};
ui.onSceneChanged = () => {
  rangeScene.apply(settings.scene);
  bloom.strength = settings.scene.bloomStrength;
  bloom.radius = settings.scene.bloomRadius;
};
ui.onWheelEquip = (index) => {
  weapons.equip(index);
  wheelIndex = index;
  ui.updateWeaponWheelSelection(wheelIndex);
};
ui.onRebindRequested = (action) => {
  input.rebinding = action;
  const timer = window.setInterval(() => {
    if (!input.rebinding) {
      window.clearInterval(timer);
      saveSettings(settings);
      ui.refreshBindings();
    }
  }, 80);
};

window.addEventListener("keydown", (event) => {
  if (input.rebinding) return;
  if (event.code === settings.keybinds.settings) {
    event.preventDefault();
    if (mode === "playing") pauseGame();
    else if (mode === "paused") resumeGame();
  }
  if (mode !== "playing") return;
  if (event.code === settings.keybinds.weaponWheel && !event.repeat) {
    wheelOpen = true;
    wheelIndex = weapons.currentIndex;
    wheelAim.set(0, -1);
    ui.showWeaponWheel();
    ui.updateWeaponWheelSelection(wheelIndex);
    input.clearTransient();
    return;
  }
  const slotActions = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7", "slot8"] as const;
  for (let i = 0; i < slotActions.length; i += 1) {
    const action = slotActions[i];
    if (event.code === settings.keybinds[action]) weapons.equip(i);
  }
  if (event.code === settings.keybinds.knife) weapons.equip(7);
  if (event.code === settings.keybinds.reload) weapons.reload();
  if (event.code === settings.keybinds.inspect) weapons.inspect();
});

window.addEventListener("keyup", (event) => {
  if (event.code !== settings.keybinds.weaponWheel || !wheelOpen) return;
  weapons.equip(wheelIndex);
  wheelOpen = false;
  ui.hideWeaponWheel();
  input.clearTransient();
});

document.addEventListener("pointerlockchange", () => {
  if (mode === "playing" && document.pointerLockElement !== renderer.domElement) pauseGame();
});

window.addEventListener("resize", applySettings);

function applySettings() {
  const [targetWidth, targetHeight] = settings.display.resolution.split("x").map(Number);
  const width = targetWidth || window.innerWidth;
  const height = targetHeight || window.innerHeight;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = settings.display.fov;
  camera.updateProjectionMatrix();
  renderer.toneMappingExposure = settings.display.brightness;
  bloom.strength = settings.scene.bloomStrength;
  bloom.radius = settings.scene.bloomRadius;
  document.documentElement.style.setProperty("--brightness", String(settings.display.brightness));
  document.documentElement.style.setProperty("--gamma", String(settings.display.gamma));
  document.body.classList.toggle("borderless", settings.display.windowMode === "borderless");
  if (settings.display.windowMode === "fullscreen" && document.fullscreenElement == null && mode === "playing") {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  if (settings.display.windowMode !== "fullscreen" && document.fullscreenElement != null) {
    document.exitFullscreen().catch(() => {});
  }
}

function animate(now: number) {
  requestAnimationFrame(animate);
  const elapsed = now - last;
  last = now;
  let dt = Math.min(0.05, elapsed / 1000);
  if (settings.display.vsync) {
    frameAccumulator = 0;
  } else {
    const cap = settings.display.fpsCap || 144;
    const minFrame = 1000 / cap;
    frameAccumulator += elapsed;
    if (frameAccumulator < minFrame) return;
    dt = Math.min(0.05, frameAccumulator / 1000);
    frameAccumulator = 0;
  }
  const time = now / 1000;
  const adsActive = mode === "playing" && input.isDown("ads");

  if (mode === "playing" && wheelOpen) {
    const look = input.consumeLook();
    wheelAim.x += look.x;
    wheelAim.y += look.y;
    if (wheelAim.lengthSq() > 64) {
      const angle = Math.atan2(wheelAim.y, wheelAim.x) + Math.PI / 2;
      const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
      wheelIndex = Math.round((normalized / (Math.PI * 2)) * WEAPON_COUNT) % WEAPON_COUNT;
      ui.updateWeaponWheelSelection(wheelIndex);
      wheelAim.setLength(Math.min(wheelAim.length(), 260));
    }
  } else if (mode === "playing") {
    const movement = player.update(dt, true);
    if (movement.stepped) audio.playFootstep(movement.stepIntensity, movement.crouching);
    if (movement.landed) audio.playLanding(movement.landingIntensity);
    if (input.isDown("shoot")) weapons.tryFire();
  } else {
    input.consumeLook();
  }
  weapons.update(dt, adsActive);
  const targetFov = settings.display.fov - weapons.adsAmount * 17;
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }
  targets.update(time);
  fx.update(dt);
  ui.update();
  composer.render();
}

applySettings();
requestAnimationFrame(animate);
