import struct, sys

def decrypt_header(b):
    out = bytearray(); seed = 1
    for x in b:
        seed = (seed * 0x343fd + 0x269ec3) & 0xffffffff
        out.append(x ^ ((seed >> 16) & 0xff))
    return bytes(out)

class R:
    def __init__(s, b, p=0): s.b=b; s.p=p
    def rc(s):
        v=s.b[s.p]; s.p+=1; return v

def lit_len(r):
    b = r.rc()
    if 1 <= b <= 0x0F: return b+3, 0
    if b == 0:
        t = 0x0F
        while True:
            b = r.rc()
            if b: break
            t += 0xFF
        return t+b+3, 0
    return 0, b

def long_off(r):
    t=0; b=r.rc()
    if b==0:
        t=0xFF
        while True:
            b=r.rc()
            if b: break
            t+=0xFF
    return t+b

def two_off(r):
    a=r.rc(); c=r.rc()
    return (a>>2)|(c<<6), a&3

def decompress(src, size):
    r=R(src); dst=bytearray()
    n, op = lit_len(r)
    dst += src[r.p:r.p+n]; r.p+=n
    while r.p < len(src):
        if op == 0: op = r.rc()
        if op >= 0x40:
            cb = ((op & 0xF0)>>4)-1; o2=r.rc(); co=(o2<<2)|((op&0x0C)>>2)
            if op & 3: ll=op&3; op=0
            else: ll, op = lit_len(r)
        elif 0x21 <= op <= 0x3F:
            cb = op-0x1E; co, ll = two_off(r)
            if ll: op=0
            else: ll, op = lit_len(r)
        elif op == 0x20:
            cb = long_off(r)+0x21; co, ll = two_off(r)
            if ll: op=0
            else: ll, op = lit_len(r)
        elif 0x12 <= op <= 0x1F:
            cb = (op&0x0F)+2; co, ll = two_off(r); co += 0x3FFF
            if ll: op=0
            else: ll, op = lit_len(r)
        elif op == 0x10:
            cb = long_off(r)+9; co, ll = two_off(r); co += 0x3FFF
            if ll: op=0
            else: ll, op = lit_len(r)
        elif op == 0x11:
            break
        else:
            raise ValueError('bad opcode %x at %d' % (op, r.p))
        s = len(dst)-co-1
        for i in range(cb): dst.append(dst[s+i])
        dst += src[r.p:r.p+ll]; r.p += ll
    return bytes(dst)

def sections(path):
    d = open(path,'rb').read()
    h = decrypt_header(d[0x80:0x80+0x6c])
    assert h[:11]==b'AcFssFcAJMB', h[:12]
    page_map_id, = struct.unpack_from('<I', h, 0x50)
    page_map_addr, = struct.unpack_from('<Q', h, 0x54)
    section_map_id, = struct.unpack_from('<I', h, 0x5C)
    a = page_map_addr + 0x100
    typ, dsz, csz, ctype, chk = struct.unpack_from('<5I', d, a)
    pm = decompress(d[a+20:a+20+csz], dsz)
    pages = {}; addr = 0x100; i = 0
    while i < len(pm):
        num, size = struct.unpack_from('<iI', pm, i); i += 8
        if num < 0: i += 16
        else: pages[num] = addr
        addr += size
    a = pages[section_map_id]
    typ, dsz, csz, ctype, chk = struct.unpack_from('<5I', d, a)
    sm = decompress(d[a+20:a+20+csz], dsz)
    ndesc, = struct.unpack_from('<I', sm, 0); i = 20
    out = {}
    for _ in range(ndesc):
        size, pcount, maxsz, unk, comp, sid, enc = struct.unpack_from('<QIIIIII', sm, i); i += 32
        name = sm[i:i+64].split(b'\0')[0].decode(); i += 64
        buf = bytearray(size)
        for _ in range(pcount):
            pnum, dsize, off = struct.unpack_from('<IIQ', sm, i); i += 16
            pa = pages[pnum]
            hdr = struct.unpack_from('<8I', d, pa)
            mask = 0x4164536b ^ pa
            hdr = [x ^ mask for x in hdr]
            ptype, snum, cdsize, psize, soff = hdr[:5]
            raw = d[pa+32:pa+32+cdsize]
            data = decompress(raw, psize) if comp == 2 else raw
            buf[off:off+len(data)] = data[:max(0, min(len(data), size-off))]
        out[name] = bytes(buf)
    return out

if __name__ == '__main__':
    secs = sections(sys.argv[1])
    for k, v in secs.items(): print(repr(k), len(v))
    import os
    os.makedirs(sys.argv[2], exist_ok=True)
    for k, v in secs.items():
        open(os.path.join(sys.argv[2], (k or 'empty').replace(':','_')+'.bin'),'wb').write(v)
