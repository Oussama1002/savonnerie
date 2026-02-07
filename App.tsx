
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ClipboardList,
  Truck,
  BarChart3,
  Scan,
  ArrowLeft,
  ChevronRight,
  Send,
  LogOut,
  Lock,
  Delete,
  Cpu,
  Package,
  Settings,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  FileText,
  CreditCard,
  Search,
  Filter,
  Check,
  Phone,
  Waves as WaveIcon,
  Flame as HeatIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCw,
  Zap,
  Leaf,
  Thermometer,
  ShieldCheck,
  Users as UsersIcon,
  Wallet,
  Banknote,
  TrendingDown,
  UserPlus,
  UserCheck,
  Edit,
  Tag,
  ImageIcon,
  Save,
  Layers,
  TrendingUp,
  Target,
  Activity,
  PieChart,
  Maximize2,
  X,
  Store,
  Building2,
  Percent,
  Barcode,
  ChevronDown
} from 'lucide-react';
import {
  CategoryId,
  ServiceId,
  CartItem,
  AppState,
  Order,
  OrderStatus,
  User,
  Machine,
  MachineStatus,
  Supplier,
  SupplierInvoice,
  Transaction,
  TransactionType,
  Article,
  Client,
  AuditLog
} from './types';
import {
  CATEGORIES,
  ARTICLES,
  SERVICES,
  SUPPLIERS,
  USERS as INITIAL_USERS,
  MACHINES,
  MACHINE_STATUS_COLORS,
  STATUS_COLORS
} from './constants';
import ArticleCard from './components/ArticleCard';
import ServiceSelector from './components/ServiceSelector';
import TicketView from './components/TicketView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentView: 'POS',
    posStep: 'CATEGORY',
    selectedCategory: null,
    cart: [],
    orders: JSON.parse(localStorage.getItem('savonnerie_orders') || '[]'),
    machines: MACHINES,
    inventory: JSON.parse(localStorage.getItem('savonnerie_inventory') || JSON.stringify(ARTICLES)),
    invoices: JSON.parse(localStorage.getItem('savonnerie_invoices') || '[]'),
    suppliers: JSON.parse(localStorage.getItem('savonnerie_suppliers') || JSON.stringify(SUPPLIERS)),
    users: (() => {
      const stored = JSON.parse(localStorage.getItem('savonnerie_users') || '[]');
      // Force update core users from constants but keep others
      const combined = INITIAL_USERS.map(iu => {
        const s = stored.find((su: any) => su.id === iu.id);
        return s ? { ...s, name: iu.name, pin: iu.pin, avatar: iu.avatar, role: iu.role } : iu;
      });
      const extra = stored.filter((su: any) => !INITIAL_USERS.find(iu => iu.id === su.id));
      return [...combined, ...extra];
    })(),
    transactions: JSON.parse(localStorage.getItem('savonnerie_transactions') || '[]'),
    clients: JSON.parse(localStorage.getItem('savonnerie_clients') || '[]'),
    auditLogs: JSON.parse(localStorage.getItem('savonnerie_audit') || '[]'),
  });

  const [pinEntry, setPinEntry] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'tous'>('tous');
  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(null);
  const [activeTicket, setActiveTicket] = useState<{ order: Order, type: 'CLIENT' | 'INTERNAL' | 'SUPPLIER', supplierId?: string } | null>(null);
  const [withdrawalModal, setWithdrawalModal] = useState<boolean>(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [withdrawalNote, setWithdrawalNote] = useState<string>('');

  // Discount State (percentage)
  const [discountRateInput, setDiscountRateInput] = useState<string>('');

  // Stock Search State
  const [stockSearch, setStockSearch] = useState<string>('');

  // Dimensions Modal State
  const [dimensionsModal, setDimensionsModal] = useState<{ article: Article } | null>(null);
  const [dimWidth, setDimWidth] = useState<string>('');
  const [dimHeight, setDimHeight] = useState<string>('');
  const [dimIsSupplier, setDimIsSupplier] = useState<boolean>(false);
  const [dimSupplierId, setDimSupplierId] = useState<string>(SUPPLIERS[0]?.id || '');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Article Editor State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleManagerCategory, setArticleManagerCategory] = useState<CategoryId | 'tous'>('tous');
  const [articleSearch, setArticleSearch] = useState<string>('');

  // Supplier UI State
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>('');
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // History UI State
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [historyFilterType, setHistoryFilterType] = useState<AuditLog['type'] | 'ALL'>('ALL');

  // Persistence
  React.useEffect(() => {
    localStorage.setItem('savonnerie_orders', JSON.stringify(state.orders));
    localStorage.setItem('savonnerie_invoices', JSON.stringify(state.invoices));
    localStorage.setItem('savonnerie_users', JSON.stringify(state.users));
    localStorage.setItem('savonnerie_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('savonnerie_inventory', JSON.stringify(state.inventory));
    localStorage.setItem('savonnerie_clients', JSON.stringify(state.clients));
    localStorage.setItem('savonnerie_suppliers', JSON.stringify(state.suppliers));
    localStorage.setItem('savonnerie_audit', JSON.stringify(state.auditLogs));
  }, [state.orders, state.invoices, state.users, state.transactions, state.inventory, state.clients, state.suppliers, state.auditLogs]);

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = state.orders.filter(o => o.createdAt.startsWith(today));

    const revenueToday = todayOrders.reduce((sum, o) => sum + o.paid, 0);
    const expectedToday = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const withdrawalsToday = state.transactions
      .filter(t => t.date.startsWith(today) && t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCashCollected = state.orders.reduce((sum, o) => sum + o.paid, 0);
    const totalWithdrawn = state.transactions.reduce((sum, t) => sum + t.amount, 0);
    const cashInDrawer = totalCashCollected - totalWithdrawn;

    const totalCreditDebt = state.orders.reduce((sum, o) => sum + (o.total - o.paid), 0);
    const avgOrderValue = todayOrders.length > 0 ? revenueToday / todayOrders.length : 0;

    const articlePerformance: Record<string, { qty: number, rev: number }> = {};
    state.orders.forEach(o => o.items.forEach(it => {
      if (!articlePerformance[it.articleName]) {
        articlePerformance[it.articleName] = { qty: 0, rev: 0 };
      }
      articlePerformance[it.articleName].qty += it.quantity;
      articlePerformance[it.articleName].rev += it.price;
    }));
    const topArticles = Object.entries(articlePerformance)
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 5);

    const serviceMix: Record<string, number> = {};
    state.orders.forEach(o => o.items.forEach(it => {
      serviceMix[it.serviceId] = (serviceMix[it.serviceId] || 0) + 1;
    }));
    const totalServices = Object.values(serviceMix).reduce((a, b) => a + b, 0);

    return {
      revenueToday,
      expectedToday,
      withdrawalsToday,
      cashInDrawer,
      totalCreditDebt,
      avgOrderValue,
      orderCountToday: todayOrders.length,
      topArticles,
      serviceMix,
      totalServices
    };
  }, [state.orders, state.transactions]);

  // Stock Analytics
  const stockStats = useMemo(() => {
    const inShopOrders = state.orders.filter(o => o.status !== 'livré');
    const totalItems = inShopOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + (it.categoryId === 'maison' ? 1 : it.quantity), 0), 0);
    const readyItems = inShopOrders.filter(o => o.status === 'prêt').length;
    const processingItems = inShopOrders.filter(o => ['lavage', 'repassage'].includes(o.status)).length;

    return { totalItems, readyItems, processingItems, inShopOrders };
  }, [state.orders]);

  const filteredStock = useMemo(() => {
    return stockStats.inShopOrders.filter(order => {
      const matchesSearch = order.ticketId.includes(stockSearch) ||
        (order.customerPhone && order.customerPhone.includes(stockSearch));
      return matchesSearch;
    });
  }, [stockStats.inShopOrders, stockSearch]);

  const filteredOrders = useMemo(() => {
    return state.orders.filter(order => {
      const matchesSearch = order.ticketId.includes(searchTerm) ||
        (order.customerPhone && order.customerPhone.includes(searchTerm));
      const matchesFilter = activeFilter === 'tous' || order.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [state.orders, searchTerm, activeFilter]);

  const handleScanSimulation = () => {
    const id = prompt("Scanner ou Entrer le N° de Ticket :");
    if (!id) return;
    const order = state.orders.find(o => o.ticketId === id);
    if (order) {
      setActiveTicket({ order, type: 'INTERNAL' });
    } else {
      alert("Ticket non trouvé");
    }
  };

  const handleLogin = (user: User) => {
    setSelectedUserForPin(user);
  };

  const handlePinSubmit = () => {
    if (selectedUserForPin?.pin === pinEntry) {
      const user = selectedUserForPin;
      setState(prev => ({ ...prev, currentUser: user, currentView: 'POS' }));
      addAuditLog('USER', 'Connexion réussie', `Utilisateur: ${user.name} (${user.role})`, user);
      setSelectedUserForPin(null);
      setPinEntry('');
    } else {
      setPinEntry('');
      alert('Code PIN incorrect');
    }
  };

  const handleWithdrawal = () => {
    if (!state.currentUser || !withdrawalAmount) return;
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      userId: state.currentUser.id,
      userName: state.currentUser.name,
      amount: amount,
      type: 'withdrawal',
      date: new Date().toISOString(),
      note: withdrawalNote || 'Retrait caisse'
    };

    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions]
    }));
    addAuditLog('PAYMENT', `Sortie de caisse effectuée`, `Montant: ${amount} DH - Motif: ${newTransaction.note} - Demandé par: ${state.currentUser?.name}`);
    setWithdrawalModal(false);
    setWithdrawalAmount('');
    setWithdrawalNote('');
  };

  const handleAddUser = () => {
    const name = prompt("Nom de l'employé :");
    if (!name) return;
    const pin = prompt("Code PIN (4 chiffres) :");
    const salary = parseFloat(prompt("Salaire Mensuel (DH) :") || "0");

    const newUser: User = {
      id: Date.now().toString(),
      name,
      role: 'cashier',
      avatar: '🧑‍💼',
      pin: pin || '0000',
      salary
    };

    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    addAuditLog('USER', `Nouvel employé ajouté: ${newUser.name}`, `Rôle: ${newUser.role}`);
  };

  const deleteUser = (id: string) => {
    if (id === 'u1') return alert("Impossible de supprimer l'admin principal");
    if (confirm("Supprimer cet employé ?")) {
      const userName = state.users.find(u => u.id === id)?.name || id;
      setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
      addAuditLog('USER', `Employé supprimé: ${userName}`, `ID: ${id}`);
    }
  };

  const calculateItemPrice = (article: Article, serviceId: string, quantity: number = 1, width?: number, height?: number) => {
    const service = SERVICES.find(s => s.id === serviceId);
    const specificPrice = article.servicePrices?.[serviceId];

    if (specificPrice !== undefined && specificPrice !== null) {
      if (article.categoryId === 'maison' && width && height) {
        return specificPrice * (width * height);
      }
      return specificPrice * quantity;
    }

    const multiplier = service?.multiplier || 1;
    if (article.categoryId === 'maison' && width && height) {
      return article.basePrice * (width * height) * multiplier;
    }
    return article.basePrice * quantity * multiplier;
  };

  const addToCart = (articleId: string) => {
    const article = state.inventory.find(a => a.id === articleId);
    if (!article) return;

    if (article.categoryId === 'maison') {
      setDimensionsModal({ article });
      setDimWidth('');
      setDimHeight('');
      return;
    }

    setState(prev => {
      let newCart = [...prev.cart];
      const barcode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      newCart.push({
        id: Date.now().toString() + Math.random(),
        articleId: article.id,
        articleName: article.name,
        categoryId: article.categoryId,
        image: article.image,
        quantity: 1,
        serviceId: 'lavage',
        price: calculateItemPrice(article, 'lavage', 1),
        isSupplierItem: false,
        supplierStatus: undefined,
        barcode,
        status: 'reçu'
      });
      return { ...prev, cart: newCart };
    });
  };

  const addMaisonToCart = () => {
    if (!dimensionsModal) return;
    const { article } = dimensionsModal;
    const w = parseFloat(dimWidth) || 1;
    const h = parseFloat(dimHeight) || 1;
    const area = w * h;

    setState(prev => {
      const newCart = [...prev.cart];
      const barcode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      newCart.push({
        id: Date.now().toString() + Math.random(),
        articleId: article.id,
        articleName: article.name,
        categoryId: article.categoryId,
        image: article.image,
        quantity: 1,
        serviceId: 'lavage',
        width: w,
        height: h,
        price: calculateItemPrice(article, 'lavage', 1, w, h),
        isSupplierItem: dimIsSupplier,
        supplierId: dimIsSupplier ? dimSupplierId : undefined,
        supplierStatus: dimIsSupplier ? 'En stock' : undefined,
        barcode,
        status: 'reçu'
      });
      return { ...prev, cart: newCart };
    });
    setDimensionsModal(null);
    setDimWidth('');
    setDimHeight('');
    setDimIsSupplier(false);
  };

  const removeFromCart = (articleId: string) => {
    setState(prev => {
      const existingIdx = prev.cart.findIndex(i => i.articleId === articleId);
      if (existingIdx === -1) return prev;
      let newCart = [...prev.cart];
      const item = newCart[existingIdx];

      if (item.categoryId === 'maison') {
        newCart.splice(existingIdx, 1);
        return { ...prev, cart: newCart };
      }

      if (item.quantity > 1) {
        const newQty = item.quantity - 1;
        const article = prev.inventory.find(a => a.id === item.articleId);
        if (!article) return item;
        newCart[existingIdx] = { ...item, quantity: newQty, price: calculateItemPrice(article, item.serviceId, newQty, item.width, item.height) };
      } else {
        newCart.splice(existingIdx, 1);
      }
      return { ...prev, cart: newCart };
    });
  };

  const updateService = (cartId: string, serviceId: ServiceId) => {
    const service = SERVICES.find(s => s.id === serviceId);
    if (!service) return;

    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item => {
        if (item.id === cartId) {
          const article = prev.inventory.find(a => a.id === item.articleId);
          if (!article) return item;

          const calculatedPrice = calculateItemPrice(article, serviceId, item.quantity, item.width, item.height);

          return { ...item, serviceId, price: calculatedPrice };
        }
        return item;
      })
    }));
  };

  const toggleSupplierItem = (cartId: string, isSupplier: boolean) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item => {
        if (item.id === cartId) {
          return {
            ...item,
            isSupplierItem: isSupplier,
            supplierId: isSupplier ? SUPPLIERS[0].id : undefined,
            supplierStatus: isSupplier ? 'En stock' : undefined
          };
        }
        return item;
      })
    }));
  };

  const updateSupplierId = (cartId: string, supplierId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item => item.id === cartId ? { ...item, supplierId } : item)
    }));
  };

  const cartSubtotal = useMemo(() => {
    return state.cart.reduce((sum, item) => sum + item.price, 0);
  }, [state.cart]);

  // Discount Calculation based on percentage
  const discountRate = parseFloat(discountRateInput) || 0;
  const discountAmount = (cartSubtotal * discountRate) / 100;
  const finalOrderTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleFinishOrder = (paymentMode: 'place' | 'avance' | 'credit', paid: number) => {
    const newOrder: Order = {
      id: Date.now().toString(),
      ticketId: Math.floor(1000 + Math.random() * 9000).toString(),
      items: [...state.cart],
      subtotal: cartSubtotal,
      discount: discountAmount > 0 ? discountAmount : undefined,
      discountRate: discountRate > 0 ? discountRate : undefined,
      total: finalOrderTotal,
      paid: paid,
      status: 'reçu',
      createdAt: new Date().toISOString(),
      pickupDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      paymentMode,
      customerPhone: customerPhone || undefined,
      clientId: selectedClient?.id,
      clientName: selectedClient?.name
    };

    setState(prev => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
      cart: [],
      posStep: 'CATEGORY',
      selectedCategory: null
    }));
    setCustomerPhone('');
    setSelectedClient(null);
    setDiscountRateInput('');
    setActiveTicket({ order: newOrder, type: 'CLIENT' });
    addAuditLog('ORDER', `Commande #${newOrder.ticketId} créée`, `Total: ${newOrder.total} DH - Mode: ${newOrder.paymentMode} - Client: ${newOrder.clientName || 'Passager'}`, undefined, newOrder.id);
  };

  const advanceOrderStatus = (order: Order) => {
    const sequence: OrderStatus[] = ['reçu', 'lavage', 'repassage', 'prêt', 'livré'];
    const currentIndex = sequence.indexOf(order.status);
    if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
      const nextStatus = sequence[currentIndex + 1];
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(o => o.id === order.id ? {
          ...o,
          status: nextStatus,
          items: o.items.map(it => ({ ...it, status: nextStatus }))
        } : o)
      }));
      addAuditLog('ORDER', `Commande #${order.ticketId} mise à jour`, `Le statut global passe de "${order.status}" à "${nextStatus}". Tous les articles ont été synchronisés.`, undefined, order.id);
    }
  };

  const updateItemStatus = (orderId: string, itemId: string, newStatus: OrderStatus) => {
    setState(prev => {
      const newOrders = prev.orders.map(order => {
        if (order.id === orderId) {
          const newItems = order.items.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          );

          // Determine overall order status based on items
          // If all items are 'livré', order is 'livré'
          // If all items are 'prêt', order is 'prêt'
          // If any item is in 'lavage' or 'repassage', order is that status
          let overallStatus: OrderStatus = order.status;
          const statusPriority: OrderStatus[] = ['livré', 'prêt', 'repassage', 'lavage', 'reçu'];

          for (const status of statusPriority) {
            if (newItems.some(it => it.status === status)) {
              overallStatus = status;
              // Special case: if some are prêt but some are still in lavage, order is still in production step
            }
          }

          // Simpler logic: lowest status in the sequence defines the order progress?
          // No, usually "In Production" means it's not ready.
          // Let's use the first status in the sequence that any item has.
          const sequence: OrderStatus[] = ['reçu', 'lavage', 'repassage', 'prêt', 'livré'];
          const lowestStatusIndex = Math.min(...newItems.map(it => sequence.indexOf(it.status)));
          overallStatus = sequence[lowestStatusIndex];

          addAuditLog('ORDER', `Statut d'article changé`, `Ticket #${order.ticketId} - Article: ${newItems.find(it => it.id === itemId)?.articleName} - Nouveau statut: ${newStatus}`, undefined, order.id);
          return { ...order, items: newItems, status: overallStatus };
        }
        return order;
      });
      return { ...prev, orders: newOrders };
    });
  };

  const assignItemWorker = (orderId: string, itemId: string, userId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(order =>
        order.id === orderId ? {
          ...order,
          items: order.items.map(item =>
            item.id === itemId ? { ...item, assignedTo: userId } : item
          )
        } : order
      )
    }));
    const userName = state.users.find(u => u.id === userId)?.name || 'Inconnu';
    const itemName = state.orders.find(o => o.id === orderId)?.items.find(it => it.id === itemId)?.articleName || 'Article';
    const ticketId = state.orders.find(o => o.id === orderId)?.ticketId || '?';
    addAuditLog('USER', `Tâche assignée`, `${userName} doit s'occuper de "${itemName}" (Commande #${ticketId})`);
  };

  const assignItemSupplier = (orderId: string, itemId: string, supplierId: string) => {
    setState(prev => {
      const newOrders = prev.orders.map(order => {
        if (order.id === orderId) {
          const newItems = order.items.map(item =>
            item.id === itemId ? {
              ...item,
              supplierId: supplierId || undefined,
              isSupplierItem: !!supplierId,
              status: supplierId ? 'fournisseur' : 'reçu',
              supplierStatus: supplierId ? 'Chez fournisseur' : undefined,
              sentAt: supplierId ? new Date().toISOString() : undefined
            } : item
          );

          // Re-calculate order status
          const statuses = newItems.map(it => it.status);
          let overallStatus: OrderStatus = 'reçu';
          if (statuses.every(s => s === 'livré')) overallStatus = 'livré';
          else if (statuses.every(s => s === 'prêt' || s === 'livré')) overallStatus = 'prêt';
          else if (statuses.some(s => s === 'fournisseur')) overallStatus = 'fournisseur';
          else if (statuses.some(s => s === 'repassage')) overallStatus = 'repassage';
          else if (statuses.some(s => s === 'lavage')) overallStatus = 'lavage';

          return { ...order, items: newItems, status: overallStatus };
        }
        return order;
      });
      const supplierName = prev.suppliers.find(s => s.id === supplierId)?.name || 'Inconnu';
      const order = prev.orders.find(o => o.id === orderId);
      const articleName = order?.items.find(i => i.id === itemId)?.articleName || 'Article';
      addAuditLog('SUPPLIER', `Article envoyé chez fournisseur`, `Ticket #${order?.ticketId} - Article: ${articleName} - Fournisseur: ${supplierName}`);
      return { ...prev, orders: newOrders };
    });
  };

  const receiveItemFromSupplier = (orderId: string, itemId: string) => {
    setState(prev => {
      const newOrders = prev.orders.map(order => {
        if (order.id === orderId) {
          const newItems = order.items.map(item =>
            item.id === itemId ? {
              ...item,
              status: 'repassage',
              supplierStatus: 'Prêt',
              receivedAt: new Date().toISOString()
            } : item
          );

          const statuses = newItems.map(it => it.status);
          let overallStatus: OrderStatus = 'reçu';
          if (statuses.every(s => s === 'livré')) overallStatus = 'livré';
          else if (statuses.every(s => s === 'prêt' || s === 'livré')) overallStatus = 'prêt';
          else if (statuses.some(s => s === 'fournisseur')) overallStatus = 'fournisseur';
          else if (statuses.some(s => s === 'repassage')) overallStatus = 'repassage';
          else if (statuses.some(s => s === 'lavage')) overallStatus = 'lavage';

          return { ...order, items: newItems, status: overallStatus };
        }
        return order;
      });
      const order = prev.orders.find(o => o.id === orderId);
      const articleName = order?.items.find(i => i.id === itemId)?.articleName || 'Article';
      addAuditLog('SUPPLIER', `Article récupéré du fournisseur`, `Ticket #${order?.ticketId} - Article: ${articleName} (Prêt à repasser)`);
      return { ...prev, orders: newOrders };
    });
  };

  const updateMachineStatus = (machineId: string, status: MachineStatus, time?: number, program?: any) => {
    setState(prev => ({
      ...prev,
      machines: prev.machines.map(m => m.id === machineId ? { ...m, status, timeRemaining: time, program } : m)
    }));
  };

  const handleSaveArticle = () => {
    if (!editingArticle) return;
    setState(prev => {
      const exists = prev.inventory.find(a => a.id === editingArticle.id);
      let newInventory;
      if (exists) {
        newInventory = prev.inventory.map(a => a.id === editingArticle.id ? editingArticle : a);
      } else {
        newInventory = [...prev.inventory, editingArticle];
      }
      return { ...prev, inventory: newInventory };
    });
    setEditingArticle(null);
    const mode = state.inventory.find(a => a.id === editingArticle.id) ? 'Mise à jour' : 'Création';
    addAuditLog('INVENTORY', `${mode} d'article`, `Article: ${editingArticle.name} - Catégorie: ${editingArticle.categoryId} - Prix Base: ${editingArticle.basePrice} DH`);
  };
  const handleDeleteArticle = (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet article ?")) return;
    const artName = state.inventory.find(a => a.id === id)?.name || id;
    setState(prev => ({ ...prev, inventory: prev.inventory.filter(a => a.id !== id) }));
    addAuditLog('INVENTORY', `Article ${artName} supprimé`, `ID: ${id}`);
  };

  const handleNewArticle = () => {
    setEditingArticle({
      id: Date.now().toString(),
      name: 'Nouvel Article',
      categoryId: 'homme',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500&auto=format&fit=crop',
      basePrice: 10
    });
  };

  const filteredArticles = useMemo(() => {
    return state.inventory.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(articleSearch.toLowerCase());
      const matchesCategory = articleManagerCategory === 'tous' || a.categoryId === articleManagerCategory;
      return matchesSearch && matchesCategory;
    });
  }, [state.inventory, articleSearch, articleManagerCategory]);

  const handleAddClient = () => {
    if (!newClientName || !newClientPhone) return alert("Nom et téléphone requis");
    const newClient: Client = {
      id: Date.now().toString(),
      name: newClientName,
      phone: newClientPhone,
      createdAt: new Date().toISOString()
    };
    setState(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));
    setSelectedClient(newClient);
    setCustomerPhone(newClientPhone);
    setNewClientPhone('');
    setShowClientModal(false);
    addAuditLog('CLIENT', `Nouveau client enregistré`, `Nom: ${newClient.name} - Téléphone: ${newClient.phone}`);
  };

  const handleSaveSupplier = () => {
    if (!editingSupplier) return;
    setState(prev => {
      const exists = prev.suppliers.find(s => s.id === editingSupplier.id);
      let newSuppliers;
      if (exists) {
        newSuppliers = prev.suppliers.map(s => s.id === editingSupplier.id ? editingSupplier : s);
      } else {
        newSuppliers = [...prev.suppliers, editingSupplier];
      }
      return { ...prev, suppliers: newSuppliers };
    });
    setEditingSupplier(null);
    setShowSupplierModal(false);
    addAuditLog('SUPPLIER', `Fournisseur ${editingSupplier.name} enregistré`, `ID: ${editingSupplier.id}`);
  };

  const handleDeleteSupplier = (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    const supName = state.suppliers.find(s => s.id === id)?.name || id;
    setState(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== id) }));
    addAuditLog('SUPPLIER', `Fournisseur ${supName} supprimé`, `ID: ${id}`);
  };

  const handleNewSupplier = () => {
    setEditingSupplier({ id: Date.now().toString(), name: '', logo: '', contact: '' });
    setShowSupplierModal(true);
  };

  const addAuditLog = (type: AuditLog['type'], action: string, details?: string, user?: User, orderId?: string) => {
    const activeUser = user || state.currentUser;
    const newLog: AuditLog = {
      id: Date.now().toString() + Math.random(),
      userId: activeUser?.id || 'system',
      userName: activeUser?.name || 'Système',
      action,
      details,
      timestamp: new Date().toISOString(),
      type,
      orderId
    };
    setState(prev => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs].slice(0, 1000) // Conserver les 1000 derniers logs
    }));
  };

  const filteredClients = useMemo(() => {
    return state.clients.filter(c =>
      c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      c.phone.includes(clientSearchTerm)
    );
  }, [state.clients, clientSearchTerm]);

  const menuItems = [
    { id: 'POS', icon: <ShoppingCart size={32} />, label: 'Caisse', roles: ['admin', 'cashier'] },
    { id: 'TRACKING', icon: <ClipboardList size={32} />, label: 'Suivi', roles: ['admin', 'cashier'] },
    { id: 'STOCK', icon: <Package size={32} />, label: 'Stock Client', roles: ['admin', 'cashier'] },
    { id: 'MACHINES', icon: <Cpu size={32} />, label: 'Machines', roles: ['admin', 'cashier'] },
    { id: 'ARTICLE_MANAGER', icon: <Package size={32} />, label: 'Articles', roles: ['admin', 'cashier'] },
    { id: 'STAFF', icon: <UsersIcon size={32} />, label: 'Employés', roles: ['admin'] },
    { id: 'CLIENTS', icon: <UsersIcon size={32} />, label: 'Clients', roles: ['admin', 'cashier'] },
    { id: 'SUPPLIERS', icon: <Truck size={32} />, label: 'Fournisseurs', roles: ['admin'] },
    { id: 'HISTORY', icon: <History size={32} />, label: 'Historique', roles: ['admin'] },
    { id: 'DASHBOARD', icon: <BarChart3 size={32} />, label: 'Stats', roles: ['admin'] },
  ].filter(item => item.roles.includes(state.currentUser?.role || ''));

  return (
    <div className="flex h-screen w-screen overflow-hidden text-gray-800 bg-gray-50">
      {!state.currentUser ? (
        <div className="h-screen w-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center p-8">
          {!selectedUserForPin ? (
            <>
              <div className="bg-white p-4 rounded-3xl mb-12 shadow-2xl">
                <h1 className="text-3xl font-black text-blue-600 uppercase tracking-tighter">Savonnerie Pro</h1>
              </div>
              <h2 className="text-white text-3xl font-black uppercase mb-12 tracking-widest">Qui êtes-vous ?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                {state.users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleLogin(user)}
                    className="bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-[3rem] p-12 transition-all active:scale-95 flex flex-col items-center group"
                  >
                    <div className="text-8xl mb-6 transform group-hover:scale-110 transition-transform">{user.avatar}</div>
                    <div className="text-2xl font-black text-white uppercase">{user.name}</div>
                    <div className="mt-2 px-4 py-1 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                      {user.role}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl w-full max-w-md flex flex-col items-center">
              <button onClick={() => { setSelectedUserForPin(null); setPinEntry(''); }} className="self-start text-gray-400 mb-4"><ArrowLeft /></button>
              <div className="text-6xl mb-4">{selectedUserForPin.avatar}</div>
              <h2 className="text-2xl font-black uppercase mb-1">{selectedUserForPin.name}</h2>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-8">Saisir votre Code PIN</p>
              <div className="flex gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-6 h-6 rounded-full border-4 border-blue-600 ${pinEntry.length > i ? 'bg-blue-600' : 'bg-transparent'}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button key={n} onClick={() => pinEntry.length < 4 && setPinEntry(prev => prev + n)} className="h-20 bg-gray-100 rounded-2xl text-2xl font-black active:bg-blue-600 active:text-white">{n}</button>
                ))}
                <button onClick={() => setPinEntry('')} className="h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center active:bg-red-600 active:text-white"><Delete /></button>
                <button onClick={() => pinEntry.length < 4 && setPinEntry(prev => prev + '0')} className="h-20 bg-gray-100 rounded-2xl text-2xl font-black">0</button>
                <button disabled={pinEntry.length !== 4} onClick={handlePinSubmit} className="h-20 bg-green-500 text-white rounded-2xl flex items-center justify-center active:bg-green-600 disabled:opacity-50"><ChevronRight size={32} /></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <nav className="w-24 md:w-32 bg-white border-r flex flex-col items-center py-8 gap-10 no-print shadow-sm z-20 overflow-y-auto no-scrollbar">
            <div className="bg-blue-600 text-white w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-100 flex-shrink-0 cursor-pointer" onClick={() => setState(prev => ({ ...prev, currentView: 'POS' }))}>S</div>
            <div className="flex flex-col gap-6 w-full px-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setState(prev => ({ ...prev, currentView: item.id as any }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all ${state.currentView === item.id
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-105'
                    : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-black uppercase hidden md:block text-center">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-4 pb-4">
              <button
                onClick={() => setWithdrawalModal(true)}
                className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center active:bg-orange-600 active:text-white transition-colors shadow-sm"
                title="Sortie de Caisse"
              >
                <Wallet size={24} />
              </button>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl shadow-inner border border-white">
                {state.currentUser.avatar}
              </div>
              <button
                onClick={() => {
                  if (state.currentUser) {
                    addAuditLog('USER', 'Déconnexion', `Utilisateur: ${state.currentUser.name}`);
                  }
                  setState(prev => ({ ...prev, currentUser: null, currentView: 'POS' }));
                }}
                className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:bg-red-500 active:text-white transition-colors"
              >
                <LogOut size={24} />
              </button>
            </div>
          </nav>

          <main className="flex-1 overflow-hidden relative">
            {state.currentView === 'POS' && (
              <div className="h-full flex flex-col">
                {state.posStep === 'CATEGORY' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 h-full overflow-y-auto no-scrollbar">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setState(prev => ({ ...prev, selectedCategory: cat.id, posStep: 'ARTICLES' }))}
                        className="relative overflow-hidden group rounded-[3rem] shadow-2xl h-full min-h-[250px] transition-all active:scale-95"
                      >
                        <img src={cat.image} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={cat.label} />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">{cat.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {state.posStep === 'ARTICLES' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
                      <button onClick={() => setState(prev => ({ ...prev, posStep: 'CATEGORY', selectedCategory: null }))} className="flex items-center gap-2 p-3 rounded-2xl bg-gray-100 text-gray-700 font-bold uppercase"><ArrowLeft /> Retour</button>
                      <div className="text-xl font-black uppercase">{CATEGORIES.find(c => c.id === state.selectedCategory)?.label}</div>
                      <button disabled={state.cart.length === 0} onClick={() => setState(prev => ({ ...prev, posStep: 'PAYMENT' }))} className="bg-blue-600 text-white p-3 px-6 rounded-2xl font-bold uppercase disabled:opacity-50">Suivant</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 no-scrollbar">
                      {state.inventory.filter(a => a.categoryId === state.selectedCategory).map(art => (
                        <ArticleCard
                          key={art.id}
                          image={art.image}
                          name={art.name}
                          quantity={state.cart.filter(i => i.articleId === art.id).reduce((sum, item) => sum + item.quantity, 0)}
                          onAdd={() => addToCart(art.id)}
                          onRemove={() => removeFromCart(art.id)}
                        />
                      ))}
                    </div>
                    {state.cart.length > 0 && (
                      <div className="p-6 bg-white border-t flex items-center justify-between shadow-2xl">
                        <div className="text-2xl font-black">{cartSubtotal.toFixed(2)} DH</div>
                        <button onClick={() => setState(prev => ({ ...prev, posStep: 'PAYMENT' }))} className="bg-blue-600 text-white p-5 rounded-3xl font-bold uppercase shadow-xl flex items-center gap-3 active:scale-95">Passer au Paiement <ChevronRight /></button>
                      </div>
                    )}
                  </div>
                )}
                {state.posStep === 'PAYMENT' && (
                  <div className="flex flex-col h-full p-6">
                    <button onClick={() => setState(prev => ({ ...prev, posStep: 'ARTICLES' }))} className="self-start mb-4 bg-white p-3 rounded-2xl shadow-sm"><ArrowLeft /></button>
                    <div className="bg-white rounded-[3rem] p-8 shadow-sm flex-1 overflow-y-auto space-y-6 no-scrollbar">
                      <h2 className="text-3xl font-black uppercase">Récapitulatif</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className=" bg-white p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-dashed sm:border-2 border-gray-200 flex flex-col gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3 text-blue-600">
                              <UsersIcon size={24} />
                              <span className="font-black uppercase text-sm">Client</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  setSelectedClient(null);
                                  setCustomerPhone('');
                                  setClientSearchTerm('');
                                }}
                                className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95
  ${!selectedClient
                                    ? 'bg-blue-600 text-white shadow-blue-100'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                              >
                                <UserCheck size={14} /> Passager
                              </button>

                              <button
                                onClick={() => setShowClientModal(true)}
                                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-green-500 text-white rounded-2xl text-[11px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
                              >
                                <UserPlus size={14} /> Nouveau
                              </button>

                            </div>
                          </div>

                          {selectedClient ? (
                            <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                  <UserCheck size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-blue-800 text-sm">{selectedClient.name}</span>
                                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mt-0.5">{selectedClient.phone}</span>
                                </div>
                              </div>
                              <button onClick={() => {
                                setSelectedClient(null);
                                setClientSearchTerm('');
                              }} className="p-2 text-blue-300 hover:text-blue-600 transition-colors"><X size={20} /></button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3 border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                                  <UserCheck size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-700 text-sm">Client de Passage</span>
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-0.5">Aucun compte sélectionné</span>
                                </div>
                              </div>
                              <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                <input
                                  type="text"
                                  placeholder="Rechercher client (Nom ou Tel)..."
                                  value={clientSearchTerm}
                                  onChange={(e) => setClientSearchTerm(e.target.value)}
                                  className="w-full p-4 pl-12 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                />
                                {clientSearchTerm && filteredClients.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto no-scrollbar">
                                    {filteredClients.map(c => (
                                      <button
                                        key={c.id}
                                        onClick={() => {
                                          setSelectedClient(c);
                                          setCustomerPhone(c.phone);
                                          setClientSearchTerm('');
                                        }}
                                        className="w-full p-4 text-left hover:bg-gray-50 flex flex-col border-b last:border-0"
                                      >
                                        <span className="font-bold">{c.name}</span>
                                        <span className="text-xs text-gray-400">{c.phone}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={`bg-white p-6 rounded-[2rem] border-2 border-dashed flex flex-col gap-4 transition-colors ${cartSubtotal >= 100 ? 'border-orange-400 bg-orange-50/20' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-3 text-orange-600">
                            <Percent size={24} />
                            <span className="font-black uppercase text-sm">Remise Client {cartSubtotal >= 100 && '(Achat > 100DH)'}</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="Ex: 5"
                              max="100"
                              min="0"
                              value={discountRateInput}
                              onChange={(e) => setDiscountRateInput(e.target.value)}
                              className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 font-bold text-xl tracking-widest pr-12"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-2xl">%</span>
                          </div>
                        </div>
                      </div>

                      {state.cart.map(item => (
                        <div key={item.id} className="bg-gray-50 p-6 rounded-[2.5rem] flex flex-col gap-4 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <img src={item.image} alt={item.articleName} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                              <div className="flex flex-col">
                                <span className="text-xl font-bold uppercase">{item.articleName}</span>
                                {item.categoryId === 'maison' && item.width && item.height && (
                                  <span className="text-[10px] font-black text-blue-500 uppercase">{item.width}m x {item.height}m = {(item.width * item.height).toFixed(2)}m²</span>
                                )}
                                {item.categoryId !== 'maison' && <span className="text-[10px] font-black text-gray-400 uppercase">Quantité: {item.quantity}</span>}
                              </div>
                            </div>
                            <span className="text-xl font-black text-blue-600">{item.price.toFixed(2)} DH</span>
                          </div>

                          <ServiceSelector item={item} onUpdateService={(sid) => updateService(item.id, sid)} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-gray-400 font-bold uppercase text-xs">
                          <span>Sous-total</span>
                          <span>{cartSubtotal.toFixed(2)} DH</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-orange-500 font-bold uppercase text-xs">
                            <span>Remise ({discountRate}%)</span>
                            <span>- {discountAmount.toFixed(2)} DH</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                          <span className="text-xl font-black uppercase text-gray-800">Total à Payer</span>
                          <span className="text-3xl font-black text-blue-600">{finalOrderTotal.toFixed(2)} DH</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <button onClick={() => handleFinishOrder('place', finalOrderTotal)} className="bg-green-500 text-white p-6 rounded-3xl font-black uppercase text-[10px] shadow-lg active:scale-95 leading-tight">Sur Place</button>
                        <button onClick={() => handleFinishOrder('avance', finalOrderTotal / 2)} className="bg-blue-500 text-white p-6 rounded-3xl font-black uppercase text-[10px] shadow-lg active:scale-95 leading-tight">Avance</button>
                        <button onClick={() => handleFinishOrder('credit', 0)} className="bg-orange-500 text-white p-6 rounded-3xl font-black uppercase text-[10px] shadow-lg active:scale-95 leading-tight">Crédit</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.currentView === 'STOCK' && (
              <div className="h-full p-8 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                      <Package className="text-blue-600" size={36} /> Stock Client
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mt-1">Articles en atelier par Code-barres</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Articles</p>
                      <p className="text-2xl font-black text-blue-600">{stockStats.totalItems}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">En cours</p>
                      <p className="text-2xl font-black text-orange-500">{stockStats.processingItems}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center hidden md:block">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Prêt / A livrer</p>
                      <p className="text-2xl font-black text-emerald-500">{stockStats.readyItems}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8 relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
                    <Barcode size={32} />
                  </div>
                  <input
                    type="text"
                    placeholder="Scanner le Ticket ou enter le N°..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full h-20 pl-20 pr-8 rounded-[2.5rem] bg-white border-4 border-transparent shadow-xl font-black text-2xl focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-200"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-100 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Scanner Actif
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pr-2 pb-20">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredStock.length > 0 ? filteredStock.map(order => (
                      <div key={order.id} className={`bg-white rounded-[3rem] border-2 p-8 shadow-sm transition-all hover:shadow-xl ${order.status === 'prêt' ? 'border-emerald-100 bg-emerald-50/10' : 'border-gray-100'
                        }`}>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="bg-gray-900 text-white px-5 py-2 rounded-2xl font-black text-xl flex items-center gap-2">
                              <Barcode size={20} /> {order.ticketId}
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date Réception</p>
                              <p className="text-xs font-bold text-gray-700">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[order.status]}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-4">
                                <img src={item.image} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt={item.articleName} />
                                <div className="flex flex-col">
                                  <span className="font-black text-gray-800 uppercase text-xs">{item.articleName}</span>
                                  <span className="text-[10px] text-blue-500 font-bold uppercase">
                                    {SERVICES.find(s => s.id === item.serviceId)?.label}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-gray-400 text-sm">
                                  {item.categoryId === 'maison' && item.width && item.height
                                    ? `${(item.width * item.height).toFixed(2)} m²`
                                    : `x${item.quantity}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 flex items-center justify-between pt-6 border-t border-dashed border-gray-200">
                          <div className="flex items-center gap-3 text-gray-400">
                            <Phone size={14} />
                            <span className="text-xs font-bold">{order.customerPhone || 'Anonyme'}</span>
                          </div>
                          <button
                            onClick={() => setActiveTicket({ order, type: 'CLIENT' })}
                            className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Search size={18} />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-40 text-center flex flex-col items-center opacity-20">
                        <Barcode size={100} strokeWidth={1} className="mb-6" />
                        <p className="text-2xl font-black uppercase tracking-widest">Aucun article trouvé</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {state.currentView === 'ARTICLE_MANAGER' && (
              <div className="h-full flex flex-col p-8 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-800">Gestion des Articles</h1>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mt-1">Catalogue et Tarification</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleNewArticle} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold uppercase shadow-xl active:scale-95">
                      <Plus /> Nouveau
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input
                      type="text"
                      placeholder="Rechercher un article..."
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                      className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border-none shadow-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {['tous', ...CATEGORIES.map(c => c.id)].map(catId => (
                      <button
                        key={catId}
                        onClick={() => setArticleManagerCategory(catId as any)}
                        className={`h-14 px-6 rounded-2xl font-black uppercase text-[10px] transition-all whitespace-nowrap ${articleManagerCategory === catId ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-400'
                          }`}
                      >
                        {catId === 'tous' ? 'Tout' : CATEGORIES.find(c => c.id === catId)?.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar pb-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredArticles.map(art => (
                      <div key={art.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col group relative transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="w-full h-[15rem] rounded-3xl overflow-hidden mb-6 shadow-inner relative">
                          <img src={art.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={art.name} />
                          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest shadow-sm">
                            {art.basePrice} DH {art.categoryId === 'maison' ? '/ m²' : ''}
                          </div>
                        </div>
                        <h3 className="text-xl font-black uppercase text-gray-800 mb-2 truncate">{art.name}</h3>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-1">
                            <Tag size={12} /> {CATEGORIES.find(c => c.id === art.categoryId)?.label}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingArticle(art)} className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-colors">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteArticle(art.id)} className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {state.currentView === 'TRACKING' && (
              <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
                <div className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                      <ClipboardList className="text-blue-600" size={36} /> Production & Suivi
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mt-1">Tableau de bord de production par article</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative group min-w-[300px]">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="N° Ticket, Nom ou Code-barres..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border-none shadow-sm font-bold text-sm focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <button onClick={handleScanSimulation} className="h-14 bg-gray-900 text-white px-8 rounded-2xl flex items-center gap-3 font-bold uppercase shadow-xl active:scale-95 transition-all text-sm">
                      <Scan size={20} /> Scanner
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto p-8 pt-4 pb-12 flex gap-6 no-scrollbar">
                  {['reçu', 'lavage', 'fournisseur', 'repassage', 'prêt'].map((columnStatus) => {
                    const columnItems = state.orders
                      .filter(o => o.status !== 'livré')
                      .flatMap(o => o.items.map(it => ({ ...it, orderId: o.id, ticketId: o.ticketId, clientName: o.clientName || 'Passager', pickupDate: o.pickupDate })))
                      .filter(it => it.status === columnStatus)
                      .filter(it =>
                        it.ticketId.includes(searchTerm) ||
                        it.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        it.barcode.includes(searchTerm) ||
                        it.articleName.toLowerCase().includes(searchTerm.toLowerCase())
                      );

                    return (
                      <div key={columnStatus} className="flex-shrink-0 w-80 flex flex-col h-full bg-gray-100/50 rounded-[3rem] border border-gray-200/50 overflow-hidden">
                        <div className="p-6 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${columnStatus === 'reçu' ? 'bg-gray-400' :
                              columnStatus === 'lavage' ? 'bg-blue-500' :
                                columnStatus === 'fournisseur' ? 'bg-pink-500' :
                                  columnStatus === 'repassage' ? 'bg-orange-500' : 'bg-emerald-500'
                              }`} />
                            <h2 className="font-black uppercase text-xs tracking-widest text-gray-600">
                              {columnStatus === 'fournisseur' ? 'Chez Fournisseur' : columnStatus}
                            </h2>
                          </div>
                          <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 shadow-sm border border-gray-50">{columnItems.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                          {columnItems.map((item) => {
                            const isLate = new Date(item.pickupDate) < new Date();
                            const service = SERVICES.find(s => s.id === item.serviceId);
                            const nextStatusMap: Record<string, OrderStatus> = {
                              'reçu': 'lavage',
                              'lavage': 'repassage',
                              'fournisseur': 'repassage',
                              'repassage': 'prêt',
                              'prêt': 'livré'
                            };
                            const prevStatusMap: Record<string, OrderStatus> = {
                              'lavage': 'reçu',
                              'repassage': 'lavage',
                              'prêt': 'repassage'
                            };

                            return (
                              <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">#{item.ticketId}</span>
                                    <span className="text-[14px] font-black uppercase text-gray-800 truncate max-w-[150px]">{item.clientName}</span>
                                  </div>
                                  <div className={`p-3 rounded-2xl ${isLate ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                                    <Clock size={16} />
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner">
                                    <img src={item.image} className="w-full h-full object-cover" alt="" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-0.5">{item.articleName}</p>
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-2 h-2 rounded-full ${service?.color.replace('text', 'bg')}`} />
                                      <span className="text-[9px] font-black uppercase text-gray-600">{service?.label || item.serviceId}</span>
                                    </div>
                                    <p className="text-[8px] font-mono text-gray-400 mt-1">{item.barcode}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="col-span-1">
                                    <select
                                      value={item.assignedTo || ''}
                                      onChange={(e) => assignItemWorker(item.orderId, item.id, e.target.value)}
                                      className="w-full h-10 px-4 bg-gray-50 border-none rounded-2xl text-[8px] font-black uppercase text-gray-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                      <option value="">Agent</option>
                                      {state.users.filter(u => u.role === 'cashier').map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-span-1">
                                    <select
                                      value={item.supplierId || ''}
                                      onChange={(e) => assignItemSupplier(item.orderId, item.id, e.target.value)}
                                      className="w-full h-10 px-4 bg-gray-50 border-none rounded-2xl text-[8px] font-black uppercase text-gray-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                      <option value="">Fours.</option>
                                      {state.suppliers.map(sup => (
                                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-span-2 grid grid-cols-2 gap-2">
                                    {prevStatusMap[columnStatus] && (
                                      <button
                                        onClick={() => updateItemStatus(item.orderId, item.id, prevStatusMap[columnStatus])}
                                        className="h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                                      >
                                        <ArrowLeft size={14} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (columnStatus === 'fournisseur') {
                                          receiveItemFromSupplier(item.orderId, item.id);
                                        } else {
                                          updateItemStatus(item.orderId, item.id, nextStatusMap[columnStatus]);
                                        }
                                      }}
                                      className={`h-10 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[8px] shadow-sm transition-all active:scale-95 ${columnStatus === 'fournisseur' ? 'bg-pink-600 text-white col-span-2' :
                                        columnStatus === 'prêt' ? 'bg-emerald-500 text-white col-span-2' :
                                          prevStatusMap[columnStatus] ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white col-span-2'
                                        }`}
                                    >
                                      {columnStatus === 'fournisseur' ? 'Récupérer' : columnStatus === 'prêt' ? 'Livrer' : 'Suivant'} <ChevronRight size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {columnItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20 filter grayscale">
                              <div className="text-4xl mb-4">✨</div>
                              <p className="font-black uppercase text-[10px] tracking-widest">Vide</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {state.currentView === 'MACHINES' && (
              <div className="h-full p-8 flex flex-col bg-gray-900 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h1 className="text-4xl font-black uppercase text-white tracking-tighter">Centre de Production</h1>
                    <p className="text-blue-400 font-black uppercase text-[10px] tracking-widest mt-1">Surveillance Temps Réel</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                  {state.machines.map(m => (
                    <div key={m.id} className={`group relative bg-slate-800/50 backdrop-blur-xl rounded-[3.5rem] p-8 border-2 transition-all overflow-hidden ${m.status === 'panne' ? 'border-red-500/30' :
                      m.status === 'maintenance' ? 'border-orange-500/30' :
                        m.status === 'terminé' ? 'border-purple-500 shadow-[0_0_50px_-12px_rgba(168,85,247,0.4)]' :
                          m.status === 'en_cours' ? 'border-blue-500' : 'border-white/10'
                      }`}>
                      <div className="flex items-start justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-6">
                          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl bg-slate-900 border border-white/5 shadow-2xl ${m.status === 'en_cours' ? 'animate-pulse' : ''}`}>
                            {m.type === 'washer' ? (
                              <div className={`${m.status === 'en_cours' ? 'animate-spin' : ''}`}>🌀</div>
                            ) : (
                              <div className={`${m.status === 'en_cours' ? 'animate-bounce' : ''}`}>♨️</div>
                            )}
                          </div>
                          <div>
                            <h2 className="text-2xl font-black uppercase text-white leading-none mb-2">{m.name}</h2>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white ${MACHINE_STATUS_COLORS[m.status]}`}>
                                {m.status === 'en_cours' ? m.program : m.status}
                              </span>
                              <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest px-2 border-l border-white/10">{m.capacity}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative h-[11rem] bg-slate-900 rounded-[2.5rem] mb-8 border border-white/5 overflow-hidden flex flex-col items-center justify-center">
                        {m.status === 'en_cours' ? (
                          <>
                            <div className="relative z-10 text-center">
                              <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Temps Restant</p>
                              <p className="text-6xl font-black text-white tabular-nums tracking-tighter">{m.timeRemaining}:00</p>
                            </div>
                            <div className={`absolute inset-x-0 bottom-0 transition-all duration-1000 ${m.type === 'washer' ? 'bg-blue-600' : 'bg-gradient-to-t from-orange-600 to-red-500'}`}
                              style={{ height: `${100 - ((m.timeRemaining ?? 0) / 60 * 100)}%`, opacity: 0.3 }} />
                          </>
                        ) : m.status === 'terminé' ? (
                          <div className="text-center animate-bounce">
                            <CheckCircle2 size={64} className="text-purple-400 mx-auto mb-3" />
                            <p className="text-white font-black uppercase text-sm tracking-widest">Cycle Terminé</p>
                          </div>
                        ) : (
                          <div className="text-center opacity-20">
                            <div className="text-5xl mb-4">SLEEP</div>
                            <p className="text-white font-black uppercase text-[10px] tracking-[0.3em]">En attente</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 relative z-10">
                        {m.status === 'disponible' ? (
                          <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => updateMachineStatus(m.id, 'en_cours', 30, 'Eco')} className="h-20 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-3xl border border-emerald-500/20 flex flex-col items-center justify-center transition-all group active:scale-95">
                              <Leaf size={24} className="mb-1" />
                              <span className="text-[9px] font-black uppercase">Eco 30'</span>
                            </button>
                            <button onClick={() => updateMachineStatus(m.id, 'en_cours', 45, 'Standard')} className="h-20 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-3xl border border-blue-500/20 flex flex-col items-center justify-center transition-all group active:scale-95">
                              <RotateCw size={24} className="mb-1" />
                              <span className="text-[9px] font-black uppercase">Std 45'</span>
                            </button>
                            <button onClick={() => updateMachineStatus(m.id, 'en_cours', 60, 'Intensif')} className="h-20 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-3xl border border-red-500/20 flex flex-col items-center justify-center transition-all group active:scale-95">
                              <Zap size={24} className="mb-1" />
                              <span className="text-[9px] font-black uppercase">Int 60'</span>
                            </button>
                          </div>
                        ) : m.status === 'terminé' ? (
                          <button onClick={() => updateMachineStatus(m.id, 'disponible')} className="w-full h-16 bg-purple-600 text-white rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3">
                            <ShieldCheck size={24} /> Déchargement Fini
                          </button>
                        ) : (
                          <button onClick={() => updateMachineStatus(m.id, 'disponible')} className="w-full h-14 bg-white/5 text-white rounded-2xl font-black uppercase text-[10px] border border-white/5">Réinitialiser</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.currentView === 'STAFF' && (
              <div className="h-full p-8 flex flex-col bg-white overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-12">
                  <h1 className="text-3xl font-black uppercase tracking-tighter">Gestion du Personnel</h1>
                  <button onClick={handleAddUser} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold uppercase shadow-xl active:scale-95">
                    <UserPlus /> Nouvel Employé
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {state.users.map(user => {
                    const withdrawn = state.transactions
                      .filter(t => t.userId === user.id)
                      .reduce((sum, t) => sum + t.amount, 0);

                    return (
                      <div key={user.id} className="bg-gray-50 p-8 rounded-[3.5rem] border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-xl border border-gray-100">{user.avatar}</div>
                        <div className="flex-1 text-center md:text-left">
                          <h2 className="text-2xl font-black uppercase text-gray-800">{user.name}</h2>
                          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                            <span className="px-4 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">{user.role}</span>
                            <span className="px-4 py-1 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600">Salaire: {user.salary} DH</span>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center min-w-[140px]">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Prélèvements</p>
                          <p className="text-2xl font-black text-orange-500">{withdrawn} DH</p>
                        </div>
                        {user.id !== 'u1' && (
                          <button onClick={() => deleteUser(user.id)} className="absolute top-6 right-6 p-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {state.currentView === 'DASHBOARD' && (
              <div className="h-full p-8 space-y-12 overflow-y-auto no-scrollbar bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-black uppercase text-gray-900 tracking-tighter">Tableau de Bord</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Activity size={12} /> Live Insights
                      </span>
                      <span className="text-gray-400 text-xs font-bold italic">Données synchronisées</span>
                    </div>
                  </div>
                  <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aujourd'hui</p>
                    <p className="text-lg font-black text-gray-800 uppercase">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="bg-blue-600 p-10 rounded-[4rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur"><TrendingUp size={32} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 rounded-full border border-white/20">Recettes Jour</span>
                      </div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Net Collecté</div>
                      <div className="text-6xl font-black tracking-tighter mb-4">{dashboardStats.revenueToday.toFixed(2)} <span className="text-2xl font-bold opacity-60">DH</span></div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="opacity-60 uppercase tracking-widest text-[9px]">Prévisions :</span>
                        <span className="text-white">{dashboardStats.expectedToday.toFixed(2)} DH</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-500 p-10 rounded-[4rem] text-white shadow-2xl shadow-emerald-200 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur"><Wallet size={32} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 rounded-full border border-white/20">Fonds de Caisse</span>
                      </div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Disponible Réel</div>
                      <div className="text-6xl font-black tracking-tighter mb-4">{dashboardStats.cashInDrawer.toFixed(2)} <span className="text-2xl font-bold opacity-60">DH</span></div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="opacity-60 uppercase tracking-widest text-[9px]">Dépenses Jour :</span>
                        <span className="text-white">{dashboardStats.withdrawalsToday.toFixed(2)} DH</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-500 p-10 rounded-[4rem] text-white shadow-2xl shadow-red-200 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur"><TrendingDown size={32} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 rounded-full border border-white/20">Crédit Client</span>
                      </div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Total En Attente</div>
                      <div className="text-6xl font-black tracking-tighter mb-4">{dashboardStats.totalCreditDebt.toFixed(2)} <span className="text-2xl font-bold opacity-60">DH</span></div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="opacity-60 uppercase tracking-widest text-[9px]">Santé Financière :</span>
                        <span className="text-white italic">{dashboardStats.totalCreditDebt > 1000 ? 'Attention' : 'Optimale'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: 'Panier Moyen', value: `${dashboardStats.avgOrderValue.toFixed(0)} DH`, icon: <Target className="text-blue-500" />, color: 'blue' },
                    { label: 'Orders Jour', value: dashboardStats.orderCountToday, icon: <Activity className="text-orange-500" />, color: 'orange' },
                    { label: 'Total Services', value: dashboardStats.totalServices, icon: <PieChart className="text-purple-500" />, color: 'purple' },
                    { label: 'Employés Actifs', value: state.users.length, icon: <UsersIcon className="text-emerald-500" />, color: 'emerald' },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className={`p-4 bg-${kpi.color}-50 rounded-2xl mb-4`}>{kpi.icon}</div>
                      <p className="text-3xl font-black text-gray-800 tracking-tighter">{kpi.value}</p>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-20">
                  <div className="bg-white rounded-[4rem] p-12 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-800 flex items-center gap-3">
                        <Target className="text-blue-600" /> Performance Articles
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-4 py-2 rounded-full text-gray-400">Top 5</span>
                    </div>
                    <div className="space-y-6">
                      {dashboardStats.topArticles.map(([name, data], i) => (
                        <div key={name} className="flex items-center gap-6 p-4 hover:bg-gray-50 rounded-3xl transition-colors">
                          <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black">#{i + 1}</div>
                          <div className="flex-1">
                            <p className="font-black uppercase text-sm text-gray-800">{name}</p>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(data.rev / (dashboardStats.topArticles[0][1]?.rev || 1)) * 100}%` }}></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-800">{data.rev.toFixed(2)} DH</p>
                            <p className="text-[9px] font-black text-gray-400 uppercase">x{data.qty} Unités</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-[4rem] p-12 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-800 flex items-center gap-3">
                        <PieChart className="text-purple-600" /> Distribution Services
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                        <span className="text-[10px] font-black uppercase text-gray-400">Activité Mix</span>
                      </div>
                    </div>
                    <div className="space-y-8">
                      {Object.entries(dashboardStats.serviceMix).map(([sid, count]) => {
                        const service = SERVICES.find(s => s.id === sid);
                        const percentage = Math.round((Number(count) / (dashboardStats.totalServices || 1)) * 100);
                        return (
                          <div key={sid} className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white">
                              {service?.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-2">
                                <span className="font-black uppercase text-xs text-gray-700">{service?.label}</span>
                                <span className="font-black text-gray-900">{percentage}%</span>
                              </div>
                              <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {state.currentView === 'SUPPLIERS' && (
              <div className="h-full p-8 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                      <Truck className="text-blue-600" size={36} /> Fournisseurs
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mt-1">Gestion des services externes et sous-traitants</p>
                  </div>
                  <button
                    onClick={handleNewSupplier}
                    className="bg-blue-600 text-white p-4 rounded-3xl font-bold uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                  >
                    <Plus size={24} /> Nouveau Fournisseur
                  </button>
                </div>

                <div className="mb-8 relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
                    <Search size={32} />
                  </div>
                  <input
                    type="text"
                    placeholder="Chercher un fournisseur..."
                    value={supplierSearchTerm}
                    onChange={(e) => setSupplierSearchTerm(e.target.value)}
                    className="w-full h-20 pl-20 pr-8 rounded-[2.5rem] bg-white border-4 border-transparent shadow-xl font-black text-2xl focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-100"
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                  {state.suppliers.filter(s => s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).map(sup => {
                    const activeOrders = state.orders.flatMap(o =>
                      o.items.filter(it => it.supplierId === sup.id && it.status === 'fournisseur')
                        .map(it => ({ ...it, orderTicketId: o.ticketId, clientName: o.clientName }))
                    );

                    return (
                      <div key={sup.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] overflow-hidden border-2 border-white shadow-inner flex items-center justify-center">
                              <img src={sup.logo} className="w-full h-full object-cover" alt={sup.name} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black uppercase text-gray-800">{sup.name}</h2>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                                  <Package size={12} /> {activeOrders.length} Articles en cours
                                </span>
                                {sup.contact && (
                                  <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                    {sup.contact}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => {
                                setEditingSupplier(sup);
                                setShowSupplierModal(true);
                              }}
                              className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 transition-colors"
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(sup.id)}
                              className="w-12 h-12 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        {activeOrders.length > 0 && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {activeOrders.map(item => (
                                <div key={item.id} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                                  <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-blue-600 uppercase">#{item.orderTicketId}</span>
                                      <span className="text-[8px] font-black text-gray-400 uppercase">{item.clientName}</span>
                                    </div>
                                    <p className="text-xs font-black uppercase text-gray-700 truncate">{item.articleName}</p>
                                    <p className="text-[8px] font-mono text-gray-400">{item.barcode}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Grouping by Ticket for Printing */}
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                              {Array.from(new Set(activeOrders.map(it => it.orderId))).map(orderId => {
                                const order = state.orders.find(o => o.id === orderId);
                                if (!order) return null;
                                return (
                                  <button
                                    key={orderId}
                                    onClick={() => setActiveTicket({ order, type: 'SUPPLIER', supplierId: sup.id })}
                                    className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-orange-100 transition-colors"
                                  >
                                    <FileText size={14} /> Bon #{order.ticketId}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {state.currentView === 'HISTORY' && (
              <div className="h-full p-8 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                      <History className="text-blue-600" size={36} /> Historique
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mt-1">Suivi des activités et modifications du système</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input
                        type="text"
                        placeholder="Rechercher une action, un utilisateur..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="h-14 pl-12 pr-6 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-80"
                      />
                    </div>
                    <select
                      value={historyFilterType}
                      onChange={(e) => setHistoryFilterType(e.target.value as any)}
                      className="h-14 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none"
                    >
                      <option value="ALL">Tous les types</option>
                      <option value="ORDER">Commandes</option>
                      <option value="PAYMENT">Paiements</option>
                      <option value="INVENTORY">Articles</option>
                      <option value="USER">Utilisateurs</option>
                      <option value="SUPPLIER">Fournisseurs</option>
                      <option value="CLIENT">Clients</option>
                      <option value="SYSTEM">Système</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 no-scrollbar space-y-4 pb-20">
                  {state.auditLogs
                    .filter(log => {
                      const matchesSearch = log.action.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                        log.userName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                        log.details?.toLowerCase().includes(historySearchTerm.toLowerCase());
                      const matchesType = historyFilterType === 'ALL' || log.type === historyFilterType;
                      return matchesSearch && matchesType;
                    })
                    .map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <div
                          key={log.id}
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className={`bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-start gap-6 hover:shadow-md transition-all cursor-pointer group ${isExpanded ? 'ring-2 ring-blue-500/10' : ''}`}
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white flex-shrink-0 ${log.type === 'ORDER' ? 'bg-blue-50 text-blue-600' :
                            log.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-600' :
                              log.type === 'USER' ? 'bg-purple-50 text-purple-600' :
                                log.type === 'SUPPLIER' ? 'bg-orange-50 text-orange-600' :
                                  log.type === 'INVENTORY' ? 'bg-pink-50 text-pink-600' :
                                    'bg-gray-50 text-gray-600'
                            }`}>
                            {log.type === 'ORDER' ? <ShoppingCart /> :
                              log.type === 'PAYMENT' ? <CreditCard /> :
                                log.type === 'USER' ? <UsersIcon /> :
                                  log.type === 'SUPPLIER' ? <Truck /> :
                                    log.type === 'INVENTORY' ? <Package /> :
                                      <Activity />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-black text-gray-800 uppercase text-sm truncate">{log.action}</h3>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                                  <Clock size={12} /> {new Date(log.timestamp).toLocaleString('fr-FR')}
                                </span>
                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : 'text-gray-300'}`}>
                                  <ChevronDown size={16} />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase">{log.userName}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${log.type === 'ORDER' ? 'bg-blue-100 text-blue-600' :
                                log.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{log.type}</span>
                            </div>
                            {log.details && (
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                <div className={`p-5 rounded-[2rem] border-2 border-dashed flex flex-col gap-2 ${log.type === 'ORDER' ? 'bg-blue-50/50 border-blue-100' :
                                  log.type === 'PAYMENT' ? 'bg-emerald-50/50 border-emerald-100' :
                                    log.type === 'USER' ? 'bg-purple-50/50 border-purple-100' :
                                      log.type === 'SUPPLIER' ? 'bg-orange-50/50 border-orange-100' :
                                        log.type === 'INVENTORY' ? 'bg-pink-50/50 border-pink-100' :
                                          'bg-gray-50/50 border-gray-100'
                                  }`}>
                                  <div className="flex items-center gap-2 opacity-40">
                                    <FileText size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Détails de l'action</span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-bold leading-relaxed">{log.details}</p>
                                  {log.orderId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const order = state.orders.find(o => o.id === log.orderId);
                                        if (order) {
                                          // Determine ticket type based on order properties
                                          const hasSupplierItems = order.items.some(item => item.isSupplierItem);
                                          setActiveTicket({
                                            order,
                                            type: hasSupplierItems ? 'SUPPLIER' : 'CLIENT',
                                            supplierId: hasSupplierItems ? order.items.find(item => item.supplierId)?.supplierId : undefined
                                          });
                                        }
                                      }}
                                      className="mt-3 w-full h-10 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                      <FileText size={14} />
                                      Voir le Ticket
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {state.auditLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-20">
                      <History size={120} className="mb-6" />
                      <p className="text-2xl font-black uppercase tracking-tighter">Aucune activité enregistrée</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {state.currentView === 'CLIENTS' && (
              <div className="h-full p-8 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                      <UsersIcon className="text-blue-600" size={36} /> Clients
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mt-1">Gestion de la base de données clients</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewClientName('');
                      setNewClientPhone('');
                      setShowClientModal(true);
                    }}
                    className="bg-blue-600 text-white p-4 rounded-3xl font-bold uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                  >
                    <UserPlus size={24} /> Nouveau Client
                  </button>
                </div>

                <div className="mb-8 relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
                    <Search size={32} />
                  </div>
                  <input
                    type="text"
                    placeholder="Chercher par nom ou numéro..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full h-20 pl-20 pr-8 rounded-[2.5rem] bg-white border-4 border-transparent shadow-xl font-black text-2xl focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-100"
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  {filteredClients.map(client => (
                    <div key={client.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition-colors group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-2xl font-black">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-black uppercase text-gray-800">{client.name}</span>
                          <span className="text-gray-400 font-bold flex items-center gap-1"><Phone size={14} /> {client.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            if (confirm("Supprimer ce client ?")) {
                              setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== client.id) }));
                              addAuditLog('CLIENT', `Client ${client.name} supprimé`, `ID: ${client.id}`);
                            }
                          }}
                          className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:bg-red-500 active:text-white transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                      <UsersIcon size={64} strokeWidth={1} />
                      <p className="font-black uppercase text-xs tracking-widest mt-4">Aucun client trouvé</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      )}
      {showClientModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
              <UserPlus size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">Nouveau Client</h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Nom Complet</p>
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-black uppercase focus:ring-0 p-0 text-gray-800"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Téléphone</p>
                <input
                  type="tel"
                  placeholder="06XXXXXXXX"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-blue-600 tracking-widest"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={() => setShowClientModal(false)} className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors">Annuler</button>
              <button
                onClick={handleAddClient}
                disabled={!newClientName || !newClientPhone}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {withdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-md flex flex-col items-center shadow-2xl">
            <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-orange-100"><Wallet size={48} /></div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">Enregistrer une Sortie de Caisse</h2>
            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Montant du retrait (DH)</p>
                <input
                  type="number"
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full bg-transparent border-none text-4xl font-black tracking-tighter focus:ring-0 p-0 text-orange-500"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Motif / Note</p>
                <input
                  type="text"
                  placeholder="Ex: Avance Salaire, Achat Savon..."
                  value={withdrawalNote}
                  onChange={(e) => setWithdrawalNote(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0 text-gray-800"
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { label: 'Avance Salaire', icon: '💵' },
                    { label: 'Achat Savon', icon: '🧼' },
                    { label: 'Transport', icon: '🚚' },
                    { label: 'Maintenance', icon: '🛠️' },
                    { label: 'Repas', icon: '🍕' },
                    { label: 'Facture', icon: '📄' },
                    { label: 'Divers', icon: '✨' }
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setWithdrawalNote(item.label)}
                      className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${withdrawalNote === item.label ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white text-gray-400 border border-gray-100 hover:border-orange-200'}`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={() => { setWithdrawalModal(false); setWithdrawalAmount(''); setWithdrawalNote(''); }} className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={handleWithdrawal} disabled={!withdrawalAmount} className="h-16 bg-orange-500 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-30">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {dimensionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
              <Maximize2 size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-2 tracking-tighter">Dimensions</h2>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-8">{dimensionsModal.article.name}</p>

            <div className="w-full space-y-6 mb-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Largeur (m)</p>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={dimWidth}
                    onChange={(e) => setDimWidth(e.target.value)}
                    className="w-full bg-transparent border-none text-2xl font-black focus:ring-0 p-0 text-gray-800"
                  />
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Hauteur (m)</p>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={dimHeight}
                    onChange={(e) => setDimHeight(e.target.value)}
                    className="w-full bg-transparent border-none text-2xl font-black focus:ring-0 p-0 text-gray-800"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck size={20} className={dimIsSupplier ? "text-blue-600" : "text-gray-400"} />
                    <div>
                      <p className="text-[10px] font-black text-gray-800 uppercase">Fournisseur Externe</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Envoyer au sous-traitant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDimIsSupplier(!dimIsSupplier)}
                    className={`w-14 h-8 rounded-full transition-all relative ${dimIsSupplier ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${dimIsSupplier ? 'right-1' : 'left-1'} shadow-sm`} />
                  </button>
                </div>

                {dimIsSupplier && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-3 tracking-widest">Sélectionner le prestataire</p>
                    <div className="grid grid-cols-1 gap-2">
                      {state.suppliers.map(sup => (
                        <button
                          key={sup.id}
                          onClick={() => setDimSupplierId(sup.id)}
                          className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all ${dimSupplierId === sup.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-white bg-white hover:border-gray-100'}`}
                        >
                          <img src={sup.logo} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          <span className="text-xs font-black uppercase text-gray-800">{sup.name}</span>
                          {dimSupplierId === sup.id && <CheckCircle2 size={16} className="ml-auto text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={() => {
                setDimensionsModal(null);
                setDimWidth('');
                setDimHeight('');
                setDimIsSupplier(false);
              }} className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors">Annuler</button>
              <button
                onClick={addMaisonToCart}
                disabled={!dimWidth || !dimHeight}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupplierModal && editingSupplier && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
              <Truck size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">
              {state.suppliers.find(s => s.id === editingSupplier.id) ? 'Modifier' : 'Nouveau'} Fournisseur
            </h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Nom du Fournisseur</p>
                <input
                  type="text"
                  placeholder="Ex: Tapis Master"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full bg-transparent border-none text-xl font-black uppercase focus:ring-0 p-0 text-gray-800"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Logo URL</p>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editingSupplier.logo}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, logo: e.target.value })}
                  className="w-full bg-transparent border-none text-[10px] font-bold focus:ring-0 p-0 text-blue-600"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Contact / Tél</p>
                <input
                  type="text"
                  placeholder="06XXXXXXXX"
                  value={editingSupplier.contact || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contact: e.target.value })}
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={() => setShowSupplierModal(false)} className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors">Annuler</button>
              <button
                onClick={handleSaveSupplier}
                disabled={!editingSupplier.name}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg flex flex-col shadow-2xl my-auto">
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 flex items-center gap-3">
              <Layers className="text-blue-600" /> {state.inventory.find(a => a.id === editingArticle.id) ? 'Modifier' : 'Nouvel'} Article
            </h2>

            <div className="space-y-6 mb-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Nom de l'article</p>
                  <input
                    type="text"
                    value={editingArticle.name}
                    onChange={(e) => setEditingArticle({ ...editingArticle, name: e.target.value })}
                    className="w-full bg-transparent border-none text-lg font-black uppercase focus:ring-0 p-0"
                  />
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Prix de base (DH)</p>
                  <input
                    type="number"
                    value={editingArticle.basePrice}
                    onChange={(e) => setEditingArticle({ ...editingArticle, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent border-none text-lg font-black focus:ring-0 p-0 text-blue-600"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Catégorie</p>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setEditingArticle({ ...editingArticle, categoryId: cat.id })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingArticle.categoryId === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Image URL</p>
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                    <img src={editingArticle.image} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                  <input
                    type="text"
                    value={editingArticle.image}
                    onChange={(e) => setEditingArticle({ ...editingArticle, image: e.target.value })}
                    className="flex-1 bg-transparent border-none text-[10px] font-bold text-gray-500 focus:ring-0 p-0 h-full"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Prix Spécifiques par Service</p>
                <div className="grid grid-cols-2 gap-4">
                  {SERVICES.map(service => (
                    <div key={service.id} className="flex flex-col gap-1 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]">{service.icon}</span>
                        <span className="text-[8px] font-black uppercase text-gray-500">{service.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder={`${(editingArticle.basePrice * service.multiplier).toFixed(0)}`}
                          value={editingArticle.servicePrices?.[service.id] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            const newPrices = { ...(editingArticle.servicePrices || {}) };
                            if (val === undefined) delete newPrices[service.id];
                            else newPrices[service.id] = val;
                            setEditingArticle({ ...editingArticle, servicePrices: newPrices });
                          }}
                          className="w-full bg-transparent border-none text-[12px] font-black text-blue-600 focus:ring-0 p-0"
                        />
                        <span className="text-[8px] font-black text-gray-300">DH</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] font-bold text-gray-400 mt-4 uppercase italic leading-tight">
                  Laissez vide pour prix auto : (Base {editingArticle.basePrice} DH × Multiplicateur)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setEditingArticle(null)} className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs transition-colors">Annuler</button>
              <button onClick={handleSaveArticle} className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all">
                <Save className="inline-block mr-2" size={18} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTicket && (
        <TicketView
          order={activeTicket.order}
          type={activeTicket.type}
          supplierId={activeTicket.supplierId}
          onClose={() => setActiveTicket(null)}
        />
      )}
    </div>
  );
};

export default App;
