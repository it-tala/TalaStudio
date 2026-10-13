// SAMPLE DATA for the public buyer dashboard demo only. Not real orders or customers.
// The live dashboard (due by February 2027) reads from Supabase instead.
export const demo = {
  company: 'Sample Retail Co.',
  order: 'DEMO-0001',
  status: 'In production',
  stages: ['Confirmed', 'In production', 'Inspection', 'Loaded', 'Shipped'],
  current: 1,
  items: [
    { name: 'Sample bed, king', qty: 40, state: 'In production' },
    { name: 'Sample nightstand', qty: 80, state: 'In production' },
    { name: 'Sample dining table', qty: 30, state: 'Confirmed' },
  ],
  qc: [
    { date: '2027-01-12', item: 'Sample bed, king', result: 'Passed' },
    { date: '2027-01-14', item: 'Sample nightstand', result: 'Passed' },
  ],
  shipment: { container: 'SAMPLE1234567', etd: '2027-02-10', eta: '2027-03-20' },
};
