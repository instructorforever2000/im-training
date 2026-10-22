// Adaptive layout for the login screen. Works from the real viewport size (CSS pixels),
// so it behaves the same on any desktop, tablet or phone and at any browser/OS zoom.
export interface LayoutMetrics {
  /** "row": three cards side by side over a floor court. "stack": one column, scrolls. */
  mode: "row" | "stack"
  /** viewport is clearly taller than wide: the motion ribbon runs top → bottom */
  portrait: boolean
  /** short desktop windows use tighter cards */
  compact: boolean
  /** scale applied to the row of cards */
  k: number
  /** top offset of the row of cards (px) */
  pt: number
  /** height reserved for the floor court (px) */
  courtH: number
  /** phone-sized width */
  mobile: boolean
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export function computeLayout(W: number, H: number): LayoutMetrics {
  const portrait = H > W * 1.1
  const mobile = W < 700
  const row = W >= 900 && H >= 560 && !portrait
  if (!row) {
    return { mode: "stack", portrait, compact: false, k: 1, pt: 0, courtH: clamp(H * 0.16, 110, 200), mobile }
  }
  const compact = H < 780
  const courtH = clamp(H * 0.34, 190, 360)
  const top = 66
  const zoneH = H - top - courtH - 118
  const clusterH = (compact ? 312 : 392) + 60
  const k = Math.max(0.72, Math.min(1, zoneH / clusterH, (W - 70) / 1010))
  const pt = top + 60 * k + Math.max(0, (zoneH - clusterH * k) / 2)
  return { mode: "row", portrait: false, compact, k, pt, courtH, mobile: false }
}
