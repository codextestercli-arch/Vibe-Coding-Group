import { ACTION_LABELS, formatBinding, saveSettings, type Action, type GameSettings } from "./settings";
import { accuracy, dps, type RangeStats } from "./stats";
import { WEAPONS } from "./weapons";
import type { WeaponSystem } from "./weaponSystem";

type Screen = "main" | "pause" | "settings" | "weapons" | "crosshair" | "models" | "scenery" | "playing";

export class UiSystem {
  root = document.querySelector<HTMLDivElement>("#app")!;
  hud = document.createElement("div");
  overlay = document.createElement("div");
  crosshair = document.createElement("div");
  hitMarker = document.createElement("div");
  weaponWheel = document.createElement("div");
  private panel = document.createElement("div");
  private screen: Screen = "main";
  private lastMenu: Screen = "main";
  private uploadedModelUrls = new Map<string, string>();
  private publicFolderHandle: any = null;

  onStart = () => {};
  onResume = () => {};
  onMainMenu = () => {};
  onSettingsChanged = () => {};
  onModelsChanged = () => {};
  onSceneChanged = () => {};
  onWheelEquip: (index: number) => void = () => {};
  onRebindRequested: (action: Action) => void = () => {};

  constructor(
    private readonly settings: GameSettings,
    private readonly stats: RangeStats,
    private readonly weapons: WeaponSystem,
  ) {
    this.root.innerHTML = "";
    this.root.append(this.hud, this.overlay, this.crosshair, this.hitMarker, this.weaponWheel, this.panel);
    this.hud.className = "hud hidden";
    this.overlay.className = "damage-layer";
    this.crosshair.className = "crosshair";
    this.hitMarker.className = "hit-marker";
    this.weaponWheel.className = "weapon-wheel hidden";
    this.panel.className = "menu";
    this.panel.addEventListener("pointerdown", (event) => {
      if (event.target === this.panel && this.screen !== "main") {
        event.preventDefault();
        event.stopPropagation();
        this.onResume();
      }
    });
    this.applyCrosshair();
    window.addEventListener("aether-hit", (event) => this.flashHitMarker((event as CustomEvent).detail));
    this.showMain();
  }

  setPlayingHud(visible: boolean) {
    this.hud.classList.toggle("hidden", !visible);
    this.panel.classList.toggle("hidden", visible);
    this.crosshair.classList.toggle("hidden", !visible);
  }

  showMain() {
    this.screen = "main";
    this.setPlayingHud(false);
    this.panel.innerHTML = `
      <section class="splash">
        <p class="eyebrow">original fantasy-sci-fi aim lab</p>
        <h1>Aether Range</h1>
        <p class="subtitle">A compact combat simulation chamber for flicks, tracking, damage timing, and weapon rhythm.</p>
        <div class="menu-actions">
          <button data-action="start">Start Training</button>
          <button data-action="settings">Settings</button>
          <button data-action="quit">Quit</button>
        </div>
      </section>`;
    this.bindButtons();
  }

  showPause() {
    this.screen = "pause";
    this.setPlayingHud(false);
    this.panel.innerHTML = `
      <section class="panel-card compact">
        <h2>Paused</h2>
        <div class="menu-actions">
          <button data-action="resume">Resume</button>
          <button data-action="weapons">Weapon Selection</button>
          <button data-action="crosshair">Crosshair Maker</button>
          <button data-action="models">Model Editor</button>
          <button data-action="scenery">Scenery Editor</button>
          <button data-action="settings">Settings</button>
          <button data-action="main">Return to Main Menu</button>
        </div>
      </section>`;
    this.bindButtons();
  }

  showSettings() {
    this.lastMenu = this.screen === "settings" ? this.lastMenu : this.screen;
    this.screen = "settings";
    this.setPlayingHud(false);
    const s = this.settings;
    this.panel.innerHTML = `
      <section class="panel-card settings-grid">
        <header><h2>Settings</h2><button data-action="${this.backAction()}">Back</button></header>
        <div class="settings-section">
          <h3>Display</h3>
          ${select("resolution", "Resolution", s.display.resolution, ["1920x1080", "2560x1440", "3840x2160"])}
          ${select("windowMode", "Window Mode", s.display.windowMode, ["windowed", "fullscreen", "borderless"])}
          ${toggle("vsync", "VSync", s.display.vsync)}
          ${range("fpsCap", "FPS Cap", s.display.fpsCap, 30, 240, 1)}
          ${range("brightness", "Brightness", s.display.brightness, 0.65, 1.45, 0.01)}
          ${range("gamma", "Gamma", s.display.gamma, 0.7, 1.45, 0.01)}
          ${range("fov", "FOV", s.display.fov, 60, 110, 1)}
        </div>
        <div class="settings-section">
          <h3>Mouse</h3>
          ${range("sensitivity", "Sensitivity", s.mouse.sensitivity, 0.1, 2.5, 0.01)}
          ${toggle("invertY", "Invert Mouse Y", s.mouse.invertY)}
        </div>
        <div class="settings-section">
          <h3>Audio</h3>
          ${range("master", "Master", s.audio.master, 0, 1, 0.01)}
          ${range("weapon", "Weapon", s.audio.weapon, 0, 1, 0.01)}
          ${range("ui", "UI", s.audio.ui, 0, 1, 0.01)}
          ${range("ambient", "Ambient", s.audio.ambient, 0, 1, 0.01)}
        </div>
        <div class="settings-section keybinds">
          <h3>Keybinds</h3>
          ${Object.keys(ACTION_LABELS)
            .map((action) => `<button class="bind" data-bind="${action}"><span>${ACTION_LABELS[action as Action]}</span><b>${formatBinding(s.keybinds[action as Action])}</b></button>`)
            .join("")}
        </div>
      </section>`;
    this.bindButtons();
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select").forEach((input) => {
      input.addEventListener("input", () => {
        this.updateRangeReadout(input);
        this.updateSetting(input);
      });
    });
    this.panel.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.bind as Action;
        button.querySelector("b")!.textContent = "Press key";
        this.onRebindRequested(action);
      });
    });
  }

  showWeapons() {
    this.screen = "weapons";
    this.setPlayingHud(false);
    this.panel.innerHTML = `
      <section class="panel-card">
        <header><h2>Weapon Selection</h2><button data-action="pause">Back</button></header>
        <div class="weapon-grid">
          ${WEAPONS.map(
            (weapon, index) => `
              <button class="weapon-card ${this.weapons.current.weapon.id === weapon.id ? "selected" : ""}" data-equip="${index}">
                <h3>${weapon.name}</h3>
                <p>${weapon.description}</p>
                <dl>
                  <span><dt>Damage</dt><dd>${weapon.damage}</dd></span>
                  <span><dt>Fire Rate</dt><dd>${weapon.fireRate}/s</dd></span>
                  <span><dt>Ammo</dt><dd>${weapon.magSize || "Melee"}</dd></span>
                  <span><dt>Range</dt><dd>${weapon.range}m</dd></span>
                </dl>
              </button>`,
          ).join("")}
        </div>
      </section>`;
    this.bindButtons();
    this.panel.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((button) => {
      button.addEventListener("click", () => {
        this.weapons.equip(Number(button.dataset.equip));
        saveSettings(this.settings);
        this.showWeapons();
      });
    });
  }

  showCrosshair() {
    this.screen = "crosshair";
    this.setPlayingHud(false);
    const c = this.settings.crosshair;
    this.panel.innerHTML = `
      <section class="panel-card crosshair-maker">
        <header><h2>Crosshair Maker</h2><button data-action="pause">Back</button></header>
        <div class="preview-stage"><div class="preview-crosshair">${this.crosshairMarkup()}</div></div>
        ${color("color", "Color", c.color)}
        ${range("thickness", "Thickness", c.thickness, 1, 8, 1)}
        ${range("length", "Length", c.length, 4, 28, 1)}
        ${toggle("centerDot", "Center Dot", c.centerDot)}
        ${range("gap", "Gap", c.gap, 0, 18, 1)}
        ${range("opacity", "Opacity", c.opacity, 0.15, 1, 0.01)}
        ${toggle("outline", "Outline", c.outline)}
        <button data-action="save-crosshair">Save Crosshair</button>
      </section>`;
    this.bindButtons();
    this.panel.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      input.addEventListener("input", () => {
        this.updateCrosshair(input);
        this.panel.querySelector(".preview-crosshair")!.innerHTML = this.crosshairMarkup();
        this.stylePreview();
      });
    });
    this.stylePreview();
  }

  showModels() {
    this.screen = "models";
    this.setPlayingHud(false);
    const m = this.settings.models;
    this.panel.innerHTML = `
      <section class="panel-card editor-panel">
        <header><h2>Model Editor</h2><button data-action="pause">Back</button></header>
        <div class="settings-section wide full">
          <h3>Import Folder</h3>
          <button data-action="choose-public-folder">Choose Public Folder</button>
          <p class="editor-note">After choosing the project public folder, weapon uploads save to /models/weapons/ and enemy uploads save to /models/enemies/.</p>
          <p class="import-status"></p>
        </div>
        <div class="settings-section wide">
          <h3>Weapon Model</h3>
          ${uploadControl("weaponModelPath", "Upload Weapon OBJ")}
          ${text("weaponModelPath", "OBJ Path", m.weaponModelPath, "/models/weapons/m4a1/M4A1/M4A1.obj")}
          <button data-model-path="weaponModelPath" data-path="/models/weapons/m4a1/M4A1/M4A1.obj">Use M4A1 OBJ</button>
          ${color("weaponTint", "Weapon Tint", m.weaponTint)}
          ${range("weaponScale", "Weapon Scale", m.weaponScale, 0.02, 25, 0.01)}
          ${range("weaponOffsetX", "Offset X", m.weaponOffsetX, -4, 4, 0.01)}
          ${range("weaponOffsetY", "Offset Y", m.weaponOffsetY, -4, 4, 0.01)}
          ${range("weaponOffsetZ", "Offset Z", m.weaponOffsetZ, -8, 8, 0.01)}
          ${range("weaponRotationY", "Yaw", m.weaponRotationY, -90, 90, 1)}
        </div>
        <div class="settings-section wide">
          <h3>Enemy Model</h3>
          ${uploadControl("targetModelPath", "Upload Enemy OBJ")}
          ${text("targetModelPath", "OBJ Path", m.targetModelPath, "/models/enemies/humanoid.obj")}
          ${toggle("showProceduralTarget", "Show Built-In Body", m.showProceduralTarget)}
          ${color("targetSkin", "Skin", m.targetSkin)}
          ${color("targetShirt", "Top", m.targetShirt)}
          ${color("targetPants", "Pants", m.targetPants)}
          ${color("targetHair", "Hair", m.targetHair)}
          ${color("targetBoots", "Shoes", m.targetBoots)}
          ${toggle("lockHitboxToModel", "Lock Hitbox To OBJ", m.lockHitboxToModel)}
          ${range("targetScale", "Body Scale", m.targetScale, 0.05, 12, 0.01)}
          ${range("targetModelScale", "OBJ Scale", m.targetModelScale, 0.01, 50, 0.01)}
          ${range("targetModelOffsetY", "OBJ Height", m.targetModelOffsetY, -8, 8, 0.01)}
          ${range("targetModelRotationY", "OBJ Yaw", m.targetModelRotationY, -180, 180, 1)}
        </div>
      </section>`;
    this.bindButtons();
    this.panel.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      input.addEventListener("input", () => {
        this.updateRangeReadout(input);
        this.updateModelSetting(input);
      });
      input.addEventListener("change", () => {
        this.updateRangeReadout(input);
        this.updateModelSetting(input);
      });
    });
    this.panel.querySelectorAll<HTMLButtonElement>("[data-model-path]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.modelPath!;
        const path = button.dataset.path!;
        (this.settings.models as any)[key] = path;
        const input = this.panel.querySelector<HTMLInputElement>(`input[name="${key}"]`);
        if (input) input.value = path;
        saveSettings(this.settings);
        this.onModelsChanged();
      });
    });
    this.panel.querySelectorAll<HTMLButtonElement>("[data-upload-model]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.uploadModel!;
        const input = this.panel.querySelector<HTMLInputElement>(`input[data-upload-input="${key}"]`);
        input?.click();
      });
    });
    this.panel.querySelectorAll<HTMLInputElement>("[data-upload-input]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.uploadInput!;
        const file = input.files?.[0];
        if (!file || !file.name.toLowerCase().endsWith(".obj")) {
          this.showImportStatus("Choose a .obj file.");
          input.value = "";
          return;
        }
        void this.importUploadedModel(key, file).finally(() => {
          input.value = "";
        });
      });
    });
  }

  showScenery() {
    this.screen = "scenery";
    this.setPlayingHud(false);
    const s = this.settings.scene;
    this.panel.innerHTML = `
      <section class="panel-card editor-panel">
        <header><h2>Scenery Editor</h2><button data-action="pause">Back</button></header>
        <div class="settings-section wide">
          <h3>Wallpaper</h3>
          ${select("wallPalette", "Pattern", s.wallPalette, ["tech", "concrete", "warm", "lab"])}
          ${color("wallColor", "Wall Tint", s.wallColor)}
          ${color("floorColor", "Floor", s.floorColor)}
          ${color("ceilingColor", "Ceiling", s.ceilingColor)}
          ${color("trimColor", "Trim", s.trimColor)}
          ${color("crystalColor", "Crystals", s.crystalColor)}
          ${color("runeColor", "Rune Lines", s.runeColor)}
          ${color("fogColor", "Fog", s.fogColor)}
          ${range("fogNear", "Fog Start", s.fogNear, 4, 36, 1)}
          ${range("fogFar", "Fog End", s.fogFar, 18, 80, 1)}
          ${range("wallRepeatX", "Pattern X", s.wallRepeatX, 1, 8, 0.25)}
          ${range("wallRepeatY", "Pattern Y", s.wallRepeatY, 1, 6, 0.25)}
        </div>
        <div class="settings-section wide">
          <h3>Lighting</h3>
          ${color("cyanLight", "Left Light", s.cyanLight)}
          ${color("violetLight", "Back Light", s.violetLight)}
          ${color("amberLight", "Entry Light", s.amberLight)}
          ${range("lightIntensity", "Intensity", s.lightIntensity, 0.2, 2.2, 0.01)}
          ${range("bloomStrength", "Bloom", s.bloomStrength, 0, 1.6, 0.01)}
          ${range("bloomRadius", "Bloom Radius", s.bloomRadius, 0, 1.5, 0.01)}
        </div>
      </section>`;
    this.bindButtons();
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select").forEach((input) => {
      input.addEventListener("input", () => {
        this.updateRangeReadout(input);
        this.updateSceneSetting(input);
      });
      input.addEventListener("change", () => {
        this.updateRangeReadout(input);
        this.updateSceneSetting(input);
      });
    });
  }

  showWeaponWheel() {
    this.weaponWheel.classList.remove("hidden");
    const current = this.weapons.current.weapon.id;
    this.weaponWheel.innerHTML = `
      <div class="wheel-ring">
        ${WEAPONS.map((weapon, index) => {
          const angle = (index / WEAPONS.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * 168;
          const y = Math.sin(angle) * 168;
          return `<button class="wheel-slot ${weapon.id === current ? "selected" : ""}" data-wheel="${index}" style="--wheel-x:${x}px;--wheel-y:${y}px">
            <b>${weapon.slot}</b><span>${weapon.name}</span>
          </button>`;
        }).join("")}
        <div class="wheel-center">${this.weapons.current.weapon.name}</div>
      </div>`;
    this.weaponWheel.querySelectorAll<HTMLButtonElement>("[data-wheel]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.onWheelEquip(Number(button.dataset.wheel));
      });
    });
  }

  updateWeaponWheelSelection(selectedIndex: number) {
    this.weaponWheel.querySelectorAll<HTMLButtonElement>("[data-wheel]").forEach((button) => {
      button.classList.toggle("selected", Number(button.dataset.wheel) === selectedIndex);
    });
    const center = this.weaponWheel.querySelector<HTMLElement>(".wheel-center");
    if (center) center.textContent = WEAPONS[selectedIndex]?.name ?? this.weapons.current.weapon.name;
  }

  hideWeaponWheel() {
    this.weaponWheel.classList.add("hidden");
  }

  update() {
    const state = this.weapons.current;
    const elapsed = Math.floor((performance.now() - this.stats.startedAt) / 1000);
    this.hud.innerHTML = `
      <div class="hud-chip weapon-readout">
        <strong>${state.weapon.name}</strong>
        <span>${state.weapon.magSize ? `${state.ammo}/${state.weapon.magSize}` : "Blade ready"} ${state.reloading ? "Reloading" : ""}</span>
      </div>
      <div class="hud-chip stats-readout">
        <span>Shots ${this.stats.shots}</span>
        <span>Hits ${this.stats.hits}</span>
        <span>Accuracy ${accuracy(this.stats)}%</span>
        <span>Damage ${Math.round(this.stats.totalDamage)}</span>
        <span>DPS ${dps(this.stats)}</span>
        <span>Current ${state.weapon.damage}</span>
        <span>Time ${elapsed}s</span>
      </div>
      ${state.weapon.magSize && state.ammo === 0 && !state.reloading ? `<div class="reload-notice">Press ${formatBinding(this.settings.keybinds.reload)} to reload</div>` : ""}
      ${state.reloading ? `<div class="reload-notice active">Reloading</div>` : ""}`;
  }

  refreshBindings() {
    if (this.screen === "settings") this.showSettings();
  }

  applyCrosshair() {
    this.crosshair.innerHTML = this.crosshairMarkup();
    this.styleCrosshairElement(this.crosshair);
  }

  private crosshairMarkup() {
    return `<i class="line top"></i><i class="line bottom"></i><i class="line left"></i><i class="line right"></i><i class="dot"></i>`;
  }

  private stylePreview() {
    const preview = this.panel.querySelector<HTMLElement>(".preview-crosshair");
    if (preview) this.styleCrosshairElement(preview);
  }

  private styleCrosshairElement(el: HTMLElement) {
    const c = this.settings.crosshair;
    el.style.setProperty("--ch-color", c.color);
    el.style.setProperty("--ch-thick", `${c.thickness}px`);
    el.style.setProperty("--ch-length", `${c.length}px`);
    el.style.setProperty("--ch-gap", `${c.gap}px`);
    el.style.setProperty("--ch-opacity", String(c.opacity));
    el.classList.toggle("no-dot", !c.centerDot);
    el.classList.toggle("outlined", c.outline);
  }

  private flashHitMarker(detail: { critical?: boolean; heavy?: boolean }) {
    this.hitMarker.className = `hit-marker active ${detail.critical ? "critical" : detail.heavy ? "heavy" : ""}`;
    window.setTimeout(() => (this.hitMarker.className = "hit-marker"), 120);
  }

  private bindButtons() {
    this.panel.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => this.handleAction(button.dataset.action!));
    });
  }

  private handleAction(action: string) {
    if (action === "start") this.onStart();
    if (action === "resume") this.onResume();
    if (action === "settings") this.showSettings();
    if (action === "weapons") this.showWeapons();
    if (action === "crosshair") this.showCrosshair();
    if (action === "models") this.showModels();
    if (action === "scenery") this.showScenery();
    if (action === "choose-public-folder") void this.choosePublicFolder();
    if (action === "pause") this.showPause();
    if (action === "main") this.onMainMenu();
    if (action === "back-main") this.showMain();
    if (action === "back-pause") this.showPause();
    if (action === "save-crosshair") {
      saveSettings(this.settings);
      this.showPause();
    }
    if (action === "quit") {
      this.panel.querySelector(".subtitle")!.textContent = "Training simulation closed. The browser tab stays open by design.";
    }
  }

  private backAction() {
    return this.lastMenu === "main" ? "back-main" : "back-pause";
  }

  private updateSetting(input: HTMLInputElement | HTMLSelectElement) {
    const key = input.name;
    const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
    const numberValue = typeof value === "string" && input instanceof HTMLInputElement && input.type === "range" ? Number(value) : value;
    if (key in this.settings.display) (this.settings.display as any)[key] = numberValue;
    if (key in this.settings.mouse) (this.settings.mouse as any)[key] = numberValue;
    if (key in this.settings.audio) (this.settings.audio as any)[key] = numberValue;
    saveSettings(this.settings);
    this.onSettingsChanged();
  }

  private updateCrosshair(input: HTMLInputElement) {
    const value = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
    (this.settings.crosshair as any)[input.name] = value;
    this.applyCrosshair();
    saveSettings(this.settings);
  }

  private updateModelSetting(input: HTMLInputElement) {
    const value =
      input.type === "checkbox"
        ? input.checked
        : input.type === "range"
          ? Number(input.value)
          : input.name.endsWith("ModelPath")
            ? normalizeModelPath(input.value)
            : input.value;
    if (typeof value === "string" && value !== input.value) input.value = value;
    (this.settings.models as any)[input.name] = value;
    if (input.name === "targetModelPath" && value) this.settings.models.showProceduralTarget = false;
    saveSettings(this.settings);
    this.onModelsChanged();
  }

  private updateSceneSetting(input: HTMLInputElement | HTMLSelectElement) {
    const value = input instanceof HTMLInputElement && input.type === "range" ? Number(input.value) : input.value;
    (this.settings.scene as any)[input.name] = value;
    saveSettings(this.settings);
    this.onSceneChanged();
  }

  private updateRangeReadout(input: HTMLInputElement | HTMLSelectElement) {
    if (!(input instanceof HTMLInputElement) || input.type !== "range") return;
    const readout = input.closest("label")?.querySelector("b");
    if (readout) readout.textContent = input.value;
  }

  private async choosePublicFolder() {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) {
      this.showImportStatus("This browser does not support folder import. Drops will load for this session only.");
      return;
    }
    try {
      this.publicFolderHandle = await picker({ mode: "readwrite" });
      this.showImportStatus(`Import folder ready: ${this.publicFolderHandle.name}`);
    } catch {
      this.showImportStatus("Import folder was not selected.");
    }
  }

  private async importUploadedModel(key: string, file: File) {
    const folder = key === "weaponModelPath" ? "weapons" : "enemies";
    if (this.publicFolderHandle) {
      try {
        const models = await this.publicFolderHandle.getDirectoryHandle("models", { create: true });
        const target = await models.getDirectoryHandle(folder, { create: true });
        const handle = await target.getFileHandle(file.name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();
        this.setUploadedModelPath(key, `/models/${folder}/${file.name}`);
        this.showImportStatus(`Imported ${file.name} to /models/${folder}/`);
        return;
      } catch {
        this.showImportStatus("Could not write to the chosen folder. Loaded as a temporary session model.");
      }
    }
    const oldUrl = this.uploadedModelUrls.get(key);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const url = URL.createObjectURL(file);
    this.uploadedModelUrls.set(key, url);
    this.setUploadedModelPath(key, url);
    this.showImportStatus(`Loaded ${file.name} temporarily. Choose Public Folder to save into /models/${folder}/.`);
  }

  private setUploadedModelPath(key: string, url: string) {
    this.uploadedModelUrls.set(key, url);
    (this.settings.models as any)[key] = url;
    if (key === "targetModelPath") this.settings.models.showProceduralTarget = false;
    const input = this.panel.querySelector<HTMLInputElement>(`input[name="${key}"]`);
    if (input) input.value = url;
    const checkbox = this.panel.querySelector<HTMLInputElement>('input[name="showProceduralTarget"]');
    if (checkbox && key === "targetModelPath") checkbox.checked = false;
    saveSettings(this.settings);
    this.onModelsChanged();
  }

  private showImportStatus(message: string) {
    const status = this.panel.querySelector<HTMLElement>(".import-status");
    if (status) status.textContent = message;
  }
}

function range(name: string, label: string, value: number, min: number, max: number, step: number) {
  return `<label><span>${label}</span><input name="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><b>${value}</b></label>`;
}

function toggle(name: string, label: string, checked: boolean) {
  return `<label><span>${label}</span><input name="${name}" type="checkbox" ${checked ? "checked" : ""}></label>`;
}

function color(name: string, label: string, value: string) {
  return `<label><span>${label}</span><input name="${name}" type="color" value="${value}"></label>`;
}

function text(name: string, label: string, value: string, placeholder: string) {
  return `<label class="text-field"><span>${label}</span><input name="${name}" type="text" value="${value}" placeholder="${placeholder}"></label>`;
}

function uploadControl(target: string, label: string) {
  return `<div class="upload-row"><button data-upload-model="${target}">${label}</button><input class="hidden-file" data-upload-input="${target}" type="file" accept=".obj,model/obj"></div>`;
}

function normalizeModelPath(value: string) {
  const trimmed = value.trim().replaceAll("\\", "/");
  if (!trimmed || trimmed.startsWith("blob:") || trimmed.startsWith("http")) return trimmed;
  const publicIndex = trimmed.toLowerCase().lastIndexOf("/public/");
  if (publicIndex >= 0) return trimmed.slice(publicIndex + "/public".length);
  if (trimmed.toLowerCase().startsWith("public/")) return `/${trimmed.slice("public/".length)}`;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function select(name: string, label: string, value: string, options: string[]) {
  return `<label><span>${label}</span><select name="${name}">${options.map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
}
