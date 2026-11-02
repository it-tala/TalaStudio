// Item code numbers and sizes, from the "SPEC SHEET DATA" tab of TS LINE SHEET 25 OCT 26 (Google Sheets), copied again 2 Nov 2026.
// Shown under each item card in place of the view count. The sheet spells Calabasas "Calabasus" and Palisades "Palasides".
// Each row: [code, room, item name, finish, W, D, H in mm]; a blank finish or size is not in the sheet yet.
// Beechwood's dining pieces are filed under living in the sheet.
type Row = [code: string, room: string, name: string, finish: string, w?: number, d?: number, h?: number];
const codes: Record<string, Row[]> = {
  Calabasas: [
    ['CA-101', 'bedroom', 'Bed', 'Honey Oak', 1965, 2080, 1030],
    ['CA-102', 'bedroom', 'Night Table', 'Honey Oak', 500, 450, 450],
    ['CA-103', 'bedroom', '6 Drawer Dresser', 'Honey Oak', 1190, 560, 700],
    ['CA-104', 'bedroom', 'Tall Boy', 'Honey Oak', 600, 500, 1100],
    ['CA-105', 'bedroom', 'Mirror', 'Honey Oak', 1000, 50, 550],
    ['CA-201', 'living', 'Sofa', 'Natural Oak', 2000, 800, 760],
    ['CA-202', 'living', 'Armchair', 'Natural Oak', 900, 800, 685],
    ['CA-203', 'living', 'Armoire', ''],
    ['CA-204', 'living', 'Coffee Table', '', 1300, 600, 450],
    ['CA-205', 'living', 'TV Console', '', 1400, 460, 600],
    ['CA-206', 'living', 'Open Cabinet', '', 1215, 460, 1700],
  ],
  Doheny: [
    ['DH-101', 'bedroom', 'Bed', '', 1600, 2130, 1050],
    ['DH-102', 'bedroom', 'Night Table', '', 450, 450, 450],
    ['DH-103', 'bedroom', '6 Drawer Dresser', '', 1400, 570, 700],
    ['DH-104', 'bedroom', 'Tall Boy', '', 950, 450, 1200],
    ['DH-105', 'bedroom', 'Mirror', '', 1200, 550, 25],
    ['DH-201', 'living', 'Sofa', '', 1820, 800, 900],
    ['DH-202', 'living', 'Arm Chair', '', 900, 800, 900],
    ['DH-203', 'living', 'Side Table', '', 500, 500, 500],
    ['DH-204', 'living', 'Coffee Table', '', 1250, 600, 400],
    ['DH-205', 'living', 'Lamp Table', '', 1400, 450, 750],
  ],
  Palisades: [
    ['PA-101', 'bedroom', 'Bed', '', 1710, 2130, 1120],
    ['PA-102', 'bedroom', 'Night Table', '', 450, 450, 455],
    ['PA-103', 'bedroom', '6 Drawer Dresser', '', 1485, 470, 810],
    ['PA-104', 'bedroom', 'Tall Boy', '', 495, 450, 1060],
    ['PA-105', 'bedroom', 'Mirror', '', 1000, 25, 550],
  ],
  Beechwood: [
    ['BW-101', 'bedroom', 'Bed', '', 1740, 2090, 1025],
    ['BW-102', 'bedroom', 'Night Table', '', 550, 500, 500],
    ['BW-103', 'bedroom', '6 Drawer Dresser', '', 1185, 600, 700],
    ['BW-104', 'bedroom', 'Tall Boy', '', 600, 500, 1100],
    ['BW-105', 'bedroom', 'Mirror', '', 900, 80, 550],
    ['BW-201', 'living', 'Dining Table', '', 2100, 800, 750],
    ['BW-202', 'living', 'Buffet', '', 1800, 600, 900],
    ['BW-203', 'living', 'Mirror', '', 1200, 50, 600],
    ['BW-204', 'living', 'Dining Chair', '', 550, 620, 860],
    ['BW-205', 'living', 'Barstool', ''],
  ],
  Zuma: [
    ['ZA-101', 'bedroom', 'Bed', 'Rustic Honey Oak', 1700, 2115, 1020],
    ['ZA-102', 'bedroom', 'Night Table', 'Rustic Honey Oak', 650, 450, 525],
    ['ZA-103', 'bedroom', '6 Drawer Dresser', 'Rustic Honey Oak', 1505, 550, 755],
    ['ZA-104', 'bedroom', 'Tall Boy', 'Rustic Honey Oak', 800, 500, 1200],
    ['ZA-105', 'bedroom', 'Mirror', 'Antique mirror glass', 1000, 35, 600],
    ['ZA-201', 'living', 'Sofa', 'Rustic Honey Oak', 2000, 850, 840],
    ['ZA-202', 'living', 'Arm Chair', 'Rustic Honey Oak', 850, 850, 840],
    ['ZA-203', 'living', 'Side Table', 'Rustic Honey Oak', 550, 550, 505],
    ['ZA-204', 'living', 'Coffee Table', 'Rustic Honey Oak', 1400, 650, 380],
    ['ZA-206', 'living', 'TV Unit', 'Rustic Honey Oak', 1250, 400, 400],
    ['ZA-112', 'living', 'Console Table', 'Rustic Honey Oak', 1250, 400, 800],
    ['ZA-113', 'dining', 'Dining Table', 'Rustic Honey Oak', 2100, 1000, 750],
    ['ZA-114', 'dining', 'Buffet', 'Rustic Honey Oak', 1460, 500, 750],
    ['ZA-115', 'dining', 'Mirror', ''],
    ['ZA-116', 'dining', 'Dining Chair', 'Rustic Honey Oak', 525, 580, 870],
  ],
};

// "6-Drawer Dresser" = "6 Drawer Dresser", "Tallboy" = "Tall Boy", "Armchair" = "Arm Chair"
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// The sheet row of an item; when a name is in two rooms (a mirror), the collection's own room wins.
export function itemSpec(collection: string, room: string, item: string): { code: string; finish: string | null; size: string | null } | null {
  const found = (codes[collection] ?? []).filter(([, , n]) => key(n) === key(item));
  const hit = found.find(([, r]) => r === room) ?? found[0];
  if (!hit) return null;
  const [code, , , finish, w, d, h] = hit;
  return { code, finish: finish || null, size: w && d && h ? `W ${w} × D ${d} × H ${h} mm` : null };
}

export const itemCode = (collection: string, room: string, item: string) => itemSpec(collection, room, item)?.code ?? null;
