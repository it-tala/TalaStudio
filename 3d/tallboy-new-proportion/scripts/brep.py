"""Tessellate ACIS SAB bodies (plane / cylinder faces, straight / ellipse / nubs
edges) into triangle meshes. Runs inside Blender (needs mathutils CDT)."""
import math
import numpy as np
from mathutils.geometry import delaunay_2d_cdt
from mathutils import kdtree

ARC_STEP = math.radians(5.0)      # edge sampling on arcs
GRID_DTHETA = math.radians(7.5)   # interior sampling on cylinders
GRID_DH = 20.0                    # mm along cylinder axis


def toks(fields, kind):
    return [t[1] for t in fields if t[0] == kind]


class Body:
    def __init__(self, recs):
        self.R = recs
        self.warn = []
        self.pt_cache = {}
        self.edge_cache = {}
        tr = [r for r in recs if r[0] == 'transform']
        if tr:
            v = toks(tr[0][1], 'vec')
            self.M = np.array(v[:3]); self.T = np.array(v[3])
            self.scale = toks(tr[0][1], 'd')[0]
        else:
            self.M = np.eye(3); self.T = np.zeros(3); self.scale = 1.0

    def f(self, i):
        return self.R[i][1]

    def ptr(self, i, k):
        return self.f(i)[k][1]

    # ---------- topology walk ----------
    def faces(self):
        out = []
        body = next(i for i, r in enumerate(self.R) if r[0] == 'body')
        lump = self.ptr(body, 3)
        while lump >= 0:
            shell = self.ptr(lump, 4)
            while shell >= 0:
                face = self.ptr(shell, 5)
                while face >= 0:
                    out.append(face)
                    face = self.ptr(face, 3)
                shell = self.ptr(shell, 3)
            lump = self.ptr(lump, 3)
        return out

    def vpos(self, v):
        p = self.ptr(v, 5)
        return np.array(toks(self.f(p), 'pos')[0])

    # ---------- curves ----------
    def edge_poly(self, e):
        if e in self.edge_cache:
            return self.edge_cache[e]
        F = self.f(e)
        vs, ts, ve, te = F[3][1], F[4][1], F[5][1], F[6][1]
        cv, sense = F[8][1], F[9][1]
        P0, P1 = self.vpos(vs), self.vpos(ve)
        ctype = self.R[cv][0]
        if ctype == 'straight-curve':
            pts = [P0, P1]
        elif ctype == 'ellipse-curve':
            cf = self.f(cv)
            c = np.array(toks(cf, 'pos')[0]); n, M = [np.array(x) for x in toks(cf, 'vec')[:2]]
            ratio = toks(cf, 'd')[0]
            mn = np.cross(n, M) / np.linalg.norm(n) * ratio
            ev = lambda t: c + M * math.cos(t) + mn * math.sin(t)
            if vs == ve and abs(te - ts) < 1e-9:
                te = ts + 2 * math.pi
            n_seg = max(2, int(math.ceil(abs(te - ts) / ARC_STEP)))
            ts_ = np.linspace(ts, te, n_seg + 1)
            cand = [np.array([ev(t) for t in ts_]), np.array([ev(-t) for t in ts_])]
            pts = None
            for cpts in (cand[1], cand[0]) if sense else cand:
                if np.linalg.norm(cpts[0] - P0) < 1e-3 and np.linalg.norm(cpts[-1] - P1) < 1e-3:
                    pts = list(cpts); break
            if pts is None:
                # fall back: go from P0 to P1 by angle along the short/long way
                a0 = math.atan2(np.dot(P0 - c, mn), np.dot(P0 - c, M))
                a1 = math.atan2(np.dot(P1 - c, mn), np.dot(P1 - c, M))
                span = abs(te - ts)
                d = (a1 - a0) % (2 * math.pi)
                if abs(d - span) > abs((2 * math.pi - d) - span):
                    d = d - 2 * math.pi
                pts = [ev(a0 + d * k / n_seg) for k in range(n_seg + 1)]
                self.warn.append('ellipse fallback edge %d' % e)
            pts[0], pts[-1] = P0, P1
        elif ctype == 'intcurve-curve':
            pts = self.nubs_poly(cv, ts, te, sense, P0, P1)
        else:
            self.warn.append('unknown curve %s' % ctype)
            pts = [P0, P1]
        pts = [np.array(p, dtype=float) for p in pts]
        self.edge_cache[e] = pts
        return pts

    def nubs_poly(self, cv, ts, te, sense, P0, P1):
        F = self.f(cv)
        k = next(i for i, t in enumerate(F) if t[0] == 'id' and t[1] in ('nubs', 'nurbs'))
        rational = F[k][1] == 'nurbs'
        deg = F[k + 1][1]; nk = F[k + 3][1]
        j = k + 4; knots = []
        for _ in range(nk):
            val = F[j][1]; mult = F[j + 1][1]; j += 2
            knots += [val] * mult
        nctrl = len(knots) - deg + 1
        dim = 4 if rational else 3
        vals = [F[j + q][1] for q in range(nctrl * dim)]
        cp = np.array(vals).reshape(nctrl, dim)
        U = np.array([knots[0]] + knots + [knots[-1]])

        def deboor(t):
            t = min(max(t, U[deg]), U[-deg - 1])
            s = np.searchsorted(U, t, side='right') - 1
            s = min(s, len(U) - deg - 2)
            d = [cp[s - deg + r].copy() if not rational else
                 np.append(cp[s - deg + r][:3] * cp[s - deg + r][3], cp[s - deg + r][3])
                 for r in range(deg + 1)]
            for r in range(1, deg + 1):
                for q in range(deg, r - 1, -1):
                    a = (t - U[s - deg + q]) / (U[s + 1 + q - r] - U[s - deg + q])
                    d[q] = (1 - a) * d[q - 1] + a * d[q]
            return d[deg][:3] / d[deg][3] if rational else d[deg]

        n_seg = 24
        for sgn in ((-1, 1) if sense else (1, -1)):
            pts = [deboor(sgn * t) for t in np.linspace(ts, te, n_seg + 1)]
            if np.linalg.norm(pts[0] - P0) < 0.05 and np.linalg.norm(pts[-1] - P1) < 0.05:
                pts[0], pts[-1] = P0, P1
                return pts
        pts = [deboor(t) for t in np.linspace(ts, te, n_seg + 1)]
        if np.linalg.norm(pts[0] - P1) < np.linalg.norm(pts[0] - P0):
            pts = pts[::-1]
        self.warn.append('nubs endpoint mismatch %.3f %.3f' % (
            np.linalg.norm(pts[0] - P0), np.linalg.norm(pts[-1] - P1)))
        pts[0], pts[-1] = P0, P1
        return pts

    # ---------- loops ----------
    def loop_poly(self, lp):
        first = self.ptr(lp, 4)
        co = first; out = []; guard = 0
        while True:
            F = self.f(co)
            e, sense = F[6][1], F[7][1]
            pts = self.edge_poly(e)
            if sense:
                pts = pts[::-1]
            out += pts[:-1]
            co = F[3][1]; guard += 1
            if co == first or co < 0 or guard > 10000:
                break
        return out

    # ---------- faces ----------
    def tess_face(self, fi):
        F = self.f(fi)
        sid = F[7][1]; reversed_ = F[8][1]
        stype = self.R[sid][0]; S = self.f(sid)
        loops = []
        lp = F[4][1]
        while lp >= 0:
            poly = self.loop_poly(lp)
            # drop duplicate consecutive points
            clean = []
            for p in poly:
                if not clean or np.linalg.norm(p - clean[-1]) > 1e-6:
                    clean.append(p)
            if len(clean) > 1 and np.linalg.norm(clean[0] - clean[-1]) < 1e-6:
                clean.pop()
            if len(clean) >= 2:
                loops.append(clean)
            lp = self.ptr(lp, 3)
        if not loops:
            return [], [], False
        if stype == 'plane-surface':
            o = np.array(toks(S, 'pos')[0]); n, u = [np.array(x) for x in toks(S, 'vec')[:2]]
            n = n / np.linalg.norm(n); u = u / np.linalg.norm(u); v = np.cross(n, u)
            to2 = lambda p: ((p - o) @ u, (p - o) @ v)
            out_n = -n if reversed_ else n
            tris, verts = self._cdt(loops, to2, None, [])
            return self._orient(verts, tris, lambda p: out_n), stype == 'cone-surface' and False, False
        if stype == 'cone-surface':
            c = np.array(toks(S, 'pos')[0]); a, M = [np.array(x) for x in toks(S, 'vec')[:2]]
            ds = toks(S, 'd'); ratio, sin_a, cos_a, rad = ds[0], ds[1], ds[2], ds[3]
            if abs(sin_a) > 1e-9:
                self.warn.append('true cone not supported, treated as cylinder')
            a = a / np.linalg.norm(a); r = np.linalg.norm(M); Mu = M / r; Nu = np.cross(a, Mu)
            th_of = lambda p: math.atan2((p - c) @ Nu, (p - c) @ Mu)
            # unwrap loops
            lp2 = []
            for L in loops:
                th = np.unwrap([th_of(p) for p in L])
                hh = [(p - c) @ a for p in L]
                closing = ((th[0] - th[-1] + math.pi) % (2 * math.pi)) - math.pi
                if abs(th[-1] - th[0] + closing) > math.pi:
                    self.warn.append('seam-wrapping loop on cylinder face %d' % fi)
                lp2.append((th, hh))
            ref = lp2[0][0].mean()
            shifts = [2 * math.pi * round((L[0].mean() - ref) / (2 * math.pi)) for L in lp2]
            pmap = {}
            for L, (th, hh), sh in zip(loops, lp2, shifts):
                for p, t, h in zip(L, th, hh):
                    pmap[tuple(p)] = ((t - sh) / GRID_DTHETA, h / GRID_DH)
            to2 = lambda p: pmap[tuple(p)]
            def from2(q):
                t = q[0] * GRID_DTHETA; h = q[1] * GRID_DH
                return c + a * h + r * (math.cos(t) * Mu + math.sin(t) * Nu)
            allq = np.array(list(pmap.values()))
            lo, hi = allq.min(0), allq.max(0)
            grid = [(x, y) for x in np.arange(math.floor(lo[0]), hi[0] + 1)
                    for y in np.arange(math.floor(lo[1]), hi[1] + 1)
                    if lo[0] < x < hi[0] and lo[1] < y < hi[1]]
            # thin out grid near the boundary (distance to boundary segments)
            if grid:
                G = np.array(grid)
                segs = []
                for L in loops:
                    Q = np.array([pmap[tuple(p)] for p in L])
                    segs.append(np.stack([Q, np.roll(Q, -1, axis=0)], 1))
                segs = np.concatenate(segs)
                A = segs[:, 0][None]; B = segs[:, 1][None]; P = G[:, None]
                AB = B - A; den = (AB ** 2).sum(-1) + 1e-12
                tt = np.clip(((P - A) * AB).sum(-1) / den, 0, 1)
                dist = np.linalg.norm(P - (A + tt[..., None] * AB), axis=-1).min(1)
                grid = [tuple(g) for g, dd in zip(G, dist) if dd > 0.35]
            # more boundary density along the axis direction for long straight sides
            tris, verts = self._cdt(loops, to2, from2, grid)
            sgn = 1.0 if cos_a >= 0 else -1.0
            if reversed_:
                sgn = -sgn
            def nrm(p):
                d = p - c; d = d - (d @ a) * a
                return sgn * d / (np.linalg.norm(d) + 1e-12)
            return self._orient(verts, tris, nrm), True, False
        self.warn.append('unsupported surface %s' % stype)
        return ([], []), False, False

    def _cdt(self, loops, to2, from2, extra):
        verts3 = []; coords = []; faces = []
        for L in loops:
            idx = []
            for p in L:
                q = to2(p)
                idx.append(len(coords)); coords.append((q[0], q[1])); verts3.append(p)
            faces.append(idx)
        for g in extra:
            coords.append(g); verts3.append(None)
        edges = []
        for fc in faces:
            for k in range(len(fc)):
                edges.append((fc[k], fc[(k + 1) % len(fc)]))
        from mathutils import Vector
        res = delaunay_2d_cdt([Vector(c) for c in coords], edges, faces, 2, 1e-7)
        out_v, out_e, out_f, orig_v = res[0], res[1], res[2], res[3]
        vmap = []
        for k, ov in enumerate(out_v):
            src = [o for o in orig_v[k] if o < len(verts3)]
            p3 = None
            for o in src:
                if verts3[o] is not None:
                    p3 = verts3[o]; break
            if p3 is None:
                if from2 is None:
                    # new vertex on a plane: interpolate linearly from nearest 3 boundary pts
                    p3 = self._plane_lift(ov, coords, verts3)
                else:
                    p3 = from2((ov[0], ov[1]))
            vmap.append(np.array(p3))
        tris = [tuple(t) for t in out_f if len(t) == 3]
        for t in out_f:
            if len(t) > 3:
                for k in range(1, len(t) - 1):
                    tris.append((t[0], t[k], t[k + 1]))
        return tris, vmap

    def _plane_lift(self, q, coords, verts3):
        # affine fit of 3D from 2D using boundary points (planar => exact)
        A = []; B = []
        for c2, p3 in zip(coords, verts3):
            if p3 is not None:
                A.append((c2[0], c2[1], 1.0)); B.append(p3)
            if len(A) > 50:
                break
        X, *_ = np.linalg.lstsq(np.array(A), np.array(B), rcond=None)
        return np.array([q[0], q[1], 1.0]) @ X

    def _orient(self, verts, tris, nrm):
        out = []
        for t in tris:
            p0, p1, p2 = verts[t[0]], verts[t[1]], verts[t[2]]
            fn = np.cross(p1 - p0, p2 - p0)
            if np.linalg.norm(fn) < 1e-12:
                continue
            ctr = (p0 + p1 + p2) / 3
            if fn @ nrm(ctr) < 0:
                t = (t[0], t[2], t[1])
            out.append(t)
        return verts, out

    def mesh(self):
        """Return world-space verts (mm) and triangles, with per-tri smooth flag."""
        V = []; T = []; smooth = []; key = {}
        def vid(p):
            w = p @ self.M * self.scale + self.T
            k = tuple(np.round(w, 4))
            if k not in key:
                key[k] = len(V); V.append(w)
            return key[k]
        for fi in self.faces():
            (verts, tris), is_curved, _ = self.tess_face(fi)
            for t in tris:
                a, b, c = vid(verts[t[0]]), vid(verts[t[1]]), vid(verts[t[2]])
                if len({a, b, c}) == 3:
                    T.append((a, b, c)); smooth.append(is_curved)
        return np.array(V), T, smooth
