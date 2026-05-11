import type { Action, GameSettings } from "./settings";

export class InputManager {
  keys = new Set<string>();
  mouseButtons = new Set<string>();
  rebinding: Action | null = null;
  private readonly lookBuffer: { x: number; y: number }[] = [];
  private ignoreNextLook = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly settings: GameSettings) {
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("mousedown", (event) => this.onMouseDown(event));
    window.addEventListener("mouseup", (event) => {
      this.mouseButtons.delete(`Mouse${event.button}`);
    });
    window.addEventListener("contextmenu", (event) => {
      if (document.pointerLockElement === this.canvas || event.target === this.canvas) event.preventDefault();
    });
    document.addEventListener("pointerlockchange", () => {
      this.lookBuffer.length = 0;
      this.ignoreNextLook = document.pointerLockElement === this.canvas;
    });
    window.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement === this.canvas) {
        if (!Number.isFinite(event.movementX) || !Number.isFinite(event.movementY)) return;
        if (this.ignoreNextLook) {
          this.ignoreNextLook = false;
          return;
        }
        if (Math.abs(event.movementX) > 720 || Math.abs(event.movementY) > 720) return;
        this.lookBuffer.push({ x: event.movementX, y: event.movementY });
        if (this.lookBuffer.length > 96) this.lookBuffer.splice(0, this.lookBuffer.length - 96);
      }
    });
  }

  private onKeyDown(event: KeyboardEvent) {
    if (this.rebinding) {
      event.preventDefault();
      this.settings.keybinds[this.rebinding] = event.code;
      this.rebinding = null;
      return;
    }
    this.keys.add(event.code);
  }

  private onMouseDown(event: MouseEvent) {
    const code = `Mouse${event.button}`;
    if (this.rebinding) {
      this.settings.keybinds[this.rebinding] = code;
      this.rebinding = null;
      return;
    }
    if (document.pointerLockElement !== this.canvas) return;
    this.mouseButtons.add(code);
  }

  isDown(action: Action) {
    const binding = this.settings.keybinds[action];
    return binding.startsWith("Mouse") ? this.mouseButtons.has(binding) : this.keys.has(binding);
  }

  consumeLook() {
    const delta = { x: 0, y: 0 };
    for (const sample of this.lookBuffer) {
      delta.x += sample.x;
      delta.y += sample.y;
    }
    this.lookBuffer.length = 0;
    return delta;
  }

  clearTransient() {
    this.mouseButtons.clear();
    this.lookBuffer.length = 0;
  }

  prepareForPointerLock() {
    this.clearTransient();
    this.ignoreNextLook = true;
  }
}
