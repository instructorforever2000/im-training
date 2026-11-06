# الشخصية التشريحية — Anatomy figure

- Source body, skeleton and skin weights: MakeHuman base mesh (makehumancommunity/makehuman), released as **CC0 1.0** (free for commercial use, no attribution required). Muscle map, athletic modifiers and painting are ours.
- `build_figure.py <makehuman/data> <out.json>` → posable body + muscle masks (`muscles.py` defines every muscle region).
- `dev/anatomy.js` → three.js figure: pose by aim directions, highlight muscles (red primary / blue secondary), fibre lines, outline, start ghost.
- Prototype for review: `docs/design/prototypes/anatomy-band-row.html` (not wired into the app yet).
