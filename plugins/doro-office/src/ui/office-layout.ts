export type OfficeSeat = {
  id: string;
  x: string;
  y: string;
  label: string;
};

export const OFFICE_SEATS: OfficeSeat[] = [
  { id: 'desk-1', x: '12%', y: '24%', label: 'Support desk' },
  { id: 'desk-2', x: '42%', y: '24%', label: 'Engineering desk' },
  { id: 'desk-3', x: '72%', y: '24%', label: 'Ops desk' },
  { id: 'desk-4', x: '18%', y: '58%', label: 'Planning desk' },
  { id: 'desk-5', x: '48%', y: '58%', label: 'QA desk' },
  { id: 'desk-6', x: '78%', y: '58%', label: 'Research desk' },
  { id: 'desk-7', x: '48%', y: '82%', label: 'Town hall stage' },
];
