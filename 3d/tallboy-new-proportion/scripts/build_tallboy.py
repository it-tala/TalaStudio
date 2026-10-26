"""Build the Tala tallboy from the DWG's ACIS solids and set up a render scene.

python dwgsections.py <file.dwg> <sections_dir>
blender -b --python build_tallboy.py -- <sections_dir> <out_dir> [samples] [res_pct]
Env: DENOISE=1 (needs a Blender build with OIDN), ONLY=<camera key>, CLAY=1
"""
import sys, os, math
import bpy, bmesh
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sab import all_sabs
from brep import Body

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
SECTIONS, OUT = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv) > 2 else 256
RES_PCT = int(argv[3]) if len(argv) > 3 else 100
os.makedirs(OUT, exist_ok=True)
TEX_DIR = os.path.join(OUT, 'textures')

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'MILLIMETERS'

# ---------------------------------------------------------------- geometry
data = open(os.path.join(SECTIONS, 'AcDb_AcDsPrototype_1b.bin'), 'rb').read()
sabs = all_sabs(data)
bodies = []
for h, recs, e in sabs:
    b = Body(recs)
    V, T, sm = b.mesh()
    bodies.append((V, T, sm))

allV = np.concatenate([b[0] for b in bodies])
lo, hi = allV.min(0), allV.max(0)
# origin: centre of width/depth, floor at Z=0 ; DWG units are mm
ORIGIN = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]])
MM = 0.001


def classify(i, V):
    ext = V.max(0) - V.min(0)
    return ext


NAMES = {0: 'Post_Front_Left', 2: 'Post_Front_Right', 1: 'Side_Panel_Left',
         3: 'Side_Panel_Right', 4: 'Bottom_Panel', 6: 'Plinth', 16: 'Top'}
drawers = sorted([i for i, b in enumerate(bodies) if len(b[0]) > 5000],
                 key=lambda i: -bodies[i][0][:, 2].max())
handles = sorted([i for i, b in enumerate(bodies)
                  if (b[0].max(0) - b[0].min(0))[2] < 11 and len(b[0]) < 500
                  and (b[0].max(0) - b[0].min(0))[1] < 11],
                 key=lambda i: -bodies[i][0][:, 2].max())
for k, i in enumerate(drawers):
    NAMES[i] = 'Drawer_Front_%d' % (k + 1)
for k, i in enumerate(handles):
    NAMES[i] = 'Handle_%d' % (k + 1)

# grain direction per part: 'Z' vertical, 'X' along width
GRAIN = {n: ('X' if n in ('Top', 'Bottom_Panel', 'Plinth') or n.startswith('Handle') else 'Z')
         for n in NAMES.values()}

collection = bpy.data.collections.new('Tallboy')
scene.collection.children.link(collection)
objs = {}
for i, (V, T, sm) in enumerate(bodies):
    name = NAMES.get(i, 'Part_%02d' % i)
    Vl = (V - ORIGIN) * MM
    ctr = (Vl.min(0) + Vl.max(0)) / 2
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v - ctr) for v in Vl], [], [tuple(t) for t in T])
    me.validate()
    bm = bmesh.new(); bm.from_mesh(me)
    for f, s in zip(bm.faces, sm):
        f.smooth = s
    # merge coplanar triangles into clean n-gons (keeps every edge of the solid)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:],
                             delimit={'NORMAL'})
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.location = Vector(ctr)
    collection.objects.link(ob)
    # smooth curved faces, keep real corners crisp
    mod = ob.modifiers.new('Smooth by Angle', 'EDGE_SPLIT')
    mod.split_angle = math.radians(35)
    objs[name] = ob

    # ---- UVs: box projection in metres, V follows grain direction
    uv = me.uv_layers.new(name='UVMap')
    gx = GRAIN[name]
    seed = (hash(name) % 97) / 97.0  # offset so parts don't share identical grain
    for poly in me.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda k: abs(n[k]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co + ob.location
            x, y, z = co
            # continuous across rounded corners / flutes (no seam when the
            # dominant axis flips between X and Y)
            if gx == 'Z':
                u, v = (x + y, z) if ax != 2 else (x, y)
            else:
                u, v = (z, x + y) if ax != 2 else (y, x)
            uv.data[li].uv = (u + seed, v + seed * 3.1)

# ---------------------------------------------------------------- materials
def silver_oak_material(name, tint=(1, 1, 1)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree; N = nt.nodes; L = nt.links
    N.clear()
    out = N.new('ShaderNodeOutputMaterial'); out.location = (1400, 0)
    bsdf = N.new('ShaderNodeBsdfPrincipled'); bsdf.location = (1100, 0)
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = N.new('ShaderNodeTexCoord'); tc.location = (-1400, 0)
    mp = N.new('ShaderNodeMapping'); mp.location = (-1200, 0)
    mp.label = 'Grain scale / rotation'
    L.new(tc.outputs['UV'], mp.inputs[0])

    diff = os.path.join(TEX_DIR, 'silver_oak_veneer_01_diff_2k.jpg')
    if os.path.exists(diff):
        # Real Poly Haven maps (1 UV unit = 1 m)
        mp.inputs['Scale'].default_value = (1.0, 1.0, 1.0)
        def img(fn, x, y, non_color=False):
            p = os.path.join(TEX_DIR, fn)
            if not os.path.exists(p):
                return None
            t = N.new('ShaderNodeTexImage'); t.location = (x, y)
            t.image = bpy.data.images.load(p)
            if non_color:
                t.image.colorspace_settings.name = 'Non-Color'
            L.new(mp.outputs[0], t.inputs[0])
            return t
        d = img('silver_oak_veneer_01_diff_2k.jpg', -700, 300)
        L.new(d.outputs[0], bsdf.inputs['Base Color'])
        r = img('silver_oak_veneer_01_rough_2k.jpg', -700, 0, True)
        if r:
            L.new(r.outputs[0], bsdf.inputs['Roughness'])
        nm = img('silver_oak_veneer_01_nor_gl_2k.jpg', -700, -300, True)
        if nm:
            nn = N.new('ShaderNodeNormalMap'); nn.location = (-300, -300)
            nn.inputs['Strength'].default_value = 0.6
            L.new(nm.outputs[0], nn.inputs['Color'])
            L.new(nn.outputs[0], bsdf.inputs['Normal'])
        bsdf.inputs['Coat Weight'].default_value = 0.15
        bsdf.inputs['Coat Roughness'].default_value = 0.35
        return mat

    # ---- procedural approximation of a light, silvery oak veneer
    # Grain runs along V (UV y). Stretch noise along the grain.
    mp.inputs['Scale'].default_value = (1.0, 1.0, 1.0)
    sep = N.new('ShaderNodeSeparateXYZ'); sep.location = (-1000, 0)
    L.new(mp.outputs[0], sep.inputs[0])
    comb = N.new('ShaderNodeCombineXYZ'); comb.location = (-850, 0)
    L.new(sep.outputs['X'], comb.inputs['X'])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.location = (-1000, -150)
    mul.inputs[1].default_value = 0.025   # compress along grain
    L.new(sep.outputs['Y'], mul.inputs[0]); L.new(mul.outputs[0], comb.inputs['Y'])

    # large-scale warp of the growth lines
    warp = N.new('ShaderNodeTexNoise'); warp.location = (-650, 250)
    warp.inputs['Scale'].default_value = 3.0
    warp.inputs['Detail'].default_value = 3.0
    L.new(comb.outputs[0], warp.inputs['Vector'])
    # growth rings: straight lines along grain (wave across U)
    # straight-grain streaks: noise strongly stretched along the grain
    wave = N.new('ShaderNodeTexNoise'); wave.location = (-400, 250)
    wave.inputs['Scale'].default_value = 45.0
    wave.inputs['Detail'].default_value = 8.0
    wave.inputs['Roughness'].default_value = 0.62
    addv = N.new('ShaderNodeVectorMath'); addv.operation = 'ADD'; addv.location = (-500, 100)
    scl = N.new('ShaderNodeVectorMath'); scl.operation = 'SCALE'; scl.location = (-500, 350)
    scl.inputs['Scale'].default_value = 0.02
    L.new(warp.outputs['Color'], scl.inputs[0])
    L.new(comb.outputs[0], addv.inputs[0]); L.new(scl.outputs[0], addv.inputs[1])
    L.new(addv.outputs[0], wave.inputs['Vector'])
    ring = N.new('ShaderNodeValToRGB'); ring.location = (-150, 250)
    ring.color_ramp.elements[0].position = 0.42
    ring.color_ramp.elements[1].position = 0.72
    ring.color_ramp.elements[1].color = (0.7, 0.7, 0.7, 1)
    L.new(wave.outputs['Fac'], ring.inputs[0])

    # fine pores / streaks
    pores = N.new('ShaderNodeTexNoise'); pores.location = (-400, -50)
    pores.inputs['Scale'].default_value = 500.0
    pores.inputs['Detail'].default_value = 2.0
    sep2 = N.new('ShaderNodeVectorMath'); sep2.operation = 'MULTIPLY'; sep2.location = (-600, -50)
    sep2.inputs[1].default_value = (1.0, 0.02, 1.0)
    L.new(mp.outputs[0], sep2.inputs[0]); L.new(sep2.outputs[0], pores.inputs['Vector'])
    pr = N.new('ShaderNodeValToRGB'); pr.location = (-150, -50)
    pr.color_ramp.elements[0].position = 0.6
    pr.color_ramp.elements[1].position = 0.75
    L.new(pores.outputs['Fac'], pr.inputs[0])

    # medullary ray flecks (short silvery dashes typical of oak)
    fl = N.new('ShaderNodeTexVoronoi'); fl.location = (-400, -300)
    fl.feature = 'F1'
    fl.inputs['Scale'].default_value = 120.0
    flv = N.new('ShaderNodeVectorMath'); flv.operation = 'MULTIPLY'; flv.location = (-600, -300)
    flv.inputs[1].default_value = (1.0, 0.18, 1.0)
    L.new(mp.outputs[0], flv.inputs[0]); L.new(flv.outputs[0], fl.inputs['Vector'])
    flr = N.new('ShaderNodeValToRGB'); flr.location = (-150, -300)
    flr.color_ramp.elements[0].position = 0.0
    flr.color_ramp.elements[1].position = 0.12
    L.new(fl.outputs['Distance'], flr.inputs[0])

    # colours: silvery greige base, slightly warmer latewood lines
    base = N.new('ShaderNodeRGB'); base.location = (150, 450)
    base.outputs[0].default_value = (0.40 * tint[0], 0.34 * tint[1], 0.27 * tint[2], 1)
    late = N.new('ShaderNodeRGB'); late.location = (150, 300)
    late.outputs[0].default_value = (0.27 * tint[0], 0.215 * tint[1], 0.16 * tint[2], 1)
    silver = N.new('ShaderNodeRGB'); silver.location = (150, -350)
    silver.outputs[0].default_value = (0.50, 0.46, 0.40, 1)
    m1 = N.new('ShaderNodeMix'); m1.data_type = 'RGBA'; m1.location = (400, 300)
    L.new(ring.outputs['Color'], m1.inputs['Factor'])
    L.new(base.outputs[0], m1.inputs[6]); L.new(late.outputs[0], m1.inputs[7])
    m2 = N.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.location = (600, 200)
    m2.blend_type = 'MULTIPLY'
    pm = N.new('ShaderNodeMath'); pm.operation = 'MULTIPLY'; pm.location = (400, 0)
    pm.inputs[1].default_value = 0.12
    L.new(pr.outputs['Color'], pm.inputs[0]); L.new(pm.outputs[0], m2.inputs['Factor'])
    L.new(m1.outputs[2], m2.inputs[6])
    m2.inputs[7].default_value = (0.55, 0.5, 0.45, 1)
    m3 = N.new('ShaderNodeMix'); m3.data_type = 'RGBA'; m3.location = (800, 150)
    fm = N.new('ShaderNodeMath'); fm.operation = 'MULTIPLY'; fm.location = (600, -250)
    fm.inputs[1].default_value = 0.18
    inv = N.new('ShaderNodeInvert'); inv.location = (450, -300)
    L.new(flr.outputs['Color'], inv.inputs['Color'])
    L.new(inv.outputs[0], fm.inputs[0]); L.new(fm.outputs[0], m3.inputs['Factor'])
    L.new(m2.outputs[2], m3.inputs[6]); L.new(silver.outputs[0], m3.inputs[7])
    L.new(m3.outputs[2], bsdf.inputs['Base Color'])

    # satin lacquer finish; pores slightly rougher and recessed
    rgh = N.new('ShaderNodeMapRange'); rgh.location = (800, -150)
    rgh.inputs['To Min'].default_value = 0.42; rgh.inputs['To Max'].default_value = 0.6
    L.new(pr.outputs['Color'], rgh.inputs['Value'])
    L.new(rgh.outputs[0], bsdf.inputs['Roughness'])
    bump = N.new('ShaderNodeBump'); bump.location = (800, -400)
    bump.inputs['Strength'].default_value = 0.04
    bump.inputs['Distance'].default_value = 0.0002
    L.new(pr.outputs['Color'], bump.inputs['Height'])
    L.new(bump.outputs[0], bsdf.inputs['Normal'])
    bsdf.inputs['Coat Weight'].default_value = 0.12
    bsdf.inputs['Coat Roughness'].default_value = 0.3
    return mat


oak = silver_oak_material('Silver_Oak_Veneer_01')
for ob in objs.values():
    ob.data.materials.append(oak)

# ---------------------------------------------------------------- studio
W = (hi - lo) * MM
floor_me = bpy.data.meshes.new('Studio_Cyc')
bm = bmesh.new()
# floor + curved cove + wall (cyclorama)
prof = [(-3.0, 0.0)]
R = 0.6; wall_y = 1.6
for k in range(0, 13):
    a = -math.pi / 2 + k * (math.pi / 2) / 12
    prof.append((wall_y - R + R * math.cos(a) + 0, R + R * math.sin(a)))
prof.append((wall_y, 3.5))
rows = []
for x in (-4.0, 4.0):
    rows.append([bm.verts.new((x, y, z)) for y, z in prof])
for k in range(len(prof) - 1):
    bm.faces.new((rows[0][k], rows[1][k], rows[1][k + 1], rows[0][k + 1]))
bm.to_mesh(floor_me); bm.free()
for p in floor_me.polygons:
    p.use_smooth = True
cyc = bpy.data.objects.new('Studio_Cyc', floor_me)
scene.collection.objects.link(cyc)
cm = bpy.data.materials.new('Studio_Backdrop'); cm.use_nodes = True
cb = cm.node_tree.nodes['Principled BSDF']
cb.inputs['Base Color'].default_value = (0.42, 0.405, 0.385, 1)
cb.inputs['Roughness'].default_value = 0.9
floor_me.materials.append(cm)

# world: bundled studio HDRI at low strength for reflections + neutral fill
world = bpy.data.worlds.new('World'); scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links
bg = wn['Background']
hdr = None
for cand in ('/usr/share/blender/datafiles/studiolights/world/interior.exr',
             '/usr/share/blender/4.0/datafiles/studiolights/world/interior.exr'):
    if os.path.exists(cand):
        hdr = cand; break
if hdr:
    env = wn.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdr)
    wl.new(env.outputs[0], bg.inputs[0])
bg.inputs['Strength'].default_value = 0.15


def area(name, loc, size, energy, color=(1, 1, 1), target=(0, 0, 0.55)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'
    ld.size, ld.size_y = size
    ld.energy = energy; ld.color = color
    lo_ = bpy.data.objects.new(name, ld); scene.collection.objects.link(lo_)
    lo_.location = loc
    d = Vector(target) - Vector(loc)
    lo_.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return lo_


area('Key_Softbox', (-1.6, -1.9, 2.0), (1.4, 1.0), 70, (1.0, 0.97, 0.92))
area('Fill', (2.0, -1.6, 1.0), (1.6, 1.2), 30, (0.95, 0.97, 1.0))
area('Top', (0.0, -0.3, 2.6), (1.2, 1.2), 35)
rim = area('Rim', (1.1, 0.75, 1.7), (0.5, 0.9), 35)
rim.data.spread = math.radians(70)

# ---------------------------------------------------------------- cameras
def camera(name, loc, target, lens):
    cd = bpy.data.cameras.new(name); cd.lens = lens
    cd.sensor_width = 36
    co = bpy.data.objects.new(name, cd); scene.collection.objects.link(co)
    co.location = loc
    co.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return co


H = W[2]
cams = {
    'perspective_34': camera('Cam_3-4', (-1.35, -2.35, 1.0), (0.0, 0.0, H * 0.5), 55),
    'front': camera('Cam_Front', (0.0, -3.4, H * 0.5), (0.0, 0.0, H * 0.5), 50),
    'detail_drawer': camera('Cam_Detail', (-0.42, -0.75, 1.15), (0.04, -0.2, 0.93), 50),
    'side': camera('Cam_Side', (3.1, -0.9, H * 0.55), (0.0, 0.0, H * 0.48), 50),
}

# ---------------------------------------------------------------- render settings
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.02
try:
    scene.cycles.use_denoising = os.environ.get('DENOISE', '0') == '1'
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
scene.view_settings.view_transform = 'AgX' if 'AgX' in [
    i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
try:
    scene.view_settings.look = 'AgX - Medium High Contrast' if scene.view_settings.view_transform == 'AgX' else 'Medium High Contrast'
except TypeError:
    pass
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_percentage = RES_PCT

if os.environ.get('CLAY') == '1':
    clay = bpy.data.materials.new('Clay'); clay.use_nodes = True
    clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.6, 0.6, 0.6, 1)
    scene.view_layers[0].material_override = clay

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'tallboy_new_proportion.blend'), compress=True)

for key, cam in cams.items():
    scene.camera = cam
    if key == 'side':
        scene.render.resolution_x, scene.render.resolution_y = 1600, 2000
    elif key == 'detail_drawer':
        scene.render.resolution_x, scene.render.resolution_y = 1800, 1350
    else:
        scene.render.resolution_x, scene.render.resolution_y = 1600, 2000
    scene.render.filepath = os.path.join(OUT, 'renders', 'render_%s.png' % key)
    if os.environ.get('ONLY') and os.environ['ONLY'] != key:
        continue
    bpy.ops.render.render(write_still=True)
    print('RENDERED', key)
