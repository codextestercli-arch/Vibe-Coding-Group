# Aether Range

Original first-person fantasy/sci-fi aim-training prototype built with Vite, TypeScript, and Three.js.

## Run

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local Vite URL, start training, then click the game view to lock the pointer.

## Controls

- WASD: move
- Mouse: look
- Left mouse: shoot
- Right mouse: aim down sights
- Space: jump
- Ctrl: crouch
- R: reload
- 1/2/3: gun slots
- V or 4: blade
- F: inspect
- Esc: pause/settings

All keybinds, display, mouse, audio, and crosshair settings are editable in-game and saved in localStorage.

## Imported Model

The Prism Lancer uses the provided OBJ archive asset at:

```text
public/models/weapons/m4a1/M4A1/M4A1.obj
```

The model is loaded as geometry and recolored with the game's original crystal/energy material so it fits the Aether Range art direction.
