/**
 * Returns true if `current` is strictly older than `minimum`.
 * Supports "major.minor.patch" semver format.
 */
export function isVersionOutdated(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10));
  const [ca, cb, cc = 0] = parse(current);
  const [ma, mb, mc = 0] = parse(minimum);
  if (ca !== ma) return ca < ma;
  if (cb !== mb) return cb < mb;
  return cc < mc;
}
