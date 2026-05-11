export interface RangeStats {
  shots: number;
  hits: number;
  totalDamage: number;
  startedAt: number;
  lastDamageAt: number;
}

export function createStats(): RangeStats {
  return {
    shots: 0,
    hits: 0,
    totalDamage: 0,
    startedAt: performance.now(),
    lastDamageAt: performance.now(),
  };
}

export function accuracy(stats: RangeStats) {
  return stats.shots === 0 ? 0 : Math.round((stats.hits / stats.shots) * 100);
}

export function dps(stats: RangeStats) {
  const seconds = Math.max(1, (performance.now() - stats.startedAt) / 1000);
  return Math.round(stats.totalDamage / seconds);
}
