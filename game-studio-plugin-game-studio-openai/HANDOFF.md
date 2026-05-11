# Aether Range Handoff

## Project

Aether Range is a browser-based first-person aim-training prototype built with Vite, TypeScript, and Three.js.

Workspace:

```text
C:\Users\xxxso\Documents\Codex\2026-05-10\game-studio-plugin-game-studio-openai
```

Run:

```powershell
npm.cmd install
npm.cmd run dev
```

Build check:

```powershell
npm.cmd run build
```

The build currently passes. Vite reports a large chunk warning because Three.js is bundled into the main app chunk.

## Current Features

- First-person movement, mouse look, jump, crouch, pointer lock, pause/menu flow.
- Five original weapons with damage, fire rate, ammo, reloads, recoil, inspect, ADS, hit markers, beams, and damage numbers.
- Imported OBJ rifle model from:

```text
public/models/weapons/m4a1/M4A1/M4A1.obj
```

- First-person player arms/hands attached to the weapon view model.
- Reload animation moves the support hand and magazine through pull/drop/insert/settle.
- Reload sound effect and reload HUD prompt using the actual reload keybind.
- Human-like target dummies with head weak points, blinking eyes, mouth motion, health bars, respawn, stationary and moving variants.
- Blood-style hit FX using fine droplets, streak lines, mist, drag, gravity, and floor damping.
- Procedural sci-fi chamber with generated wall panel/rune texture, crystals, lights, bloom, floor runes.
- Main menu, pause menu, settings, weapon selection, crosshair maker.
- Saved localStorage settings/keybinds/crosshair/audio/display controls.

## Important Files

- `src/main.ts`: game boot, render loop, pointer-lock state, settings application.
- `src/input.ts`: keyboard/mouse input, pointer-lock delta filtering, key rebinding.
- `src/player.ts`: first-person movement, mouse look, recoil.
- `src/weaponSystem.ts`: weapon state, firing, reload, ADS, view models, imported OBJ loader, arms/hands.
- `src/weapons.ts`: weapon data and model path.
- `src/targets.ts`: target dummy geometry, hit parts, blinking face animation, health/respawn.
- `src/fx.ts`: beams, sparks, blood, damage numbers.
- `src/ui.ts`: DOM HUD, menus, settings, weapon selection, crosshair maker, reload notifier.
- `src/audio.ts`: synthesized weapon, hit, UI, ambient, and reload sounds.
- `src/world.ts`: procedural environment, lighting, generated wall texture.
- `src/styles.css`: HUD/menu/crosshair/reload prompt styling.

## Recent Fixes

- Corrected recoil direction so shots kick upward and can be mouse-controlled.
- Corrected ADS to right mouse button. Browser mouse codes are:
  - `Mouse0`: left click
  - `Mouse1`: middle click
  - `Mouse2`: right click
- Added save migration so old saved ADS bindings of `Mouse1` become `Mouse2`.
- Improved pointer-lock reacquisition from pause/menu:
  - Menu backdrop click resumes.
  - UI clicks no longer leak into held game mouse state.
  - Raw pointer-lock request falls back to normal pointer lock.
  - If pointer lock fails, the game returns to pause instead of hiding UI while cursor remains visible.
- Reworked targets multiple times toward more human proportions.
- Replaced blob blood circles with finer particle/streak/mist behavior.
- Added player arms/hands, reload animation, reload sound, and reload prompt.
- Added procedural wall “wallpaper” texture instead of flat wall color.

## Known User Preferences

- User wants a playable aim trainer, not placeholder menus.
- User strongly dislikes robot/toy/Roblox-looking targets and wants more human-looking player models.
- User wants blood to feel more physically designed, not random blob shapes.
- User has been sensitive to mouse jitter and pointer-lock/menu recapture behavior.
- User wants visible FPS-style interactions: right-click ADS, real reload animation, recoil, hands/arms, clear reload prompt.

## Likely Next Work

- If targets still do not look human enough, consider replacing procedural body geometry with an actual humanoid GLB model. Procedural primitives are reaching their limit for convincing human silhouettes.
- If mouse jitter persists, test in-browser with pointer lock and inspect:
  - whether browser supports `unadjustedMovement`
  - whether OS mouse acceleration is affecting perceived motion
  - whether canvas resolution forcing 2560x1440 on lower displays is causing performance hitching
- Add actual world/view model weapon animations using clips if future GLB assets include them.
- Improve reload animation per weapon type; currently it is a shared procedural animation.
- Consider code-splitting Three.js examples/imports if bundle warning matters.

## Verification Status

Last successful command:

```powershell
npm.cmd run build
```

Result: passed.

