
export type CategoryId = 'homme' | 'femme' | 'maison' | 'produits';

export type ServiceId = 'lavage' | 'repassage' | 'lavage_repassage' | 'dry_clean' | 'express' | 'vente';

export type OrderStatus = 'reçu' | 'lavage' | 'repassage' | 'prêt' | 'livré' | 'fournisseur' | 'retard';

export type UserRole = 'admin' | 'cashier';

export type MachineStatus = 'disponible' | 'en_cours' | 'maintenance' | 'panne' | 'terminé';

export type TransactionType = 'withdrawal' | 'salary_payment' | 'expense';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  pin?: string;
  salary: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
}

export interface Article {
  id: string;
  name: string;
  categoryId: CategoryId;
  image: string;
  basePrice: number;
  stock?: number;
  supplierCost?: number;
  servicePrices?: Record<string, number>;
}

export interface Machine {
  id: string;
  name: string;
  type: 'washer' | 'dryer';
  status: MachineStatus;
  timeRemaining?: number;
  program?: 'Eco' | 'Standard' | 'Intensif';
  capacity?: string;
}

export interface CartItem {
  id: string;
  articleId: string;
  articleName: string;
  categoryId: CategoryId;
  image: string;
  quantity: number;
  serviceId: ServiceId;
  price: number;
  isSupplierItem: boolean;
  width?: number;
  height?: number;
  supplierId?: string;
  supplierStatus?: 'En stock' | 'Chez fournisseur' | 'Prêt' | 'Retard';
  sentAt?: string;
  receivedAt?: string;
  barcode: string;
  status: OrderStatus;
  assignedTo?: string;
}

export interface Supplier {
  id: string;
  name: string;
  logo: string;
  contact?: string;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  amount: number;
  status: 'A payer' | 'Payé';
  createdAt: string;
  itemsCount: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Order {
  id: string;
  ticketId: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  discount?: number;
  discountRate?: number;
  paid: number;
  status: OrderStatus;
  createdAt: string;
  pickupDate: string;
  paymentMode: 'place' | 'avance' | 'credit';
  customerPhone?: string;
  clientId?: string;
  clientName?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: string;
  type: 'ORDER' | 'PAYMENT' | 'INVENTORY' | 'USER' | 'SUPPLIER' | 'SYSTEM' | 'CLIENT';
  orderId?: string; // Link to order for ticket viewing
}

export interface AppState {
  currentUser: User | null;
  currentView: 'POS' | 'TRACKING' | 'SUPPLIERS' | 'DASHBOARD' | 'STOCK' | 'MACHINES' | 'STAFF' | 'ARTICLE_MANAGER' | 'CLIENTS' | 'HISTORY';
  posStep: 'CATEGORY' | 'ARTICLES' | 'PAYMENT' | 'TICKET';
  selectedCategory: CategoryId | null;
  cart: CartItem[];
  orders: Order[];
  machines: Machine[];
  inventory: Article[];
  invoices: SupplierInvoice[];
  suppliers: Supplier[];
  users: User[];
  transactions: Transaction[];
  clients: Client[];
  auditLogs: AuditLog[];
}
