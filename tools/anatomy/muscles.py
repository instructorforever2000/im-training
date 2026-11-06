"""Muscle map of the IM Training anatomy figure (rest pose, metres; figure faces +Z, its left side is +X).

Each muscle is painted on the body surface with a soft mask:
  - torso muscles: a polygon seen from the back ("back") or the front ("front") view, limited by where the skin faces;
  - limb muscles: a span along a bone (t: 0 = joint, 1 = next joint) and an angular sector around it
    (0° = front, 90° = outer side, 180° = back, 270° = inner side).
Masks also drive the anatomical definition: a soft bulge inside each muscle and a fine groove along its border.
"""
import numpy as np

SOFT = 0.018          # polygon edge softness (m)
BULGE = 0.0035        # outward relief inside a muscle (m)
GROOVE = 0.0024       # inward relief along muscle borders (m)

# name, Arabic, English, kind, data, fibre direction (2D in the view plane, or "axis" along the bone), relief scale
TORSO = [
    ("trapUpper", "شبه المنحرفة — العلوية", "Upper trapezius", "back", [(0.0, 1.62), (0.05, 1.6), (0.1, 1.49), (0.19, 1.44), (0.16, 1.41), (0.06, 1.43), (0.0, 1.46)], (1, -0.45), 0.8),
    ("trapMid", "شبه المنحرفة — الوسطى", "Middle trapezius", "back", [(0.0, 1.46), (0.06, 1.43), (0.16, 1.41), (0.1, 1.35), (0.0, 1.32)], (1, 0.05), 0.7),
    ("trapLower", "شبه المنحرفة — السفلية", "Lower trapezius", "back", [(0.0, 1.32), (0.1, 1.35), (0.065, 1.25), (0.0, 1.17)], (0.6, 1), 0.6),
    ("rhomboid", "المعيّنية", "Rhomboids", "back", [(0.012, 1.42), (0.07, 1.4), (0.09, 1.28), (0.03, 1.3)], (1, -0.6), 0.6),
    ("infra", "تحت الشوكة", "Infraspinatus", "back", [(0.075, 1.38), (0.17, 1.37), (0.168, 1.3), (0.11, 1.265), (0.085, 1.3)], (1, 0.25), 0.9),
    ("teres", "المدوّرة الكبرى", "Teres major", "back", [(0.12, 1.3), (0.18, 1.335), (0.195, 1.285), (0.15, 1.245)], (1, 0.5), 1.0),
    ("lat", "الظهرية العريضة", "Latissimus dorsi", "back", [(0.15, 1.265), (0.2, 1.31), (0.2, 1.22), (0.17, 1.12), (0.14, 1.02), (0.065, 0.985), (0.02, 1.02), (0.02, 1.15), (0.065, 1.235), (0.11, 1.255)], (0.75, 1), 1.0),
    ("erector", "ناصبة الفقار", "Erector spinae", "back", [(0.012, 1.25), (0.05, 1.24), (0.062, 1.02), (0.035, 0.965), (0.012, 0.975)], (0, 1), 0.8),
    ("pec", "الصدرية الكبرى", "Pectoralis major", "front", [(0.0, 1.43), (0.09, 1.435), (0.175, 1.41), (0.2, 1.34), (0.15, 1.27), (0.06, 1.265), (0.0, 1.28)], (1, 0.15), 1.0),
    ("abs", "المستقيمة البطنية", "Rectus abdominis", "front", [(0.0, 1.27), (0.068, 1.262), (0.064, 0.99), (0.0, 0.96)], (0, 1), 0.9),
    ("oblique", "المائلة الخارجية", "External oblique", "front", [(0.068, 1.235), (0.145, 1.225), (0.165, 1.12), (0.15, 1.0), (0.075, 0.985)], (0.55, 1), 0.8),
    ("serratus", "المنشارية الأمامية", "Serratus anterior", "front", [(0.135, 1.305), (0.19, 1.315), (0.18, 1.215), (0.145, 1.225)], (1, 0.55), 0.9),
]
# bones: segment from joint A to joint B (names of skeleton bones whose head/tail define it), owner bones (skin weights)
LIMB = [
    ("deltAnt", "الدالية الأمامية", "Anterior deltoid", ("upperarm01", "upperarm02"), (-0.35, 0.55), (-35, 55), ("shoulder01", "upperarm01", "upperarm02", "clavicle"), 1.0),
    ("deltLat", "الدالية الجانبية", "Lateral deltoid", ("upperarm01", "upperarm02"), (-0.35, 0.6), (55, 125), ("shoulder01", "upperarm01", "upperarm02", "clavicle"), 1.0),
    ("deltPost", "الدالية الخلفية", "Posterior deltoid", ("upperarm01", "upperarm02"), (-0.35, 0.55), (125, 215), ("shoulder01", "upperarm01", "upperarm02"), 1.0),
    ("biceps", "ذات الرأسين العضدية", "Biceps brachii", ("upperarm01", "upperarm02"), (0.45, 0.93), (-55, 50), ("upperarm01", "upperarm02"), 1.0),
    ("triceps", "ثلاثية الرؤوس العضدية", "Triceps brachii", ("upperarm01", "upperarm02"), (0.42, 0.95), (110, 255), ("upperarm01", "upperarm02"), 1.0),
    ("forearm", "عضلات الساعد", "Forearm muscles", ("lowerarm01", "lowerarm02"), (0.02, 0.62), (-180, 180), ("lowerarm01", "lowerarm02"), 0.7),
    ("quad", "رباعية الرؤوس الفخذية", "Quadriceps", ("upperleg01", "upperleg02"), (0.18, 0.92), (-75, 85), ("upperleg01", "upperleg02"), 1.0),
    ("ham", "العضلات الخلفية للفخذ", "Hamstrings", ("upperleg01", "upperleg02"), (0.3, 0.9), (115, 245), ("upperleg01", "upperleg02"), 1.0),
    ("adductor", "العضلات المقرّبة", "Adductors", ("upperleg01", "upperleg02"), (0.15, 0.6), (245, 295), ("upperleg01", "upperleg02"), 0.7),
    ("calf", "التوأمية (السمانة)", "Gastrocnemius", ("lowerleg01", "lowerleg02"), (0.02, 0.55), (110, 250), ("lowerleg01", "lowerleg02"), 1.0),
    ("tibialis", "الظنبوبية الأمامية", "Tibialis anterior", ("lowerleg01", "lowerleg02"), (0.08, 0.7), (-15, 70), ("lowerleg01", "lowerleg02"), 0.6),
]
# the six-pack: tendinous lines across the rectus abdominis, and the linea alba
ABS_LINES = (1.105, 1.165, 1.225)


def poly_sd(px, py, poly):
    """Signed distance (negative inside) from points to a polygon, vectorised."""
    P = np.array(poly)
    n = len(P)
    d = np.full(px.shape, 1e9)
    inside = np.zeros(px.shape, dtype=bool)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        ex, ey = b[0] - a[0], b[1] - a[1]
        wx, wy = px - a[0], py - a[1]
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        d = np.minimum(d, np.hypot(wx - ex * t, wy - ey * t))
        cond = ((a[1] > py) != (b[1] > py)) & (px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1] + 1e-12) + a[0])
        inside ^= cond
    return np.where(inside, -d, d)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def vertex_normals(v, tris):
    n = np.zeros_like(v)
    a, b, c = v[tris[:, 0]], v[tris[:, 1]], v[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


def build(v, tris, joints, owner_of):
    """v: rest positions (body vertices), tris: triangles, joints: bone → (head, tail), owner_of: vertex → dominant bone name.
    Returns masks {name+side: (indices, weights)}, fibre coordinate per vertex, displaced positions, muscle info."""
    nrm = vertex_normals(v, tris)
    masks, fib = {}, np.zeros(len(v))
    best = np.zeros(len(v))
    relief = np.zeros(len(v))
    arm_owned = np.array([o.startswith(("upperarm", "lowerarm", "wrist", "finger", "metacarpal")) for o in owner_of])
    info = []
    for side, sx in (("L", 1), ("R", -1)):
        X = v[:, 0] * sx
        for name, ar, en, view, poly, fd, rs in TORSO:
            sd = poly_sd(X, v[:, 1], poly)
            face = smooth(0.15, -0.35, nrm[:, 2]) if view == "back" else smooth(-0.45, 0.1, nrm[:, 2])
            on_side = smooth(-0.004, 0.004, X)  # this half of the body only
            m = np.clip(0.5 - sd / SOFT, 0, 1) * face * on_side * (~arm_owned)
            if name == "abs":  # tendinous intersections + linea alba
                lines = sum(np.exp(-((v[:, 1] - y) / 0.006) ** 2) for y in ABS_LINES) + np.exp(-(X / 0.005) ** 2)
                relief -= GROOVE * 1.2 * np.clip(lines, 0, 1) * m
            _store(masks, name + side, m, fib, best, v[:, 0] * fd[1] * sx - v[:, 1] * fd[0])
            relief += rs * (BULGE * smooth(0.25, 1, m) - GROOVE * np.exp(-((m - 0.18) / 0.12) ** 2) * (sd < 0.02))
            if side == "L":
                info.append({"k": name, "ar": ar, "en": en})
        for name, ar, en, seg, tspan, ang, owners, rs in LIMB:
            a, _ = joints[f"{seg[0]}.{side}"]
            _, b = joints[f"{seg[1]}.{side}"]
            ax = b - a
            L = np.linalg.norm(ax)
            u = ax / L
            rel = v - a
            t = rel @ u / L
            radial = rel - np.outer(rel @ u, u)
            front = np.array([0, 0, 1.0]) - u * u[2]
            front /= np.linalg.norm(front)
            lateral = np.cross(u, front) * (1 if np.cross(u, front)[0] * sx > 0 else -1)
            phi = np.degrees(np.arctan2(radial @ lateral, radial @ front))
            lo, hi = ang
            dphi = (phi - (lo + hi) / 2 + 180) % 360 - 180
            half = (hi - lo) / 2
            ang_m = smooth(half + 14, half - 6, np.abs(dphi)) if half < 179 else np.ones(len(v))
            t_m = smooth(tspan[0] - 0.06, tspan[0] + 0.04, t) * smooth(tspan[1] + 0.06, tspan[1] - 0.04, t)
            own = np.array([o.startswith(owners) and o.endswith("." + side) for o in owner_of])
            m = ang_m * t_m * own
            _store(masks, name + side, m, fib, best, np.radians(phi) * np.linalg.norm(radial, axis=1))
            relief += rs * (BULGE * smooth(0.3, 1, m) - GROOVE * np.exp(-((m - 0.2) / 0.13) ** 2))
            if side == "L":
                info.append({"k": name, "ar": ar, "en": en})
    # muscles' fibres run along the limb: stripes are drawn across "fib", so for limbs use the angle around the bone
    out = v + nrm * relief[:, None]
    return masks, fib, out, info


def _store(masks, key, m, fib, best, coord):
    sel = m > 0.02
    masks[key] = (np.nonzero(sel)[0], m[sel])
    upd = m > best
    fib[upd] = coord[upd]
    best[upd] = m[upd]
