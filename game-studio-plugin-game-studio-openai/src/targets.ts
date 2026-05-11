import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ModelSettings } from "./settings";

export interface TargetHit {
  damage: number;
  critical: boolean;
  destroyed: boolean;
  position: THREE.Vector3;
  target: RangeTarget;
}

export class RangeTarget {
  group = new THREE.Group();
  body: THREE.Mesh;
  weakPoint: THREE.Mesh;
  healthBar: THREE.Mesh;
  hitParts: THREE.Mesh[] = [];
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private mouth: THREE.Mesh;
  private skinMat: THREE.MeshStandardMaterial;
  private shirtMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private bootMat: THREE.MeshStandardMaterial;
  private proceduralParts: THREE.Object3D[] = [];
  private externalVisual: THREE.Group | null = null;
  private externalModelPath = "";
  private baseHitTransforms: Array<{
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    scale: THREE.Vector3;
  }> = [];
  private importedHitboxBaseScale = new THREE.Vector3(1, 1, 1);
  private importedHitboxScale = new THREE.Vector3(1, 1, 1);
  private importedHitboxYOffset = 0;
  maxHealth = 120;
  health = 120;
  alive = true;
  respawnAt = 0;
  origin = new THREE.Vector3();
  slide = false;
  phase = Math.random() * Math.PI * 2;

  constructor(position: THREE.Vector3, slide = false, modelSettings?: ModelSettings) {
    this.origin.copy(position);
    this.slide = slide;
    const skinMat = new THREE.MeshStandardMaterial({ color: modelSettings?.targetSkin ?? "#b98264", roughness: 0.56, metalness: 0.02 });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: modelSettings?.targetShirt ?? "#2d6d8f",
      emissive: "#06131d",
      roughness: 0.5,
      metalness: 0.04,
    });
    const pantsMat = new THREE.MeshStandardMaterial({ color: modelSettings?.targetPants ?? "#202b3a", roughness: 0.58, metalness: 0.05 });
    this.skinMat = skinMat;
    this.shirtMat = shirtMat;
    this.pantsMat = pantsMat;
    const bootMat = new THREE.MeshStandardMaterial({ color: modelSettings?.targetBoots ?? "#11131a", roughness: 0.44, metalness: 0.16 });
    const hairMat = new THREE.MeshStandardMaterial({ color: modelSettings?.targetHair ?? "#221711", roughness: 0.65 });
    this.hairMat = hairMat;
    this.bootMat = bootMat;
    const eyeMat = new THREE.MeshBasicMaterial({ color: "#10131a" });
    const shadowSkinMat = new THREE.MeshStandardMaterial({ color: "#9f604d", roughness: 0.62, metalness: 0.01 });

    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.62, 8, 18), shirtMat);
    this.body.position.y = 1.1;
    this.body.scale.set(0.9, 1.08, 0.56);
    this.body.userData.target = this;

    const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.78, 6, 12), shirtMat);
    shoulders.position.set(0, 1.43, 0.035);
    shoulders.rotation.z = Math.PI / 2;
    shoulders.scale.set(1.0, 1.0, 0.55);
    shoulders.userData.target = this;

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 18), shirtMat);
    chest.position.set(0, 1.23, 0.055);
    chest.scale.set(1.12, 1.18, 0.54);
    chest.userData.target = this;
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 14), shirtMat);
    abdomen.position.set(0, 0.96, 0.035);
    abdomen.scale.set(0.86, 1.02, 0.5);
    abdomen.userData.target = this;
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 14), pantsMat);
    pelvis.position.set(0, 0.78, 0.04);
    pelvis.scale.set(1.15, 0.62, 0.54);
    pelvis.userData.target = this;

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 14), skinMat);
    neck.position.set(0, 1.53, 0);
    neck.userData.target = this;

    this.weakPoint = new THREE.Mesh(new THREE.SphereGeometry(0.2, 34, 22), skinMat);
    this.weakPoint.scale.set(0.78, 1.08, 0.72);
    this.weakPoint.position.set(0, 1.74, 0.02);
    this.weakPoint.userData.target = this;
    this.weakPoint.userData.weakPoint = true;
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10), skinMat);
    jaw.position.set(0, 1.64, 0.075);
    jaw.scale.set(0.9, 0.52, 0.72);
    jaw.userData.target = this;
    jaw.userData.weakPoint = true;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.018), shadowSkinMat);
    brow.position.set(0, 1.79, 0.158);
    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), shadowSkinMat);
    leftCheek.position.set(-0.066, 1.705, 0.148);
    leftCheek.scale.set(1, 0.45, 0.32);
    const rightCheek = leftCheek.clone();
    rightCheek.position.x = 0.066;

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    hair.scale.set(0.86, 0.72, 0.82);
    hair.position.set(0, 1.82, 0);
    hair.rotation.x = -0.18;

    this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), eyeMat);
    this.leftEye.position.set(-0.055, 1.76, 0.155);
    this.rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), eyeMat);
    this.rightEye.position.set(0.055, 1.76, 0.155);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.06, 8), skinMat);
    nose.position.set(0, 1.725, 0.175);
    nose.rotation.x = Math.PI / 2;
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.008), new THREE.MeshBasicMaterial({ color: "#5f2926" }));
    this.mouth.position.set(0, 1.675, 0.158);
    const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), skinMat);
    leftEar.scale.set(0.55, 1, 0.35);
    leftEar.position.set(-0.17, 1.735, 0.02);
    const rightEar = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), skinMat);
    rightEar.scale.set(0.55, 1, 0.35);
    rightEar.position.set(0.17, 1.735, 0.02);

    const upperArmGeo = new THREE.CapsuleGeometry(0.052, 0.36, 7, 14);
    const forearmGeo = new THREE.CapsuleGeometry(0.045, 0.34, 7, 14);
    const legGeo = new THREE.CapsuleGeometry(0.077, 0.62, 8, 14);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    leftUpperArm.position.set(-0.41, 1.23, 0.025);
    leftUpperArm.rotation.z = -0.24;
    const rightUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    rightUpperArm.position.set(0.41, 1.23, 0.025);
    rightUpperArm.rotation.z = 0.24;
    const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
    leftForearm.position.set(-0.47, 0.89, 0.055);
    leftForearm.rotation.z = -0.1;
    const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
    rightForearm.position.set(0.47, 0.89, 0.055);
    rightForearm.rotation.z = 0.1;
    const leftElbow = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), skinMat);
    leftElbow.position.set(-0.45, 1.04, 0.04);
    const rightElbow = leftElbow.clone();
    rightElbow.position.x = 0.45;
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.057, 14, 9), skinMat);
    leftHand.position.set(-0.48, 0.61, 0.065);
    leftHand.scale.set(0.85, 0.62, 1.15);
    const rightHand = leftHand.clone();
    rightHand.position.x = 0.48;
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.12, 0.43, 0.005);
    leftLeg.scale.set(0.86, 1.0, 0.82);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.12, 0.43, 0.005);
    rightLeg.scale.set(0.86, 1.0, 0.82);
    const leftKnee = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), pantsMat);
    leftKnee.position.set(-0.12, 0.46, 0.085);
    leftKnee.scale.set(0.9, 0.7, 0.45);
    const rightKnee = leftKnee.clone();
    rightKnee.position.x = 0.12;
    const leftBoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 7, 12), bootMat);
    leftBoot.position.set(-0.12, 0.075, 0.105);
    leftBoot.rotation.x = Math.PI / 2;
    leftBoot.scale.set(1.05, 1.1, 0.8);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.12;
    const fingerGeo = new THREE.CapsuleGeometry(0.008, 0.055, 4, 6);
    const fingers: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i += 1) {
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        finger.position.set(side * (0.455 + i * 0.016), 0.56, 0.106);
        finger.rotation.z = side * 0.04;
        finger.rotation.x = 0.18;
        finger.userData.target = this;
        fingers.push(finger);
      }
    }
    for (const part of [
      neck,
      shoulders,
      abdomen,
      pelvis,
      leftUpperArm,
      rightUpperArm,
      leftForearm,
      rightForearm,
      leftElbow,
      rightElbow,
      leftHand,
      rightHand,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      leftBoot,
      rightBoot,
    ]) {
      part.userData.target = this;
    }

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.95, 0.14, 32),
      new THREE.MeshStandardMaterial({ color: "#182236", metalness: 0.7, roughness: 0.25, emissive: "#071224" }),
    );
    base.position.y = 0.07;
    this.healthBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.05, 0.045),
      new THREE.MeshBasicMaterial({ color: "#78ffc6" }),
    );
    this.healthBar.position.set(0, 1.98, 0.52);
    this.hitParts = [
      this.body,
      chest,
      abdomen,
      shoulders,
      pelvis,
      neck,
      this.weakPoint,
      jaw,
      leftUpperArm,
      rightUpperArm,
      leftForearm,
      rightForearm,
      leftElbow,
      rightElbow,
      leftHand,
      rightHand,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      leftBoot,
      rightBoot,
    ];
    this.baseHitTransforms = this.hitParts.map((mesh) => ({
      mesh,
      position: mesh.position.clone(),
      scale: mesh.scale.clone(),
    }));
    this.proceduralParts = [
      base,
      this.body,
      chest,
      abdomen,
      shoulders,
      pelvis,
      neck,
      this.weakPoint,
      jaw,
      brow,
      leftCheek,
      rightCheek,
      hair,
      this.leftEye,
      this.rightEye,
      nose,
      this.mouth,
      leftEar,
      rightEar,
      leftUpperArm,
      rightUpperArm,
      leftForearm,
      rightForearm,
      leftElbow,
      rightElbow,
      leftHand,
      rightHand,
      ...fingers,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      leftBoot,
      rightBoot,
      this.healthBar,
    ];
    this.group.add(...this.proceduralParts);
    this.group.position.copy(position);
    if (modelSettings) this.applyModelSettings(modelSettings);
  }

  update(time: number) {
    if (!this.alive && time >= this.respawnAt) this.respawn();
    if (this.slide && this.alive) {
      this.group.position.x = this.origin.x + Math.sin(time * 1.35 + this.phase) * 1.35;
    }
    this.group.rotation.y = Math.sin(time * 0.8 + this.phase) * 0.08;
    const blink = Math.max(0, Math.sin(time * 3.1 + this.phase * 1.7) - 0.88) / 0.12;
    const eyeScale = THREE.MathUtils.lerp(1, 0.08, THREE.MathUtils.clamp(blink, 0, 1));
    this.leftEye.scale.y = eyeScale;
    this.rightEye.scale.y = eyeScale;
    this.mouth.scale.x = 1 + Math.sin(time * 1.7 + this.phase) * 0.12;
  }

  applyDamage(baseDamage: number, critical: boolean): TargetHit {
    const damage = Math.round(baseDamage * (critical ? 1.6 : 1));
    this.health = Math.max(0, this.health - damage);
    this.updateHealthBar();
    const destroyed = this.health <= 0;
    if (destroyed) this.destroy();
    return {
      damage,
      critical,
      destroyed,
      position: this.group.localToWorld(new THREE.Vector3(0, 1.45, 0.55)),
      target: this,
    };
  }

  private updateHealthBar() {
    const pct = Math.max(0.02, this.health / this.maxHealth);
    this.healthBar.scale.x = pct;
    this.healthBar.position.x = -(1 - pct) * 0.28;
    const mat = this.healthBar.material as THREE.MeshBasicMaterial;
    mat.color.set(this.health < this.maxHealth * 0.35 ? "#ff6c6c" : "#78ffc6");
  }

  private destroy() {
    this.alive = false;
    this.respawnAt = performance.now() / 1000 + 1.8;
    this.group.visible = false;
  }

  private respawn() {
    this.health = this.maxHealth;
    this.alive = true;
    this.group.visible = true;
    this.updateHealthBar();
  }

  getHitObjects() {
    return this.hitParts;
  }

  applyModelSettings(settings: ModelSettings) {
    this.skinMat.color.set(settings.targetSkin);
    this.shirtMat.color.set(settings.targetShirt);
    this.pantsMat.color.set(settings.targetPants);
    this.hairMat.color.set(settings.targetHair);
    this.bootMat.color.set(settings.targetBoots);
    this.group.scale.setScalar(settings.targetScale);
    const hasExternalModel = Boolean(settings.targetModelPath.trim());
    for (const part of this.proceduralParts) part.visible = !hasExternalModel || settings.showProceduralTarget;
    this.importedHitboxScale.copy(this.importedHitboxBaseScale).multiplyScalar(settings.targetModelScale);
    this.applyHitboxScale(hasExternalModel && settings.lockHitboxToModel);
    if (this.externalVisual) {
      this.externalVisual.scale.setScalar(settings.targetModelScale);
      this.externalVisual.position.y = 0.94 + settings.targetModelOffsetY;
      this.externalVisual.rotation.y = THREE.MathUtils.degToRad(settings.targetModelRotationY);
    }
  }

  loadExternalModel(loader: OBJLoader, settings: ModelSettings) {
    const modelPath = settings.targetModelPath.trim();
    if (!modelPath) {
      if (this.externalVisual) {
        this.group.remove(this.externalVisual);
        this.externalVisual = null;
      }
      this.externalModelPath = "";
      this.applyModelSettings(settings);
      return;
    }
    if (modelPath === this.externalModelPath) {
      this.applyModelSettings(settings);
      return;
    }
    if (this.externalVisual) {
      this.group.remove(this.externalVisual);
      this.externalVisual = null;
    }
    this.externalModelPath = modelPath;
    loader.load(
      modelPath,
      (object) => {
        if (modelPath !== this.externalModelPath) return;
        if (this.externalVisual) this.group.remove(this.externalVisual);
        const material = new THREE.MeshStandardMaterial({
          color: settings.targetSkin,
          roughness: 0.62,
          metalness: 0.03,
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
        const height = Math.max(0.001, size.y);
        if (!Number.isFinite(height) || height <= 0.001) {
          this.externalModelPath = "";
          return;
        }
        this.importedHitboxBaseScale.set(
          THREE.MathUtils.clamp(size.x / height / 0.42, 0.05, 25),
          1,
          THREE.MathUtils.clamp(size.z / height / 0.24, 0.05, 25),
        );
        this.importedHitboxScale.copy(this.importedHitboxBaseScale).multiplyScalar(settings.targetModelScale);
        this.importedHitboxYOffset = settings.targetModelOffsetY;
        object.position.sub(center);
        const visual = new THREE.Group();
        visual.scale.setScalar((1.85 / height) * settings.targetModelScale);
        visual.position.set(0, 0.94 + settings.targetModelOffsetY, 0);
        visual.rotation.y = THREE.MathUtils.degToRad(settings.targetModelRotationY);
        visual.add(object);
        this.externalVisual = visual;
        this.group.add(visual);
        this.applyModelSettings(settings);
      },
      undefined,
      () => {
        if (modelPath === this.externalModelPath) this.externalModelPath = "";
        this.applyModelSettings(settings);
      },
    );
  }

  private applyHitboxScale(hasExternalModel: boolean) {
    const scale = hasExternalModel ? this.importedHitboxScale : new THREE.Vector3(1, 1, 1);
    for (const base of this.baseHitTransforms) {
      base.mesh.position.set(
        base.position.x * scale.x,
        base.position.y * scale.y + (hasExternalModel ? this.importedHitboxYOffset : 0),
        base.position.z * scale.z,
      );
      base.mesh.scale.set(
        base.scale.x * scale.x,
        base.scale.y * scale.y,
        base.scale.z * scale.z,
      );
    }
  }
}

export class TargetSystem {
  targets: RangeTarget[] = [];
  private objLoader = new OBJLoader();

  constructor(scene: THREE.Scene, private readonly modelSettings: ModelSettings) {
    const placements = [
      [0, 0, -10, false],
      [-3.2, 0, -11.5, true],
      [3.5, 0, -12, true],
      [-5.5, 0, -7.5, false],
      [5.5, 0, -7.5, false],
      [0, 0, -15, true],
    ] as const;
    for (const [x, y, z, slide] of placements) {
      const target = new RangeTarget(new THREE.Vector3(x, y, z), slide, modelSettings);
      target.loadExternalModel(this.objLoader, modelSettings);
      scene.add(target.group);
      this.targets.push(target);
    }
  }

  update(time: number) {
    for (const target of this.targets) target.update(time);
  }

  getHitObjects() {
    return this.targets.flatMap((target) => (target.alive ? target.getHitObjects() : []));
  }

  applyModelSettings() {
    for (const target of this.targets) {
      target.applyModelSettings(this.modelSettings);
      target.loadExternalModel(this.objLoader, this.modelSettings);
    }
  }
}
