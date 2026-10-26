import struct, re

def parse_sab(d, i):
    """Parse SAB starting at 'ASM BinaryFile4'. Returns (header, records, end)."""
    i += 15
    ver, nrec, nbody, flags = struct.unpack_from('<4i', d, i); i += 16
    toks = []
    def tok():
        nonlocal i
        t = d[i]; i += 1
        if t == 0x02: v = d[i]; i += 1; return ('c', v)
        if t == 0x03: v, = struct.unpack_from('<h', d, i); i += 2; return ('s', v)
        if t == 0x04: v, = struct.unpack_from('<i', d, i); i += 4; return ('i', v)
        if t == 0x05: v, = struct.unpack_from('<f', d, i); i += 4; return ('f', v)
        if t == 0x06: v, = struct.unpack_from('<d', d, i); i += 8; return ('d', v)
        if t == 0x07: n = d[i]; i += 1; v = d[i:i+n].decode('latin1'); i += n; return ('str', v)
        if t == 0x08: n, = struct.unpack_from('<H', d, i); i += 2; v = d[i:i+n].decode('latin1'); i += n; return ('str', v)
        if t == 0x09: n, = struct.unpack_from('<I', d, i); i += 4; v = d[i:i+n].decode('latin1'); i += n; return ('str', v)
        if t == 0x0A: return ('b', True)
        if t == 0x0B: return ('b', False)
        if t == 0x0C: v, = struct.unpack_from('<i', d, i); i += 4; return ('p', v)
        if t == 0x0D: n = d[i]; i += 1; v = d[i:i+n].decode('latin1'); i += n; return ('id', v)
        if t == 0x0E: n = d[i]; i += 1; v = d[i:i+n].decode('latin1'); i += n; return ('sid', v)
        if t == 0x0F: return ('{', None)
        if t == 0x10: return ('}', None)
        if t == 0x11: return ('#', None)
        if t == 0x12: n, = struct.unpack_from('<I', d, i); i += 4; v = d[i:i+n]; i += n; return ('lit', v)
        if t == 0x13: v = struct.unpack_from('<3d', d, i); i += 24; return ('pos', v)
        if t == 0x14: v = struct.unpack_from('<3d', d, i); i += 24; return ('vec', v)
        if t == 0x15: v, = struct.unpack_from('<i', d, i); i += 4; return ('e', v)
        if t == 0x16: v = struct.unpack_from('<2d', d, i); i += 16; return ('v2', v)
        raise ValueError('unknown tag %02x at %d' % (t, i-1))
    header = [tok() for _ in range(6)]  # product, acis ver, date, scale, resabs, resnor
    records = []
    while True:
        # record name
        parts = []
        t = tok()
        while t[0] == 'sid':
            parts.append(t[1]); t = tok()
        assert t[0] == 'id', (t, i)
        parts.append(t[1])
        name = '-'.join(parts)
        if name.startswith('End-of-ASM'):
            break
        fields = []
        while True:
            t = tok()
            if t[0] == '#': break
            fields.append(t)
        records.append((name, fields))
    return header, records, i

def all_sabs(d):
    return [parse_sab(d, m.start()) for m in re.finditer(b'ASM BinaryFile4', d)]
