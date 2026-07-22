import { BookOpen, Music, PenTool, Clapperboard } from 'lucide-react';

export const SDGs = [
  { id: 1, n: 'No Poverty', c: '#E5243B' },
  { id: 2, n: 'Zero Hunger', c: '#DDA63A' },
  { id: 3, n: 'Good Health', c: '#4C9F38' },
  { id: 4, n: 'Quality Education', c: '#C5192D' },
  { id: 5, n: 'Gender Equality', c: '#FF3A21' },
  { id: 6, n: 'Clean Water', c: '#26BDE2' },
  { id: 7, n: 'Affordable Energy', c: '#FCC30B' },
  { id: 8, n: 'Decent Work', c: '#A21942' },
  { id: 9, n: 'Innovation', c: '#FD6925' },
  { id: 10, n: 'Reduced Inequalities', c: '#DD1367' },
  { id: 11, n: 'Sustainable Cities', c: '#FD9D24' },
  { id: 12, n: 'Responsible Consumption', c: '#BF8B2E' },
  { id: 13, n: 'Climate Action', c: '#3F7E44' },
  { id: 14, n: 'Life Below Water', c: '#0A97D9' },
  { id: 15, n: 'Life on Land', c: '#56C02B' },
  { id: 16, n: 'Peace & Justice', c: '#00689D' },
  { id: 17, n: 'Partnerships', c: '#19486A' },
];

export const DIGITAL_CATS = [
  { id: 'EBOOK', label: 'eBooks', icon: BookOpen, color: '#9B72CF', bg: '#1A1030' },
  { id: 'MUSIC', label: 'Music', icon: Music, color: '#2EB8E6', bg: '#041525' },
  { id: 'GRAPHIC', label: 'Graphics', icon: PenTool, color: '#E07B54', bg: '#1F0E08' },
  { id: 'ANIMATION', label: 'Animation', icon: Clapperboard, color: '#52C47C', bg: '#061510' },
];

export function getSdg(id) {
  return SDGs.find(s => s.id === id);
}
