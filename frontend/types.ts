
export type CategoryId = 'homme' | 'femme' | 'maison' | 'produits';

export type ServiceId = 'lavage' | 'repassage' | 'lavage_repassage' | 'dry_clean' | 'express' | 'vente';

export type OrderStatus = 'reçu' | 'lavage' | 'repassage' | 'prêt' | 'livré' | 'fournisseur' | 'retard' | 'no_service' | 'lost';

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
  phone?: string;
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
  name_ar?: string;
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
  name_ar?: string;
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
  articleName_ar?: string;
  categoryId: CategoryId;
  image: string;
  quantity: number;
  serviceId: ServiceId;
  price: number;
  isSupplierItem: boolean;
  width?: number;
  height?: number;
  supplierId?: string;
  supplierPrice?: number;
  supplierStatus?: 'En stock' | 'Chez fournisseur' | 'Prêt' | 'Retard';
  sentAt?: string;
  receivedAt?: string;
  barcode: string;
  status: OrderStatus;
  assignedTo?: string;
  processedBy?: string;
  placement?: string;
  statusUpdatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  name_ar?: string;
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
  address?: string;
  notificationsEnabled?: boolean;
  discountRate?: number;
  note?: string;
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
  isDelivery?: boolean;
  deliveryAddress?: string;
  clientAddress?: string;
  note?: string;
  createdBy?: string;
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

// From DB: category list for POS
export interface CategoryRef {
  id: string;
  name: string;
  name_ar?: string;
  image?: string;
  color?: string;
}

// From DB: service list for POS
export interface ServiceRef {
  id: string;
  name: string;
  name_ar?: string;
  multiplier?: number;
  image?: string;
  color?: string;
}

export interface StockItem {
  id: string;
  name: string;
  name_ar?: string;
  quantity: number;
  unitPrice: number;
  minQuantity: number;
  supplierId?: string;
  supplierName?: string;
  createdAt: string;
}

export interface ExpenseArticle {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export type NotificationType =
  | 'client_reminder'
  | 'supplier_reminder'
  | 'article_reminder'
  | 'salary_reminder'
  | 'withdrawal_reminder'
  | 'expense_notification';

export interface Notification {
  id: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface OldStockItem {
  id: string;
  clientId: string;
  clientName: string;
  placement: string;
  articleId: string | null;
  articleName: string;
  serviceId: string | null;
  barcode: string;
   status: OrderStatus;
  createdAt: string;
}

export interface AppState {
  currentUser: User | null;
  currentView: 'POS' | 'TRACKING' | 'SUPPLIERS' | 'DASHBOARD' | 'STOCK' | 'MACHINES' | 'STAFF' | 'ARTICLE_MANAGER' | 'CLIENTS' | 'HISTORY' | 'PRODUCTS';
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
  categories: CategoryRef[];
  services: ServiceRef[];
  stockItems: StockItem[];
  expenseArticles: ExpenseArticle[];
  oldStockItems: OldStockItem[];
  notifications: Notification[];
}
