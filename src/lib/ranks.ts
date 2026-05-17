export const RANKS = [
  { min: 1,  max: 10,  name: "E-RANK HUNTER" },
  { min: 11, max: 20,  name: "D-RANK SOLDIER" },
  { min: 21, max: 30,  name: "C-RANK KNIGHT" },
  { min: 31, max: 40,  name: "B-RANK ELITE" },
  { min: 41, max: 50,  name: "A-RANK MAGE" },
  { min: 51, max: 60,  name: "S-RANK ASSASSIN" },
  { min: 61, max: 70,  name: "SS-RANK OVERLORD" },
  { min: 71, max: Infinity, name: "SHADOW MONARCH" },
] as const;

export function rankForLevel(level: number): string {
  return RANKS.find(r => level >= r.min && level <= r.max)?.name ?? "E-RANK HUNTER";
}

export function nextRankAt(level: number): number | null {
  const idx = RANKS.findIndex(r => level >= r.min && level <= r.max);
  if (idx < 0 || idx === RANKS.length - 1) return null;
  return RANKS[idx + 1].min;
}
