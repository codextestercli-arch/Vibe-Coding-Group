import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { AudioBus } from "./audio";
import type { FxSystem } from "./fx";
import type { PlayerController } from "./player";
import type { RangeStats } from "./stats";
import type { GameSettings } from "./settings";
import type { TargetSystem } from "./targets";
import { WEAPONS, type WeaponDef } from "./weapons";

export interface WeaponState {
  weapon: WeaponDef;
  ammo: number;
  reloading: boolean;
  reloadDoneAt: number;
  nextFireAt: number;
}

export class WeaponSystem {
  states = new Map<string, WeaponState>();
  currentIndex = 0;
  group = new THREE.Group();
  private model: THREE.Group | null = null;
  private hands = new THREE.Group();
  private magazine: THREE.Mesh | null = null;
  private supportHand: THREE.Mesh | null = null;
  private inspectTime = 0;
  private switchTime = 0;
  adsAmount = 0;
  private objLoader = new OBJLoader();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly player: PlayerController,
    private readonly targets: TargetSystem,
    private readonly fx: FxSystem,
    private readonly audio: AudioBus,
    private readonly stats: RangeStats,
    private readonly settings: GameSettings,
  ) {
    for (const weapon of WEAPONS) {
      this.states.set(weapon.id, {
        weapon,
        ammo: weapon.magSize,
        reloading: false,
        reloadDoneAt: 0,
        nextFireAt: 0,
      });
    }
    this.camera.add(this.group);
    this.hands = this.createHands();
    this.group.add(this.hands);
    this.group.position.set(0.45, -0.42, -0.85);
    this.equip(0);
  }

  get current() {
    return this.states.get(WEAPONS[this.currentIndex].id)!;
  }

  equip(index: number) {
    this.currentIndex = THREE.MathUtils.clamp(index, 0, WEAPONS.length - 1);
    this.switchTime = 0.24;
    if (this.model) this.group.remove(this.model);
    this.model = this.createModel(this.current.weapon);
    this.group.add(this.model);
    this.loadExternalModel(this.current.weapon, this.model);
    this.positionHands(this.current.weapon);
  }

  reload() {
    const state = this.current;
    if (state.weapon.magSize <= 0 || state.ammo === state.weapon.magSize || state.reloading) return;
    state.reloading = true;
    state.reloadDoneAt = performance.now() / 1000 + state.weapon.reloadTime;
    this.audio.playReload();
  }

  inspect() {
    this.inspectTime = 0.9;
  }

  tryFire() {
    const now = performance.now() / 1000;
    const state = this.current;
    const weapon = state.weapon;
    if (state.reloading || now < state.nextFireAt) return;
    if (weapon.magSize > 0 && state.ammo <= 0) {
      this.reload();
      return;
    }
    state.nextFireAt = now + 1 / weapon.fireRate;
    if (weapon.magSize > 0) state.ammo -= 1;
    this.stats.shots += 1;
    this.audio.playWeapon(weapon);
    this.player.addRecoil(weapon.recoil);
    this.fireRay(weapon);
  }

  update(dt: number, adsActive: boolean) {
    const state = this.current;
    const now = performance.now() / 1000;
    if (state.reloading && now >= state.reloadDoneAt) {
      state.reloading = false;
      state.ammo = state.weapon.magSize;
    }
    this.inspectTime = Math.max(0, this.inspectTime - dt);
    this.switchTime = Math.max(0, this.switchTime - dt);
    this.adsAmount = THREE.MathUtils.lerp(this.adsAmount, adsActive && state.weapon.kind !== "melee" ? 1 : 0, 16 * dt);
    const bob = Math.sin(now * 8) * 0.012;
    const hip = new THREE.Vector3(0.45, -0.42 + bob - this.switchTime * 0.5, -0.85);
    const ads = new THREE.Vector3(0.06, -0.38 - this.switchTime * 0.25, -0.72);
    this.group.position.copy(hip.lerp(ads, this.adsAmount));
    this.group.rotation.z = Math.sin(now * 3) * 0.015 * (1 - this.adsAmount) + this.inspectTime * 1.8;
    this.group.rotation.x = this.inspectTime * 0.75 - this.adsAmount * 0.025;
    this.group.rotation.y = -this.adsAmount * 0.015;
    this.animateReload(state, now);
  }

  reloadProgress(state = this.current) {
    if (!state.reloading || state.weapon.reloadTime <= 0) return 0;
    const remaining = Math.max(0, state.reloadDoneAt - performance.now() / 1000);
    return THREE.MathUtils.clamp(1 - remaining / state.weapon.reloadTime, 0, 1);
  }

  private fireRay(weapon: WeaponDef) {
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.player.forwardVector();
    dir.x += (Math.random() - 0.5) * weapon.spread;
    dir.y += (Math.random() - 0.5) * weapon.spread;
    dir.normalize();
    const raycaster = new THREE.Raycaster(origin, dir, 0, weapon.range);
    const hits = raycaster.intersectObjects(this.targets.getHitObjects(), false);
    const end = origin.clone().addScaledVector(dir, weapon.range);
    const muzzle = this.camera.localToWorld(new THREE.Vector3(0.48, -0.32, -0.95));
    if (hits.length > 0) {
      const hit = hits[0];
      const target = hit.object.userData.target;
      const critical = Boolean(hit.object.userData.weakPoint);
      if (target) {
        const result = target.applyDamage(weapon.damage * (critical ? weapon.critMultiplier : 1), critical);
        this.stats.hits += 1;
        this.stats.totalDamage += result.damage;
        this.stats.lastDamageAt = performance.now();
        this.audio.playHit(critical || result.damage >= 55);
        this.fx.addDamageText(result.damage, result.position, critical || result.damage >= 55);
        this.fx.addBlood(hit.point, dir);
        this.fx.addImpact(hit.point, weapon.accent);
        this.fx.addBeam(muzzle, hit.point, weapon.accent);
        window.dispatchEvent(new CustomEvent("aether-hit", { detail: { critical, heavy: result.damage >= 55 } }));
        return;
      }
    }
    this.fx.addBeam(muzzle, end, weapon.accent);
  }

  private createModel(weapon: WeaponDef) {
    const group = new THREE.Group();
    const weaponTint = this.settings.models.weaponTint || weapon.color;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: weaponTint,
      emissive: weapon.accent,
      emissiveIntensity: 0.35,
      metalness: 0.45,
      roughness: 0.18,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: "#161a26", metalness: 0.65, roughness: 0.22 });
    const glowMat = new THREE.MeshBasicMaterial({ color: weapon.accent });
    const scale = weapon.id === "nova-cannon" ? 1.25 : weapon.id === "veil-blade" ? 0.85 : 1;

    if (weapon.kind === "melee") {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.55, 12), darkMat);
      grip.rotation.z = Math.PI / 2.6;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.9), bodyMat);
      blade.position.set(0.18, 0.12, -0.32);
      blade.rotation.z = -0.65;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.035, 0.92), glowMat);
      edge.position.set(0.21, 0.19, -0.32);
      edge.rotation.z = -0.65;
      group.add(grip, blade, edge);
      return group;
    }

    const compact = weapon.id === "lumen-pistol";
    const sprayer = weapon.id === "arc-weaver";
    const receiverLength = compact ? 0.48 : sprayer ? 0.64 : 0.78 * scale;
    const receiverHeight = compact ? 0.18 : 0.22 * scale;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, receiverHeight, receiverLength), bodyMat);
    receiver.position.set(0, 0.01, -0.19 * scale);

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.055 * scale, receiverLength * 0.78), darkMat);
    slide.position.set(0, 0.16 * scale, -0.22 * scale);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.16 * scale, compact ? 0.18 : 0.42 * scale), darkMat);
    handguard.position.set(0, 0.035 * scale, compact ? -0.48 : -0.72 * scale);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032 * scale, 0.04 * scale, compact ? 0.28 : 0.66 * scale, 18), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04 * scale, compact ? -0.61 : -0.94 * scale);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.046 * scale, 0.08 * scale, 18), darkMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.04 * scale, compact ? -0.76 : -1.28 * scale);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.025 * scale, compact ? 0.26 : 0.62 * scale), darkMat);
    rail.position.set(0, 0.22 * scale, compact ? -0.24 : -0.38 * scale);
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.025 * scale, 0.026 * scale), darkMat);
    rearSight.position.set(0, 0.27 * scale, compact ? 0.0 : -0.04 * scale);
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.03 * scale, 0.02 * scale), darkMat);
    frontSight.position.set(0, 0.25 * scale, compact ? -0.51 : -0.82 * scale);

    const core = new THREE.Mesh(new THREE.SphereGeometry((compact ? 0.055 : 0.085) * scale, 18, 12), glowMat);
    core.position.set(0, 0.04 * scale, compact ? -0.2 : -0.28 * scale);
    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.07 * scale, 0.009 * scale, 6, 18, Math.PI * 1.45), darkMat);
    triggerGuard.position.set(0.0, -0.14 * scale, compact ? 0.0 : -0.03 * scale);
    triggerGuard.rotation.set(Math.PI / 2, 0, 0);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.018 * scale, 0.085 * scale, 0.018 * scale), darkMat);
    trigger.position.set(0, -0.15 * scale, compact ? 0.02 : -0.015 * scale);
    trigger.rotation.x = -0.34;

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, compact ? 0.32 : 0.4 * scale, 0.14 * scale), darkMat);
    grip.position.set(0.07 * scale, compact ? -0.22 : -0.3 * scale, compact ? 0.08 : 0.06 * scale);
    grip.rotation.x = compact ? -0.42 : -0.28;
    this.magazine = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, compact ? 0.25 : 0.36 * scale, 0.12 * scale), darkMat);
    this.magazine.position.set(-0.04 * scale, compact ? -0.2 : -0.31 * scale, compact ? -0.1 : -0.16 * scale);
    this.magazine.rotation.x = compact ? -0.2 : -0.12;
    this.magazine.userData.home = this.magazine.position.clone();

    const details: THREE.Object3D[] = [
      receiver,
      slide,
      handguard,
      barrel,
      muzzle,
      rail,
      rearSight,
      frontSight,
      core,
      triggerGuard,
      trigger,
      grip,
      this.magazine,
    ];
    if (!compact) {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.14 * scale, 0.36 * scale), darkMat);
      stock.position.set(0, -0.005 * scale, 0.38 * scale);
      stock.rotation.x = -0.08;
      const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scale, 0.05 * scale, 0.28 * scale), bodyMat);
      cheekRest.position.set(0, 0.11 * scale, 0.28 * scale);
      details.push(stock, cheekRest);
    }
    if (sprayer) {
      const coilA = new THREE.Mesh(new THREE.TorusGeometry(0.12 * scale, 0.012 * scale, 8, 24), glowMat);
      coilA.position.set(0, 0.04 * scale, -0.58 * scale);
      coilA.rotation.x = Math.PI / 2;
      const coilB = coilA.clone();
      coilB.position.z = -0.73 * scale;
      details.push(coilA, coilB);
    }
    group.add(...details);
    group.scale.setScalar(this.settings.models.weaponScale);
    group.position.set(this.settings.models.weaponOffsetX, this.settings.models.weaponOffsetY, this.settings.models.weaponOffsetZ);
    group.rotation.y = THREE.MathUtils.degToRad(this.settings.models.weaponRotationY);
    return group;
  }

  private createHands() {
    const group = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: "#b98264", roughness: 0.56 });
    const sleeve = new THREE.MeshStandardMaterial({ color: "#162238", roughness: 0.52, metalness: 0.08 });
    const armGeo = new THREE.CapsuleGeometry(0.055, 0.54, 6, 12);
    const handGeo = new THREE.SphereGeometry(0.08, 14, 10);

    const rightArm = new THREE.Mesh(armGeo, sleeve);
    rightArm.position.set(0.24, -0.29, 0.1);
    rightArm.rotation.set(1.05, 0.08, -0.4);
    const rightHand = new THREE.Mesh(handGeo, skin);
    rightHand.position.set(0.16, -0.24, -0.16);
    rightHand.scale.set(0.85, 0.58, 1.0);

    const leftArm = new THREE.Mesh(armGeo, sleeve);
    leftArm.position.set(-0.27, -0.33, -0.2);
    leftArm.rotation.set(0.92, -0.12, 0.48);
    this.supportHand = new THREE.Mesh(handGeo, skin);
    this.supportHand.position.set(-0.15, -0.22, -0.52);
    this.supportHand.scale.set(0.86, 0.56, 1.05);
    this.supportHand.userData.home = this.supportHand.position.clone();

    group.add(rightArm, rightHand, leftArm, this.supportHand);
    return group;
  }

  private positionHands(weapon: WeaponDef) {
    this.hands.visible = true;
    this.hands.position.set(0, 0, 0);
    this.hands.scale.setScalar(weapon.id === "nova-cannon" ? 1.08 : 1);
    if (weapon.kind === "melee") {
      this.hands.position.set(0.08, 0.05, -0.05);
    }
    if (this.supportHand?.userData.home) this.supportHand.position.copy(this.supportHand.userData.home);
  }

  private animateReload(state: WeaponState, now: number) {
    if (!this.magazine && !this.supportHand) return;
    const magHome = this.magazine?.userData.home as THREE.Vector3 | undefined;
    const handHome = this.supportHand?.userData.home as THREE.Vector3 | undefined;
    if (!state.reloading) {
      if (this.magazine && magHome) this.magazine.position.lerp(magHome, 0.35);
      if (this.supportHand && handHome) this.supportHand.position.lerp(handHome, 0.35);
      return;
    }
    const p = this.reloadProgress(state);
    const out = Math.sin(Math.min(1, p / 0.45) * Math.PI * 0.5);
    const into = Math.sin(THREE.MathUtils.clamp((p - 0.48) / 0.42, 0, 1) * Math.PI * 0.5);
    const settle = Math.sin(THREE.MathUtils.clamp((p - 0.84) / 0.16, 0, 1) * Math.PI);
    const drop = out * (1 - into);
    if (this.magazine && magHome) {
      this.magazine.position.set(
        magHome.x - 0.03 * drop,
        magHome.y - 0.46 * drop + 0.04 * settle,
        magHome.z + 0.12 * drop,
      );
      this.magazine.rotation.x = -0.12 - 0.5 * drop + 0.08 * Math.sin(now * 28) * drop;
    }
    if (this.supportHand && handHome) {
      this.supportHand.position.set(
        handHome.x - 0.1 * drop + 0.08 * into,
        handHome.y - 0.25 * drop + 0.03 * settle,
        handHome.z + 0.24 * drop - 0.1 * into,
      );
    }
  }

  private loadExternalModel(weapon: WeaponDef, mount: THREE.Group) {
    const modelPath = this.settings.models.weaponModelPath.trim() || weapon.modelPath;
    if (!modelPath) return;
    this.objLoader.load(
      modelPath,
      (object) => {
        if (mount !== this.model) return;
        mount.clear();
        const material = new THREE.MeshStandardMaterial({
          color: this.settings.models.weaponTint || weapon.color,
          emissive: weapon.accent,
          emissiveIntensity: 0.22,
          metalness: 0.55,
          roughness: 0.24,
        });
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const longest = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(longest) || longest <= 0.001) return;
        object.position.sub(center);

        // The uploaded OBJ is authored as a full-size world model; offset it into a first-person view-model pose.
        const normalized = new THREE.Group();
        normalized.scale.setScalar(1.08 / longest);
        normalized.rotation.set(0, 0, 0);
        normalized.position.set(
          0.05 + this.settings.models.weaponOffsetX,
          -0.02 + this.settings.models.weaponOffsetY,
          -0.16 + this.settings.models.weaponOffsetZ,
        );
        normalized.rotation.y = THREE.MathUtils.degToRad(this.settings.models.weaponRotationY);
        normalized.scale.multiplyScalar(this.settings.models.weaponScale);
        normalized.add(object);

        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.035, 0.34),
          new THREE.MeshBasicMaterial({ color: weapon.accent, transparent: true, opacity: 0.82 }),
        );
        glow.position.set(0.02, 0.04, -0.28);
        this.magazine = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.24, 0.12),
          new THREE.MeshStandardMaterial({ color: "#10141c", metalness: 0.62, roughness: 0.28 }),
        );
        this.magazine.position.set(-0.02, -0.22, -0.12);
        this.magazine.userData.home = this.magazine.position.clone();
        mount.add(normalized, glow, this.magazine);
      },
      undefined,
      () => {
        // Procedural fallback remains mounted if the provided model cannot be loaded.
      },
    );
  }

  applyModelSettings() {
    this.equip(this.currentIndex);
  }
}
