
import React from 'react';
import {
  Waves,
  Flame,
  Zap,
  Droplets
} from 'lucide-react';
import { Article, CategoryId, ServiceId, Supplier, User, Machine } from './types';

// Fix: Added missing 'salary' property to match the User interface
export const USERS: User[] = [
  { id: 'u1', name: 'Karim', role: 'admin', avatar: '🔐', pin: '1234', salary: 0 },
  { id: 'u2', name: 'Nadir', role: 'cashier', avatar: '🧑‍💼', pin: '2222', salary: 3000 },
  { id: 'u3', name: 'Fatima', role: 'cashier', avatar: '👩‍💼', pin: '3333', salary: 3000 },
];

export const CATEGORIES = [
  {
    id: 'homme' as CategoryId,
    label: 'Homme',
    image: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=1470&auto=format&fit=crop',
    color: 'bg-blue-500'
  },
  {
    id: 'femme' as CategoryId,
    label: 'Femme',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1470&auto=format&fit=crop',
    color: 'bg-pink-500'
  },
  {
    id: 'maison' as CategoryId,
    label: 'Maison',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop',
    color: 'bg-green-500'
  },
];

export const ARTICLES: Article[] = [
  // Homme
  { id: 'jacket', name: 'Jacket', categoryId: 'homme', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500&auto=format&fit=crop', basePrice: 40 },
  { id: 'hoodie', name: 'Hoodie', categoryId: 'homme', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=500&auto=format&fit=crop', basePrice: 25 },
  { id: 'pantalon', name: 'Pantalon', categoryId: 'homme', image: 'https://images.unsplash.com/photo-1624371414361-e6e0ea58d38c?q=80&w=500&auto=format&fit=crop', basePrice: 15 },
  { id: 'chemise', name: 'Chemise', categoryId: 'homme', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=500&auto=format&fit=crop', basePrice: 10 },
  { id: 'costume', name: 'Costume', categoryId: 'homme', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=500&auto=format&fit=crop', basePrice: 60 },

  // Femme
  { id: 'jacket_f', name: 'Jacket', categoryId: 'femme', image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=500&auto=format&fit=crop', basePrice: 40 },
  { id: 'robe', name: 'Robe', categoryId: 'femme', image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680ac95?q=80&w=500&auto=format&fit=crop', basePrice: 35 },
  { id: 'pantalon_f', name: 'Pantalon', categoryId: 'femme', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=500&auto=format&fit=crop', basePrice: 15 },
  { id: 'manteau', name: 'Manteau', categoryId: 'femme', image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=500&auto=format&fit=crop', basePrice: 50 },
  { id: 'chemise_f', name: 'Chemise', categoryId: 'femme', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=500&auto=format&fit=crop', basePrice: 10 },

  // Maison
  { id: 'tapis', name: 'Tapis', categoryId: 'maison', image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?q=80&w=500&auto=format&fit=crop', basePrice: 100 },
  { id: 'couette', name: 'Couette', categoryId: 'maison', image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=500&auto=format&fit=crop', basePrice: 80 },
  { id: 'couverture', name: 'Couverture', categoryId: 'maison', image: 'https://images.unsplash.com/photo-1543333995-a78aea2efe52?q=80&w=500&auto=format&fit=crop', basePrice: 50 },
  { id: 'rideaux', name: 'Rideaux', categoryId: 'maison', image: 'https://images.unsplash.com/photo-1514894636961-f24250368132?q=80&w=500&auto=format&fit=crop', basePrice: 30 },
  { id: 'draps', name: 'Draps', categoryId: 'maison', image: 'https://images.unsplash.com/photo-1616627544454-0268ecb47604?q=80&w=500&auto=format&fit=crop', basePrice: 20 },

  // Cleaning Supplies
  { id: 'detergent', name: 'Lessive Industrielle 5L', categoryId: 'produits', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=500&auto=format&fit=crop', basePrice: 0, stock: 24 },
  { id: 'softener', name: 'Assouplissant Pro', categoryId: 'produits', image: 'https://images.unsplash.com/photo-1626784215021-2e39ccf971cd?q=80&w=500&auto=format&fit=crop', basePrice: 0, stock: 15 },
  { id: 'bleach', name: 'Eau de Javel Pro', categoryId: 'produits', image: 'https://images.unsplash.com/photo-1584622781564-1d9876a3e740?q=80&w=500&auto=format&fit=crop', basePrice: 0, stock: 10 },
  { id: 'perfume', name: 'Parfum Finition', categoryId: 'produits', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=500&auto=format&fit=crop', basePrice: 0, stock: 8 },
];

export const MACHINES: Machine[] = [
  { id: 'm1', name: 'Lave-Linge 1', type: 'washer', status: 'disponible', capacity: '7kg' },
  { id: 'm2', name: 'Lave-Linge 2', type: 'washer', status: 'en_cours', timeRemaining: 15, capacity: '12kg', program: 'Standard' },
  { id: 'm3', name: 'Lave-Linge 3', type: 'washer', status: 'maintenance', capacity: '7kg' },
  { id: 'm4', name: 'Sèche-Linge 1', type: 'dryer', status: 'disponible', capacity: '15kg' },
  { id: 'm5', name: 'Sèche-Linge 2', type: 'dryer', status: 'panne', capacity: '15kg' },
  { id: 'm6', name: 'Lave-Linge 4', type: 'washer', status: 'terminé', capacity: '12kg', program: 'Intensif' },
];

export const SERVICES = [
  {
    id: 'lavage' as ServiceId,
    label: 'Lavage',
    icon: <Waves size={32} />,
    image: 'https://images.unsplash.com/photo-1545173153-5dd9215c678f?q=80&w=500&auto=format&fit=crop',
    multiplier: 1,
    color: 'text-blue-500'
  },
  {
    id: 'repassage' as ServiceId,
    label: 'Repassage',
    icon: <Flame size={32} />,
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=500&auto=format&fit=crop',
    multiplier: 0.8,
    color: 'text-orange-500'
  },
  {
    id: 'lavage_repassage' as ServiceId,
    label: 'Mix',
    icon: <div className="flex"><Waves size={20} /><Flame size={20} /></div>,
    image: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd15?q=80&w=500&auto=format&fit=crop',
    multiplier: 1.5,
    color: 'text-purple-500'
  },
  {
    id: 'dry_clean' as ServiceId,
    label: 'Dry Clean',
    icon: <Droplets size={32} />,
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=500&auto=format&fit=crop',
    multiplier: 2.0,
    color: 'text-cyan-500'
  },
  {
    id: 'express' as ServiceId,
    label: 'Express',
    icon: <Zap size={32} />,
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=500&auto=format&fit=crop',
    multiplier: 1.3,
    color: 'text-yellow-500'
  },
];

export const SUPPLIERS: Supplier[] = [
  { id: 'sup1', name: 'Tapis Master', logo: 'https://picsum.photos/seed/sup1/100/100' },
  { id: 'sup2', name: 'Clean Expert', logo: 'https://picsum.photos/seed/sup2/100/100' },
];

export const STATUS_COLORS: Record<string, string> = {
  reçu: 'bg-gray-100 text-gray-600',
  lavage: 'bg-blue-100 text-blue-700',
  repassage: 'bg-orange-100 text-orange-700',
  prêt: 'bg-green-100 text-green-700',
  livré: 'bg-purple-100 text-purple-700',
  fournisseur: 'bg-pink-100 text-pink-700',
  retard: 'bg-red-100 text-red-700',
};

export const MACHINE_STATUS_COLORS: Record<string, string> = {
  disponible: 'bg-green-500',
  en_cours: 'bg-blue-500',
  maintenance: 'bg-orange-500',
  panne: 'bg-red-500',
  terminé: 'bg-purple-500',
};
