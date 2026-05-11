import * as THREE from "three";
import type { GameSettings } from "./settings";
import type { InputManager } from "./input";

export interface PlayerMovementFrame {
  stepped: boolean;
  stepIntensity: number;
  crouching: boolean;
  landed: boolean;
  landingIntensity: number;
}

export class PlayerController {
  position = new THREE.Vector3(0, 1.7, 2.4);
  velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  grounded = true;
  crouchAmount = 0;
  recoilPitch = 0;
  private stepDistance = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputManager,
    private readonly settings: GameSettings,
  ) {
    this.camera.position.copy(this.position);
  }

  update(dt: number, active: boolean): PlayerMovementFrame {
    const frame: PlayerMovementFrame = {
      stepped: false,
      stepIntensity: 0,
      crouching: false,
      landed: false,
      landingIntensity: 0,
    };
    if (!active) return frame;
    const look = this.input.consumeLook();
    const sens = this.settings.mouse.sensitivity * 0.0019;
    this.yaw -= look.x * sens;
    const ySign = this.settings.mouse.invertY ? -1 : 1;
    this.pitch -= look.y * sens * ySign;
    this.pitch += this.recoilPitch;
    this.recoilPitch *= 0.82;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.42);

    const forward = Number(this.input.isDown("forward")) - Number(this.input.isDown("backward"));
    const strafe = Number(this.input.isDown("right")) - Number(this.input.isDown("left"));
    const crouching = this.input.isDown("crouch");
    frame.crouching = crouching;
    this.crouchAmount = THREE.MathUtils.lerp(this.crouchAmount, crouching ? 1 : 0, 12 * dt);
    const speed = crouching ? 3.0 : 5.2;
    const dir = new THREE.Vector3(strafe, 0, -forward);
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, dir.x * speed, 12 * dt);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, dir.z * speed, 12 * dt);
    if (this.grounded && this.input.isDown("jump")) {
      this.velocity.y = 5.0;
      this.grounded = false;
    }
    this.velocity.y -= 13.8 * dt;
    const previousGrounded = this.grounded;
    const previousYVelocity = this.velocity.y;
    this.position.addScaledVector(this.velocity, dt);

    const eyeHeight = 1.7 - this.crouchAmount * 0.45;
    if (this.position.y <= eyeHeight) {
      this.position.y = eyeHeight;
      this.velocity.y = 0;
      this.grounded = true;
    }
    if (!previousGrounded && this.grounded) {
      frame.landed = true;
      frame.landingIntensity = THREE.MathUtils.clamp(Math.abs(previousYVelocity) / 8.2, 0.25, 1);
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.grounded && horizontalSpeed > 0.65) {
      this.stepDistance += horizontalSpeed * dt;
      const strideLength = crouching ? 1.35 : 1.72;
      if (this.stepDistance >= strideLength) {
        this.stepDistance %= strideLength;
        frame.stepped = true;
        frame.stepIntensity = THREE.MathUtils.clamp(horizontalSpeed / speed, 0.35, 1);
      }
    } else {
      this.stepDistance = Math.min(this.stepDistance, 0.4);
    }

    this.position.x = THREE.MathUtils.clamp(this.position.x, -7.15, 7.15);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -16.7, 4.95);
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    return frame;
  }

  addRecoil(amount: number) {
    this.recoilPitch += amount;
  }

  forwardVector() {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    return direction.normalize();
  }
}
