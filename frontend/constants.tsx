
import React from 'react';
import { Waves, Flame, Zap, Droplets } from 'lucide-react';
import { ServiceId } from './types';

// UI-only: status badge colors (not from DB)
export const STATUS_COLORS: Record<string, string> = {
  reçu: 'bg-gray-100 text-gray-600',
  lavage: 'bg-blue-100 text-blue-700',
  repassage: 'bg-orange-100 text-orange-700',
  prêt: 'bg-green-100 text-green-700',
  livré: 'bg-purple-100 text-purple-700',
  fournisseur: 'bg-pink-100 text-pink-700',
  retard: 'bg-red-100 text-red-700',
};

// UI-only: machine status colors (not from DB)
export const MACHINE_STATUS_COLORS: Record<string, string> = {
  disponible: 'bg-green-500',
  en_cours: 'bg-blue-500',
  maintenance: 'bg-orange-500',
  panne: 'bg-red-500',
  terminé: 'bg-purple-500',
};

// UI-only: service id -> icon component (for display when service comes from DB)
export const SERVICE_ICONS: Record<string, React.ReactNode> = {
  lavage: <Waves size={32} />,
  repassage: <Flame size={32} />,
  lavage_repassage: <div className="flex"><Waves size={20} /><Flame size={20} /></div>,
  dry_clean: <Droplets size={32} />,
  express: <Zap size={32} />,
  vente: <Zap size={32} />,
};
