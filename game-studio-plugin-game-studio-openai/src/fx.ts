import * as THREE from "three";

export interface FloatingText {
  el: HTMLDivElement;
  world: THREE.Vector3;
  born: number;
}

export class FxSystem {
  private beams: THREE.Line[] = [];
  private sparks: THREE.Mesh[] = [];
  private blood: THREE.Mesh[] = [];
  private bloodTrails: Array<THREE.Line | THREE.Points> = [];
  private floating: FloatingText[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private overlay: HTMLElement,
  ) {}

  setOverlay(overlay: HTMLElement) {
    this.overlay = overlay;
  }

  addBeam(start: THREE.Vector3, end: THREE.Vector3, color: string) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geometry, material);
    line.userData.life = 0.08;
    this.scene.add(line);
    this.beams.push(line);
  }

  addImpact(position: THREE.Vector3, color: string) {
    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      );
      spark.position.copy(position);
      spark.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3);
      spark.userData.life = 0.28;
      this.scene.add(spark);
      this.sparks.push(spark);
    }
  }

  addBlood(position: THREE.Vector3, direction: THREE.Vector3) {
    const colors = ["#c5162b", "#8f0b1b", "#4e050e"];
    for (let i = 0; i < 34; i++) {
      const velocity = direction.clone().multiplyScalar(0.95 + Math.random() * 1.9);
      velocity.x += (Math.random() - 0.5) * 1.7;
      velocity.y += Math.random() * 1.45 - 0.12;
      velocity.z += (Math.random() - 0.5) * 1.7;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.006 + Math.random() * 0.018, 6, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 }),
      );
      drop.position.copy(position);
      drop.userData.velocity = velocity;
      drop.userData.life = 0.48 + Math.random() * 0.32;
      drop.userData.maxLife = drop.userData.life;
      this.scene.add(drop);
      this.blood.push(drop);

      if (i < 16) {
        const trail = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([position, position.clone().addScaledVector(velocity, 0.08 + Math.random() * 0.05)]),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.62 }),
        );
        trail.userData.velocity = velocity.clone();
        trail.userData.life = 0.18 + Math.random() * 0.14;
        trail.userData.maxLife = trail.userData.life;
        this.scene.add(trail);
        this.bloodTrails.push(trail);
      }
    }
    for (let i = 0; i < 5; i++) {
      const mist = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 10 }, () =>
            position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16)),
          ),
        ),
        new THREE.PointsMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 0.38,
          size: 0.018,
          depthWrite: false,
        }),
      );
      mist.userData.velocity = direction.clone().multiplyScalar(0.28 + Math.random() * 0.5);
      mist.userData.life = 0.28 + Math.random() * 0.18;
      mist.userData.maxLife = mist.userData.life;
      this.scene.add(mist);
      this.bloodTrails.push(mist);
    }
  }

  addDamageText(value: number, world: THREE.Vector3, critical: boolean) {
    const el = document.createElement("div");
    el.className = `damage-number${critical ? " critical" : ""}`;
    el.textContent = critical ? `${value}!` : String(value);
    this.overlay.appendChild(el);
    this.floating.push({ el, world: world.clone(), born: performance.now() });
  }

  update(dt: number) {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      beam.userData.life -= dt;
      (beam.material as THREE.LineBasicMaterial).opacity = Math.max(0, beam.userData.life / 0.08);
      if (beam.userData.life <= 0) {
        this.scene.remove(beam);
        beam.geometry.dispose();
        (beam.material as THREE.Material).dispose();
        this.beams.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.userData.life -= dt;
      spark.position.addScaledVector(spark.userData.velocity, dt);
      (spark.material as THREE.MeshBasicMaterial).opacity = Math.max(0, spark.userData.life / 0.28);
      if (spark.userData.life <= 0) {
        this.scene.remove(spark);
        spark.geometry.dispose();
        (spark.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      }
    }
    for (let i = this.blood.length - 1; i >= 0; i--) {
      const drop = this.blood[i];
      drop.userData.life -= dt;
      drop.userData.velocity.multiplyScalar(1 - Math.min(0.45, dt * 1.6));
      drop.userData.velocity.y -= 6.2 * dt;
      drop.position.addScaledVector(drop.userData.velocity, dt);
      if (drop.position.y < 0.08) {
        drop.position.y = 0.08;
        drop.userData.velocity.multiplyScalar(0.18);
      }
      (drop.material as THREE.MeshBasicMaterial).opacity = Math.max(0, drop.userData.life / drop.userData.maxLife) * 0.92;
      if (drop.userData.life <= 0) {
        this.scene.remove(drop);
        drop.geometry.dispose();
        (drop.material as THREE.Material).dispose();
        this.blood.splice(i, 1);
      }
    }
    for (let i = this.bloodTrails.length - 1; i >= 0; i--) {
      const trail = this.bloodTrails[i];
      trail.userData.life -= dt;
      trail.position.addScaledVector(trail.userData.velocity, dt * 0.2);
      const material = trail.material as THREE.LineBasicMaterial | THREE.PointsMaterial;
      material.opacity = Math.max(0, trail.userData.life / trail.userData.maxLife) * 0.62;
      if (trail.userData.life <= 0) {
        this.scene.remove(trail);
        trail.geometry.dispose();
        (trail.material as THREE.Material).dispose();
        this.bloodTrails.splice(i, 1);
      }
    }
    for (let i = this.floating.length - 1; i >= 0; i--) {
      const text = this.floating[i];
      const age = (performance.now() - text.born) / 1000;
      text.world.y += dt * 0.75;
      const projected = text.world.clone().project(this.camera);
      text.el.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
      text.el.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
      text.el.style.opacity = String(Math.max(0, 1 - age / 0.9));
      if (age > 0.9) {
        text.el.remove();
        this.floating.splice(i, 1);
      }
    }
  }
}
