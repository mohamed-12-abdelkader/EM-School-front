/** Titles saved with a broken encoding often become literal "?" chars. */
export function displayTitle(raw: string | null | undefined, fallback: string) {
  const t = (raw || '').trim();
  if (!t) return fallback;
  const q = (t.match(/\?/g) || []).length;
  if (q >= Math.max(2, Math.floor(t.length * 0.4))) return fallback;
  return t;
}
