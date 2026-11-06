"""Builds the IM Training anatomy figure from the MakeHuman base mesh (CC0, makehumancommunity/makehuman).

Output: a compact JSON (body + shorts meshes, skeleton, skin weights) that the platform's three.js engine poses and renders.
Run:  python3 tools/anatomy/build_figure.py <makehuman/data dir> <out.json>
"""
import base64
import json
import sys

import numpy as np

sys.path.insert(0, __import__('os').path.dirname(__file__))
import muscles  # noqa: E402

DATA = sys.argv[1]
OUT = sys.argv[2]
SCALE = 0.1  # MakeHuman units are decimetres → metres
# athletic young male: ethnic mix as MakeHuman's default (1/3 each) + max muscle, average weight
TARGETS = [
    ("macrodetails/universal-male-young-maxmuscle-averageweight.target", 1.0),
    ("macrodetails/african-male-young.target", 1 / 3),
    ("macrodetails/asian-male-young.target", 1 / 3),
    ("macrodetails/caucasian-male-young.target", 1 / 3),
    # athletic detail (MakeHuman's own CC0 modifiers)
    ("torso/torso-muscle-dorsi-incr.target", 0.8),
    ("torso/torso-muscle-pectoral-incr.target", 0.6),
    ("torso/torso-vshape-incr.target", 0.5),
    ("stomach/stomach-tone-incr.target", 1.0),
    ("buttocks/buttocks-volume-incr.target", 0.15),
] + [(f"armslegs/{s}-{m}-incr.target", w) for s in ("l", "r") for m, w in (
    ("upperarm-muscle", 0.75), ("upperarm-shoulder-muscle", 0.7), ("lowerarm-muscle", 0.55), ("upperleg-muscle", 0.6), ("lowerleg-muscle", 0.6))]
KEEP_BONES_SKIP = ("tongue", "oris", "oculi", "orbicularis", "risorius", "levator", "temporalis", "special", "jaw", "eye", "breast", "toe")


def read_obj(path):
    v, vt, faces, group = [], [], {}, None
    for line in open(path):
        if line.startswith("v "):
            v.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "):
            vt.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("g "):
            group = line.split()[1]
        elif line.startswith("f "):
            idx = [p.split("/") for p in line.split()[1:]]
            faces.setdefault(group, []).append([(int(a[0]) - 1, int(a[1]) - 1 if len(a) > 1 and a[1] else -1) for a in idx])
    return np.array(v, dtype=np.float64), np.array(vt, dtype=np.float64), faces


def apply_target(v, path, w):
    for line in open(path):
        if line.startswith("#") or not line.strip():
            continue
        i, dx, dy, dz = line.split()
        v[int(i)] += w * np.array([float(dx), float(dy), float(dz)])


def b64(a, dtype):
    return base64.b64encode(np.ascontiguousarray(a, dtype=dtype).tobytes()).decode()


def mesh_part(v, faces, keep):
    """Re-index a face group into its own vertex list (positions keep the base-mesh index for skinning)."""
    used = sorted({i for f in faces for i, _ in f})
    remap = {o: n for n, o in enumerate(used)}
    tris = []
    for f in faces:
        ids = [remap[i] for i, _ in f]
        tris += [ids[0], ids[1], ids[2]] + ([ids[0], ids[2], ids[3]] if len(ids) == 4 else [])
    return np.array(used), np.array(tris, dtype=np.uint32)


def subdivide(P, SI, SW, T):
    """Midpoint subdivision; new vertices blend the skin weights of their edge."""
    P, SIl, SWl = list(P), list(SI), list(SW)
    edge = {}
    def mid(a, b):
        k = (a, b) if a < b else (b, a)
        if k not in edge:
            P.append((P[a] + P[b]) / 2)
            w = {}
            for i, x in zip(SIl[a], SWl[a]):
                w[i] = w.get(i, 0) + x / 2
            for i, x in zip(SIl[b], SWl[b]):
                w[i] = w.get(i, 0) + x / 2
            top = sorted(w.items(), key=lambda z: -z[1])[:4]
            tot = sum(x for _, x in top) or 1
            SIl.append(np.array([i for i, _ in top] + [0] * (4 - len(top)), dtype=np.uint16))
            SWl.append(np.array([x / tot for _, x in top] + [0] * (4 - len(top)), dtype=np.float32))
            edge[k] = len(P) - 1
        return edge[k]
    out = []
    for a, b, c in T:
        ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
        out += [(a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)]
    return np.array(P), np.array(SIl), np.array(SWl), np.array(out, dtype=np.uint32)


def main():
    v, vt, faces = read_obj(f"{DATA}/3dobjs/base.obj")
    for t, w in TARGETS:
        apply_target(v, f"{DATA}/targets/{t}", w)
    skel = json.load(open(f"{DATA}/rigs/default.mhskel"))
    joint = {k: v[idx].mean(axis=0) for k, idx in skel["joints"].items()}
    weights = json.load(open(f"{DATA}/rigs/default_weights.mhw"))["weights"]

    # keep the body skeleton (no face / tongue / toe detail bones); their weights go to the nearest kept parent
    bones = skel["bones"]
    def kept(name):
        return name == "root" or not name.startswith(KEEP_BONES_SKIP)
    def keep_parent(name):
        while not kept(name):
            name = bones[name]["parent"]
        return name
    order, seen = [], set()
    def visit(name):
        if name in seen:
            return
        p = bones[name]["parent"]
        if p:
            visit(p)
        seen.add(name)
        order.append(name)
    for b in bones:
        if kept(b):
            visit(b)
    order = [b for b in order if kept(b)]
    bidx = {b: i for i, b in enumerate(order)}

    nv = len(v)
    vw = [dict() for _ in range(nv)]
    for b, lst in weights.items():
        kb = keep_parent(b)
        for i, w in lst:
            vw[i][kb] = vw[i].get(kb, 0) + w
    si = np.zeros((nv, 4), dtype=np.uint16)
    sw = np.zeros((nv, 4), dtype=np.float32)
    for i, d in enumerate(vw):
        top = sorted(d.items(), key=lambda x: -x[1])[:4]
        tot = sum(w for _, w in top) or 1
        for k, (b, w) in enumerate(top):
            si[i, k] = bidx[b]
            sw[i, k] = w / tot

    # ground the figure: feet on y = 0, centred on x/z
    vs = v * SCALE
    body_ids, body_tris = mesh_part(vs, faces["body"], "body")
    floor = vs[body_ids][:, 1].min()
    cx, cz = vs[body_ids][:, 0].mean(), vs[body_ids][:, 2].mean()
    off = np.array([cx, floor, cz])
    vs = vs - off
    jw = {k: (p * SCALE - off) for k, p in joint.items()}

    # subdivide the body once (each triangle → 4) so muscle colours get smooth, airbrush-like borders
    P, SI, SW, T = subdivide(vs[body_ids], si[body_ids], sw[body_ids], body_tris.reshape(-1, 3))
    owner = [order[i] for i in SI[:, 0]]
    joints = {b: (jw[bones[b]["head"]], jw[bones[b]["tail"]]) for b in order}
    masks, fib, P2, info = muscles.build(P, T, joints, owner)
    head_y = jw[bones["head"]["head"]][1]
    is_head = np.array([o == "head" for o in owner])
    front_z = P[is_head][:, 2].max()
    hair = is_head & (P[:, 1] > head_y + 0.085 + np.clip(P[:, 2] - (front_z - 0.07), 0, None) * 0.9)
    waist = jw[bones["spine05"]["head"]][1] + 0.055
    limb_upper = np.array([o.startswith(("upperarm", "lowerarm", "wrist", "finger", "metacarpal")) for o in owner])
    shorts = muscles.smooth(waist + 0.006, waist - 0.006, P[:, 1]) * muscles.smooth(0.635, 0.647, P[:, 1]) * (~limb_upper)
    nrm = muscles.vertex_normals(P2, T)
    P2 = P2 + nrm * (shorts * 0.004)[:, None]
    parts = {"body": {
        "n": int(len(P2)), "pos": b64(P2, np.float32), "idx": b64(T.ravel(), np.uint32),
        "si": b64(SI, np.uint16), "sw": b64(SW, np.float32), "fib": b64(fib, np.float32),
        "hair": b64(np.nonzero(hair)[0], np.uint32), "shorts": b64(np.round(shorts * 255), np.uint8),
    }}
    out = {
        "muscles": info,
        "masks": {k: [b64(i, np.uint32), b64(np.round(w * 255), np.uint8)] for k, (i, w) in masks.items()},
        "source": "MakeHuman base mesh, skeleton and weights — CC0 1.0 (makehumancommunity/makehuman)",
        "bones": [{"name": b, "parent": bones[b]["parent"] if b != "root" else None,
                   "head": [round(x, 5) for x in jw[bones[b]["head"]]], "tail": [round(x, 5) for x in jw[bones[b]["tail"]]]} for b in order],
        "parts": parts,
    }
    json.dump(out, open(OUT, "w"))
    print("bones", len(order), "body verts", len(body_ids), "tris", len(body_tris) // 3, "subdivided verts", len(P2), "height", round(float(vs[body_ids][:, 1].max()), 3))


main()
