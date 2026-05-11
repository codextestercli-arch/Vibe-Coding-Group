import type { GameSettings } from "./settings";
import type { WeaponDef } from "./weapons";

export class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private weapon: GainNode | null = null;
  private ui: GainNode | null = null;
  private ambient: GainNode | null = null;
  private movement: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private lastFootstepAt = 0;

  constructor(private settings: GameSettings) {}

  async resume() {
    if (!this.context) this.init();
    if (this.context?.state === "suspended") await this.context.resume();
  }

  private init() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.weapon = this.context.createGain();
    this.ui = this.context.createGain();
    this.ambient = this.context.createGain();
    this.movement = this.context.createGain();
    this.weapon.connect(this.master);
    this.ui.connect(this.master);
    this.ambient.connect(this.master);
    this.movement.connect(this.master);
    this.master.connect(this.context.destination);
    this.applySettings(this.settings);
    this.startAmbient();
  }

  applySettings(settings: GameSettings) {
    this.settings = settings;
    if (!this.context || !this.master || !this.weapon || !this.ui || !this.ambient || !this.movement) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.audio.master, now, 0.03);
    this.weapon.gain.setTargetAtTime(settings.audio.weapon, now, 0.03);
    this.ui.gain.setTargetAtTime(settings.audio.ui, now, 0.03);
    this.ambient.gain.setTargetAtTime(settings.audio.ambient * 0.18, now, 0.08);
    this.movement.gain.setTargetAtTime(settings.audio.master * 0.7, now, 0.03);
  }

  private startAmbient() {
    if (!this.context || !this.ambient || this.ambientOsc) return;
    const osc = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.value = 72;
    filter.type = "lowpass";
    filter.frequency.value = 380;
    osc.connect(filter);
    filter.connect(this.ambient);
    osc.start();
    this.ambientOsc = osc;
  }

  playWeapon(weapon: WeaponDef) {
    if (!this.context || !this.weapon) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const base = weapon.kind === "melee" ? 210 : 120 + weapon.damage * 8;
    osc.type = weapon.kind === "arc" ? "sawtooth" : weapon.kind === "melee" ? "triangle" : "square";
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, base * 0.35), now + 0.12);
    filter.type = "lowpass";
    filter.frequency.value = weapon.kind === "arc" ? 1200 : 1900;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(weapon.kind === "melee" ? 0.2 : 0.34, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (weapon.kind === "arc" ? 0.08 : 0.16));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.weapon);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playReload() {
    if (!this.context || !this.weapon) return;
    const now = this.context.currentTime;
    const makeClick = (time: number, frequency: number, gainValue: number) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const filter = this.context!.createBiquadFilter();
      osc.type = "square";
      osc.frequency.setValueAtTime(frequency, time);
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.weapon!);
      osc.start(time);
      osc.stop(time + 0.11);
    };
    makeClick(now, 320, 0.13);
    makeClick(now + 0.32, 190, 0.16);
    makeClick(now + 0.72, 460, 0.12);
  }

  playFootstep(intensity: number, crouching: boolean) {
    if (!this.context || !this.movement) return;
    const now = this.context.currentTime;
    if (now - this.lastFootstepAt < 0.11) return;
    this.lastFootstepAt = now;
    const impact = crouching ? 0.45 : 0.78;
    const level = Math.max(0.04, intensity * impact);
    this.playBodyThump(now, 88 + Math.random() * 18, level * 0.08, 0.075);
    this.playFilteredNoise(now + 0.006, crouching ? 720 : 1050, level * 0.045, 0.055);
    this.playSoleScrape(now + 0.025, crouching ? 440 : 620, level * 0.024);
  }

  playLanding(intensity: number) {
    if (!this.context || !this.movement) return;
    const now = this.context.currentTime;
    const level = Math.max(0.15, intensity);
    this.playBodyThump(now, 62, level * 0.18, 0.16);
    this.playFilteredNoise(now + 0.01, 520, level * 0.11, 0.12);
    this.playFilteredNoise(now + 0.045, 1350, level * 0.045, 0.07);
  }

  playHit(critical = false) {
    if (!this.context || !this.ui) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(critical ? 920 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(critical ? 1380 : 840, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(critical ? 0.22 : 0.13, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ui);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playUi() {
    if (!this.context || !this.ui) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "triangle";
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ui);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playBodyThump(time: number, frequency: number, gainValue: number, duration: number) {
    if (!this.context || !this.movement) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(38, frequency * 0.58), time + duration);
    filter.type = "lowpass";
    filter.frequency.value = 240;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.movement);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playFilteredNoise(time: number, frequency: number, gainValue: number, duration: number) {
    if (!this.context || !this.movement) return;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 1.8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.movement);
    noise.start(time);
    noise.stop(time + duration + 0.01);
  }

  private playSoleScrape(time: number, frequency: number, gainValue: number) {
    if (!this.context || !this.movement) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.72, time + 0.06);
    filter.type = "highpass";
    filter.frequency.value = 260;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.movement);
    osc.start(time);
    osc.stop(time + 0.09);
  }
}
