import React, { useState, useMemo, useRef } from "react";
import { useLanguage } from "./context/LanguageContext";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ClipboardList,
  Truck,
  Bell,
  BellOff,
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
  User as UserIcon,
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
  ChevronDown,
  MapPin,
  ShoppingBag,
  Grid,
} from "lucide-react";
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
  UserRole,
  AuditLog,
  CategoryRef,
  ServiceRef,
  StockItem,
  ExpenseArticle,
  OldStockItem,
} from "./types";
import {
  MACHINE_STATUS_COLORS,
  STATUS_COLORS,
  SERVICE_ICONS,
} from "./constants";
import ArticleCard from "./components/ArticleCard";
import ServiceSelector from "./components/ServiceSelector";
import TicketView from "./components/TicketView";
import EditTicketModal from "./components/EditTicketModal";
import * as api from "./services/api";

/** Drop zone for image: drag & drop or click to choose file. Supports URL or data URL. */
const ArticleImageDropbox: React.FC<{
  image: string;
  onImageChange: (image: string) => void;
  showUrlInput?: boolean;
}> = ({ image, onImageChange, showUrlInput = true }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const setImageFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer?.files?.[0];
          if (file) setImageFromFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 min-h-[120px] cursor-pointer transition-colors
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setImageFromFile(file);
            e.target.value = "";
          }}
        />
        {image ? (
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
            <img src={image} className="w-full h-full object-cover" alt="Preview" />
          </div>
        ) : null}
        <span className="text-[10px] font-bold text-gray-500">
          {image ? t("common.change_image") || "Changer l'image" : t("common.drop_image") || "Glissez une image ou cliquez"}
        </span>
      </div>
      {showUrlInput && (
        <input
          type="text"
          value={image}
          onChange={(e) => onImageChange(e.target.value)}
          className="w-full bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 focus:ring-2 focus:ring-blue-400 px-3 py-2"
          placeholder="https://... (ou déposez une image ci-dessus)"
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentView: "POS",
    posStep: "CATEGORY",
    selectedCategory: null,
    cart: [],
    orders: [],
    machines: [],
    inventory: [],
    invoices: [],
    suppliers: [],
    users: [],
    transactions: [],
    clients: [],
    auditLogs: [],
    categories: [],
    services: [],
    stockItems: [],
    expenseArticles: [],
    oldStockItems: [],
    notifications: [],
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  const [showMachineModal, setShowMachineModal] = useState(false);
  const [newMachine, setNewMachine] = useState({
    name: "",
    type: "washer",
    capacity: "10kg",
  });
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditItemForDelivery, setCreditItemForDelivery] = useState<{
    orderId: string;
    itemId: string;
    orderTotal: number;
    orderPaid: number;
  } | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmountInput, setAdvanceAmountInput] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostItemData, setLostItemData] = useState<{
    orderId: string;
    itemId: string;
    itemName: string;
    defaultAmount: number;
  } | null>(null);
  const [lostReimbursementAmount, setLostReimbursementAmount] = useState("");

  // Pas de service – confirmation du montant à déduire
  const [showNoServiceModal, setShowNoServiceModal] = useState(false);
  const [noServiceItemData, setNoServiceItemData] = useState<{
    orderId: string;
    itemId: string;
    itemName: string;
    defaultAmount: number;
  } | null>(null);
  const [noServiceAmount, setNoServiceAmount] = useState("");

  // Supplier measurement modal (receive from fournisseur for maison)
  const [showSupplierMeasureModal, setShowSupplierMeasureModal] =
    useState(false);
  const [supplierMeasureItem, setSupplierMeasureItem] = useState<{
    orderId: string;
    itemId: string;
    articleId: string;
    serviceId: ServiceId;
    articleName: string;
    categoryId: CategoryId;
    supplierId?: string;
  } | null>(null);
  const [measureWidth, setMeasureWidth] = useState("");
  const [measureHeight, setMeasureHeight] = useState("");
  const [measureSurface, setMeasureSurface] = useState("");
  const [supplierPricePerM2, setSupplierPricePerM2] = useState("");
  const [clientPricePerM2, setClientPricePerM2] = useState("");

  // Load all data from DB on mount
  const loadData = async () => {
    try {
      const [
        orders,
        categories,
        services,
        inventory,
        users,
        suppliers,
        machines,
        clients,
        transactions,
        auditLogs,
        invoices,
        stockItems,
        expenseArticles,
        oldStockItems,
        notifications,
      ] = await Promise.all([
        api.getOrders().catch(() => []),
        api.getCategories().catch(() => []),
        api.getServices().catch(() => []),
        api.getArticles().catch(() => []),
        api.getUsers().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getMachines().catch(() => []),
        api.getClients().catch(() => []),
        api.getTransactions().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getSupplierInvoicesList().catch(() => []),
        api.getStock().catch(() => []),
        api.getExpenseArticles().catch(() => []),
        api.getOldStockItems().catch(() => []),
        state.currentUser
          ? api.getNotifications(state.currentUser.id).catch(() => [])
          : Promise.resolve([]),
      ]);

      const orderStatusFromItems = (itemStatuses: OrderStatus[]): OrderStatus => {
        const sequence: OrderStatus[] = ["reçu", "lavage", "fournisseur", "repassage", "prêt", "livré", "no_service", "lost"];
        const closedStatuses: OrderStatus[] = ["livré", "no_service", "lost"];
        const inProgress = itemStatuses.filter((s) => !closedStatuses.includes(s));
        if (inProgress.length === 0) return "livré";
        const lowestIndex = Math.min(...inProgress.map((s) => (sequence.indexOf(s) >= 0 ? sequence.indexOf(s) : 999)));
        return sequence[lowestIndex] ?? "reçu";
      };

      const ordersNorm: Order[] = (orders || []).map((o: any) => {
        const items = (o.items || []).map((i: any) => {
          const art = (inventory || []).find((a: any) => a.id === i.articleId);
          return {
            id: i.id,
            articleId: i.articleId,
            articleName: art?.name ?? "Article",
            articleName_ar: art?.name_ar,
            categoryId: (art?.categoryId ?? "homme") as CategoryId,
            image: art?.image ?? "",
            quantity: i.quantity ?? 1,
            serviceId: (i.service || "lavage") as ServiceId,
            price: i.totalPrice ?? 0,
            isSupplierItem: !!i.supplierId,
            width: i.width,
            height: i.height,
            supplierId: i.supplierId,
            supplierPrice: i.supplierPrice,
            barcode: i.id,
            status: (i.status || "reçu") as OrderStatus,
            placement: i.placement,
            assignedTo: i.assignedTo,
            processedBy: i.processedBy,
            sentAt: i.sentAt,
            receivedAt: i.receivedAt,
            statusUpdatedAt: i.statusUpdatedAt,
          };
        });
        const derivedStatus = orderStatusFromItems(items.map((it) => it.status));
        return {
          id: o.ticketId ?? o.id,
          ticketId: o.ticketId ?? o.id,
          items,
          total: o.total ?? 0,
          subtotal: o.total ?? 0,
          paid: o.paid ?? 0,
          status: derivedStatus,
          createdAt: o.createdAt ?? new Date().toISOString(),
          pickupDate: o.pickupDate ?? new Date().toISOString(),
          paymentMode: (o.paymentMode || "place") as
            | "place"
            | "avance"
            | "credit",
          customerPhone: o.customerPhone,
          clientId: o.clientId,
          clientName: o.clientName,
          createdBy: o.createdBy,
        };
      });

      setState((prev) => ({
        ...prev,
        orders: ordersNorm,
        categories: (categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          name_ar: c.name_ar,
          image: c.image,
          color: c.color,
        })),
        services: (services || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          name_ar: s.name_ar,
          multiplier: s.multiplier,
          image: s.image,
          color: s.color,
        })),
        inventory: (inventory || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          name_ar: a.name_ar,
          categoryId: a.categoryId,
          image: a.image ?? "",
          basePrice: a.basePrice ?? 0,
          stock: a.stock,
          supplierCost: a.supplierCost,
        })),
        users: (users || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar ?? "👤",
          pin: u.pin,
          salary: u.salary ?? 0,
          phone: u.phone ?? "",
        })),
        suppliers: (suppliers || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          name_ar: s.name_ar,
          logo: s.logo ?? "",
          contact: s.contact,
        })),
        machines: (machines || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          name_ar: m.name_ar,
          type: m.type,
          status: m.status ?? "disponible",
          capacity: m.capacity,
          timeRemaining: m.timeRemaining,
          program: m.program,
        })),
        clients: (clients || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? "",
          address: c.address ?? "",
          notificationsEnabled: c.notificationsEnabled !== false,
          discountRate: c.discountRate || 0,
          note: c.note || "",
          createdAt: c.createdAt,
        })),
        transactions: (transactions || []).map((t: any) => ({
          id: t.id,
          userId: t.userId,
          userName: t.userName,
          amount: t.amount,
          type: t.type,
          date: t.date,
          note: t.note ?? "",
        })),
        auditLogs: (auditLogs || []).map((l: any) => ({
          id: l.id,
          userId: l.userId,
          userName: l.userName,
          action: l.action,
          details: l.details,
          type: l.type,
          orderId: l.orderId,
          timestamp: l.timestamp,
        })),
        invoices: (invoices || []).map((i: any) => ({
          id: i.id,
          supplierId: i.supplierId,
          amount: i.amount,
          status: i.status,
          createdAt: i.createdAt,
          itemsCount: i.itemsCount ?? 0,
        })),
        stockItems: (stockItems || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          name_ar: s.name_ar,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          minQuantity: s.minQuantity,
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          createdAt: s.createdAt,
        })),
        expenseArticles: (expenseArticles || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          price: e.price,
          image: e.image || "",
        })),
        oldStockItems: (oldStockItems || []).map((o: any) => ({
          id: o.id,
          clientId: o.clientId,
          clientName: o.clientName ?? "",
          placement: o.placement ?? "",
          articleId: o.articleId ?? null,
          articleName: o.articleName ?? "",
          serviceId: o.serviceId ?? null,
          barcode: o.barcode ?? "",
          status: (o.status || "prêt") as OrderStatus,
          createdAt: o.createdAt,
        })),
        notifications: (() => {
          const mapped = (notifications || []).map((n: any) => ({
            id: n.id,
            userId: n.userId ?? null,
            type: n.type,
            title: n.title,
            body: n.body,
            createdAt: n.createdAt,
            readAt: n.readAt ?? null,
          }));
          const existing = prev.notifications || [];
          const byId: Record<string, any> = {};
          for (const n of existing) byId[n.id] = n;
          for (const n of mapped) {
            byId[n.id] = { ...(byId[n.id] || {}), ...n };
          }
          return Object.values(byId).sort((a, b) =>
            new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime(),
          );
        })(),
      }));
    } catch (e) {
      console.error("Failed to load data from API", e);
    }
    setDataLoaded(true);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Refetch orders when opening Suivi (tracking) so deleted orders/items don't stay visible
  React.useEffect(() => {
    if (state.currentView === "TRACKING") {
      loadData();
      // Focus search so barcode scanner can type directly into Suivi
      setTimeout(() => trackingSearchRef.current?.focus(), 100);
    }
  }, [state.currentView]);

  const [pinEntry, setPinEntry] = useState<string>("");
  const [newCategoryNameAr, setNewCategoryNameAr] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const trackingSearchRef = useRef<HTMLInputElement>(null);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState<string>("");
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientPhone, setNewClientPhone] = useState<string>("");
  const [newClientAddress, setNewClientAddress] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "tous">(
    "tous",
  );
  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(
    null,
  );
  const [ticketQueue, setTicketQueue] = useState<Array<{
    order: Order;
    type: "CLIENT" | "INTERNAL" | "SUPPLIER";
    supplierId?: string;
  }>>([]);
  const [withdrawalModal, setWithdrawalModal] = useState<boolean>(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [withdrawalNote, setWithdrawalNote] = useState<string>("");
  const [expenseArticleQuantities, setExpenseArticleQuantities] = useState<Record<string, number>>({});
  const [showExpenseArticleModal, setShowExpenseArticleModal] = useState<boolean>(false);
  const [editingExpenseArticle, setEditingExpenseArticle] = useState<Partial<ExpenseArticle> | null>(null);

  // Discount State (percentage)
  const [discountRateInput, setDiscountRateInput] = useState<string>("");

  // Delivery State
  const [isDelivery, setIsDelivery] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [orderNote, setOrderNote] = useState<string>("");

  // Stock Search State
  const [stockSearch, setStockSearch] = useState<string>("");

  // Dimensions Modal State
  const [dimensionsModal, setDimensionsModal] = useState<{
    article: Article;
  } | null>(null);
  const [dimIsSupplier, setDimIsSupplier] = useState<boolean>(false);
  const [dimSupplierId, setDimSupplierId] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Article Editor State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleManagerCategory, setArticleManagerCategory] = useState<
    CategoryId | "tous"
  >("tous");
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [itemForPlacement, setItemForPlacement] = useState<{
    orderId: string;
    itemId: string;
  } | null>(null);
  // Old stock (Stock Client: client + article + service + placement + barcode for Suivi)
  const [oldStockClientId, setOldStockClientId] = useState<string>("passager");
  const [oldStockNewClientName, setOldStockNewClientName] = useState("");
  const [oldStockNewClientPhone, setOldStockNewClientPhone] = useState("");
  type OldStockLine = { articleId: string | null; articleName: string; serviceId: string; placement: string; barcode: string };
  const [oldStockLines, setOldStockLines] = useState<OldStockLine[]>([
    { articleId: null, articleName: "", serviceId: "lavage", placement: "", barcode: "" },
  ]);
  const [showOldStockForm, setShowOldStockForm] = useState(false);

  const handlePlacementSelection = async (placement: string) => {
    if (!itemForPlacement) return;
    if (!state.currentUser) {
      alert("Veuillez d'abord choisir un utilisateur");
      return;
    }
    try {
      // Fallback: If no user logged in, use the first admin/cashier found (for testing/safety)
      // Ideally should force login, but for now we auto-assign to allow flow
      const defaultUser =
        state.users.find((u) => u.role === "admin") || state.users[0];
      const activeUser = state.currentUser || defaultUser;

      const assignedTo = activeUser?.id || "u1"; // Force u1 if all else fails

      const currentOrder = state.orders.find(
        (o) => o.id === itemForPlacement.orderId,
      );
      const currentItem = currentOrder?.items.find(
        (i) => i.id === itemForPlacement.itemId,
      );

      let processedBy = undefined;
      // If item was in 'reçu', we mark who processed it
      if (currentItem?.status === "reçu") {
        processedBy = activeUser?.id;
      }

      await api.updateItemStatus(
        itemForPlacement.orderId,
        itemForPlacement.itemId,
        "prêt",
        placement,
        assignedTo,
        processedBy,
      );

      // Force reload to get fresh data
      await loadData();

      setShowPlacementModal(false);
      setItemForPlacement(null);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'assignation de l'emplacement");
    }
  };
  const [articleSearch, setArticleSearch] = useState<string>("");

  // Supplier UI State
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>("");
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [supplierTab, setSupplierTab] = useState<
    "articles" | "tous_articles" | "factures" | "historique"
  >("articles");
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState<string>("");
  const [newInvoiceItemsCount, setNewInvoiceItemsCount] = useState<string>("");
  const [supplierArticlePrices, setSupplierArticlePrices] = useState<
    Record<string, number>
  >({});

  // Dashboard period (day / week / month) and calendar dates for filtering
  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const todayStr = toDateStr(new Date());
  const getMonday = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  };
  const [dashboardPeriod, setDashboardPeriod] = useState<
    "day" | "week" | "month"
  >("day");
  const [showDashboardPeriodPicker, setShowDashboardPeriodPicker] =
    useState(false);
  const [dashboardDay, setDashboardDay] = useState<string>(() => todayStr);
  const [dashboardWeekStart, setDashboardWeekStart] = useState<string>(() =>
    toDateStr(getMonday(new Date()))
  );
  const [dashboardMonth, setDashboardMonth] = useState<string>(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  // Edit user modal (STAFF)
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Profile modal (current user: view/edit own info)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  // Placement zones (admin can edit and add). Load from localStorage.
  const PLACEMENT_ZONES_IDS_KEY = "savonnerie_placement_zone_ids";
  const PLACEMENT_ZONES_NAMES_KEY = "savonnerie_placement_zone_names";
  const defaultPlacementZoneIds = ["1", "2", "3", "4"];
  const defaultPlacementZoneNames: Record<string, string> = { "1": "Zone 1", "2": "Zone 2", "3": "Zone 3", "4": "Zone 4" };
  const [placementZoneIds, setPlacementZoneIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(PLACEMENT_ZONES_IDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    return [...defaultPlacementZoneIds];
  });
  const [placementZoneNames, setPlacementZoneNames] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(PLACEMENT_ZONES_NAMES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        return { ...defaultPlacementZoneNames, ...parsed };
      }
    } catch (_) {}
    return { ...defaultPlacementZoneNames };
  });

  // Client Detail View State
  const [selectedClientViewId, setSelectedClientViewId] = useState<string | null>(null);

  // History UI State
  const [historySearchTerm, setHistorySearchTerm] = useState<string>("");
  const [historyFilterType, setHistoryFilterType] = useState<
    AuditLog["type"] | "ALL"
  >("ALL");

  // Category modal (admin – add category on caisse)
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] =
    useState<Partial<CategoryRef> | null>(null);

  // Stock Management State
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [editingStockItem, setEditingStockItem] =
    useState<Partial<StockItem> | null>(null);
  const [stockProductSearch, setStockProductSearch] = useState<string>("");

  // Load article prices when supplier selected (admin / fournisseurs)
  React.useEffect(() => {
    if (!selectedSupplierId) {
      setSupplierArticlePrices({});
      return;
    }
    api
      .getArticlePricesBySupplier(selectedSupplierId)
      .then(setSupplierArticlePrices)
      .catch(() => setSupplierArticlePrices({}));
  }, [selectedSupplierId]);

  // Refetch from database when window gains focus (so DB changes are visible)
  React.useEffect(() => {
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Dashboard Stats (filtered by period: day / week / month + calendar dates)
  const dashboardStats = useMemo(() => {
    let startStr: string;
    let endStr: string;
    if (dashboardPeriod === "day") {
      startStr = endStr = dashboardDay;
    } else if (dashboardPeriod === "week") {
      startStr = dashboardWeekStart;
      const end = new Date(dashboardWeekStart);
      end.setDate(end.getDate() + 6);
      endStr = toDateStr(end);
    } else {
      const [y, m] = dashboardMonth.split("-").map(Number);
      startStr = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0);
      endStr = toDateStr(lastDay);
    }
    const inRange = (d: string) =>
      d >= startStr && d <= endStr;
    const datePart = (s: string) => (s || "").slice(0, 10);
    const periodOrders = state.orders.filter((o) =>
      inRange(datePart(o.createdAt)),
    );

    const revenueToday = periodOrders.reduce((sum, o) => sum + o.paid, 0);
    const expectedToday = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const withdrawalsToday = state.transactions
      .filter(
        (t) =>
          inRange(datePart(t.date)) &&
          (t.type === "withdrawal" ||
            t.type === "expense" ||
            t.type === "salary_payment"),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCashCollected = state.orders.reduce((sum, o) => sum + o.paid, 0);
    const totalWithdrawn = state.transactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const cashInDrawer = totalCashCollected - totalWithdrawn;

    const totalCreditDebt = state.orders.reduce(
      (sum, o) => sum + (o.total - o.paid),
      0,
    );
    const avgOrderValue =
      periodOrders.length > 0 ? revenueToday / periodOrders.length : 0;

    const articlePerformance: Record<string, { qty: number; rev: number }> = {};
    periodOrders.forEach((o) =>
      o.items.forEach((it) => {
        if (!articlePerformance[it.articleName]) {
          articlePerformance[it.articleName] = { qty: 0, rev: 0 };
        }
        articlePerformance[it.articleName].qty += it.quantity;
        articlePerformance[it.articleName].rev += it.price;
      }),
    );
    const topArticles = Object.entries(articlePerformance)
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 5);

    const serviceMix: Record<string, number> = {};
    periodOrders.forEach((o) =>
      o.items.forEach((it) => {
        serviceMix[it.serviceId] = (serviceMix[it.serviceId] || 0) + 1;
      }),
    );
    const totalServices = Object.values(serviceMix).reduce((a, b) => a + b, 0);

    return {
      revenueToday,
      expectedToday,
      withdrawalsToday,
      cashInDrawer,
      totalCreditDebt,
      avgOrderValue,
      orderCountToday: periodOrders.length,
      topArticles,
      serviceMix,
      totalServices,
      startStr,
      endStr,
    };
  }, [state.orders, state.transactions, dashboardPeriod, dashboardDay, dashboardWeekStart, dashboardMonth]);

  // Stock Analytics
  const stockStats = useMemo(() => {
    const inShopOrders = state.orders.filter((o) => o.status !== "livré");
    const totalItems = inShopOrders.reduce(
      (sum, o) =>
        sum +
        o.items.reduce(
          (s, it) => s + (it.categoryId === "maison" ? 1 : it.quantity),
          0,
        ),
      0,
    );
    const readyItems = inShopOrders.filter((o) => o.status === "prêt").length;
    const processingItems = inShopOrders.filter((o) =>
      ["lavage", "repassage"].includes(o.status),
    ).length;

    return { totalItems, readyItems, processingItems, inShopOrders };
  }, [state.orders]);

  const supplierStats = useMemo(() => {
    const enCours: Record<string, number> = {};
    const returnTimes: Record<string, number[]> = {};
    state.suppliers.forEach((s) => {
      enCours[s.id] = 0;
      returnTimes[s.id] = [];
    });
    state.orders.forEach((o) =>
      o.items.forEach((it) => {
        if (!it.supplierId) return;
        if (it.status === "fournisseur") {
          enCours[it.supplierId] = (enCours[it.supplierId] ?? 0) + 1;
        }
        if (it.sentAt && it.receivedAt) {
          const sent = new Date(it.sentAt).getTime();
          const received = new Date(it.receivedAt).getTime();
          const hours = (received - sent) / (1000 * 60 * 60);
          if (hours >= 0 && hours < 720) {
            if (!returnTimes[it.supplierId]) returnTimes[it.supplierId] = [];
            returnTimes[it.supplierId].push(hours);
          }
        }
      }),
    );
    const result: Record<
      string,
      { enCours: number; rating: "green" | "yellow" | "red" }
    > = {};
    state.suppliers.forEach((s) => {
      const times = returnTimes[s.id] ?? [];
      const avgHours = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
      let rating: "green" | "yellow" | "red" = "yellow";
      if (avgHours !== null) {
        if (avgHours < 48) rating = "green";
        else if (avgHours > 96) rating = "red";
      }
      result[s.id] = { enCours: enCours[s.id] ?? 0, rating };
    });
    return result;
  }, [state.orders, state.suppliers]);

  const filteredStock = useMemo(() => {
    return state.orders
      .filter((order) => {
        const matchesSearch =
          order.ticketId.includes(stockSearch) ||
          (order.customerPhone && order.customerPhone.includes(stockSearch));
        return matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [state.orders, stockSearch]);

  const filteredOrders = useMemo(() => {
    return state.orders
      .filter((order) => {
        const matchesSearch =
          order.ticketId.includes(searchTerm) ||
          (order.customerPhone && order.customerPhone.includes(searchTerm));
        const matchesFilter =
          activeFilter === "tous" || order.status === activeFilter;
        return matchesSearch && matchesFilter;
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [state.orders, searchTerm, activeFilter]);

  const handleScanSimulation = () => {
    const id = prompt("Scanner ou Entrer le N° de Ticket :");
    if (!id) return;
    const order = state.orders.find((o) => o.ticketId === id);
    if (order) {
      setTicketQueue([{ order, type: "INTERNAL" }]);
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
      setState((prev) => ({ ...prev, currentUser: user, currentView: "POS" }));
      addAuditLog(
        "USER",
        "Connexion réussie",
        `Utilisateur: ${user.name} (${user.role})`,
        user,
      );
      setSelectedUserForPin(null);
      setPinEntry("");
    } else {
      setPinEntry("");
      alert("Code PIN incorrect");
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
      type: withdrawalNote === "Achat Materiel" ? "expense" : "withdrawal",
      date: new Date().toISOString(),
      note: withdrawalNote || "Retrait caisse",
    };

    setState((prev) => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
    }));
    // Persist notification so it stays even after reload
    (async () => {
      try {
        const created = await api.createNotification({
          userId: state.currentUser?.id ?? null,
          type:
            newTransaction.type === "expense"
              ? "expense_notification"
              : "withdrawal_reminder",
          title:
            newTransaction.type === "expense"
              ? (t("withdrawals.motifs.equipment_purchase") ||
                  "Achat Materiel")
              : t("withdrawals.title") || "Retraits",
          body:
            newTransaction.type === "expense"
              ? `Dépense ${amount.toFixed(2)} DH - ${newTransaction.note}`
              : `Retrait ${amount.toFixed(2)} DH - ${newTransaction.note}`,
        });
        setState((prev) => ({
          ...prev,
          notifications: [created, ...(prev.notifications || [])],
        }));
      } catch (e) {
        console.error("Failed to create withdrawal notification", e);
      }
    })();
    addAuditLog(
      "PAYMENT",
      `Sortie de caisse effectuée`,
      `Montant: ${amount} DH - Motif: ${newTransaction.note} - Demandé par: ${state.currentUser?.name}`,
    );
    setWithdrawalModal(false);
    setWithdrawalAmount("");
    setWithdrawalNote("");
    setExpenseArticleQuantities({});
  };

  const totalExpenseAmount = useMemo(() => {
    return Object.entries(expenseArticleQuantities).reduce((sum, [_, qty]) => {
      const art = state.expenseArticles.find((a) => a.id === _);
      return sum + ((art?.price || 0) * (qty as number));
    }, 0);
  }, [expenseArticleQuantities, state.expenseArticles]);

  React.useEffect(() => {
    if (withdrawalNote === "Achat Materiel" && totalExpenseAmount > 0) {
      setWithdrawalAmount(totalExpenseAmount.toString());
    }
  }, [totalExpenseAmount, withdrawalNote]);

  const handleAddUser = async () => {
    const name = prompt("Nom de l'employé :");
    if (!name?.trim()) return;
    const pin = prompt("Code PIN (4 chiffres) :");
    const salary = parseFloat(prompt("Salaire Mensuel (DH) :") || "0");
    try {
      const created = await api.createUser({
        name: name.trim(),
        role: "cashier",
        pin: pin || "0000",
        avatar: "🧑‍💼",
        salary,
      });
      const newUser: User = {
        id: created.id,
        name: created.name,
        role: (created.role === "admin" ? "admin" : "cashier") as UserRole,
        avatar: created.avatar ?? "👤",
        pin: created.pin,
        salary: created.salary ?? 0,
      };
      setState((prev) => ({ ...prev, users: [...prev.users, newUser] }));
      addAuditLog(
        "USER",
        `Nouvel employé ajouté: ${newUser.name}`,
        `Rôle: ${newUser.role}`,
      );
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout de l'employé.");
    }
  };

  const deleteUser = async (id: string) => {
    if (id === "u1") return alert("Impossible de supprimer l'admin principal");
    if (!confirm("Supprimer cet employé ?")) return;
    const userName = state.users.find((u) => u.id === id)?.name || id;
    try {
      await api.deleteUser(id);
      setState((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== id),
      }));
      addAuditLog("USER", `Employé supprimé: ${userName}`, `ID: ${id}`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    }
  };

  const calculateItemPrice = (
    article: Article,
    serviceId: string,
    quantity: number = 1,
    width?: number,
    height?: number,
  ) => {
    // For category "maison", price is defined later (after fournisseur measures).
    // So at caisse time we always use 0, the real price will be set via Edit Ticket / updateItemPrice.
    if (article.categoryId === "maison") {
      return 0;
    }

    const service = state.services.find((s) => s.id === serviceId);
    const specificPrice = article.servicePrices?.[serviceId];

    if (specificPrice !== undefined && specificPrice !== null) {
      return specificPrice * quantity;
    }

    const multiplier = service?.multiplier || 1;
    return article.basePrice * quantity * multiplier;
  };

  const addToCart = (articleId: string) => {
    const article = state.inventory.find((a) => a.id === articleId);
    if (!article) return;

    if (article.categoryId === "maison") {
      setDimensionsModal({ article });
      return;
    }

    setState((prev) => {
      let newCart = [...prev.cart];
      const barcode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      newCart.push({
        id: Date.now().toString() + Math.random(),
        articleId: article.id,
        articleName: article.name,
        categoryId: article.categoryId,
        image: article.image,
        quantity: 1,
        serviceId: "lavage",
        price: calculateItemPrice(article, "lavage", 1),
        isSupplierItem: false,
        supplierStatus: undefined,
        barcode,
        status: "reçu",
      });
      return { ...prev, cart: newCart };
    });
  };

  const addMaisonToCart = () => {
    if (!dimensionsModal) return;
    const { article } = dimensionsModal;

    setState((prev) => {
      const newCart = [...prev.cart];
      const barcode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      newCart.push({
        id: Date.now().toString() + Math.random(),
        articleId: article.id,
        articleName: article.name,
        categoryId: article.categoryId,
        image: article.image,
        quantity: 1,
        serviceId: "lavage",
        price: calculateItemPrice(article, "lavage", 1),
        isSupplierItem: dimIsSupplier,
        supplierId: dimIsSupplier ? dimSupplierId : undefined,
        supplierStatus: dimIsSupplier ? "En stock" : undefined,
        barcode,
        status: "reçu",
      });
      return { ...prev, cart: newCart };
    });
    setDimensionsModal(null);
    setDimIsSupplier(false);
  };

  const removeFromCart = (articleId: string) => {
    setState((prev) => {
      const existingIdx = prev.cart.findIndex((i) => i.articleId === articleId);
      if (existingIdx === -1) return prev;
      let newCart = [...prev.cart];
      const item = newCart[existingIdx];

      if (item.categoryId === "maison") {
        newCart.splice(existingIdx, 1);
        return { ...prev, cart: newCart };
      }

      if (item.quantity > 1) {
        const newQty = item.quantity - 1;
        const article = prev.inventory.find((a) => a.id === item.articleId);
        if (!article) return item;
        newCart[existingIdx] = {
          ...item,
          quantity: newQty,
          price: calculateItemPrice(
            article,
            item.serviceId,
            newQty,
            item.width,
            item.height,
          ),
        };
      } else {
        newCart.splice(existingIdx, 1);
      }
      return { ...prev, cart: newCart };
    });
  };

  const removeCartItemCompletely = (articleId: string) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.filter((i) => i.articleId !== articleId),
    }));
  };

  const clearCart = () => {
    if (state.cart.length === 0) return;
    if (!confirm(t("pos.confirm_clear_cart") || "Vider le panier ?")) return;
    setState((prev) => ({ ...prev, cart: [] }));
  };

  const updateService = (cartId: string, serviceId: ServiceId) => {
    const service = state.services.find((s) => s.id === serviceId);
    if (!service) return;

    setState((prev) => ({
      ...prev,
      cart: prev.cart.map((item) => {
        if (item.id === cartId) {
          const article = prev.inventory.find((a) => a.id === item.articleId);
          if (!article) return item;

          const calculatedPrice = calculateItemPrice(
            article,
            serviceId,
            item.quantity,
            item.width,
            item.height,
          );

          return { ...item, serviceId, price: calculatedPrice };
        }
        return item;
      }),
    }));
  };

  const toggleSupplierItem = (cartId: string, isSupplier: boolean) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.map((item) => {
        if (item.id === cartId) {
          return {
            ...item,
            isSupplierItem: isSupplier,
            supplierId: isSupplier ? prev.suppliers[0]?.id : undefined,
            supplierStatus: isSupplier ? "En stock" : undefined,
          };
        }
        return item;
      }),
    }));
  };

  const updateSupplierId = (cartId: string, supplierId: string) => {
    setState((prev) => {
      const item = prev.cart.find((i) => i.id === cartId);
      if (!item) return prev;

      const defaultPrice = supplierId ? item.price / 2 : undefined;

      return {
        ...prev,
        cart: prev.cart.map((i) =>
          i.id === cartId
            ? {
                ...i,
                supplierId: supplierId || undefined,
                supplierPrice: supplierId
                  ? (i.supplierPrice ?? defaultPrice)
                  : undefined,
                isSupplierItem: !!supplierId,
              }
            : i,
        ),
      };
    });
  };

  const updateSupplierPrice = (cartId: string, price: number) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.map((item) =>
        item.id === cartId ? { ...item, supplierPrice: price } : item,
      ),
    }));
  };

  const cartSubtotal = useMemo(() => {
    return state.cart.reduce((sum, item) => sum + item.price, 0);
  }, [state.cart]);

  const hasMaisonWithSupplier = useMemo(
    () =>
      state.cart.some(
        (item) => item.categoryId === "maison" && !!item.supplierId,
      ),
    [state.cart],
  );

  // Calculate Total Spent and Previous Discounts
  const { clientTotalSpent, timesDiscounted } = useMemo(() => {
    if (!selectedClient) return { clientTotalSpent: 0, timesDiscounted: 0 };
    return state.orders
      .filter((o) => o.clientId === selectedClient.id)
      .reduce(
        (acc, o) => {
          acc.clientTotalSpent += o.total;
          // Count how many times the client received a 5% discount exactly.
          if (o.discountRate === 5) {
            acc.timesDiscounted += 1;
          }
          return acc;
        },
        { clientTotalSpent: 0, timesDiscounted: 0 }
      );
  }, [state.orders, selectedClient]);

  // Determine Automatic Discount Rate
  // Priority: Admin-set client discount > Auto-calculated discount
  const autoDiscountRate = useMemo(() => {
    if (!selectedClient) return 0;
    
    // If admin has set a specific discount for this client, use it
    if (selectedClient.discountRate && selectedClient.discountRate > 0) {
      return selectedClient.discountRate;
    }
    
    // Rule 1: After 1000 DH total spent, 10% in every ticket
    if (clientTotalSpent >= 1000) return 10;
    
    // Rule 2: For every 100 DH spent, 5% on exactly ONE ticket
    const earned5PercentDiscounts = Math.floor(clientTotalSpent / 100);
    if (earned5PercentDiscounts > timesDiscounted) {
      return 5;
    }
    
    return 0;
  }, [clientTotalSpent, timesDiscounted, selectedClient]);

  // Discount Calculation based on percentage (Auto or Manual Override)
  const discountRate =
    discountRateInput !== ""
      ? parseFloat(discountRateInput) || 0
      : autoDiscountRate;
  const discountAmount = (cartSubtotal * discountRate) / 100;
  const finalOrderTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleFinishOrder = (
    paymentMode: "place" | "avance" | "credit",
    paid: number,
  ) => {
    const userId = state.currentUser?.id || "anonymous";
    const pickupDate = new Date(Date.now() + 86400000 * 2).toISOString();

    const orderPayload = {
      clientId: selectedClient?.id ?? null,
      customerPhone: (customerPhone && customerPhone.trim()) || (selectedClient?.phone && selectedClient.phone.trim()) || null,
      userId,
      total: finalOrderTotal,
      paid,
      pickupDate,
      isDelivery,
      deliveryAddress: isDelivery ? deliveryAddress.trim() : "",
      clientAddress: selectedClient?.address || "",
      note: orderNote.trim(),
      paymentMode,
      items: state.cart.map((item) => ({
        articleId: item.articleId,
        service: item.serviceId,
        quantity: item.categoryId === "maison" ? 1 : item.quantity,
        width: item.width,
        height: item.height,
        unitPrice:
          item.categoryId === "maison"
            ? item.price
            : item.quantity > 0
              ? item.price / item.quantity
              : item.price,
        totalPrice: item.price,
        supplierId: item.supplierId,
        supplierPrice: item.supplierPrice,
      })),
    };

    (async () => {
      // Helper to generate date-based fallback ticket ID
      const generateDateTicketId = () => {
        const now = new Date();
        const datePrefix =
          (now.getMonth() + 1).toString().padStart(2, "0") +
          now.getDate().toString().padStart(2, "0");
        // Count existing orders with today's prefix for incrementing
        const todayCount = state.orders.filter((o) =>
          o.ticketId.startsWith(datePrefix),
        ).length;
        return datePrefix + (todayCount + 1).toString().padStart(2, "0");
      };

      let ticketId: string;
      let itemIds: string[] | undefined;

      try {
        const result = await api.createOrder(orderPayload as any);
        ticketId = (result && result.ticketId) || generateDateTicketId();
        itemIds = result?.itemIds;
      } catch (error: any) {
        console.error("Failed to persist order to backend", error);
        ticketId = generateDateTicketId();
      }

      // Assign ticket-based barcodes to items: ticketId + 01, 02, 03...
      const itemsWithIds = state.cart.map((item, i) => ({
        ...item,
        id:
          (itemIds && itemIds[i]) ||
          ticketId + (i + 1).toString().padStart(2, "0"),
        barcode:
          (itemIds && itemIds[i]) ||
          ticketId + (i + 1).toString().padStart(2, "0"),
      }));

      const newOrder: Order = {
        id: ticketId,
        ticketId,
        items: itemsWithIds,
        subtotal: cartSubtotal,
        discount: discountAmount > 0 ? discountAmount : undefined,
        discountRate: discountRate > 0 ? discountRate : undefined,
        total: finalOrderTotal,
        paid,
        status: "reçu",
        createdAt: new Date().toISOString(),
        pickupDate,
        paymentMode,
        customerPhone: customerPhone || undefined,
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
        isDelivery,
        deliveryAddress: isDelivery ? deliveryAddress.trim() : "",
        clientAddress: selectedClient?.address || "",
        note: orderNote.trim(),
      };

      // Automatically save delivery address to client profile if not already set or if different
      if (isDelivery && deliveryAddress.trim() !== "" && selectedClient) {
        if (selectedClient.address !== deliveryAddress.trim()) {
          try {
            const updatedClient = await api.updateClient(selectedClient.id, { 
              address: deliveryAddress.trim() 
            });
            setState((prev) => ({
              ...prev,
              clients: prev.clients.map((c) => (c.id === selectedClient.id ? updatedClient : c)),
              orders: [newOrder, ...prev.orders],
              cart: [],
              posStep: "CATEGORY",
              selectedCategory: null,
            }));
          } catch (err) {
            console.error("Failed to update client address", err);
            // Still update the local state for orders
            setState((prev) => ({
              ...prev,
              orders: [newOrder, ...prev.orders],
              cart: [],
              posStep: "CATEGORY",
              selectedCategory: null,
            }));
          }
        } else {
          setState((prev) => ({
            ...prev,
            orders: [newOrder, ...prev.orders],
            cart: [],
            posStep: "CATEGORY",
            selectedCategory: null,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          orders: [newOrder, ...prev.orders],
          cart: [],
          posStep: "CATEGORY",
          selectedCategory: null,
        }));
      }

      setCustomerPhone("");
      setSelectedClient(null);
      setDiscountRateInput("");
      setIsDelivery(false);
      setDeliveryAddress("");
      setOrderNote("");
      const newQueue: Array<{
        order: Order;
        type: "CLIENT" | "INTERNAL" | "SUPPLIER";
        supplierId?: string;
      }> = [{ order: newOrder, type: "CLIENT" }];
      
      const supplierIds = Array.from(new Set(newOrder.items.filter(it => it.isSupplierItem && it.supplierId).map(it => it.supplierId))) as string[];
      supplierIds.forEach(sid => {
        newQueue.push({ order: newOrder, type: "SUPPLIER", supplierId: sid });
      });

      setTicketQueue(newQueue);
      addAuditLog(
        "ORDER",
        `Commande #${newOrder.ticketId} créée`,
        `Total: ${newOrder.total} DH - Mode: ${newOrder.paymentMode} - Client: ${newOrder.clientName || "Passager"}${newOrder.isDelivery ? " (Livraison)" : ""}`,
        undefined,
        newOrder.id,
      );
    })();
  };

  const advanceOrderStatus = (order: Order) => {
    if (!state.currentUser) {
      alert("Veuillez d'abord choisir un utilisateur");
      return;
    }
    const sequence: OrderStatus[] = [
      "reçu",
      "lavage",
      "repassage",
      "prêt",
      "livré",
    ];
    const currentIndex = sequence.indexOf(order.status);
    if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
      const nextStatus = sequence[currentIndex + 1];

      if (nextStatus === "livré" && order.paymentMode === "credit" && order.total > order.paid) {
        setCreditItemForDelivery({
          orderId: order.id,
          // Use the first item's ID for the modal (we'll just advance the item, but really all items should advance)
          // Since the credit modal triggers updateItemStatus, we need to adapt it. 
          // For now, let's just use the first item to pop the modal. The modal handles the payment.
          itemId: order.items[0]?.id || "",
          orderTotal: order.total,
          orderPaid: order.paid,
        });
        setShowCreditModal(true);
        return;
      }

      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: nextStatus,
                items: o.items.map((it) => ({ ...it, status: nextStatus })),
              }
            : o,
        ),
      }));
      addAuditLog(
        "ORDER",
        `Commande #${order.ticketId} mise à jour`,
        `Le statut global passe de "${order.status}" à "${nextStatus}". Tous les articles ont été synchronisés.`,
        undefined,
        order.id,
      );
    }
  };

  const updateItemStatus = async (
    orderId: string,
    itemId: string,
    newStatus: OrderStatus,
    reimbursementAmount?: number,
  ) => {
    try {
      // Auto-assign current user if they are an agent/cashier
      // Automatic assignment:
      // 1. Current User (Logged In)
      // 2. Default Admin (Fallback)
      // 3. 'u1' (Hard Fallback)
      const defaultUser =
        state.users.find((u) => u.role === "admin") || state.users[0];
      const activeUser = state.currentUser || defaultUser;

      const assignedTo = activeUser?.id || "u1";

      const currentOrder = state.orders.find((o) => o.id === orderId);
      const currentItem = currentOrder?.items.find((i) => i.id === itemId);

      // If item was in 'reçu' and moving to something else, record who processed it
      let processedBy = undefined;
      if (currentItem?.status === "reçu" && newStatus !== "reçu") {
        processedBy = activeUser?.id;
      }

      await api.updateItemStatus(
        orderId,
        itemId,
        newStatus,
        undefined,
        assignedTo,
        processedBy,
        (newStatus === "no_service" || newStatus === "lost") ? activeUser?.id : undefined,
        (newStatus === "no_service" || newStatus === "lost") ? activeUser?.name : undefined,
        (newStatus === "no_service" || newStatus === "lost") ? reimbursementAmount : undefined,
      );

      if (newStatus === "no_service" || newStatus === "lost") {
        const order = state.orders.find((o) => o.id === orderId);
        const itemName = order?.items.find((i) => i.id === itemId)?.articleName;
        addAuditLog(
          "ORDER",
          "Statut d'article changé",
          `Ticket #${order?.ticketId} - ${itemName} - ${newStatus === "no_service" ? t("stock_client.no_service") : t("stock_client.lost")} (déduction Fonds de Caisse si payé)`,
          undefined,
          orderId,
        );
        await loadData();
        return;
      }

      setState((prev) => {
        const newOrders = prev.orders.map((order) => {
          if (order.id === orderId) {
            const newItems = order.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: newStatus,
                    assignedTo: assignedTo || item.assignedTo,
                    processedBy: processedBy || item.processedBy,
                  }
                : item,
            );

            // Determine overall order status based on items
            // If all items are 'livré', order is 'livré'
            // If all items are 'prêt', order is 'prêt'
            // If any item is in 'lavage' or 'repassage', order is that status
            let overallStatus: OrderStatus = order.status;
            const statusPriority: OrderStatus[] = [
              "livré",
              "prêt",
              "repassage",
              "lavage",
              "reçu",
            ];

            for (const status of statusPriority) {
              if (newItems.some((it) => it.status === status)) {
                overallStatus = status;
                // Special case: if some are prêt but some are still in lavage, order is still in production step
              }
            }

            // Simpler logic: lowest status in the sequence defines the order progress?
            // No, usually "In Production" means it's not ready.
            // Let's use the first status in the sequence that any item has.
            const sequence: OrderStatus[] = [
              "reçu",
              "lavage",
              "fournisseur",
              "repassage",
              "prêt",
              "livré",
              "no_service",
              "lost",
            ];
            const closedStatuses: OrderStatus[] = ["livré", "no_service", "lost"];
            const inProgress = newItems.filter((it) => !closedStatuses.includes(it.status));
            if (inProgress.length === 0) {
              overallStatus = "livré";
            } else {
              const lowestStatusIndex = Math.min(
                ...inProgress.map((it) => sequence.indexOf(it.status) >= 0 ? sequence.indexOf(it.status) : 999),
              );
              overallStatus = sequence[lowestStatusIndex] || "reçu";
            }

            addAuditLog(
              "ORDER",
              `Statut d'article changé`,
              `Ticket #${order.ticketId} - Article: ${newItems.find((it) => it.id === itemId)?.articleName} - Nouveau statut: ${newStatus}`,
              undefined,
              order.id,
            );
            return { ...order, items: newItems, status: overallStatus };
          }
          return order;
        });
        return { ...prev, orders: newOrders };
      });
    } catch (error) {
      console.error("Failed to update item status", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const assignItemWorker = async (
    orderId: string,
    itemId: string,
    userId: string,
  ) => {
    try {
      const item = state.orders
        .find((o) => o.id === orderId)
        ?.items.find((it) => it.id === itemId);
      if (item) {
        await api.updateItemStatus(
          orderId,
          itemId,
          item.status,
          undefined,
          userId,
        );
      }

      setState((prev) => ({
        ...prev,
        orders: prev.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map((item) =>
                  item.id === itemId ? { ...item, assignedTo: userId } : item,
                ),
              }
            : order,
        ),
      }));
      const userName =
        state.users.find((u) => u.id === userId)?.name || "Inconnu";
      const itemName =
        state.orders
          .find((o) => o.id === orderId)
          ?.items.find((it) => it.id === itemId)?.articleName || "Article";
      const ticketId =
        state.orders.find((o) => o.id === orderId)?.ticketId || "?";
      addAuditLog(
        "USER",
        `Tâche assignée`,
        `${userName} doit s'occuper de "${itemName}" (Commande #${ticketId})`,
      );
    } catch (error) {
      console.error("Failed to assign worker", error);
      alert("Erreur lors de l'assignation");
    }
  };

  const assignItemSupplier = async (
    orderId: string,
    itemId: string,
    supplierId: string,
    supplierPrice?: number,
  ) => {
    const order = state.orders.find((o) => o.id === orderId);
    const item = order?.items.find((i) => i.id === itemId);
    if (!item) return;

    const finalPrice =
      supplierPrice ?? (supplierId ? item.price / 2 : undefined);

    try {
      await api.updateOrderItemSupplier(
        itemId,
        supplierId || null,
        finalPrice || null,
      );
    } catch (error) {
      console.error("Failed to update supplier", error);
    }

    setState((prev) => {
      const newOrders = prev.orders.map((order) => {
        if (order.id === orderId) {
          const newItems = order.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  supplierId: supplierId || undefined,
                  supplierPrice: finalPrice,
                  isSupplierItem: !!supplierId,
                  status: "reçu",
                  supplierStatus: supplierId ? "Chez fournisseur" : undefined,
                }
              : item,
          );

          const statuses = newItems.map((it) => it.status);
          let overallStatus: OrderStatus = "reçu";
          if (statuses.every((s) => s === "livré")) overallStatus = "livré";
          else if (statuses.every((s) => s === "prêt" || s === "livré"))
            overallStatus = "prêt";
          else if (statuses.some((s) => s === "fournisseur"))
            overallStatus = "fournisseur";
          else if (statuses.some((s) => s === "repassage"))
            overallStatus = "repassage";
          else if (statuses.some((s) => s === "lavage"))
            overallStatus = "lavage";

          return { ...order, items: newItems, status: overallStatus };
        }
        return order;
      });
      const supplierName =
        prev.suppliers.find((s) => s.id === supplierId)?.name || "Inconnu";
      const order = prev.orders.find((o) => o.id === orderId);
      const articleName =
        order?.items.find((i) => i.id === itemId)?.articleName || "Article";
      addAuditLog(
        "SUPPLIER",
        "Fournisseur assigné",
        `Ticket #${order?.ticketId} - ${articleName} - Fournisseur: ${supplierName} (cliquer « Fournisseur a récupéré » quand il a pris l'article)`,
      );
      return { ...prev, orders: newOrders };
    });
  };

  const receiveItemFromSupplier = async (orderId: string, itemId: string) => {
    if (!state.currentUser) {
      alert("Veuillez d'abord choisir un utilisateur");
      return;
    }
    const item = state.orders.find((o) => o.id === orderId)?.items.find((i) => i.id === itemId);
    const amount = item?.supplierPrice ?? 0;
    if (amount > 0 && !confirm(`Récupérer l'article du fournisseur ? Le montant ${amount.toFixed(2)} DH sera déduit des Fonds de Caisse (paiement fournisseur).`)) {
      return;
    }
    try {
      const defaultUser = state.users.find((u) => u.role === "admin") || state.users[0];
      const activeUser = state.currentUser || defaultUser;
      await api.updateItemStatus(
        orderId,
        itemId,
        "repassage",
        undefined,
        undefined,
        undefined,
        activeUser?.id,
        activeUser?.name,
      );
      await loadData();
      const order = state.orders.find((o) => o.id === orderId);
      const articleName = order?.items.find((i) => i.id === itemId)?.articleName || "Article";
      addAuditLog(
        "SUPPLIER",
        "Article récupéré du fournisseur",
        `Ticket #${order?.ticketId} - ${articleName} (${amount > 0 ? amount.toFixed(2) + " DH déduits Fonds de Caisse" : "Prêt à repasser"})`,
      );
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la récupération.");
    }
  };

  const updateMachineStatus = async (
    machineId: string,
    status: MachineStatus,
    time?: number,
    program?: any,
  ) => {
    try {
      await api.updateMachineStatus(machineId, status, time, program);
      setState((prev) => ({
        ...prev,
        machines: prev.machines.map((m) =>
          m.id === machineId
            ? { ...m, status, timeRemaining: time, program }
            : m,
        ),
      }));
    } catch (e) {
      console.error(e);
      alert("Erreur update machine");
    }
  };

  const handleCreateMachine = async () => {
    if (!newMachine.name) return alert("Nom requis");
    try {
      const machine = await api.createMachine(newMachine);
      setState((prev) => ({ ...prev, machines: [...prev.machines, machine] }));
      setShowMachineModal(false);
      setNewMachine({ name: "", type: "washer", capacity: "10kg" });
      addAuditLog(
        "SYSTEM",
        `Nouvelle machine: ${machine.name}`,
        `ID: ${machine.id}`,
      );
    } catch (e) {
      alert("Erreur création machine");
    }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm("Supprimer cette machine ?")) return;
    try {
      await api.deleteMachine(id);
      setState((prev) => ({
        ...prev,
        machines: prev.machines.filter((m) => m.id !== id),
      }));
      addAuditLog("SYSTEM", `Machine supprimée`, `ID: ${id}`);
    } catch (e) {
      alert("Erreur suppression machine");
    }
  };

  const handleSaveArticle = async () => {
    if (!editingArticle) return;
    try {
      const exists = state.inventory.find((a) => a.id === editingArticle.id);
      const payload = {
        id: editingArticle.id,
        name: editingArticle.name,
        name_ar: editingArticle.name_ar,
        categoryId: editingArticle.categoryId,
        image: editingArticle.image,
        basePrice: editingArticle.basePrice,
        stock: editingArticle.stock,
        supplierCost: editingArticle.supplierCost,
      };
      const saved = exists
        ? await api.updateArticle(editingArticle.id, payload)
        : await api.createArticle(payload);

      setState((prev) => {
        const withServicePrices = {
          ...saved,
          servicePrices: editingArticle.servicePrices,
        } as Article;
        const already = prev.inventory.find((a) => a.id === saved.id);
        const newInventory = already
          ? prev.inventory.map((a) => (a.id === saved.id ? withServicePrices : a))
          : [...prev.inventory, withServicePrices];
        return { ...prev, inventory: newInventory };
      });

      const mode = exists ? "Mise à jour" : "Création";
      addAuditLog(
        "INVENTORY",
        `${mode} d'article`,
        `Article: ${editingArticle.name} - Catégorie: ${editingArticle.categoryId} - Prix Base: ${editingArticle.basePrice} DH`,
      );
      setEditingArticle(null);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement de l'article.";
      alert(msg);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet article ?")) return;
    const artName = state.inventory.find((a) => a.id === id)?.name || id;
    try {
      await api.deleteArticle(id);
      setState((prev) => ({
        ...prev,
        inventory: prev.inventory.filter((a) => a.id !== id),
      }));
      addAuditLog("INVENTORY", `Article ${artName} supprimé`, `ID: ${id}`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression de l'article.");
    }
  };

  const handleNewArticle = () => {
    setEditingArticle({
      id: Date.now().toString(),
      name: "Nouvel Article",
      categoryId: "homme",
      image:
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500&auto=format&fit=crop",
      basePrice: 10,
    });
  };

  const filteredArticles = useMemo(() => {
    return state.inventory.filter((a) => {
      const matchesSearch = a.name
        .toLowerCase()
        .includes(articleSearch.toLowerCase());
      const matchesCategory =
        articleManagerCategory === "tous" ||
        a.categoryId === articleManagerCategory;
      return matchesSearch && matchesCategory;
    });
  }, [state.inventory, articleSearch, articleManagerCategory]);

  const handleSaveCategory = async () => {
    if (!editingCategory?.name?.trim()) {
      return alert("Nom de la catégorie requis");
    }
    try {
      if (!editingCategory.id) {
        // Create new
        const created = await api.createCategory({
          name: editingCategory.name.trim(),
          name_ar: (editingCategory.name_ar || "").trim(),
          image: editingCategory.image || undefined,
          color: editingCategory.color || "bg-gray-500",
        });
        const newCat: CategoryRef = {
          id: created.id,
          name: created.name,
          name_ar: created.name_ar,
          image: created.image,
          color: created.color,
        };
        setState((prev) => ({
          ...prev,
          categories: [...prev.categories, newCat].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        }));
        addAuditLog(
          "SYSTEM",
          `Nouvelle catégorie: ${newCat.name}`,
          `ID: ${newCat.id}`,
        );
      } else {
        // Update existing
        await api.updateCategory(editingCategory.id, {
          name: editingCategory.name?.trim(),
          name_ar: editingCategory.name_ar?.trim(),
          image: editingCategory.image,
          color: editingCategory.color,
        });
        setState((prev) => ({
          ...prev,
          categories: prev.categories
            .map((c) =>
              c.id === editingCategory.id
                ? {
                    ...c,
                    name: editingCategory.name!.trim(),
                    name_ar: editingCategory.name_ar || "",
                    image: editingCategory.image || "",
                    color: editingCategory.color || "bg-gray-500",
                  }
                : c,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        }));
        addAuditLog(
          "SYSTEM",
          `Catégorie modifiée: ${editingCategory.name}`,
          `ID: ${editingCategory.id}`,
        );
      }
      setEditingCategory(null);
      setShowCategoryModal(false);
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? e.message
          : "Erreur lors de l'enregistrement de la catégorie.",
      );
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (
      !confirm(
        `Supprimer la catégorie « ${name} » ? (Aucun article ne doit y être rattaché)`,
      )
    )
      return;
    try {
      await api.deleteCategory(id);
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      }));
      addAuditLog("SYSTEM", `Catégorie supprimée: ${name}`, `ID: ${id}`);
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? e.message
          : "Impossible de supprimer (catégorie utilisée par des articles ?).",
      );
    }
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientPhone)
      return alert("Nom et téléphone requis");
    try {
      const created = await api.createClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        address: newClientAddress.trim(),
      });
      const newClient: Client = {
        id: created.id,
        name: created.name,
        phone: created.phone ?? "",
        address: created.address ?? "",
        createdAt: created.createdAt ?? new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, clients: [newClient, ...prev.clients] }));
      setSelectedClient(newClient);
      setCustomerPhone(newClientPhone);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientAddress("");
      setShowClientModal(false);
      addAuditLog(
        "CLIENT",
        `Nouveau client enregistré`,
        `Nom: ${newClient.name} - Téléphone: ${newClient.phone}`,
      );
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement du client.");
    }
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier) return;
    const payload = {
      name: editingSupplier.name,
      name_ar: editingSupplier.name_ar || undefined,
      logo: editingSupplier.logo || undefined,
      contact: editingSupplier.contact || undefined,
    };
    try {
      const hasExistingId = editingSupplier.id && state.suppliers.some((s) => s.id === editingSupplier.id);
      let saved: Supplier;
      if (hasExistingId) {
        try {
          saved = (await api.updateSupplier(editingSupplier.id, payload)) as Supplier;
          setState((prev) => ({
            ...prev,
            suppliers: prev.suppliers.map((s) => (s.id === saved.id ? saved : s)),
          }));
        } catch (updateErr: unknown) {
          const err = updateErr as Error & { status?: number };
          if (err?.status === 404) {
            saved = (await api.createSupplier(payload)) as Supplier;
            setState((prev) => ({
              ...prev,
              suppliers: prev.suppliers.filter((s) => s.id !== editingSupplier.id).concat(saved),
            }));
          } else throw updateErr;
        }
      } else {
        saved = (await api.createSupplier(payload)) as Supplier;
        setState((prev) => ({ ...prev, suppliers: [...prev.suppliers, saved] }));
      }
      setEditingSupplier(null);
      setShowSupplierModal(false);
      addAuditLog(
        "SUPPLIER",
        `Fournisseur ${saved.name} enregistré`,
        `ID: ${saved.id}${saved.contact ? ` • Tél: ${saved.contact}` : ""}`,
      );
    } catch (e) {
      const msg = (e as Error).message || "Erreur lors de l'enregistrement du fournisseur.";
      alert(msg);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    const supName = state.suppliers.find((s) => s.id === id)?.name || id;
    try {
      await api.deleteSupplier(id);
      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.filter((s) => s.id !== id),
      }));
      addAuditLog("SUPPLIER", `Fournisseur ${supName} supprimé`, `ID: ${id}`);
    } catch (e) {
      alert((e as Error).message || "Erreur lors de la suppression du fournisseur.");
    }
  };

  const handleNewSupplier = () => {
    setEditingSupplier({
      id: "", // backend will assign id on create
      name: "",
      logo: "",
      contact: "",
    });
    setShowSupplierModal(true);
  };

  const addAuditLog = (
    type: AuditLog["type"],
    action: string,
    details?: string,
    user?: User,
    orderId?: string,
  ) => {
    const activeUser = user || state.currentUser;
    const newLog: AuditLog = {
      id: Date.now().toString() + Math.random(),
      userId: activeUser?.id || "system",
      userName: activeUser?.name || "Système",
      action,
      details,
      timestamp: new Date().toISOString(),
      type,
      orderId,
    };
    // Update local state immediately
    setState((prev) => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs].slice(0, 1000),
    }));
    // Persist to backend so Historique uses audit_logs table
    (async () => {
      try {
        await api.createAuditLog({
          type,
          action,
          details,
          userId: activeUser?.id,
          userName: activeUser?.name,
          orderId,
        });
      } catch (e) {
        console.error("Failed to persist audit log", e);
      }
    })();
  };

  const filteredClients = useMemo(() => {
    return state.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        c.phone.includes(clientSearchTerm),
    );
  }, [state.clients, clientSearchTerm]);

  const menuItems = [
    {
      id: "POS",
      icon: <ShoppingCart size={32} />,
      label: t("menu.pos"),
      roles: ["admin", "cashier"],
    },
    {
      id: "TRACKING",
      icon: <ClipboardList size={32} />,
      label: t("menu.tracking"),
      roles: ["admin", "cashier"],
    },
    {
      id: "STOCK",
      icon: <Package size={32} />,
      label: t("menu.stock_client"),
      roles: ["admin", "cashier"],
    },
    {
      id: "MACHINES",
      icon: <Cpu size={32} />,
      label: t("menu.machines"),
      roles: ["admin", "cashier"],
    },
    {
      id: "ARTICLE_MANAGER",
      icon: <Package size={32} />,
      label: t("menu.articles"),
      roles: ["admin", "cashier"],
    },
    {
      id: "STAFF",
      icon: <UsersIcon size={32} />,
      label: t("menu.staff"),
      roles: ["admin"],
    },
    {
      id: "CLIENTS",
      icon: <UsersIcon size={32} />,
      label: t("menu.clients"),
      roles: ["admin", "cashier"],
    },
    {
      id: "SUPPLIERS",
      icon: <Truck size={32} />,
      label: t("menu.suppliers"),
      roles: ["admin"],
    },
    {
      id: "HISTORY",
      icon: <History size={32} />,
      label: t("menu.history"),
      roles: ["admin"],
    },
    {
      id: "DASHBOARD",
      icon: <BarChart3 size={32} />,
      label: t("menu.stats"),
      roles: ["admin"],
    },
    {
      id: "EXPENSE_ARTICLES",
      icon: <Tag size={32} />,
      label: t("menu.stock_magasin"),
      roles: ["admin"],
    },
  ].filter((item) => item.roles.includes(state.currentUser?.role || ""));

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden text-gray-800 bg-gray-50">
      {!dataLoaded ? (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <p className="text-xl font-black text-gray-400 uppercase">
            {t("status.loading") || "Chargement..."}
          </p>
        </div>
      ) : !state.currentUser ? (
        <div className="h-screen w-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center p-8">
          {!selectedUserForPin ? (
            <>
              <div className="bg-white p-4 rounded-3xl mb-12 shadow-2xl">
                <h1 className="text-3xl font-black text-blue-600 uppercase tracking-tighter">
                  {t("app_title")}
                </h1>
              </div>
              <h2 className="text-white text-3xl font-black uppercase mb-12 tracking-widest">
                {t("login.who_are_you") || "Qui êtes-vous ?"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                {state.users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleLogin(user)}
                    className="bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-[3rem] p-12 transition-all active:scale-95 flex flex-col items-center group"
                  >
                    <div className="text-8xl mb-6 transform group-hover:scale-110 transition-transform">
                      {user.avatar}
                    </div>
                    <div className="text-2xl font-black text-white uppercase">
                      {user.name}
                    </div>
                    <div className="mt-2 px-4 py-1 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                      {user.role}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl w-full max-w-md flex flex-col items-center">
              <button
                onClick={() => {
                  setSelectedUserForPin(null);
                  setPinEntry("");
                }}
                className="self-start text-gray-400 mb-4 text-sm font-bold uppercase tracking-widest"
              >
                {t("common.back") || "Retour"}
              </button>
              <div className="text-6xl mb-4">{selectedUserForPin.avatar}</div>
              <h2 className="text-2xl font-black uppercase mb-1">
                {selectedUserForPin.name}
              </h2>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-8">
                {t("login.enter_pin") || "Saisir votre Code PIN"}
              </p>
              <div className="flex gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full border-4 border-blue-600 ${pinEntry.length > i ? "bg-blue-600" : "bg-transparent"}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      pinEntry.length < 4 && setPinEntry((prev) => prev + n)
                    }
                    className="h-20 bg-gray-100 rounded-2xl text-2xl font-black active:bg-blue-600 active:text-white"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPinEntry("")}
                  className="h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-xl font-black active:bg-red-600 active:text-white"
                >
                  {t("login.clear") || "Effacer"}
                </button>
                <button
                  onClick={() =>
                    pinEntry.length < 4 && setPinEntry((prev) => prev + "0")
                  }
                  className="h-20 bg-gray-100 rounded-2xl text-2xl font-black"
                >
                  0
                </button>
                <button
                  disabled={pinEntry.length !== 4}
                  onClick={handlePinSubmit}
                  className="h-20 bg-green-500 text-white rounded-2xl flex items-center justify-center text-xl font-black active:bg-green-600 disabled:opacity-50"
                >
                  {t("login.ok") || "OK"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full w-full overflow-hidden bg-gray-50">
          <div
            className="flex h-full w-full overflow-hidden flex-shrink-0"
            style={{
              transform: "scale(0.88)",
              transformOrigin: isRTL ? "top right" : "top left",
              width: "113.64%",
              height: "113.64%",
            }}
          >
          <nav
            className={`w-28 md:w-32 flex-shrink-0 bg-white/80 backdrop-blur-xl ${isRTL ? "border-l" : "border-r"} flex flex-col items-center py-6 gap-8 no-print shadow-[0_0_40px_-15px_rgba(0,0,0,0.05)] z-30 h-full min-h-0 transition-all duration-500`}
          >
            <div
              className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-l shadow-lg shadow-indigo-100 cursor-pointer hover:scale-105 active:scale-95 transition-all mb-2"
              onClick={() => {
                setProfileForm({
                  name: state.currentUser?.name ?? "",
                  phone: state.currentUser?.phone ?? "",
                });
                setShowProfileModal(true);
              }}
            >
              {state.currentUser.name}
            </div>

            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 scale-90">
              <button
                onClick={() => setLanguage("ar")}
                className={`w-9 h-9 rounded-lg text-[10px] font-black transition-all ${language === "ar" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                AR
              </button>
              <button
                onClick={() => setLanguage("fr")}
                className={`w-9 h-9 rounded-lg text-[10px] font-black transition-all ${language === "fr" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                FR
              </button>
            </div>

            <div className="flex-1 w-full flex flex-col gap-6 items-center overflow-y-auto no-scrollbar py-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      currentView: item.id as any,
                    }))
                  }
                  className={`group relative flex flex-col items-center gap-1.5 transition-all active:scale-90 w-full px-2`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      state.currentView === item.id
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50"
                        : "bg-transparent text-slate-300 group-hover:bg-slate-50 group-hover:text-slate-600"
                    }`}
                  >
                    {React.cloneElement(item.icon as React.ReactElement, {
                      size: 24,
                    })}
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase tracking-widest text-center px-1 transition-all duration-300 truncate w-full
                    ${state.currentView === item.id ? "text-indigo-600 opacity-100" : "text-slate-400 opacity-70 group-hover:opacity-100 group-hover:text-slate-600"}
                    ${language === "ar" ? "font-arabic text-[11px] leading-none" : ""}`}
                  >
                    {item.label}
                  </span>

                  {state.currentView === item.id && (
                    <div
                      className={`absolute ${isRTL ? "-left-0" : "-right-0"} top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]`}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-6 items-center w-full pb-2">
              <button
                onClick={() => setWithdrawalModal(true)}
                className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-100 active:bg-rose-600 active:text-white transition-all shadow-sm group relative"
              >
                <Wallet size={24} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                  Retrait
                </span>
              </button>

            

              <button
                onClick={() => loadData()}
                className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-100 active:bg-blue-600 active:text-white transition-all shadow-sm group relative"
                title="Rafraîchir les données (base de données)"
              >
                <RotateCw size={24} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                  Rafraîchir
                </span>
              </button>

              <button
                onClick={() => {
                  if (state.currentUser) {
                    addAuditLog(
                      "USER",
                      "Déconnexion",
                      `Utilisateur: ${state.currentUser.name}`,
                    );
                  }
                  setState((prev) => ({
                    ...prev,
                    currentUser: null,
                    currentView: "POS",
                  }));
                }}
                className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 active:bg-rose-500 active:text-white transition-all"
              >
                <LogOut size={24} />
              </button>
            </div>
          </nav>

          <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
            {state.currentUser && (
              <>
                <div
                  className={`absolute top-4 z-40 ${
                    language === "ar" ? "left-4 right-auto" : "right-4 left-auto"
                  }`}
                >
                  <button
                    type="button"
                    onClick={async () => {
                    setShowNotifications((prev) => !prev);
                    if (!showNotifications && state.currentUser) {
                      try {
                        const notifs = await api.getNotifications(state.currentUser.id);
                        setState((prev) => ({
                          ...prev,
                          notifications: (notifs || []).map((n: any) => ({
                            id: n.id,
                            userId: n.userId ?? null,
                            type: n.type,
                            title: n.title,
                            body: n.body,
                            createdAt: n.createdAt,
                            readAt: n.readAt ?? null,
                          })),
                        }));
                      } catch (e) {
                        console.error("Failed to load notifications", e);
                      }
                    }
                  }}
                    className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/80 backdrop-blur shadow-md border border-gray-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  >
                    <Bell size={18} />
                    {state.notifications && state.notifications.some((n) => !n.readAt) && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                        {
                          state.notifications.filter((n) => !n.readAt).length > 9
                            ? "9+"
                            : state.notifications.filter((n) => !n.readAt).length
                        }
                      </span>
                    )}
                  </button>
                </div>
                {showNotifications && (
                  <div
                    className={`absolute mt-2 top-16 z-40 w-72 max-w-[80vw] rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden
                      ${language === "ar" ? "left-4 right-auto" : "right-4 left-auto"}`}
                    >
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {t("notifications.title") || "Notifications"}
                      </span>
                      <div className="flex items-center gap-2">
                        {state.notifications && state.notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!state.currentUser) return;
                              try {
                                await api.markAllNotificationsRead(state.currentUser.id);
                              } catch (e) {
                                console.error("Failed to clear notifications", e);
                              }
                              setState((prev) => ({
                                ...prev,
                                notifications: [],
                              }));
                            }}
                            className="text-[9px] font-bold uppercase text-gray-400 hover:text-red-500"
                          >
                            {t("notifications.clear") || "Effacer"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-300 hover:text-gray-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {(!state.notifications || state.notifications.length === 0) && (
                        <div className="px-4 py-6 text-center text-[11px] text-gray-400">
                          {t("notifications.empty") || "Aucune notification pour le moment."}
                        </div>
                      )}
                      {state.notifications && state.notifications.length > 0 && (
                        <ul className="divide-y divide-gray-100 text-[11px]">
                          {state.notifications.map((n) => (
                            <li
                              key={n.id}
                              className={`px-4 py-3 flex flex-col gap-1 cursor-pointer hover:bg-gray-50 ${
                                n.readAt ? "opacity-70" : ""
                              }`}
                              onClick={async () => {
                                try {
                                  await api.markNotificationRead(n.id);
                                } catch (e) {
                                  console.error("Failed to mark notification read", e);
                                }

                                // Mark as read locally
                                setState((prev) => ({
                                  ...prev,
                                  notifications: (prev.notifications || []).map((x) =>
                                    x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
                                  ),
                                }));

                                // Navigate based on notification type
                                if (n.type === "client_reminder") {
                                  // Extract ticket barcode after "Ticket #"
                                  let search = "";
                                  if (n.body) {
                                    const match = n.body.match(/Ticket\s*#?(\S+)/);
                                    if (match && match[1]) {
                                      search = match[1];
                                    }
                                  }
                                  if (!search) {
                                    search = n.body || "";
                                  }
                                  setSearchTerm(search);
                                  setState((prev) => ({
                                    ...prev,
                                    currentView: "TRACKING",
                                  }));
                                } else {
                                  setState((prev) => ({
                                    ...prev,
                                    currentView: "HISTORY",
                                  }));
                                }

                                setShowNotifications(false);
                              }}
                            >
                              <span className="font-bold text-gray-800">{n.title}</span>
                              <span className="text-gray-500">{n.body}</span>
                              <span className="text-[9px] text-gray-400">
                                {new Date(n.createdAt).toLocaleString(language === "ar" ? "ar-MA" : "fr-FR")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {state.currentView === "POS" && (
              <div className="h-full min-h-0 flex flex-col overflow-hidden">
                {state.posStep === "CATEGORY" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-8 pt-8 pb-4 flex-shrink-0">
                      <h2
                        className={`text-4xl font-black text-slate-900 tracking-tighter ${language === "ar" ? "font-arabic" : "uppercase"}`}
                      >
                        {t("pos.categories")}
                      </h2>
                      <p
                        className={`text-slate-400 font-medium text-sm mt-1 ${language === "ar" ? "font-arabic" : "uppercase tracking-[0.2em]"}`}
                      >
                        {t("pos.categories_subtitle")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-8 overflow-y-auto no-scrollbar content-start pb-24">
                      {state.categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="relative group flex flex-col"
                        >
                          <button
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                selectedCategory: cat.id,
                                posStep: "ARTICLES",
                              }))
                            }
                            className="relative w-full aspect-[4/5] rounded-[2.5rem] bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] group-hover:shadow-[0_40px_80px_-15px_rgba(79,70,229,0.2)] group-hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col border border-white"
                          >
                            <div className="relative flex-1 overflow-hidden">
                              <img
                                src={cat.image || ""}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                alt={cat.name}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                            </div>
                            <div className="bg-white p-6 flex flex-col items-center justify-center min-h-[100px]">
                              <span
                                className={`text-xl font-bold text-slate-900 ${language === "ar" ? "font-arabic" : "uppercase tracking-tight"} text-center`}
                              >
                                {language === "ar" && cat.name_ar
                                  ? cat.name_ar
                                  : cat.name}
                              </span>
                              <div className="mt-2 px-4 py-1.2 bg-indigo-50 rounded-full">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                  {
                                    state.inventory.filter(
                                      (a) => a.categoryId === cat.id,
                                    ).length
                                  }{" "}
                                  Articles
                                </span>
                              </div>
                            </div>
                          </button>

                          {state.currentUser?.role === "admin" && (
                            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(cat);
                                  setShowCategoryModal(true);
                                }}
                                className="w-10 h-10 bg-white/90 backdrop-blur-md text-blue-600 rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white transition-all"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat.id, cat.name);
                                }}
                                className="w-10 h-10 bg-white/90 backdrop-blur-md text-red-500 rounded-2xl flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {state.currentUser?.role === "admin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory({
                              id: "",
                              name: "",
                              name_ar: "",
                              image: "",
                              color: "bg-gray-500",
                            });
                            setShowCategoryModal(true);
                          }}
                          className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-4 border-dashed border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 group"
                        >
                          <div className="w-16 h-16 rounded-[1.5rem] bg-white shadow-sm flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 ring-8 ring-slate-100/50 group-hover:ring-indigo-50">
                            <Plus size={32} />
                          </div>
                          <span
                            className={`text-xs font-black uppercase text-slate-500 tracking-widest group-hover:text-indigo-600 transition-colors`}
                          >
                            {t("pos.new_category")}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {state.posStep === "ARTICLES" && (
                  <div className="flex h-full min-h-0 overflow-hidden bg-[#f8fafc]">
                    {/* Left Side: Article Grid */}
                    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-100 overflow-hidden relative">
                      {/* Sub-header for Articles */}
                      <div className="flex items-center justify-between px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex-shrink-0 z-20 shadow-sm">
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              posStep: "CATEGORY",
                              selectedCategory: null,
                            }))
                          }
                          className="flex items-center gap-2 group px-4 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold uppercase text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
                        >
                          <ArrowLeft
                            size={16}
                            className="group-hover:-translate-x-1 transition-transform"
                          />{" "}
                          {t("common.back")}
                        </button>
                        <div
                          className={`text-2xl font-black text-slate-900 ${language === "ar" ? "font-arabic" : "uppercase tracking-tighter"}`}
                        >
                          {language === "ar" &&
                          state.categories.find(
                            (c) => c.id === state.selectedCategory,
                          )?.name_ar
                            ? state.categories.find(
                                (c) => c.id === state.selectedCategory,
                              )?.name_ar
                            : state.categories.find(
                                (c) => c.id === state.selectedCategory,
                              )?.name}
                        </div>
                        <div className="w-24" /> {/* Spacer */}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                        {state.inventory
                          .filter(
                            (a) => a.categoryId === state.selectedCategory,
                          )
                          .map((art) => (
                            <ArticleCard
                              key={art.id}
                              image={art.image}
                              name={art.name}
                              name_ar={art.name_ar}
                              quantity={state.cart
                                .filter((i) => i.articleId === art.id)
                                .reduce((sum, item) => sum + item.quantity, 0)}
                              onAdd={() => addToCart(art.id)}
                              onRemove={() => removeFromCart(art.id)}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Right Side: Persistent Cart Sidebar */}
                    <div className="w-full lg:w-[400px] xl:w-[450px] bg-white flex flex-col shadow-[-10px_0_40px_-15px_rgba(0,0,0,0.03)] z-20">
                      <div className="p-8 border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <ShoppingCart size={20} />
                          </div>
                          <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">
                            {t("pos.items_selected")}
                          </h3>
                        </div>
                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black">
                          {state.cart.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                        {state.cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                            <ShoppingBag size={64} strokeWidth={1} />
                            <p className="font-bold uppercase text-[10px] tracking-widest">
                              {t("pos.cart_empty")}
                            </p>
                          </div>
                        ) : (
                          state.cart.map((item) => (
                            <div
                              key={item.id}
                              className="bg-slate-50/50 p-4 rounded-2xl flex flex-col gap-4 group border border-transparent hover:border-indigo-100 hover:bg-indigo-50/20 transition-all duration-300"
                            >
                              {/* Row 1: Article image + name, then price */}
                              <div className="flex items-center justify-between gap-3 min-w-0">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                    <img
                                      src={item.image}
                                      alt={(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                      className="w-full h-full object-cover"
                                    />
                                    {item.quantity > 1 && (
                                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white shadow-lg">
                                        {item.quantity}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                                    {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                  </span>
                                </div>
                                <span className="text-sm font-black text-slate-900 shrink-0">
                                  {item.price.toFixed(2)} DH
                                </span>
                              </div>
                              {/* Row 2: Service selector (full width) */}
                              <div className="border-t border-slate-100 pt-3">
                                <ServiceSelector
                                  item={item}
                                  services={state.services}
                                  onUpdateService={(sid) =>
                                    updateService(item.id, sid)
                                  }
                                />
                              </div>
                              {/* Row 3: Quantity and delete buttons */}
                              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => removeFromCart(item.articleId)}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                                    title={t("common.less") || "Moins"}
                                  >
                                    <Minus size={14} strokeWidth={3} />
                                  </button>
                                  <span className="min-w-[1.5rem] text-center text-xs font-black text-slate-700">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => addToCart(item.articleId)}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                                    title={t("common.more") || "Plus"}
                                  >
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeCartItemCompletely(item.articleId)}
                                  className="h-8 px-3 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors text-[10px] font-bold uppercase"
                                  title={t("pos.remove_item") || "Supprimer l'article"}
                                >
                                  <Trash2 size={12} strokeWidth={2.5} />
                                  {t("pos.remove_item") || "Supprimer"}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            {t("pos.cart_summary") || "Récapitulatif"}
                          </p>
                          {state.cart.length > 0 && (
                            <button
                              onClick={clearCart}
                              className="text-[10px] font-black uppercase px-3 py-1 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              {t("pos.clear_cart") || "Vider le panier"}
                            </button>
                          )}
                        </div>
                        <div className="space-y-3 mb-8">
                          <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                            <span>{t("ticket.subtotal")}</span>
                            <span className="text-slate-900">
                              {cartSubtotal.toFixed(2)} DH
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
                            <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                              {t("common.total")}
                            </span>
                            <span className="text-3xl font-black text-indigo-600 tracking-tighter">
                              {cartSubtotal.toFixed(2)}{" "}
                              <span className="text-sm">DH</span>
                            </span>
                          </div>
                        </div>

                        <button
                          disabled={state.cart.length === 0}
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              posStep: "PAYMENT",
                            }))
                          }
                          className="w-full bg-indigo-600 text-white py-5 rounded-[1.8rem] font-bold uppercase shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-30 disabled:shadow-none group"
                        >
                          {t("common.checkout")}
                          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {state.posStep === "PAYMENT" && (
                  <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] overflow-hidden relative">
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex-shrink-0 z-20 shadow-sm">
                      <button
                        onClick={() =>
                          setState((prev) => ({ ...prev, posStep: "ARTICLES" }))
                        }
                        className="flex items-center gap-2 group px-4 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold uppercase text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
                      >
                        <ArrowLeft
                          size={16}
                          className="group-hover:-translate-x-1 transition-transform"
                        />{" "}
                        {t("common.back")}
                      </button>
                      <h2
                        className={`text-2xl font-black text-slate-900 ${language === "ar" ? "font-arabic" : "uppercase tracking-tighter"}`}
                      >
                        {t("common.summary")}
                      </h2>
                      <div className="w-24" /> {/* Spacer */}
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col gap-6 p-8 min-h-0 pb-32">
                      {/* Unified Control Bar */}
                      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] border border-slate-100">
                        <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-slate-100">

                          {/* ── CLIENT SECTION ── */}
                          <div className="flex-[2] p-5 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/40">
                                <UsersIcon size={18} strokeWidth={2.5} />
                              </div>
                              <div className="hidden md:flex flex-col">
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">{t("ticket.client")}</span>
                                <span className="text-[9px] font-medium text-slate-400 leading-none mt-0.5">{selectedClient ? selectedClient.name : t("pos.passenger")}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => { setSelectedClient(null); setCustomerPhone(""); setClientSearchTerm(""); }}
                                className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${!selectedClient ? "bg-slate-800 text-white shadow-lg shadow-slate-300/30" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                              >
                                <UserCheck size={12} /> {t("pos.passenger")}
                              </button>
                              <button
                                onClick={() => setShowClientModal(true)}
                                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-200/40 hover:bg-emerald-600 transition-all active:scale-95"
                              >
                                <UserPlus size={12} /> {t("pos.new")}
                              </button>
                            </div>

                            <div className="flex-1 w-full md:w-auto relative group">
                              {selectedClient ? (
                                <div className="h-11 px-4 bg-gradient-to-r from-indigo-50 to-violet-50/50 rounded-xl flex items-center justify-between border border-indigo-100/60 animate-in zoom-in duration-300">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-7 h-7 bg-indigo-500 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                                      <UserIcon size={12} strokeWidth={3} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-black text-slate-800 text-xs leading-none truncate">{selectedClient.name}</span>
                                      <span className="text-[9px] font-bold text-indigo-400 leading-none mt-0.5">{selectedClient.phone}</span>
                                    </div>
                                    {selectedClient.address && (
                                      <span className="hidden lg:flex items-center gap-1 ml-2 px-2 py-1 bg-white/80 rounded-lg text-[8px] font-bold text-slate-400 border border-slate-100 flex-shrink-0">
                                        📍 {selectedClient.address.length > 20 ? selectedClient.address.slice(0, 20) + "…" : selectedClient.address}
                                      </span>
                                    )}
                                  </div>
                                  <button onClick={() => { setSelectedClient(null); setClientSearchTerm(""); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0 ml-2">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={15} />
                                  <input
                                    type="text"
                                    placeholder={t("pos.search_clients")}
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    className="w-full h-11 pl-10 pr-4 bg-slate-50/80 rounded-xl border border-transparent focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 font-bold text-xs text-slate-700 placeholder:text-slate-300 transition-all"
                                  />
                                  {clientSearchTerm && filteredClients.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-52 overflow-y-auto no-scrollbar ring-4 ring-black/5 animate-in slide-in-from-top-2 duration-200">
                                      {filteredClients.map((c) => (
                                        <button
                                          key={c.id}
                                          onClick={() => { setSelectedClient(c); setCustomerPhone(c.phone); setClientSearchTerm(""); }}
                                          className="w-full px-4 py-3 text-left hover:bg-indigo-50/50 flex items-center justify-between border-b border-slate-50 last:border-0 group transition-colors"
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors text-xs">{c.name}</span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] text-slate-400">{c.phone}</span>
                                              {c.address && <span className="text-[8px] text-slate-300">📍 {c.address.slice(0, 20)}…</span>}
                                            </div>
                                          </div>
                                          <ArrowUpRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── REMISE SECTION ── */}
                          <div className="flex-shrink-0 p-5 flex items-center gap-3 xl:w-[200px]">
                            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200/40 flex-shrink-0">
                              <Percent size={16} strokeWidth={3} />
                            </div>
                            <div className="flex-1 relative group">
                              <input
                                type="number"
                                placeholder={autoDiscountRate > 0 ? autoDiscountRate.toString() : "0"}
                                max="100" min="0"
                                value={discountRateInput}
                                onChange={(e) => setDiscountRateInput(e.target.value)}
                                className="w-full h-11 px-4 bg-slate-50/80 rounded-xl border border-transparent focus:border-rose-200 focus:bg-white focus:ring-4 focus:ring-rose-50 font-black text-lg text-slate-900 transition-all placeholder:text-slate-300"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-200 group-focus-within:text-rose-300">%</div>
                            </div>
                            {autoDiscountRate > 0 && discountRateInput === "" && selectedClient && (
                              <div className="px-2 py-1 bg-rose-50 rounded-lg flex-shrink-0">
                                <span className="text-[9px] font-black text-rose-500">-{autoDiscountRate}%</span>
                              </div>
                            )}
                          </div>

                          {/* ── LIVRAISON SECTION ── */}
                          <div className={`flex-shrink-0 p-5 flex items-center gap-3 xl:min-w-[300px] transition-colors duration-300 ${isDelivery ? 'bg-gradient-to-r from-indigo-50/40 to-transparent' : ''}`}>
                            <button
                              onClick={() => setIsDelivery(!isDelivery)}
                              className="flex items-center gap-2.5 group flex-shrink-0"
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 flex-shrink-0 ${
                                isDelivery ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-200/40' : 'bg-slate-100 text-slate-400 shadow-transparent group-hover:bg-slate-200'
                              }`}>
                                <Truck size={16} strokeWidth={2.5} />
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${isDelivery ? 'text-indigo-700' : 'text-slate-400'}`}>
                                Livraison
                              </span>
                              <div className={`w-10 h-[22px] rounded-full p-0.5 transition-all duration-300 flex-shrink-0 ${isDelivery ? 'bg-gradient-to-r from-indigo-500 to-blue-500' : 'bg-slate-200'}`}>
                                <div className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isDelivery ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                              </div>
                            </button>

                            {isDelivery && (
                              <div className="flex-1 animate-in slide-in-from-right-2 duration-200">
                                <input
                                  type="text"
                                  placeholder="📍 Adresse..."
                                  value={deliveryAddress || (selectedClient?.address || "")}
                                  onChange={(e) => setDeliveryAddress(e.target.value)}
                                  className="w-full h-11 px-4 bg-white rounded-xl border border-indigo-200/60 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Note Input */}
                      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-3">
                        <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={16} />
                        </div>
                        <input
                          type="text"
                          placeholder="📝 Ajouter une note pour ce ticket..."
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          className="flex-1 bg-transparent border-none text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0 p-0"
                        />
                        {orderNote && (
                          <button onClick={() => setOrderNote("")} className="text-slate-300 hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Main Articles Grid: Full Width */}
                      <div className="flex-1 bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between flex-shrink-0 bg-white/50 backdrop-blur-md">
                          <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                              <ShoppingCart size={20} />
                            </div>
                            {t("pos.items_selected")}
                          </h3>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {t("pos.total_articles")}
                            </span>
                            <span className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 animate-in zoom-in">
                              {state.cart.length}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-8 min-h-0 bg-slate-50/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                            {state.cart.map((item) => (
                              <div
                                key={item.id}
                                className="bg-white p-6 rounded-[2.2rem] flex flex-col gap-6 group border border-slate-100 hover:border-indigo-200 transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-indigo-50/80 ring-1 ring-slate-100/50"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-5">
                                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                                      <img
                                        src={item.image}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt={(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                      />
                                      {item.quantity > 1 && (
                                        <div className="absolute -top-1 -right-1 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black border-4 border-white shadow-lg">
                                          {item.quantity}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xl font-black text-slate-900 truncate tracking-tight mb-1">
                                        {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                          {language === "ar" && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}` ? t(`stock_client.${item.serviceId}`) : (state.services.find((s) => s.id === item.serviceId)?.name || t("stock_client.lavage"))}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-2xl font-black text-slate-900 tracking-tighter shadow-sm">
                                      {item.price.toFixed(2)}{" "}
                                      <span className="text-xs">DH</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-50">
                                  <ServiceSelector
                                    item={item}
                                    services={state.services}
                                    onUpdateService={(sid) =>
                                      updateService(item.id, sid)
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-8 bg-white border-t border-slate-100 flex-shrink-0 grid grid-cols-1 md:grid-cols-3 items-center gap-8">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                              <span>{t("ticket.subtotal")}</span>
                              <span className="text-slate-900">
                                {cartSubtotal.toFixed(2)} DH
                              </span>
                            </div>
                            {discountAmount > 0 && (
                              <div className="flex justify-between items-center text-rose-500 font-bold uppercase text-[10px] tracking-widest">
                                <span className="flex items-center gap-2">
                                  <Percent size={14} strokeWidth={3} />{" "}
                                  {t("ticket.discount")} ({discountRate}%)
                                </span>
                                <span className="font-black">
                                  - {discountAmount.toFixed(2)} DH
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="hidden md:block border-x border-slate-50 h-full mx-4" />

                          <div className="flex items-center justify-between md:justify-end gap-12 ml-auto">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                {t("common.total")}{" "}
                                {t("pos.to_pay") || "À PAYER"}
                              </span>
                              <span className="text-5xl font-black text-indigo-600 tracking-tighter flex items-baseline gap-2">
                                {finalOrderTotal.toFixed(2)}{" "}
                                <span className="text-lg">DH</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center z-30 pointer-events-none">
                      <div className="w-full max-w-5xl glass-morphism rounded-[2.5rem] p-6 flex items-center justify-between shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] pointer-events-auto border-white ring-8 ring-black/5 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {t("pos.payment_confirmation")}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-100" />
                            <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                              {t("pos.ready_for_cash")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {!hasMaisonWithSupplier && (
                            <>
                              <button
                                onClick={() =>
                                  handleFinishOrder("place", finalOrderTotal)
                                }
                                className="bg-emerald-500 text-white px-8 py-4 rounded-[1.8rem] font-bold uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-600 hover:shadow-emerald-200 transition-all active:scale-95 flex flex-col items-center leading-none"
                              >
                                <span className="text-lg mb-1">
                                  {t("common.on_site")}
                                </span>
                                <span className="text-[8px] opacity-70 tracking-[0.2em]">
                                  {t("pos.entirety")}
                                </span>
                              </button>
                              <button
                                onClick={() => {
                                  setAdvanceAmountInput(finalOrderTotal.toFixed(2));
                                  setShowAdvanceModal(true);
                                }}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-[1.8rem] font-bold uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-95 flex flex-col items-center leading-none"
                              >
                                <span className="text-lg mb-1">
                                  {t("common.advance")}
                                </span>
                                <span className="text-[8px] opacity-70 tracking-[0.2em]">
                                  {t("pos.down_payment")}
                                </span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleFinishOrder("credit", 0)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-[1.8rem] font-bold uppercase shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex flex-col items-center leading-none"
                          >
                            <span className="text-lg mb-1">
                              {t("common.credit")}
                            </span>
                            <span className="text-[8px] opacity-70 tracking-[0.2em]">
                              {t("pos.debt_slate")}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.currentView === "STOCK" && (
              <div className="h-full min-h-0 p-4 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 flex-shrink-0">
                  <div>
                    <Package className="text-blue-600" size={24} />{" "}
                    {t("stock_client.title")}
                    <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest mt-0.5">
                      {t("stock_client.subtitle")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        {t("ticket.total")}
                      </p>
                      <p className="text-lg font-black text-blue-600">
                        {stockStats.totalItems}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        {t("stock_client.processing")}
                      </p>
                      <p className="text-lg font-black text-orange-500">
                        {stockStats.processingItems}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-center hidden md:block">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        {t("stock_client.ready")}
                      </p>
                      <p className="text-lg font-black text-emerald-500">
                        {stockStats.readyItems}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ancien stock: button to reveal form (admin only) */}
                {state.currentUser?.role === "admin" && (
                  <div className="mb-4 flex-shrink-0">
                    {!showOldStockForm ? (
                      <button
                        type="button"
                        onClick={() => setShowOldStockForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-amber-200 bg-amber-50/50 text-amber-800 font-bold text-sm hover:bg-amber-100 hover:border-amber-300 transition-colors"
                      >
                        <Package size={18} />
                        {t("stock_client.old_stock_btn")}
                        {(state.oldStockItems || []).length > 0 && (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                            {state.oldStockItems.length}
                          </span>
                        )}
                      </button>
                    ) : (
                <div className="p-4 rounded-2xl border border-amber-200/60 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase text-amber-800 tracking-wider">
                      {t("stock_client.old_stock_form_title")}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowOldStockForm(false)}
                      className="p-2 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
                      title="Masquer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Client</label>
                        <select
                          value={oldStockClientId}
                          onChange={(e) => {
                            setOldStockClientId(e.target.value);
                            if (e.target.value !== "new") {
                              setOldStockNewClientName("");
                              setOldStockNewClientPhone("");
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                        >
                          <option value="passager">Passager</option>
                          {state.clients.filter((c) => c.id !== "passager").map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                          <option value="new">➕ Nouveau client</option>
                        </select>
                        {oldStockClientId === "new" && (
                          <div className="mt-1 space-y-1">
                            <input
                              type="text"
                              value={oldStockNewClientName}
                              onChange={(e) => setOldStockNewClientName(e.target.value)}
                              placeholder={t("common.name") || "Nom du client"}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-amber-500 outline-none"
                            />
                            <input
                              type="tel"
                              value={oldStockNewClientPhone}
                              onChange={(e) => setOldStockNewClientPhone(e.target.value)}
                              placeholder={t("ticket.phone_placeholder") || "Téléphone"}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-amber-500 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold uppercase text-gray-500">Articles (même client)</label>
                        <button
                          type="button"
                          onClick={() =>
                            setOldStockLines((prev) => [
                              ...prev,
                              { articleId: null, articleName: "", serviceId: "lavage", placement: "", barcode: "" },
                            ])
                          }
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        >
                          <Plus size={12} /> Ajouter une ligne
                        </button>
                      </div>
                      <div className="space-y-4">
                        {oldStockLines.map((line, lineIdx) => (
                          <div key={lineIdx} className="p-3 rounded-xl bg-white border border-amber-100 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-amber-700">Article {lineIdx + 1}</span>
                              {oldStockLines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOldStockLines((prev) => prev.filter((_, i) => i !== lineIdx))
                                  }
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                  title="Supprimer la ligne"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {state.inventory.map((art) => (
                                <button
                                  key={art.id}
                                  type="button"
                                  onClick={() => {
                                    setOldStockLines((prev) => {
                                      const next = [...prev];
                                      next[lineIdx] = { ...next[lineIdx], articleId: art.id, articleName: art.name };
                                      return next;
                                    });
                                  }}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border-2 transition-all ${
                                    line.articleId === art.id
                                      ? "border-amber-500 bg-amber-100 text-amber-900"
                                      : "border-gray-200 bg-white hover:border-amber-300"
                                  }`}
                                >
                                  <img src={art.image} alt="" className="w-6 h-6 rounded object-cover" />
                                  <span className="text-[10px] font-bold truncate max-w-[80px]">{language === "ar" && art.name_ar ? art.name_ar : art.name}</span>
                                </button>
                              ))}
                              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                                <input
                                  type="text"
                                  value={line.articleId ? "" : line.articleName}
                                  onChange={(e) => {
                                    setOldStockLines((prev) => {
                                      const next = [...prev];
                                      next[lineIdx] = { ...next[lineIdx], articleId: null, articleName: e.target.value };
                                      return next;
                                    });
                                  }}
                                  onFocus={() => {
                                    if (line.articleId) {
                                      setOldStockLines((prev) => {
                                        const next = [...prev];
                                        const art = state.inventory.find((a) => a.id === line.articleId);
                                        next[lineIdx] = { ...next[lineIdx], articleId: null, articleName: art?.name ?? "" };
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="Autre (nom libre)"
                                  className="w-24 text-[10px] bg-transparent border-none outline-none placeholder:text-gray-400"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Service</label>
                                <select
                                  value={line.serviceId}
                                  onChange={(e) => {
                                    setOldStockLines((prev) => {
                                      const next = [...prev];
                                      next[lineIdx] = { ...next[lineIdx], serviceId: e.target.value };
                                      return next;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[10px] focus:border-amber-500 outline-none"
                                >
                                  {state.services.map((s) => (
                                    <option key={s.id} value={s.id}>{language === "ar" && s.name_ar ? s.name_ar : s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Zone</label>
                                <select
                                  value={line.placement}
                                  onChange={(e) => {
                                    setOldStockLines((prev) => {
                                      const next = [...prev];
                                      next[lineIdx] = { ...next[lineIdx], placement: e.target.value };
                                      return next;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[10px] focus:border-amber-500 outline-none"
                                >
                                  <option value="">—</option>
                                  {placementZoneIds.map((zoneId) => (
                                    <option key={zoneId} value={zoneId}>{placementZoneNames[zoneId] || zoneId}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Code-barres</label>
                                <input
                                  type="text"
                                  value={line.barcode}
                                  onChange={(e) => {
                                    setOldStockLines((prev) => {
                                      const next = [...prev];
                                      next[lineIdx] = { ...next[lineIdx], barcode: e.target.value };
                                      return next;
                                    });
                                  }}
                                  placeholder="Ex: 01"
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[10px] font-mono focus:border-amber-500 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={async () => {
                          let cId: string = oldStockClientId;
                          if (oldStockClientId === "new") {
                            if (!oldStockNewClientName?.trim()) {
                              alert("Veuillez saisir le nom du nouveau client.");
                              return;
                            }
                            try {
                              const created = await api.createClient({
                                name: oldStockNewClientName.trim(),
                                phone: oldStockNewClientPhone.trim() || undefined,
                              });
                              cId = created.id;
                            } catch (e) {
                              console.error(e);
                              alert("Erreur lors de la création du client.");
                              return;
                            }
                          }
                          const validLines = oldStockLines.filter((l) => l.articleName?.trim() && l.barcode?.trim());
                          if (validLines.length === 0) {
                            alert("Veuillez remplir au moins un article avec nom et code-barres.");
                            return;
                          }
                          try {
                            for (const line of validLines) {
                              await api.createOldStockItem({
                                clientId: cId,
                                placement: line.placement || undefined,
                                articleId: line.articleId || undefined,
                                articleName: line.articleName.trim(),
                                serviceId: line.serviceId || undefined,
                                barcode: line.barcode.trim(),
                              });
                            }
                            setOldStockClientId("passager");
                            setOldStockNewClientName("");
                            setOldStockNewClientPhone("");
                            setOldStockLines([{ articleId: null, articleName: "", serviceId: "lavage", placement: "", barcode: "" }]);
                            await loadData();
                          } catch (e: any) {
                            console.error(e);
                            alert(e?.message || "Erreur lors de l'ajout.");
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors"
                      >
                        <Plus size={18} /> {t("stock_client.add_old_stock")}
                      </button>
                      {(state.oldStockItems || []).length > 0 && (
                        <span className="text-xs font-bold text-gray-500">
                          {state.oldStockItems.length}{" "}
                          {t("stock_client.old_stock_items_label")}
                        </span>
                      )}
                    </div>
                    {(state.oldStockItems || []).length > 0 && (
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {state.oldStockItems.map((os) => (
                          <li key={os.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-white border border-amber-100">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {os.articleId && state.inventory.find((a) => a.id === os.articleId) ? (
                                <img
                                  src={state.inventory.find((a) => a.id === os.articleId)!.image}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-gray-800 truncate block text-xs">{os.clientName || "—"}</span>
                                <span className="text-[10px] text-gray-500 truncate block">
                                  {(language === "ar" &&
                                    os.articleId &&
                                    state.inventory.find((a) => a.id === os.articleId)?.name_ar)
                                    ? state.inventory.find((a) => a.id === os.articleId)!.name_ar
                                    : os.articleName}{" "}
                                  · {os.barcode}
                                </span>
                                {os.placement && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 font-bold">
                                    <MapPin size={8} /> {placementZoneNames[os.placement] || `P${os.placement}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Supprimer cet article de l'ancien stock ?")) return;
                                try {
                                  await api.deleteOldStockItem(os.id);
                                  await loadData();
                                } catch (e) {
                                  console.error(e);
                                  alert("Erreur lors de la suppression.");
                                }
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                    )}
                  </div>
                )}

                <div className="mb-3 relative group flex-shrink-0">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
                    <Barcode size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder={t("stock_client.scan_placeholder")}
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-8 rounded-xl bg-white border-2 border-transparent shadow font-black text-sm focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-200"
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filteredStock.length > 0 ? (
                      filteredStock.map((order) => (
                        <div
                          key={order.id}
                          className={`bg-white rounded-2xl border-2 p-4 shadow-sm transition-all hover:shadow ${
                            order.status === "prêt"
                              ? "border-emerald-100 bg-emerald-50/10"
                              : "border-gray-100"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-gray-900 text-white px-3 py-1.5 rounded-xl font-black text-sm flex items-center gap-1">
                                <Barcode size={14} /> {order.ticketId}
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">
                                  {t("stock_client.reception_date")}
                                </p>
                                <p className="text-xs font-bold text-gray-700">
                                  {new Date(order.createdAt).toLocaleString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[order.status]}`}
                            >
                              {t("stock_client." + order.status) ||
                                order.status}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100"
                              >
                                <div className="flex items-center gap-4">
                                  <img
                                    src={item.image}
                                    className="w-10 h-10 rounded-lg object-cover shadow-sm"
                                    alt={(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-black text-gray-800 uppercase text-xs">
                                      {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] text-blue-500 font-bold uppercase">
                                        {language === "ar" && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}` ? t(`stock_client.${item.serviceId}`) : state.services.find((s) => s.id === item.serviceId)?.name}
                                      </span>
                                      {item.placement && (
                                        <div className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-md">
                                          <MapPin size={8} />
                                          <span className="text-[8px] font-black uppercase">
                                            {placementZoneNames[item.placement] || `P${item.placement}`}
                                          </span>
                                        </div>
                                      )}
                                      <span
                                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                          item.status === "livré" ? "bg-blue-100 text-blue-700" :
                                          item.status === "prêt" ? "bg-green-100 text-green-700" :
                                          item.status === "fournisseur" ? "bg-purple-100 text-purple-700" :
                                          item.status === "en_cours" ? "bg-amber-100 text-amber-700" :
                                          item.status === "no_service" || item.status === "lost" ? "bg-red-100 text-red-700" :
                                          "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        {t(`stock_client.${item.status}`) !== `stock_client.${item.status}` ? t(`stock_client.${item.status}`) : item.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-gray-400 text-sm">
                                    {`x${item.quantity}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-3 border-t border-dashed border-gray-200">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Phone size={12} />
                              <span className="text-[10px] font-bold">
                                {order.customerPhone ||
                                  t("stock_client.anonymous")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {state.currentUser?.role === "admin" && (
                                <button
                                  onClick={() => setEditingOrder(order)}
                                  className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                  title="Modifier le ticket"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setTicketQueue([{ order, type: "CLIENT" }])
                                }
                                className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Search size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center flex flex-col items-center opacity-20">
                        <Barcode size={48} strokeWidth={1} className="mb-3" />
                        <p className="text-sm font-black uppercase tracking-widest">
                          {t("stock_client.no_article_found")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {state.currentView === "PRODUCTS" && (
              <div className="h-full min-h-0 flex flex-col p-4 overflow-hidden bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 flex-shrink-0">
                  <div>
                    <Building2 className="text-blue-600" size={24} />{" "}
                    {t("stock_magasin.title")}
                    <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest mt-0.5">
                      {t("stock_magasin.subtitle")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {t("stock_magasin.total_value")}
                        </p>
                        <p className="text-lg font-black text-gray-800">
                          {state.stockItems
                            .reduce(
                              (acc, item) =>
                                acc + item.quantity * item.unitPrice,
                              0,
                            )
                            .toFixed(2)}{" "}
                          DH
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingStockItem({});
                        setShowStockModal(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-2 font-black uppercase text-xs shadow active:scale-95 transition-all"
                    >
                      <Plus size={16} /> {t("stock_magasin.new_product")}
                    </button>
                  </div>
                </div>

                <div className="mb-4 relative group flex-shrink-0">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder={t("stock_magasin.search_placeholder")}
                    value={stockProductSearch}
                    onChange={(e) => setStockProductSearch(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-white border-none shadow-sm font-bold text-sm focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {state.stockItems
                      .filter((item) =>
                        item.name
                          .toLowerCase()
                          .includes(stockProductSearch.toLowerCase()),
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingStockItem(item);
                                  setShowStockModal(true);
                                }}
                                className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Supprimer ce produit ?")) {
                                    try {
                                      await api.deleteStockItem(item.id);
                                      setState((prev) => ({
                                        ...prev,
                                        stockItems: prev.stockItems.filter(
                                          (i) => i.id !== item.id,
                                        ),
                                      }));
                                    } catch (e) {
                                      alert(
                                        t("common.error_delete") ||
                                          "Erreur suppression",
                                      );
                                    }
                                  }
                                }}
                                className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <h3
                            className="text-lg font-black uppercase text-gray-800 mb-1 truncate"
                            title={
                              language === "ar" && item.name_ar
                                ? item.name_ar
                                : item.name
                            }
                          >
                            {language === "ar" && item.name_ar
                              ? item.name_ar
                              : item.name}
                          </h3>

                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                              {item.supplierName ||
                                t("stock_magasin.unknown_supplier")}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                {t("stock.quantity")}
                              </p>
                              <p
                                className={`text-xl font-black ${item.quantity <= item.minQuantity ? "text-red-500" : "text-gray-800"}`}
                              >
                                {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                {t("stock.unit_price")}
                              </p>
                              <p className="text-base font-black text-blue-600">
                                {item.unitPrice.toFixed(2)} DH
                              </p>
                            </div>
                          </div>

                          {item.quantity <= item.minQuantity && (
                            <div className="mt-3 flex items-center gap-2 text-red-500">
                              <AlertTriangle size={12} />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                {t("stock.low_stock")}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    {state.stockItems.length === 0 && (
                      <div className="col-span-full py-12 text-center opacity-30">
                        <Package size={48} className="mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest">
                          {t("stock.no_stock")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {state.currentView === "ARTICLE_MANAGER" && (
              <div className="h-full min-h-0 flex flex-col p-4 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 flex-shrink-0">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">
                      {t("article_manager.title")}
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest mt-0.5">
                      {t("article_manager.subtitle")}
                    </p>
                  </div>
                  <button
                    onClick={handleNewArticle}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold uppercase text-sm shadow active:scale-95"
                  >
                    <Plus size={16} /> {t("article_manager.new")}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mb-3 flex-shrink-0">
                  <div className="flex-1 relative min-w-0">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder={`${t("common.search")}...`}
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border-none shadow-sm font-bold text-sm focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {["tous", ...state.categories.map((c) => c.id)].map(
                      (catId) => (
                        <button
                          key={catId}
                          onClick={() =>
                            setArticleManagerCategory(catId as any)
                          }
                          className={`h-10 px-4 rounded-xl font-black uppercase text-[9px] transition-all whitespace-nowrap ${
                            articleManagerCategory === catId
                              ? "bg-gray-800 text-white shadow"
                              : "bg-white text-gray-400"
                          }`}
                        >
                          {catId === "tous"
                            ? t("article_manager.all")
                            : state.categories.find((c) => c.id === catId)
                                ?.name}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1 no-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col group relative transition-all hover:shadow"
                      >
                        <div className="w-full aspect-square max-h-24 rounded-xl overflow-hidden mb-2 shadow-inner relative">
                          <img
                            src={art.image}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            alt={art.name}
                          />
                          <div className="absolute top-1 right-1 px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[8px] font-black text-blue-600 uppercase shadow-sm">
                            {art.basePrice} DH
                          </div>
                        </div>
                        <h3 className="text-xs font-black uppercase text-gray-800 mb-1 truncate">
                          {language === "ar" && art.name_ar
                            ? art.name_ar
                            : art.name}
                        </h3>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[8px] font-black uppercase text-gray-300 flex items-center gap-0.5">
                            <Tag size={10} />{" "}
                            {
                              state.categories.find(
                                (c) => c.id === art.categoryId,
                              )?.name
                            }
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingArticle(art)}
                              className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(art.id)}
                              className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {state.currentView === "TRACKING" && (
              <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">
                <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print flex-shrink-0">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                      <ClipboardList className="text-blue-600" size={22} />{" "}
                      {t("tracking.title")}
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest mt-0.5">
                      {t("tracking.subtitle")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative group min-w-[200px]">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500"
                        size={16}
                      />
                      <input
                        ref={trackingSearchRef}
                        type="text"
                        placeholder={t("tracking.search_placeholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 rounded-xl bg-white border-none shadow-sm font-bold text-xs focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleScanSimulation}
                      className="h-9 bg-gray-900 text-white px-4 rounded-xl flex items-center gap-2 font-bold uppercase text-xs shadow active:scale-95 transition-all"
                    >
                      <Scan size={14} /> {t("tracking.scan")}
                    </button>
                  </div>
                </div>

                <div className={`flex-1 min-h-0 overflow-x-auto p-3 pt-2 flex gap-3 no-scrollbar ${isRTL ? "flex-row-reverse" : ""}`}>
                  {(state.currentUser?.role === "admin"
                    ? ["reçu", "lavage", "fournisseur", "repassage", "prêt", "no_service", "lost"]
                    : ["reçu", "lavage", "fournisseur", "repassage", "prêt"]
                  ).map((columnStatus: OrderStatus) => {
                      const isClosedColumn = columnStatus === "no_service" || columnStatus === "lost";
                      const orderBasedItems = state.orders
                        .filter((o) => isClosedColumn || o.status !== "livré")
                        .sort(
                          (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime(),
                        )
                        .flatMap((o) =>
                          o.items.map((it) => ({
                            ...it,
                            orderId: o.id,
                            ticketId: o.ticketId,
                            clientName: o.clientName || "Passager",
                            pickupDate: o.pickupDate,
                            createdBy: o.createdBy,
                            orderCreatedAt: o.createdAt,
                            isOldStock: false,
                          })),
                        )
                        .filter((it) => it.status === columnStatus);
                      const oldStockSynthetic =
                        columnStatus === "prêt"
                          ? (state.oldStockItems || [])
                              .filter((os) => os.status === "prêt")
                              .map((os) => {
                                const invArticle = os.articleId ? state.inventory.find((a) => a.id === os.articleId) : null;
                                return {
                                  id: os.id,
                                  orderId: "old_stock",
                                  ticketId: "ANCIEN",
                                  clientName: os.clientName || "Passager",
                                  barcode: os.barcode,
                                  articleName: os.articleName,
                                  articleName_ar: invArticle?.name_ar as string | undefined,
                                  placement: os.placement,
                                  status: os.status as OrderStatus,
                                  image: invArticle?.image ?? "",
                                  serviceId: os.serviceId || "lavage",
                                  isOldStock: true as const,
                                  pickupDate: "",
                                  createdBy: "",
                                  orderCreatedAt: os.createdAt,
                                };
                              })
                          : [];
                      const columnItems = [...orderBasedItems, ...oldStockSynthetic]
                        .filter(
                          (it) =>
                            it.ticketId.includes(searchTerm) ||
                            it.clientName
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            it.barcode.includes(searchTerm) ||
                            it.articleName
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            (it.articleName_ar || "")
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                        )
                        .filter(
                          (it) =>
                            columnStatus !== "lavage" || it.serviceId !== "repassage",
                        );

                      return (
                        <div
                          key={columnStatus}
                          className={`flex-shrink-0 w-64 flex flex-col h-full min-h-0 rounded-2xl overflow-hidden ${isClosedColumn ? "bg-red-50/80 border border-red-200/60" : "bg-gray-100/50 border border-gray-200/50"}`}
                        >
                          <div className={`p-2 flex items-center justify-between border-b ${isClosedColumn ? "bg-red-100/50 border-red-200/50" : "bg-white/50 backdrop-blur-sm border-gray-100"}`}>
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  columnStatus === "reçu"
                                    ? "bg-gray-400"
                                    : columnStatus === "lavage"
                                      ? "bg-blue-500"
                                      : columnStatus === "fournisseur"
                                        ? "bg-pink-500"
                                        : columnStatus === "repassage"
                                          ? "bg-orange-500"
                                          : columnStatus === "prêt"
                                            ? "bg-emerald-500"
                                            : "bg-red-500"
                                }`}
                              />
                              <h2 className={`font-black uppercase text-[10px] tracking-widest ${isClosedColumn ? "text-red-700" : "text-gray-600"}`}>
                                {columnStatus === "fournisseur"
                                  ? t("ticket.supplier") || "Fournisseur"
                                  : columnStatus === "no_service"
                                    ? t("stock_client.no_service")
                                    : columnStatus === "lost"
                                      ? t("stock_client.lost")
                                      : t(`stock_client.${columnStatus}`) ||
                                        columnStatus}
                              </h2>
                            </div>
                            <span className="bg-white px-2 py-0.5 rounded-full text-[9px] font-black text-gray-400 shadow-sm border border-gray-50">
                              {columnItems.length}
                            </span>
                          </div>

                          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 no-scrollbar">
                            {columnItems.map((item) => {
                              const isLate =
                                new Date(item.pickupDate) < new Date();
                              const service = state.services.find(
                                (s) => s.id === item.serviceId,
                              );
                              const isRepassageOnly = item.serviceId === "repassage";
                              const nextStatusMap: Record<string, OrderStatus> =
                                isRepassageOnly
                                  ? {
                                      reçu: "repassage",
                                      fournisseur: "repassage",
                                      repassage: "prêt",
                                      prêt: "livré",
                                    }
                                  : {
                                      reçu: "lavage",
                                      lavage: "repassage",
                                      fournisseur: "repassage",
                                      repassage: "prêt",
                                      prêt: "livré",
                                    };
                              const prevStatusMap: Record<string, OrderStatus> =
                                isRepassageOnly
                                  ? {
                                      repassage: "reçu",
                                      prêt: "repassage",
                                    }
                                  : {
                                      lavage: "reçu",
                                      repassage: "lavage",
                                      prêt: "repassage",
                                    };

                              const isOldStock = (item as any).isOldStock === true;

                              return (
                                <div
                                  key={item.id}
                                  className={`bg-white p-3 rounded-xl shadow-sm border hover:shadow transition-all group flex flex-col gap-2 ${isOldStock ? "border-amber-200/60 bg-amber-50/30" : "border-gray-100/50"}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[9px] font-black text-blue-600 uppercase">
                                        #{item.ticketId}
                                      </span>
                                      {isOldStock && (
                                        <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                                          {t("stock_client.old_stock")}
                                        </span>
                                      )}
                                      <span className="text-[11px] font-black uppercase text-gray-800 truncate max-w-[120px]">
                                        {item.clientName}
                                      </span>
                                    </div>
                                    {!isOldStock && isLate && (
                                      <div className="p-2 rounded-xl flex-shrink-0 bg-red-50 text-red-500 text-[9px] font-black uppercase">
                                        {t("tracking.late") || "Retard"}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                    {!isOldStock && (
                                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                                        <img
                                          src={item.image}
                                          className="w-full h-full object-cover"
                                          alt=""
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] font-black uppercase text-gray-400 truncate">
                                        {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                      </p>
                                      {!isOldStock && (
                                        <div className="flex items-center gap-1">
                                          <div
                                            className={`w-1.5 h-1.5 rounded-full ${service?.color?.replace("text", "bg") || "bg-gray-400"}`}
                                          />
                                          <span className="text-[8px] font-black uppercase text-gray-600 truncate">
                                            {language === "ar" && t(`stock_client.${item.serviceId}`) !== `stock_client.${item.serviceId}` ? t(`stock_client.${item.serviceId}`) : (service?.name || item.serviceId)}
                                          </span>
                                        </div>
                                      )}
                                      <p className="text-[7px] font-mono text-gray-400 truncate">
                                        {item.barcode}
                                      </p>
                                      {item.placement && (
                                        <div className="mt-1 inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-md">
                                          <MapPin size={8} />
                                          <span className="text-[8px] font-black uppercase">
                                            {placementZoneNames[item.placement] || `P${item.placement}`}
                                          </span>
                                        </div>
                                      )}
                                      {!isOldStock && (
                                        <>
                                          <div className="mt-1 flex items-center gap-1 text-[7px] font-bold text-gray-400 uppercase">
                                            <UserIcon size={8} />
                                            <span>
                                              {t("common.by")} {(state.users || []).find(
                                                (u) => u.id === (item.processedBy || item.createdBy),
                                              )?.name || (item.processedBy || item.createdBy) || t("common.unknown")}
                                            </span>
                                          </div>
                                          {(columnStatus === "reçu" && (item as any).orderCreatedAt) && (
                                            <p className="mt-1 text-[7px] font-bold text-gray-500">
                                              Reçu le {new Date((item as any).orderCreatedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                            </p>
                                          )}
                                          {(columnStatus === "repassage" && item.statusUpdatedAt) && (
                                            <p className="mt-1 text-[7px] font-bold text-gray-500">
                                              Repassage le {new Date(item.statusUpdatedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {!isOldStock && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="col-span-1">
                                      <select
                                        value={item.assignedTo || ""}
                                        onChange={(e) =>
                                          assignItemWorker(
                                            item.orderId,
                                            item.id,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full h-8 px-2 bg-gray-50 border-none rounded-xl text-[8px] font-black uppercase text-gray-500 focus:ring-1 focus:ring-blue-500/20"
                                      >
                                        <option value="">
                                          {t("tracking.agent")}
                                        </option>
                                        {state.users.map((user) => (
                                          <option key={user.id} value={user.id}>
                                            {user.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="col-span-1">
                                      <select
                                        value={item.supplierId || ""}
                                        onChange={(e) => {
                                          const supplierId = e.target.value;
                                          const defaultPrice = supplierId
                                            ? item.price / 2
                                            : undefined;
                                          assignItemSupplier(
                                            item.orderId,
                                            item.id,
                                            supplierId,
                                            defaultPrice,
                                          );
                                        }}
                                        className="w-full h-8 px-2 bg-gray-50 border-none rounded-xl text-[8px] font-black uppercase text-gray-500 focus:ring-1 focus:ring-blue-500/20"
                                      >
                                        <option value="">
                                          {t("ticket.supplier")}
                                        </option>
                                        {state.suppliers.map((sup) => (
                                          <option key={sup.id} value={sup.id}>
                                            {sup.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    {item.supplierId && (
                                      <div className="col-span-2 flex items-center gap-1">
                                        <label className="text-[7px] font-black uppercase text-gray-500 whitespace-nowrap">
                                          Prix:
                                        </label>
                                        <input
                                          type="number"
                                          value={
                                            item.supplierPrice?.toFixed(2) || ""
                                          }
                                          onChange={(e) => {
                                            const price =
                                              parseFloat(e.target.value) || 0;
                                            assignItemSupplier(
                                              item.orderId,
                                              item.id,
                                              item.supplierId!,
                                              price,
                                            );
                                          }}
                                          placeholder={(item.price / 2).toFixed(
                                            2,
                                          )}
                                          className="flex-1 h-8 px-2 bg-white border border-gray-200 rounded-xl text-[8px] font-black text-gray-700 focus:border-blue-500 focus:ring-0"
                                          step="0.01"
                                          min="0"
                                        />
                                        <span className="text-[7px] font-black text-gray-500">
                                          DH
                                        </span>
                                      </div>
                                    )}

                                    {columnStatus === "reçu" && item.supplierId && (
                                      <div className="col-span-2">
                                        <button
                                          onClick={() =>
                                            updateItemStatus(
                                              item.orderId,
                                              item.id,
                                              "fournisseur",
                                            )
                                          }
                                          className="w-full h-8 rounded-xl bg-pink-500 text-white font-black uppercase text-[8px] flex items-center justify-center gap-1 hover:bg-pink-600 transition-colors"
                                        >
                                          <Truck size={12} />
                                          {t("tracking.supplier_recovered")}
                                        </button>
                                      </div>
                                    )}

                                    <div className="col-span-2 grid grid-cols-2 gap-1">
                                      {prevStatusMap[columnStatus] && (
                                        <button
                                          onClick={() =>
                                            updateItemStatus(
                                              item.orderId,
                                              item.id,
                                              prevStatusMap[columnStatus],
                                            )
                                          }
                                          className="h-8 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                        >
                                          <ArrowLeft size={12} />
                                        </button>
                                      )}
                                      {!(columnStatus === "reçu" && item.supplierId) && (
                                        <button
                                          onClick={async () => {
                                            if (columnStatus === "fournisseur") {
                                              if (item.categoryId === "maison") {
                                                setSupplierMeasureItem({
                                                  orderId: item.orderId,
                                                  itemId: item.id,
                                                  articleId: item.articleId,
                                                  serviceId: item.serviceId,
                                                  articleName:
                                                    (language === "ar" &&
                                                      item.articleName_ar)
                                                      ? item.articleName_ar
                                                      : item.articleName,
                                                  categoryId: item.categoryId,
                                                  supplierId: item.supplierId,
                                                });
                                                setMeasureWidth(
                                                  item.width
                                                    ? String(item.width)
                                                    : "",
                                                );
                                                setMeasureHeight(
                                                  item.height
                                                    ? String(item.height)
                                                    : "",
                                                );
                                                setMeasureSurface("");

                                                try {
                                                  // Prix client / m² défini par l'admin (article + service)
                                                  const article =
                                                    state.inventory.find(
                                                      (a) =>
                                                        a.id ===
                                                        item.articleId,
                                                    );
                                                  const service =
                                                    state.services.find(
                                                      (s) =>
                                                        s.id ===
                                                        item.serviceId,
                                                    );
                                                  const specific =
                                                    (article as any)
                                                      ?.servicePrices?.[
                                                      item.serviceId
                                                    ];
                                                  const clientPerM2 =
                                                    specific ??
                                                    ((article?.basePrice ??
                                                      0) *
                                                      (service?.multiplier ??
                                                        1));
                                                  setClientPricePerM2(
                                                    clientPerM2 > 0
                                                      ? clientPerM2.toFixed(2)
                                                      : "",
                                                  );

                                                  // Prix fournisseur / m² défini par l'admin (article_supplier_prices)
                                                  if (item.supplierId) {
                                                    const prices =
                                                      await api.getArticlePricesBySupplier(
                                                        item.supplierId,
                                                      );
                                                    const supplierPerM2 =
                                                      prices[item.articleId] ||
                                                      0;
                                                    setSupplierPricePerM2(
                                                      supplierPerM2 > 0
                                                        ? supplierPerM2.toFixed(
                                                            2,
                                                          )
                                                        : "",
                                                    );
                                                  } else {
                                                    setSupplierPricePerM2("");
                                                  }
                                                } catch (e) {
                                                  console.error(
                                                    "Failed to load article/supplier prices",
                                                    e,
                                                  );
                                                }

                                                setShowSupplierMeasureModal(
                                                  true,
                                                );
                                              } else {
                                                receiveItemFromSupplier(
                                                  item.orderId,
                                                  item.id,
                                                );
                                              }
                                            } else {
                                              const nextStatus =
                                                nextStatusMap[columnStatus];
                                              if (nextStatus === "prêt") {
                                                setItemForPlacement({
                                                  orderId: item.orderId,
                                                  itemId: item.id,
                                                });
                                                setShowPlacementModal(true);
                                              } else if (nextStatus === "livré") {
                                                const order = state.orders.find(o => o.id === item.orderId);
                                                if (order && order.paymentMode === "credit" && order.total > order.paid) {
                                                  setCreditItemForDelivery({
                                                    orderId: order.id,
                                                    itemId: item.id,
                                                    orderTotal: order.total,
                                                    orderPaid: order.paid,
                                                  });
                                                  setShowCreditModal(true);
                                                } else {
                                                  updateItemStatus(item.orderId, item.id, nextStatus);
                                                }
                                              } else {
                                                updateItemStatus(
                                                  item.orderId,
                                                  item.id,
                                                  nextStatus,
                                                );
                                              }
                                            }
                                          }}
                                          className={`h-8 rounded-xl flex items-center justify-center gap-1 font-black uppercase text-[7px] shadow-sm transition-all active:scale-95 ${
                                            columnStatus === "fournisseur"
                                              ? "bg-pink-600 text-white col-span-2"
                                              : columnStatus === "prêt"
                                                ? "bg-emerald-500 text-white col-span-2"
                                                : prevStatusMap[columnStatus]
                                                  ? "bg-blue-600 text-white"
                                                  : "bg-blue-600 text-white col-span-2"
                                          }`}
                                        >
                                          {columnStatus === "fournisseur"
                                            ? t("common.collect") || "Récupérer"
                                            : columnStatus === "prêt"
                                              ? t("common.deliver") || "Livrer"
                                              : t("common.next")}{" "}
                                          <ChevronRight size={12} />
                                        </button>
                                      )}
                                    </div>
                                    {state.currentUser?.role === "admin" && ["reçu", "lavage", "fournisseur", "repassage", "prêt"].includes(columnStatus) && (
                                      <div className="col-span-2 flex gap-1 mt-1">
                                        <button
                                          onClick={() => {
                                            const itemName = (language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName;
                                            const price = item.price ?? 0;
                                            setNoServiceItemData({
                                              orderId: item.orderId,
                                              itemId: item.id,
                                              itemName,
                                              defaultAmount: price,
                                            });
                                            setNoServiceAmount(String(price));
                                            setShowNoServiceModal(true);
                                          }}
                                          className="flex-1 h-7 rounded-lg bg-red-50 text-red-700 border border-red-300 text-[8px] font-black uppercase flex items-center justify-center hover:bg-red-100 transition-colors"
                                        >
                                          {t("stock_client.no_service")}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setLostItemData({
                                              orderId: item.orderId,
                                              itemId: item.id,
                                              itemName: (language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName,
                                              defaultAmount: item.price ?? 0,
                                            });
                                            setLostReimbursementAmount(String(item.price ?? 0));
                                            setShowLostModal(true);
                                          }}
                                          className="flex-1 h-7 rounded-lg bg-red-50 text-red-700 border border-red-300 text-[8px] font-black uppercase flex items-center justify-center hover:bg-red-100 transition-colors"
                                        >
                                          {t("stock_client.lost")}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  )}
                                  {isOldStock && columnStatus === "prêt" && (
                                    <div className="mt-2">
                                      <button
                                        onClick={async () => {
                                          try {
                                            await api.updateOldStockStatus(item.id, "livré");
                                            await loadData();
                                          } catch (e: any) {
                                            alert(e?.message || "Erreur lors de la mise à jour de l'ancien stock.");
                                          }
                                        }}
                                        className="w-full h-8 rounded-xl bg-emerald-500 text-white font-black uppercase text-[8px] flex items-center justify-center gap-1 hover:bg-emerald-600 transition-colors"
                                      >
                                        <span>{t("common.deliver") || "Livrer"}</span>
                                        <ChevronRight size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {columnItems.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-10 opacity-20 filter grayscale">
                                <div className="text-4xl mb-4">✨</div>
                                <p className="font-black uppercase text-[10px] tracking-widest">
                                  {t("common.empty") || "Vide"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {state.currentView === "MACHINES" && (
              <div className="h-full min-h-0 p-4 flex flex-col bg-slate-100 overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h1 className="text-2xl font-extrabold uppercase text-slate-900 tracking-tight">
                      Machines
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wide">
                        {t("machines.status_park")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMachineModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold uppercase text-[10px] shadow-lg active:scale-95 transition-all"
                  >
                    <Plus size={16} /> {t("machines.add")}
                  </button>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {state.machines.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-0"
                    >
                      {/* Header Status */}
                      <div
                        className={`h-1 w-full flex-shrink-0 ${
                          m.status === "disponible"
                            ? "bg-green-500"
                            : m.status === "en_cours"
                              ? "bg-blue-500"
                              : m.status === "terminé"
                                ? "bg-purple-600"
                                : "bg-red-500"
                        }`}
                      />

                      <div className="p-3 flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-start mb-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-md flex items-center justify-center text-lg bg-slate-50 border border-slate-100 ${m.status === "en_cours" ? "text-blue-600" : "text-slate-400"}`}
                            >
                              {m.type === "washer" ? "🌀" : "♨️"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-800 uppercase leading-none truncate text-sm">
                                {m.name}
                              </h3>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase leading-none">
                                {m.capacity} •{" "}
                                {m.type === "washer"
                                  ? t("machines.washer")
                                  : t("machines.dryer")}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMachine(m.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg mb-2 border border-slate-100 relative overflow-hidden group min-h-0">
                          {m.status === "en_cours" ? (
                            <div className="text-center w-full z-10 relative px-2">
                              <span className="text-blue-600 font-bold text-[9px] uppercase tracking-widest block mb-0.5 truncate">
                                {m.program}
                              </span>
                              <div className="text-3xl font-black text-slate-800 tabular-nums tracking-tighter leading-none">
                                {m.timeRemaining}
                                <span className="text-xs text-slate-400 ml-0.5">
                                  min
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1 absolute bottom-0 left-0">
                                <div
                                  className="bg-blue-500 h-full transition-all duration-1000"
                                  style={{
                                    width: `${((m.timeRemaining || 0) / 60) * 100}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ) : m.status === "terminé" ? (
                            <div className="text-center animate-pulse">
                              <CheckCircle2
                                size={32}
                                className="text-purple-600 mx-auto mb-1"
                              />
                              <span className="text-purple-700 font-black uppercase text-xs">
                                Terminé
                              </span>
                            </div>
                          ) : m.status === "disponible" ? (
                            <div className="text-center opacity-30">
                              <span className="text-2xl block mb-1">🟢</span>
                              <span className="font-bold uppercase text-[10px]">
                                {t("machines.ready")}
                              </span>
                            </div>
                          ) : (
                            <div className="text-center opacity-30">
                              <span className="text-2xl block mb-1">⚠️</span>
                              <span className="font-bold uppercase text-[10px]">
                                {t("machines.hs")}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="flex-shrink-0">
                          {m.status === "disponible" ? (
                            <div className="grid grid-cols-3 gap-1.5">
                              {/* Eco Button */}
                              <button
                                onClick={() =>
                                  updateMachineStatus(
                                    m.id,
                                    "en_cours",
                                    30,
                                    "Eco",
                                  )
                                }
                                className="bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-md py-1.5 flex flex-col items-center justify-center transition-all active:scale-95"
                              >
                                <span className="text-[9px] font-black uppercase">
                                  Eco
                                </span>
                                <span className="text-[8px] font-bold opacity-60">
                                  30'
                                </span>
                              </button>
                              {/* Standard Button */}
                              <button
                                onClick={() =>
                                  updateMachineStatus(
                                    m.id,
                                    "en_cours",
                                    45,
                                    "Standard",
                                  )
                                }
                                className="bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-md py-1.5 flex flex-col items-center justify-center transition-all active:scale-95"
                              >
                                <span className="text-[9px] font-black uppercase">
                                  Std
                                </span>
                                <span className="text-[8px] font-bold opacity-60">
                                  45'
                                </span>
                              </button>
                              {/* Intense Button */}
                              <button
                                onClick={() =>
                                  updateMachineStatus(
                                    m.id,
                                    "en_cours",
                                    60,
                                    "Intensif",
                                  )
                                }
                                className="bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-600 hover:text-orange-700 rounded-md py-1.5 flex flex-col items-center justify-center transition-all active:scale-95"
                              >
                                <span className="text-[9px] font-black uppercase">
                                  Int
                                </span>
                                <span className="text-[8px] font-bold opacity-60">
                                  60'
                                </span>
                              </button>
                            </div>
                          ) : m.status === "terminé" ? (
                            <button
                              onClick={() =>
                                updateMachineStatus(m.id, "disponible")
                              }
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase text-xs py-2.5 rounded-lg shadow-md shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                              <ShieldCheck size={14} /> Libérer
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                updateMachineStatus(m.id, "disponible")
                              }
                              className="w-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 font-bold uppercase text-[10px] py-2.5 rounded-lg border border-slate-200 transition-all"
                            >
                              {t("machines.stop_reset")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.currentView === "STAFF" && (
              <div className="h-full min-h-0 p-4 flex flex-col bg-white overflow-hidden">
                <div className="flex items-center justify-between mb-12">
                  <h1 className="text-3xl font-black uppercase tracking-tighter">
                    Gestion du Personnel
                  </h1>
                  <button
                    onClick={handleAddUser}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold uppercase shadow-xl active:scale-95"
                  >
                    <UserPlus /> Nouvel Employé
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {state.users.map((user) => {
                    const withdrawn = (state.transactions || [])
                      .filter((t) => t.userId === user.id)
                      .reduce((sum, t) => sum + (t.amount || 0), 0);

                    return (
                      <div
                        key={user.id}
                        className="bg-gray-50 p-8 rounded-[3.5rem] border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group"
                      >
                        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-xl border border-gray-100">
                          {user.avatar}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <h2 className="text-2xl font-black uppercase text-gray-800">
                            {user.name}
                          </h2>
                          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                            <span className="px-4 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {user.role}
                            </span>
                            <span className="px-4 py-1 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600">
                              {t("staff.salary")}: {user.salary} DH
                            </span>
                            {user.phone && (
                              <span className="px-4 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                                <Phone size={10} /> {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center min-w-[140px]">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                            {t("staff.withdrawals")}
                          </p>
                          <p className="text-2xl font-black text-orange-500">
                            {withdrawn} DH
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingUser({ ...user })}
                            className="p-3 text-blue-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("common.edit")}
                          >
                            <Edit size={20} />
                          </button>
                          {user.id !== "u1" && (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="p-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-12 p-8 rounded-[3.5rem] border border-gray-100 bg-gray-50">
                  <h3 className="text-xl font-black uppercase text-gray-800 mb-4 tracking-tighter">
                    {t("placement.zones_title")}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Noms affichés lors du choix de la zone où placer l&apos;article (Suivi). Vous pouvez ajouter des zones.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {placementZoneIds.map((zoneId) => (
                      <div key={zoneId}>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Zone {zoneId}</label>
                        <input
                          type="text"
                          value={placementZoneNames[zoneId] ?? ""}
                          onChange={(e) => {
                            const next = { ...placementZoneNames, [zoneId]: e.target.value };
                            setPlacementZoneNames(next);
                            localStorage.setItem(PLACEMENT_ZONES_NAMES_KEY, JSON.stringify(next));
                          }}
                          placeholder={`Zone ${zoneId}`}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const numericIds = placementZoneIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
                      const nextId = numericIds.length ? String(Math.max(...numericIds) + 1) : "1";
                      const nextIds = [...placementZoneIds, nextId];
                      const nextNames = { ...placementZoneNames, [nextId]: "Zone " + nextId };
                      setPlacementZoneIds(nextIds);
                      setPlacementZoneNames(nextNames);
                      localStorage.setItem(PLACEMENT_ZONES_IDS_KEY, JSON.stringify(nextIds));
                      localStorage.setItem(PLACEMENT_ZONES_NAMES_KEY, JSON.stringify(nextNames));
                    }}
                    className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <Plus size={18} /> Ajouter une zone
                  </button>
                </div>

              </div>
            )}

            {state.currentView === "DASHBOARD" && (
              <div className="h-full min-h-0 p-4 overflow-y-auto no-scrollbar bg-gray-50 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-black uppercase text-gray-900 tracking-tighter">
                      Tableau de Bord
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Activity size={12} /> Live Insights
                      </span>
                      <span className="text-gray-400 text-xs font-bold italic">
                        {t("dashboard.synced_data")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
                      {(["day", "week", "month"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setDashboardPeriod(p)}
                          className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                            dashboardPeriod === p
                              ? "bg-blue-600 text-white"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p === "day"
                            ? "Jour"
                            : p === "week"
                              ? "Semaine"
                              : "Mois"}
                        </button>
                      ))}
                    </div>
                    {dashboardPeriod === "day" && (
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                          Date
                        </label>
                        <input
                          type="date"
                          value={dashboardDay}
                          onChange={(e) => setDashboardDay(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-800 border-0 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setDashboardDay(todayStr)}
                          className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                        >
                          Aujourd&apos;hui
                        </button>
                      </div>
                    )}
                    {dashboardPeriod === "week" && (
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                          Début semaine (lun.)
                        </label>
                        <input
                          type="date"
                          value={dashboardWeekStart}
                          onChange={(e) => setDashboardWeekStart(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-800 border-0 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setDashboardWeekStart(toDateStr(getMonday(new Date())))}
                          className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                        >
                          Cette semaine
                        </button>
                      </div>
                    )}
                    {dashboardPeriod === "month" && (
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                          Mois
                        </label>
                        <input
                          type="month"
                          value={dashboardMonth}
                          onChange={(e) => setDashboardMonth(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-800 border-0 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const n = new Date();
                            setDashboardMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`);
                          }}
                          className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                        >
                          Ce mois
                        </button>
                      </div>
                    )}
                    <div className="relative">
                      <div
                        className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm cursor-pointer hover:border-blue-200 transition-colors"
                        onClick={() =>
                          setShowDashboardPeriodPicker((prev) => !prev)
                        }
                      >
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Période affichée
                      </p>
                      <p className="text-lg font-black text-gray-800 uppercase">
                        {dashboardStats.startStr === dashboardStats.endStr
                          ? new Date(dashboardStats.startStr).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )
                          : `${new Date(dashboardStats.startStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${new Date(dashboardStats.endStr).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}`}
                      </p>
                      </div>
                      {showDashboardPeriodPicker && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-lg z-20 p-2 space-y-1">
                          <button
                            className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 text-gray-700"
                            onClick={() => {
                              setDashboardPeriod("day");
                              setDashboardDay(todayStr);
                              setShowDashboardPeriodPicker(false);
                            }}
                          >
                            Jour · Aujourd&apos;hui
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 text-gray-700"
                            onClick={() => {
                              setDashboardPeriod("week");
                              setDashboardWeekStart(
                                toDateStr(getMonday(new Date())),
                              );
                              setShowDashboardPeriodPicker(false);
                            }}
                          >
                            Semaine · Cette semaine
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 text-gray-700"
                            onClick={() => {
                              const n = new Date();
                              setDashboardPeriod("month");
                              setDashboardMonth(
                                `${n.getFullYear()}-${String(
                                  n.getMonth() + 1,
                                ).padStart(2, "0")}`,
                              );
                              setShowDashboardPeriodPicker(false);
                            }}
                          >
                            Mois · Ce mois
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="bg-blue-600 p-10 rounded-[4rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur">
                          <TrendingUp size={32} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 rounded-full border border-white/20">
                          Recettes Jour
                        </span>
                      </div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">
                        {t("dashboard.net_collected")}
                      </div>
                      <div className="text-6xl font-black tracking-tighter mb-4">
                        {dashboardStats.revenueToday.toFixed(2)}{" "}
                        <span className="text-2xl font-bold opacity-60">
                          DH
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="opacity-60 uppercase tracking-widest text-[9px]">
                          Prévisions :
                        </span>
                        <span className="text-white">
                          {dashboardStats.expectedToday.toFixed(2)} DH
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-500 p-10 rounded-[4rem] text-white shadow-2xl shadow-emerald-200 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur">
                          <Wallet size={32} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 rounded-full border border-white/20">
                          Fonds de Caisse
                        </span>
                      </div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">
                        {t("dashboard.real_available")}
                      </div>
                      <div className="text-6xl font-black tracking-tighter mb-4">
                        {dashboardStats.cashInDrawer.toFixed(2)}{" "}
                        <span className="text-2xl font-bold opacity-60">
                          DH
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="opacity-60 uppercase tracking-widest text-[9px]">
                          Dépenses Jour :
                        </span>
                        <span className="text-white">
                          {dashboardStats.withdrawalsToday.toFixed(2)} DH
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-500 p-10 rounded-[4rem] text-white shadow-2xl shadow-red-200 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl backdrop-blur">
                          <TrendingDown size={32} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 rounded-full border border-white/20">
                          Crédit Client
                        </span>
                      </div>
                      <div className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">
                        Total En Attente
                      </div>
                      <div className="text-6xl font-black tracking-tighter mb-4">
                        {dashboardStats.totalCreditDebt.toFixed(2)}{" "}
                        <span className="text-2xl font-bold opacity-60">
                          DH
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="opacity-60 uppercase tracking-widest text-[9px]">
                          Santé Financière :
                        </span>
                        <span className="text-white italic">
                          {dashboardStats.totalCreditDebt > 1000
                            ? "Attention"
                            : "Optimale"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    {
                      label: "Panier Moyen",
                      value: `${dashboardStats.avgOrderValue.toFixed(0)} DH`,
                      icon: <Target className="text-blue-500" />,
                      color: "blue",
                    },
                    {
                      label: "Orders Jour",
                      value: dashboardStats.orderCountToday,
                      icon: <Activity className="text-orange-500" />,
                      color: "orange",
                    },
                    {
                      label: "Total Services",
                      value: dashboardStats.totalServices,
                      icon: <PieChart className="text-purple-500" />,
                      color: "purple",
                    },
                    {
                      label: "Employés Actifs",
                      value: state.users.length,
                      icon: <UsersIcon className="text-emerald-500" />,
                      color: "emerald",
                    },
                  ].map((kpi, i) => (
                    <div
                      key={i}
                      className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center"
                    >
                      <div
                        className={`p-4 bg-${kpi.color}-50 rounded-2xl mb-4`}
                      >
                        {kpi.icon}
                      </div>
                      <p className="text-3xl font-black text-gray-800 tracking-tighter">
                        {kpi.value}
                      </p>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">
                        {kpi.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-20">
                  <div className="bg-white rounded-[4rem] p-12 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-800 flex items-center gap-3">
                        <Target className="text-blue-600" />{" "}
                        {t("dashboard.article_performance")}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-4 py-2 rounded-full text-gray-400">
                        Top 5
                      </span>
                    </div>
                    <div className="space-y-6">
                      {dashboardStats.topArticles.map(([name, data], i) => (
                        <div
                          key={name}
                          className="flex items-center gap-6 p-4 hover:bg-gray-50 rounded-3xl transition-colors"
                        >
                          <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black">
                            #{i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-black uppercase text-sm text-gray-800">
                              {name}
                            </p>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{
                                  width: `${(data.rev / (dashboardStats.topArticles[0][1]?.rev || 1)) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-800">
                              {data.rev.toFixed(2)} DH
                            </p>
                            <p className="text-[9px] font-black text-gray-400 uppercase">
                              x{data.qty} Unités
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-[4rem] p-12 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-800 flex items-center gap-3">
                        <PieChart className="text-purple-600" />{" "}
                        {t("dashboard.service_distribution")}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                        <span className="text-[10px] font-black uppercase text-gray-400">
                          Activité Mix
                        </span>
                      </div>
                    </div>
                    <div className="space-y-8">
                      {Object.entries(dashboardStats.serviceMix).map(
                        ([sid, count]) => {
                          const service = state.services.find(
                            (s) => s.id === sid,
                          );
                          const percentage = Math.round(
                            (Number(count) /
                              (dashboardStats.totalServices || 1)) *
                              100,
                          );
                          return (
                            <div key={sid} className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white">
                                {service?.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-end mb-2">
                                  <span className="font-black uppercase text-xs text-gray-700">
                                    {language === "ar" && t(`stock_client.${sid}`) !== `stock_client.${sid}` ? t(`stock_client.${sid}`) : (service?.name || sid)}
                                  </span>
                                  <span className="font-black text-gray-900">
                                    {percentage}%
                                  </span>
                                </div>
                                <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                  <div
                                    className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {state.currentView === "SUPPLIERS" && (
              <div className="h-full flex overflow-hidden bg-gray-50">
                {/* Suppliers List Sidebar */}
                <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black uppercase text-gray-900">
                        {t("suppliers.title")}
                      </h2>
                      <button
                        onClick={handleNewSupplier}
                        className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder={t("suppliers.search_placeholder")}
                        value={supplierSearchTerm}
                        onChange={(e) => setSupplierSearchTerm(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-gray-50 rounded-xl text-sm font-bold border border-gray-200 focus:border-blue-500 focus:ring-0"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    {state.suppliers
                      .filter((s) =>
                        s.name
                          .toLowerCase()
                          .includes(supplierSearchTerm.toLowerCase()),
                      )
                      .map((sup) => {
                        const activeItemsCount = state.orders.flatMap((o) =>
                          o.items.filter(
                            (it) =>
                              it.supplierId === sup.id &&
                              it.status === "fournisseur",
                          ),
                        ).length;
                        const supplierInvoices = state.invoices.filter(
                          (inv) => inv.supplierId === sup.id,
                        );
                        const unpaidInvoices = supplierInvoices.filter(
                          (inv) => inv.status === "A payer",
                        );
                        const unpaidTotal = unpaidInvoices.reduce(
                          (sum, inv) => sum + inv.amount,
                          0,
                        );

                        return (
                          <button
                            key={sup.id}
                            onClick={() => {
                              setSelectedSupplierId(sup.id);
                              setSupplierTab("articles");
                            }}
                            className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              selectedSupplierId === sup.id
                                ? "bg-blue-50 border-l-4 border-l-blue-600"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                                <img
                                  src={sup.logo}
                                  className="w-full h-full object-cover"
                                  alt={sup.name}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black uppercase text-gray-800 truncate">
                                  {sup.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[9px] font-bold text-gray-500">
                                    {activeItemsCount} {t("suppliers.articles")}
                                  </span>
                                  {unpaidTotal > 0 && (
                                    <span className="text-[9px] font-bold text-orange-600">
                                      {unpaidTotal.toFixed(2)} DH
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Supplier Details Panel */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {selectedSupplierId ? (
                    (() => {
                      const supplier = state.suppliers.find(
                        (s) => s.id === selectedSupplierId,
                      );
                      if (!supplier) return null;

                      const activeItems = state.orders.flatMap((o) =>
                        o.items
                          .filter(
                            (it) =>
                              it.supplierId === supplier.id &&
                              it.status === "fournisseur",
                          )
                          .map((it) => ({
                            ...it,
                            orderTicketId: o.ticketId,
                            clientName: o.clientName || "Passager",
                            orderId: o.id,
                            orderCreatedAt: o.createdAt,
                          })),
                      );

                      // ALL articles ever assigned to this supplier (any status)
                      const allAssignedItems = state.orders.flatMap((o) =>
                        o.items
                          .filter((it) => it.supplierId === supplier.id)
                          .map((it) => ({
                            ...it,
                            orderTicketId: o.ticketId,
                            clientName: o.clientName || "Passager",
                            orderId: o.id,
                            orderCreatedAt: o.createdAt,
                          })),
                      );

                      const supplierInvoices = state.invoices.filter(
                        (inv) => inv.supplierId === supplier.id,
                      );
                      const supplierHistory = state.auditLogs.filter(
                        (log) =>
                          (log.type === "SUPPLIER" &&
                            (log.details?.includes(supplier.name) ||
                              log.details?.includes(supplier.id))) ||
                          (log.type === "ORDER" &&
                            log.details?.includes(supplier.name)),
                      );

                      return (
                        <>
                          {/* Header */}
                          <div className="p-6 border-b border-gray-200 bg-white">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200">
                                  <img
                                    src={supplier.logo}
                                    className="w-full h-full object-cover"
                                    alt={supplier.name}
                                  />
                                </div>
                                <div>
                                  <h1 className="text-2xl font-black uppercase text-gray-900">
                                    {supplier.name}
                                  </h1>
                                  {supplier.contact && (
                                    <p className="text-xs font-bold text-gray-500 mt-1">
                                      {supplier.contact}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSupplier(supplier);
                                    setShowSupplierModal(true);
                                  }}
                                  className="w-10 h-10 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSupplier(supplier.id)
                                  }
                                  className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Dashboard Grid - All sections visible at once */}
                          <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3 p-3 overflow-hidden">
                            {/* TOP LEFT: En cours */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">
                                    {t("suppliers.in_progress")}
                                  </h3>
                                </div>
                                <span className="text-[10px] font-black text-orange-600">
                                  {activeItems.length} {t("suppliers.articles")}
                                </span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {activeItems.length > 0 ? (
                                  activeItems.map((item) => {
                                    const order = state.orders.find(
                                      (o) => o.id === item.orderId,
                                    );
                                    return (
                                      <div
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                                      >
                                        <img
                                          src={item.image}
                                          className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                          alt=""
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase text-gray-800 truncate">
                                              {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                            </p>
                                            <span className="text-[9px] font-black text-blue-600 flex-shrink-0">
                                              #{item.orderTicketId}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[8px] font-bold text-gray-400">
                                              {item.clientName}
                                            </span>
                                            {item.supplierPrice && (
                                              <span className="text-[8px] font-black text-orange-600">
                                                {item.supplierPrice.toFixed(2)}{" "}
                                                DH
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {order && (
                                          <button
                                            onClick={() =>
                                              setTicketQueue([{
                                                order,
                                                type: "CLIENT",
                                              }])
                                            }
                                            className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity"
                                          >
                                            <FileText size={12} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <Package size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">
                                      {t("suppliers.no_articles")}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {activeItems.length > 0 && (
                                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
                                  <p className="text-[9px] font-bold text-gray-500">
                                    {t("common.total")}:{" "}
                                    <span className="text-orange-600 font-black">
                                      {activeItems
                                        .reduce(
                                          (sum, item) =>
                                            sum + (item.supplierPrice || 0),
                                          0,
                                        )
                                        .toFixed(2)}{" "}
                                      DH
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* TOP RIGHT: Factures */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">
                                    {t("suppliers.invoices")}
                                  </h3>
                                </div>
                                <button
                                  onClick={() => {
                                    setNewInvoiceAmount("");
                                    setNewInvoiceItemsCount("");
                                    setShowInvoiceModal(true);
                                  }}
                                  className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  <Plus size={10} /> {t("common.new")}
                                </button>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {supplierInvoices.length > 0 ? (
                                  supplierInvoices.map((invoice) => (
                                    <div
                                      key={invoice.id}
                                      className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="text-[10px] font-black text-gray-800">
                                            #{invoice.id.slice(0, 8)}
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                              invoice.status === "Payé"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-orange-100 text-orange-700"
                                            }`}
                                          >
                                            {invoice.status === "Payé"
                                              ? t("suppliers.paid")
                                              : t("suppliers.unpaid")}
                                          </span>
                                        </div>
                                        <p className="text-[8px] font-bold text-gray-400">
                                          {invoice.itemsCount}{" "}
                                          {t("suppliers.art_short")}. •{" "}
                                          {new Date(
                                            invoice.createdAt,
                                          ).toLocaleDateString("fr-FR")}
                                        </p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="text-xs font-black text-gray-900">
                                          {invoice.amount.toFixed(2)} DH
                                        </p>
                                        {invoice.status === "A payer" && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await api.updateSupplierInvoice(
                                                  invoice.id,
                                                  { status: "Payé" },
                                                );
                                                setState((prev) => ({
                                                  ...prev,
                                                  invoices: prev.invoices.map(
                                                    (inv) =>
                                                      inv.id === invoice.id
                                                        ? {
                                                            ...inv,
                                                            status:
                                                              "Payé" as const,
                                                          }
                                                        : inv,
                                                  ),
                                                }));
                                                addAuditLog(
                                                  "SUPPLIER",
                                                  `Facture payée`,
                                                  `Facture #${invoice.id.slice(0, 8)} - ${invoice.amount.toFixed(2)} DH`,
                                                );
                                              } catch (error) {
                                                console.error(
                                                  "Failed to update invoice",
                                                  error,
                                                );
                                              }
                                            }}
                                            className="mt-1 px-2 py-0.5 bg-green-600 text-white rounded text-[7px] font-black uppercase hover:bg-green-700 transition-colors"
                                          >
                                            {t("machines.release")}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <FileText size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">
                                      {t("suppliers.no_invoices")}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {supplierInvoices.length > 0 && (
                                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-gray-500">
                                    {t("suppliers.to_pay")}:
                                  </span>
                                  <span className="text-xs font-black text-orange-600">
                                    {supplierInvoices
                                      .filter((inv) => inv.status === "A payer")
                                      .reduce((sum, inv) => sum + inv.amount, 0)
                                      .toFixed(2)}{" "}
                                    DH
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* BOTTOM LEFT: Tous les Articles */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">
                                    {t("suppliers.all_articles")}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2 text-[8px] font-bold text-gray-400">
                                  <span>
                                    {
                                      allAssignedItems.filter(
                                        (i) => i.status === "fournisseur",
                                      ).length
                                    }{" "}
                                    {t("suppliers.in_progress_short")}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {
                                      allAssignedItems.filter((i) =>
                                        ["prêt", "livré"].includes(i.status),
                                      ).length
                                    }{" "}
                                    {t("suppliers.finished_short")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {allAssignedItems.length > 0 ? (
                                  allAssignedItems.map((item) => {
                                    const statusColor =
                                      item.status === "livré"
                                        ? "bg-green-100 text-green-700"
                                        : item.status === "prêt"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : item.status === "fournisseur"
                                            ? "bg-orange-100 text-orange-700"
                                            : item.status === "reçu"
                                              ? "bg-gray-100 text-gray-600"
                                              : "bg-blue-100 text-blue-700";
                                    return (
                                      <div
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                                      >
                                        <img
                                          src={item.image}
                                          className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                          alt=""
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase text-gray-800 truncate">
                                              {(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}
                                            </p>
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex-shrink-0 ${statusColor}`}
                                            >
                                              {t(`stock_client.${item.status}`) !== `stock_client.${item.status}` ? t(`stock_client.${item.status}`) : item.status}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[8px] font-bold text-gray-400">
                                              {item.clientName} • #
                                              {item.orderTicketId}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-400">
                                              {new Date(item.orderCreatedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <Package size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">
                                      {t("suppliers.no_assigned_articles")}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {allAssignedItems.length > 0 && (
                                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-gray-500">
                                    {t("common.total")}:
                                  </span>
                                  <span className="text-xs font-black text-orange-600">
                                    {allAssignedItems
                                      .reduce(
                                        (sum, item) =>
                                          sum + (item.supplierPrice || 0),
                                        0,
                                      )
                                      .toFixed(2)}{" "}
                                    DH ({allAssignedItems.length}{" "}
                                    {t("suppliers.articles")})
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* BOTTOM RIGHT: Historique */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">
                                    {t("common.history")}
                                  </h3>
                                </div>
                                <span className="text-[10px] font-black text-purple-600">
                                  {supplierHistory.length}{" "}
                                  {t("suppliers.events")}
                                </span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {supplierHistory.length > 0 ? (
                                  supplierHistory.map((log) => (
                                    <div
                                      key={log.id}
                                      className="p-2 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <div
                                            className={`w-1.5 h-1.5 rounded-full ${
                                              log.type === "SUPPLIER"
                                                ? "bg-orange-500"
                                                : "bg-blue-400"
                                            }`}
                                          />
                                          <span className="text-[9px] font-black uppercase text-gray-800">
                                            {log.action}
                                          </span>
                                        </div>
                                        <span className="text-[7px] font-bold text-gray-400">
                                          {new Date(
                                            log.timestamp,
                                          ).toLocaleString("fr-FR")}
                                        </span>
                                      </div>
                                      <p className="text-[8px] text-gray-500 ml-3">
                                        {log.details}
                                      </p>
                                      {log.userName && (
                                        <p className="text-[7px] font-bold text-gray-400 ml-3 mt-0.5">
                                          {t("common.by")}: {log.userName}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <History size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">
                                      {t("suppliers.no_history")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Prix par article (admin) */}
                          {state.currentUser?.role === "admin" && (
                            <div className="mt-3 px-3 pb-3">
                              <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">
                                    Prix par article (fournisseur)
                                  </h3>
                                  <button
                                    onClick={() => {
                                      if (!selectedSupplierId) return;
                                      api
                                        .setArticlePricesBySupplier(
                                          selectedSupplierId,
                                          supplierArticlePrices,
                                        )
                                        .then(() => {})
                                        .catch(() => {});
                                    }}
                                    className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto no-scrollbar p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(state.inventory || []).map((art) => (
                                    <div
                                      key={art.id}
                                      className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100"
                                    >
                                      <span className="text-[10px] font-bold text-gray-800 truncate flex-1 min-w-0">
                                        {art.name}
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="Prix"
                                        value={
                                          supplierArticlePrices[art.id] ?? ""
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setSupplierArticlePrices((prev) => ({
                                            ...prev,
                                            [art.id]:
                                              v === ""
                                                ? 0
                                                : parseFloat(v) || 0,
                                          }));
                                        }}
                                        className="w-20 h-8 text-right text-xs font-bold border border-gray-200 rounded-lg px-2"
                                      />
                                      <span className="text-[9px] font-bold text-gray-400">
                                        DH
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Truck size={64} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-black uppercase">
                          {t("suppliers.select_supplier")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {state.currentView === "HISTORY" && (
              <div className="h-full min-h-0 p-4 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                      <History className="text-blue-600" size={24} />{" "}
                      {t("common.history")}
                    </h1>
                    <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest mt-0.5">
                      {t("history.subtitle")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder={t("history.search_placeholder")}
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="h-9 pl-9 pr-4 bg-white rounded-xl border border-gray-100 shadow-sm text-xs font-bold focus:ring-2 focus:ring-blue-500/20 w-48"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ["ALL", t("history.all_types")],
                          ["ORDER", t("history.orders")],
                          ["PAYMENT", t("history.payments")],
                          ["INVENTORY", t("history.articles")],
                          ["USER", t("history.users")],
                          ["SUPPLIER", t("history.suppliers")],
                          ["CLIENT", t("history.clients")],
                          ["SYSTEM", t("history.system")],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setHistoryFilterType(
                              value as AuditLog["type"] | "ALL",
                            )
                          }
                          className={`h-9 px-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-colors shrink-0 ${
                            historyFilterType === value
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-2 no-scrollbar space-y-3">
                  {state.auditLogs
                    .filter((log) => {
                      const matchesSearch =
                        log.action
                          .toLowerCase()
                          .includes(historySearchTerm.toLowerCase()) ||
                        log.userName
                          .toLowerCase()
                          .includes(historySearchTerm.toLowerCase()) ||
                        log.details
                          ?.toLowerCase()
                          .includes(historySearchTerm.toLowerCase());
                      const matchesType =
                        historyFilterType === "ALL" ||
                        log.type === historyFilterType;
                      return matchesSearch && matchesType;
                    })
                    .map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <div
                          key={log.id}
                          onClick={() =>
                            setExpandedLogId(isExpanded ? null : log.id)
                          }
                          className={`bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-start gap-6 hover:shadow-md transition-all cursor-pointer group ${isExpanded ? "ring-2 ring-blue-500/10" : ""}`}
                        >
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white flex-shrink-0 ${
                              log.type === "ORDER"
                                ? "bg-blue-50 text-blue-600"
                                : log.type === "PAYMENT"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : log.type === "USER"
                                    ? "bg-purple-50 text-purple-600"
                                    : log.type === "SUPPLIER"
                                      ? "bg-orange-50 text-orange-600"
                                      : log.type === "INVENTORY"
                                        ? "bg-pink-50 text-pink-600"
                                        : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {log.type === "ORDER" ? (
                              <ShoppingCart />
                            ) : log.type === "PAYMENT" ? (
                              <CreditCard />
                            ) : log.type === "USER" ? (
                              <UsersIcon />
                            ) : log.type === "SUPPLIER" ? (
                              <Truck />
                            ) : log.type === "INVENTORY" ? (
                              <Package />
                            ) : (
                              <Activity />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-black text-gray-800 uppercase text-sm truncate">
                                {log.action}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                                  <Clock size={12} />{" "}
                                  {new Date(log.timestamp).toLocaleString(
                                    "fr-FR",
                                  )}
                                </span>
                                <div
                                  className={`transition-transform duration-300 ${isExpanded ? "rotate-180 text-blue-500" : "text-gray-300"}`}
                                >
                                  <ChevronDown size={16} />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase">
                                {log.userName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  log.type === "ORDER"
                                    ? "bg-blue-100 text-blue-600"
                                    : log.type === "PAYMENT"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {log.type}
                              </span>
                            </div>
                            {log.details && (
                              <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}
                              >
                                <div
                                  className={`p-5 rounded-[2rem] border-2 border-dashed flex flex-col gap-2 ${
                                    log.type === "ORDER"
                                      ? "bg-blue-50/50 border-blue-100"
                                      : log.type === "PAYMENT"
                                        ? "bg-emerald-50/50 border-emerald-100"
                                        : log.type === "USER"
                                          ? "bg-purple-50/50 border-purple-100"
                                          : log.type === "SUPPLIER"
                                            ? "bg-orange-50/50 border-orange-100"
                                            : log.type === "INVENTORY"
                                              ? "bg-pink-50/50 border-pink-100"
                                              : "bg-gray-50/50 border-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 opacity-40">
                                    <FileText size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                      {t("history.action_details")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-bold leading-relaxed">
                                    {log.details}
                                  </p>
                                  {log.orderId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const order = state.orders.find(
                                          (o) => o.id === log.orderId,
                                        );
                                        if (order) {
                                          // Determine ticket type based on order properties
                                          const hasSupplierItems =
                                            order.items.some(
                                              (item) => item.isSupplierItem,
                                            );
                                          setTicketQueue([{
                                            order,
                                            type: hasSupplierItems
                                              ? "SUPPLIER"
                                              : "CLIENT",
                                            supplierId: hasSupplierItems
                                              ? order.items.find(
                                                  (item) => item.supplierId,
                                                )?.supplierId
                                              : undefined,
                                          }]);
                                        }
                                      }}
                                      className="mt-3 w-full h-10 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                      <FileText size={14} />
                                      {t("history.view_ticket")}
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
                      <p className="text-2xl font-black uppercase tracking-tighter">
                        {t("history.no_activity_recorded")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {state.currentView === "EXPENSE_ARTICLES" && (
              <div className="h-full min-h-0 p-8 flex flex-col overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                      <Tag className="text-blue-600" size={32} />{" "}
                      Gestion des Dépenses
                    </h1>
                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">
                      Configurez les articles et prix pour "Achat Materiel"
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingExpenseArticle({ name: "", price: 0, image: "" } as any);
                      setShowExpenseArticleModal(true);
                    }}
                    className="h-14 px-8 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <Plus size={20} /> Nouveau Article
                  </button>
                </div>

                <div className="flex-1 min-h-0 bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {state.expenseArticles.map((art) => (
                        <div key={art.id} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 group relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm overflow-hidden">
                              {art.image ? (
                                <img
                                  src={art.image}
                                  alt={art.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>📦</span>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingExpenseArticle(art);
                                  setShowExpenseArticleModal(true);
                                }}
                                className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Supprimer l'article "${art.name}" ?`)) {
                                    try {
                                      await api.deleteExpenseArticle(art.id);
                                      setState(prev => ({
                                        ...prev,
                                        expenseArticles: prev.expenseArticles.filter(e => e.id !== art.id)
                                      }));
                                      addAuditLog("SYSTEM", "Article de dépense supprimé", `Nom: ${art.name}`);
                                    } catch (e) {
                                      console.error(e);
                                      alert("Erreur lors de la suppression");
                                    }
                                  }
                                }}
                                className="w-10 h-10 bg-white text-rose-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-lg font-black uppercase text-gray-800 mb-1">{art.name}</h3>
                          <p className="text-2xl font-black text-blue-600">{art.price} <span className="text-xs">DH</span></p>
                        </div>
                      ))}
                    </div>
                    {state.expenseArticles.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                        <Tag size={120} className="mb-6" />
                        <p className="text-2xl font-black uppercase tracking-tighter">
                          Aucun article configuré
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {state.currentView === "CLIENTS" && (
              <div className="h-full min-h-0 flex overflow-hidden bg-gray-50">
                {/* Left Panel: Client List */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-black uppercase text-gray-900 tracking-tight flex items-center gap-2">
                        <UsersIcon className="text-blue-600" size={20} /> {t("clients.title")}
                      </h2>
                      <button
                        onClick={() => { setNewClientName(""); setNewClientPhone(""); setShowClientModal(true); }}
                        className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input
                        type="text"
                        placeholder={t("clients.search_placeholder")}
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-gray-50 rounded-xl border border-transparent focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50 font-bold text-xs text-gray-700 placeholder:text-gray-300 transition-all"
                      />
                    </div>
                  </div>
                  {/* Client List */}
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    {filteredClients.map((client) => {
                      const clientOrders = state.orders.filter((o) => o.clientId === client.id);
                      const activeOrders = clientOrders.filter((o) => o.status !== "livré");
                      const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);
                      return (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClientViewId(client.id)}
                          className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            selectedClientViewId === client.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-black uppercase text-gray-800 truncate">{client.name}</h3>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[9px] font-bold text-gray-400">{client.phone}</span>
                                {activeOrders.length > 0 && (
                                  <span className="text-[9px] font-bold text-orange-600">{activeOrders.length} en cours</span>
                                )}
                              </div>
                              {totalSpent > 0 && (
                                <span className="text-[9px] font-black text-blue-600">{totalSpent.toFixed(2)} DH</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {filteredClients.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                        <UsersIcon size={40} strokeWidth={1} />
                        <p className="font-black uppercase text-[9px] tracking-widest mt-3">{t("clients.no_client_found")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Client Detail */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {selectedClientViewId ? (
                    (() => {
                      const client = state.clients.find((c) => c.id === selectedClientViewId);
                      if (!client) return null;

                      const clientOrders = state.orders.filter((o) => o.clientId === client.id);
                      const activeOrders = clientOrders.filter((o) => o.status !== "livré");
                      const completedOrders = clientOrders.filter((o) => o.status === "livré");
                      const allClientItems = clientOrders.flatMap((o) =>
                        o.items.map((it) => ({ ...it, orderTicketId: o.ticketId, orderId: o.id, orderCreatedAt: o.createdAt, orderStatus: o.status }))
                      );
                      const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);
                      const totalPaid = clientOrders.reduce((sum, o) => sum + o.paid, 0);
                      const totalRest = totalSpent - totalPaid;
                      const clientHistory = state.auditLogs.filter(
                        (log) => log.type === "CLIENT" && (log.details?.includes(client.name) || log.details?.includes(client.id)) ||
                          (log.type === "ORDER" && log.details?.includes(client.name))
                      );

                      return (
                        <>
                          {/* Client Header */}
                          <div className="p-5 border-b border-gray-200 bg-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-200/50">
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h1 className="text-xl font-black uppercase text-gray-900 tracking-tight">{client.name}</h1>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Phone size={12} /> {client.phone}</span>
                                    {client.address && <span className="text-xs font-bold text-gray-400 flex items-center gap-1">📍 {client.address}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Stats badges */}
                                <div className="flex items-center gap-2">
                                  <div className="px-3 py-2 bg-blue-50 rounded-xl text-center">
                                    <p className="text-lg font-black text-blue-600">{clientOrders.length}</p>
                                    <p className="text-[8px] font-black text-blue-400 uppercase">Commandes</p>
                                  </div>
                                  <div className="px-3 py-2 bg-green-50 rounded-xl text-center">
                                    <p className="text-lg font-black text-green-600">{totalPaid.toFixed(0)}</p>
                                    <p className="text-[8px] font-black text-green-400 uppercase">Payé DH</p>
                                  </div>
                                  {totalRest > 0 && (
                                    <div className="px-3 py-2 bg-red-50 rounded-xl text-center">
                                      <p className="text-lg font-black text-red-600">{totalRest.toFixed(0)}</p>
                                      <p className="text-[8px] font-black text-red-400 uppercase">Reste DH</p>
                                    </div>
                                  )}
                                </div>
                                {/* Discount Rate Input */}
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-100">
                                  <span className="text-[8px] font-black text-rose-400 uppercase">Remise</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={client.discountRate || 0}
                                    onChange={(e) => {
                                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                      setState((prev) => ({
                                        ...prev,
                                        clients: prev.clients.map((c) => c.id === client.id ? { ...c, discountRate: val } : c),
                                      }));
                                    }}
                                    onBlur={async (e) => {
                                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                      try {
                                        await api.updateClient(client.id, { discountRate: val });
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="w-10 text-center bg-transparent border-none text-sm font-black text-rose-600 focus:ring-0 p-0"
                                  />
                                  <span className="text-sm font-black text-rose-400">%</span>
                                </div>
                                {/* Notification Toggle */}
                                <button
                                  onClick={async () => {
                                    const newVal = !(client.notificationsEnabled !== false);
                                    try {
                                      await api.updateClient(client.id, { notificationsEnabled: newVal });
                                      setState((prev) => ({
                                        ...prev,
                                        clients: prev.clients.map((c) => c.id === client.id ? { ...c, notificationsEnabled: newVal } : c),
                                      }));
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                    client.notificationsEnabled !== false
                                      ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                  title={client.notificationsEnabled !== false ? 'Notifications activées' : 'Notifications désactivées'}
                                >
                                  {client.notificationsEnabled !== false ? <Bell size={18} /> : <BellOff size={18} />}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(t("clients.delete_confirm"))) return;
                                    try {
                                      await api.deleteClient(client.id);
                                      setState((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== client.id) }));
                                      setSelectedClientViewId(null);
                                      addAuditLog("CLIENT", `Client ${client.name} supprimé`, `ID: ${client.id}`);
                                    } catch (e) {
                                      console.error(e);
                                      alert(t("clients.delete_error"));
                                    }
                                  }}
                                  className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Client Note */}
                          <div className="px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                            <div className="flex items-center gap-3">
                              <span className="text-sm">📝</span>
                              <input
                                type="text"
                                placeholder="Ajouter une note sur ce client..."
                                value={client.note || ""}
                                onChange={(e) => {
                                  setState((prev) => ({
                                    ...prev,
                                    clients: prev.clients.map((c) => c.id === client.id ? { ...c, note: e.target.value } : c),
                                  }));
                                }}
                                onBlur={async (e) => {
                                  try {
                                    await api.updateClient(client.id, { note: e.target.value.trim() });
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`flex-1 bg-transparent border-none text-xs font-bold placeholder:text-gray-300 focus:ring-0 p-0 ${client.note ? 'text-amber-700' : 'text-gray-600'}`}
                              />
                            </div>
                          </div>

                          {/* Dashboard Grid */}
                          <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3 p-3 overflow-hidden">
                            {/* TOP LEFT: En Cours Tickets */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">En Cours</h3>
                                </div>
                                <span className="text-[10px] font-black text-orange-600">{activeOrders.length} tickets</span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {activeOrders.length > 0 ? (
                                  activeOrders.map((order) => (
                                    <div
                                      key={order.id}
                                      onClick={() => setTicketQueue([{ order, type: "CLIENT" }])}
                                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                                          #{order.ticketId}
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black uppercase text-gray-800">{order.items.length} articles</p>
                                          <p className="text-[8px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-black text-gray-900">{order.total.toFixed(2)} DH</p>
                                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                                          order.status === "en_cours" ? "bg-orange-100 text-orange-700" :
                                          order.status === "prêt" ? "bg-green-100 text-green-700" :
                                          "bg-blue-100 text-blue-700"
                                        }`}>{t(`stock_client.${order.status}`) !== `stock_client.${order.status}` ? t(`stock_client.${order.status}`) : order.status}</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <FileText size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">Aucun ticket en cours</p>
                                  </div>
                                )}
                              </div>
                              {activeOrders.length > 0 && (
                                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
                                  <p className="text-[9px] font-bold text-gray-500">
                                    {t("common.total")}: <span className="text-orange-600 font-black">{activeOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} DH</span>
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* TOP RIGHT: Tous les Articles */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Tous les Articles</h3>
                                </div>
                                <span className="text-[10px] font-black text-blue-600">{allClientItems.length} articles</span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {allClientItems.length > 0 ? (
                                  allClientItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                      <img src={item.image} className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" alt="" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] font-black uppercase text-gray-800 truncate">{(language === "ar" && item.articleName_ar) ? item.articleName_ar : item.articleName}</p>
                                          <span className="text-[9px] font-black text-blue-600 flex-shrink-0">#{item.orderTicketId}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                          <span className="text-[8px] font-bold text-gray-400">{item.serviceName}</span>
                                          <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                                            item.status === "fournisseur" ? "bg-purple-100 text-purple-700" :
                                            item.status === "prêt" ? "bg-green-100 text-green-700" :
                                            item.status === "livré" ? "bg-blue-100 text-blue-700" :
                                            "bg-orange-100 text-orange-700"
                                          }`}>{t(`stock_client.${item.status}`) !== `stock_client.${item.status}` ? t(`stock_client.${item.status}`) : item.status}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <Package size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">Aucun article</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* BOTTOM LEFT: Historique */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Historique</h3>
                                </div>
                                <span className="text-[10px] font-black text-violet-600">{clientHistory.length}</span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {clientHistory.length > 0 ? (
                                  clientHistory.slice(0, 50).map((log) => (
                                    <div key={log.id} className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-gray-800">{log.action}</p>
                                        <span className="text-[8px] font-bold text-gray-400">{new Date(log.timestamp).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                                      </div>
                                      {log.details && <p className="text-[8px] font-bold text-gray-400 mt-0.5 truncate">{log.details}</p>}
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <Clock size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">Aucun historique</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* BOTTOM RIGHT: Tickets Livrés */}
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <h3 className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Tickets Livrés</h3>
                                </div>
                                <span className="text-[10px] font-black text-green-600">{completedOrders.length}</span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2">
                                {completedOrders.length > 0 ? (
                                  completedOrders.map((order) => (
                                    <div
                                      key={order.id}
                                      onClick={() => setTicketQueue([{ order, type: "CLIENT" }])}
                                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                                          #{order.ticketId}
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black text-gray-800">{order.items.length} articles</p>
                                          <p className="text-[8px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-black text-gray-900">{order.total.toFixed(2)} DH</p>
                                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700">livré</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <CheckCircle2 size={28} className="mb-2" />
                                    <p className="text-[9px] font-black uppercase">Aucun ticket livré</p>
                                  </div>
                                )}
                              </div>
                              {completedOrders.length > 0 && (
                                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-gray-500">{t("common.total")}:</span>
                                  <span className="text-xs font-black text-green-600">{completedOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} DH</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                      <UsersIcon size={64} strokeWidth={1} />
                      <p className="font-black uppercase text-xs tracking-widest mt-4">Sélectionnez un client</p>
                      <p className="text-[9px] font-bold text-gray-300 mt-1">Cliquez sur un client pour voir ses détails</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
          </div>
        </div>
      )}
      {showClientModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
              <UserPlus size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">
              {t("clients.new_client")}
            </h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.full_name") || "Nom Complet"}
                </p>
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-black uppercase focus:ring-0 p-0 text-gray-800"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("suppliers.contact")}
                </p>
                <input
                  type="tel"
                  placeholder="06XXXXXXXX"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-blue-600 tracking-widest"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.address") || "Adresse"}
                </p>
                <textarea
                  placeholder="Adresse du client"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="w-full bg-transparent border-none text-lg font-black focus:ring-0 p-0 text-gray-800 resize-none h-16"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => setShowClientModal(false)}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAddClient}
                disabled={!newClientName || !newClientPhone}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
              <Plus size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">
              {editingCategory.id ? t("common.edit") : t("common.new")}{" "}
              {t("ticket.category") || "Catégorie"}
            </h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.name")}
                </p>
                <input
                  type="text"
                  placeholder="Ex: Accessoires"
                  value={editingCategory.name || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                    } as any)
                  }
                  className="w-full bg-transparent border-none text-xl font-black uppercase focus:ring-0 p-0 text-gray-800"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.name")} (Arabe)
                </p>
                <input
                  type="text"
                  placeholder="مثال: اكسسوارات"
                  value={editingCategory.name_ar || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name_ar: e.target.value,
                    } as any)
                  }
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800 font-arabic"
                  dir="rtl"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.image_url")} ({t("common.optional")})
                </p>
                <ArticleImageDropbox
                  image={editingCategory.image || ""}
                  onImageChange={(image) =>
                    setEditingCategory({
                      ...editingCategory,
                      image,
                    } as any)
                  }
                  showUrlInput={false}
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.color")} (ex: bg-blue-500)
                </p>
                <input
                  type="text"
                  placeholder="bg-gray-500"
                  value={editingCategory.color || "bg-gray-500"}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      color: e.target.value,
                    } as any)
                  }
                  className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0 text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!editingCategory?.name?.trim()}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                {t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {withdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-2xl flex flex-col items-center shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-center -mt-4 mb-6">
              <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-orange-100">
                <Wallet size={32} />
              </div>
            </div>
            <h2 className="text-xl font-black uppercase text-gray-800 mb-6 tracking-tighter text-center">
              {t("withdrawals.title")}
            </h2>

            <div className="w-full space-y-4 mb-6">
              <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <p className="text-[10px] font-black text-orange-400 uppercase mb-2 tracking-widest">
                  {t("withdrawals.amount")}
                </p>
                <div className="flex items-center justify-center gap-2 relative z-10">
                  <span className="text-3xl text-orange-300 font-black">
                    DH
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    readOnly={withdrawalNote === "Achat Materiel" && totalExpenseAmount > 0}
                    className="w-48 bg-transparent border-none text-6xl font-black tracking-tighter text-center focus:ring-0 p-0 text-orange-600 placeholder:text-orange-200/50"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 px-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {t("withdrawals.motif_placeholder")}
                  </p>
                  {withdrawalNote && (
                    <button
                      onClick={() => {
                        setWithdrawalNote("");
                        setExpenseArticleQuantities({});
                        setWithdrawalAmount("");
                      }}
                      className="text-[9px] font-bold text-red-400 hover:text-red-500 uppercase tracking-widest"
                    >
                      {t("withdrawals.clear")}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {[
                    {
                      label:
                        t("withdrawals.motifs.salary_advance") ||
                        "Avance Salaire",
                      icon: "💵",
                      color: "bg-blue-50 text-blue-600 border-blue-100",
                      value: "Avance Salaire",
                    },
                    {
                      label:
                        t("withdrawals.motifs.equipment_purchase") ||
                        "Achat Materiel",
                      icon: "🧼",
                      color: "bg-green-50 text-green-600 border-green-100",
                      value: "Achat Materiel",
                    },
                    {
                      label:
                        t("withdrawals.motifs.transport_fees") ||
                        "Frais Transport",
                      icon: "🚚",
                      color: "bg-purple-50 text-purple-600 border-purple-100",
                      value: "Frais Transport",
                    },
                    {
                      label: t("withdrawals.motifs.meal") || "Repas / Dej",
                      icon: "🍕",
                      color: "bg-yellow-50 text-yellow-600 border-yellow-100",
                      value: "Repas / Dej",
                    },
                    {
                      label:
                        t("withdrawals.motifs.utility_bill") ||
                        "Facture Eau/Elec",
                      icon: "📄",
                      color: "bg-cyan-50 text-cyan-600 border-cyan-100",
                      value: "Facture Eau/Elec",
                    },
                    {
                      label:
                        t("withdrawals.motifs.maintenance") || "Maintenance",
                      icon: "🛠️",
                      color: "bg-gray-50 text-gray-600 border-gray-100",
                      value: "Maintenance",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setWithdrawalNote(item.value);
                        if (item.value !== "Achat Materiel") {
                          setExpenseArticleQuantities({});
                        }
                      }}
                      className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${
                        withdrawalNote === item.value
                          ? "bg-gray-900 text-white border-gray-900 shadow-lg scale-[1.02]"
                          : `${item.color} hover:brightness-95 hover:scale-[1.01]`
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-tight text-center leading-none">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                {withdrawalNote === "Achat Materiel" && (
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                      Articles d'achat
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                      {state.expenseArticles.map((art) => (
                        <div key={art.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-50">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase text-gray-800">{art.name}</span>
                            <span className="text-[10px] font-bold text-orange-600">{art.price} DH</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const currentQty = expenseArticleQuantities[art.id] || 0;
                                if (currentQty > 0) {
                                  setExpenseArticleQuantities({
                                    ...expenseArticleQuantities,
                                    [art.id]: currentQty - 1,
                                  });
                                }
                              }}
                              className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-xs font-black w-4 text-center">
                              {expenseArticleQuantities[art.id] || 0}
                            </span>
                            <button
                              onClick={() => {
                                setExpenseArticleQuantities({
                                  ...expenseArticleQuantities,
                                  [art.id]: (expenseArticleQuantities[art.id] || 0) + 1,
                                });
                              }}
                              className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {state.expenseArticles.length === 0 && (
                        <p className="text-center text-[10px] font-bold text-gray-400 py-4 italic">
                          Aucun article configuré
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="relative group">
                  <div className="absolute left-4 top-3 text-gray-400">
                    <Edit size={14} />
                  </div>
                  <textarea
                    placeholder="Autre motif ou détails..."
                    value={withdrawalNote}
                    onChange={(e) => setWithdrawalNote(e.target.value)}
                    className="w-full bg-gray-50 rounded-2xl border-none text-xs font-bold focus:ring-2 focus:ring-orange-500/20 py-3 pl-10 pr-4 text-gray-800 placeholder:text-gray-400 min-h-[60px] resize-none transition-all focus:bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-auto">
              <button
                onClick={() => {
                  setWithdrawalModal(false);
                  setWithdrawalAmount("");
                  setWithdrawalNote("");
                }}
                className="h-14 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={!withdrawalAmount}
                className="h-14 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-30"
              >
                {t("common.confirm") || "Confirmer"}
              </button>
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
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-2 tracking-tighter">
              {t("pos.dimensions")}
            </h2>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-8">
              {dimensionsModal.article.name}
            </p>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck
                      size={20}
                      className={
                        dimIsSupplier ? "text-blue-600" : "text-gray-400"
                      }
                    />
                    <div>
                      <p className="text-[10px] font-black text-gray-800 uppercase">
                        {t("pos.external_supplier")}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-[8px]">
                        {t("pos.send_to_subcontractor")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDimIsSupplier(!dimIsSupplier)}
                    className={`w-14 h-8 rounded-full transition-all relative ${dimIsSupplier ? "bg-blue-600" : "bg-gray-200"}`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${dimIsSupplier ? "right-1" : "left-1"} shadow-sm`}
                    />
                  </button>
                </div>

                {dimIsSupplier && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-3 tracking-widest">
                      {t("pos.select_provider")}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {[...state.suppliers]
                        .sort((a, b) => {
                          const rA = supplierStats[a.id]?.rating ?? "yellow";
                          const rB = supplierStats[b.id]?.rating ?? "yellow";
                          const order = { green: 0, yellow: 1, red: 2 };
                          return (order[rA] ?? 1) - (order[rB] ?? 1);
                        })
                        .map((sup) => {
                          const stats = supplierStats[sup.id];
                          const enCours = stats?.enCours ?? 0;
                          const rating = stats?.rating ?? "yellow";
                          return (
                            <div
                              key={sup.id}
                              className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${dimSupplierId === sup.id ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-white bg-white hover:border-gray-100"}`}
                            >
                              <button
                                type="button"
                                onClick={() => setDimSupplierId(sup.id)}
                                className="flex flex-1 items-center gap-3 min-w-0 text-left"
                              >
                                <span
                                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                    rating === "green"
                                      ? "bg-emerald-500"
                                      : rating === "yellow"
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  }`}
                                  title={
                                    rating === "green"
                                      ? "Rapidité correcte"
                                      : rating === "yellow"
                                        ? "Rapidité moyenne"
                                        : "Retours lents"
                                  }
                                />
                                <img
                                  src={sup.logo}
                                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                  alt=""
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black uppercase text-gray-800 block truncate">
                                    {sup.name}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500">
                                    {enCours} en cours
                                  </span>
                                </div>
                                {dimSupplierId === sup.id && (
                                  <CheckCircle2
                                    size={16}
                                    className="flex-shrink-0 text-blue-600"
                                  />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSupplierId(sup.id);
                                  setState((prev) => ({
                                    ...prev,
                                    currentView: "SUPPLIERS",
                                  }));
                                  setDimensionsModal(null);
                                  setDimIsSupplier(false);
                                }}
                                className="flex-shrink-0 h-8 px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-[9px] font-black uppercase"
                              >
                                Détails
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => {
                  setDimensionsModal(null);
                  setDimIsSupplier(false);
                }}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addMaisonToCart}
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
              {state.suppliers.find((s) => s.id === editingSupplier.id)
                ? t("common.edit")
                : t("common.new")}{" "}
              {t("suppliers.supplier")}
            </h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("suppliers.supplier_name")}
                </p>
                <input
                  type="text"
                  placeholder="Ex: Tapis Master"
                  value={editingSupplier.name}
                  onChange={(e) =>
                    setEditingSupplier({
                      ...editingSupplier,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border-none text-xl font-black uppercase focus:ring-0 p-0 text-gray-800"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("common.name")} (Arabe)
                </p>
                <input
                  type="text"
                  placeholder="مثال: خبير السجاد"
                  value={editingSupplier.name_ar || ""}
                  onChange={(e) =>
                    setEditingSupplier({
                      ...editingSupplier,
                      name_ar: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800 font-arabic"
                  dir="rtl"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("suppliers.logo_url")}
                </p>
                <ArticleImageDropbox
                  image={editingSupplier.logo || ""}
                  onImageChange={(image) =>
                    setEditingSupplier({
                      ...editingSupplier,
                      logo: image,
                    })
                  }
                  showUrlInput={false}
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("suppliers.phone_notification")}
                </p>
                <input
                  type="tel"
                  placeholder="06XXXXXXXX"
                  value={editingSupplier.contact || ""}
                  onChange={(e) =>
                    setEditingSupplier({
                      ...editingSupplier,
                      contact: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800"
                />
                <p className="text-[9px] text-gray-400 mt-1.5">
                  {t("suppliers.phone_notification_hint")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
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

      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-6 tracking-tighter text-center">
              Modifier l&apos;employé
            </h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nom</label>
                <input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser((u) => (u ? { ...u, name: e.target.value } : null))}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Code PIN</label>
                <input
                  type="password"
                  value={editingUser.pin ?? ""}
                  onChange={(e) => setEditingUser((u) => (u ? { ...u, pin: e.target.value } : null))}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Rôle</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser((u) => (u ? { ...u, role: e.target.value as UserRole } : null))}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-bold"
                >
                  <option value="cashier">Caissier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Salaire (DH)</label>
                <input
                  type="number"
                  min={0}
                  value={editingUser.salary}
                  onChange={(e) => setEditingUser((u) => (u ? { ...u, salary: parseFloat(e.target.value) || 0 } : null))}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                  Téléphone (rapport WhatsApp quotidien)
                </label>
                <input
                  type="text"
                  placeholder="06XXXXXXXX"
                  value={editingUser.phone ?? ""}
                  onChange={(e) => setEditingUser((u) => (u ? { ...u, phone: e.target.value } : null))}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setEditingUser(null)}
                className="h-14 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-xs"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!editingUser) return;
                  try {
                    const updated = await api.updateUser(editingUser.id, {
                      name: editingUser.name,
                      pin: editingUser.pin,
                      role: editingUser.role,
                      salary: editingUser.salary,
                      phone: editingUser.phone || undefined,
                    });
                    setState((prev) => ({
                      ...prev,
                      users: prev.users.map((u) =>
                        u.id === editingUser.id
                          ? {
                              ...u,
                              name: updated.name,
                              role: updated.role as UserRole,
                              pin: updated.pin,
                              salary: updated.salary ?? 0,
                              phone: updated.phone ?? "",
                            }
                          : u,
                      ),
                    }));
                    setEditingUser(null);
                  } catch (e) {
                    console.error(e);
                    alert("Erreur lors de la mise à jour.");
                  }
                }}
                className="h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && selectedSupplierId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-orange-100">
              <FileText size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">
              {t("suppliers.new_invoice")}
            </h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("suppliers.invoice_amount")}
                </p>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newInvoiceAmount}
                  onChange={(e) => setNewInvoiceAmount(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("suppliers.items_count_optional")}
                </p>
                <input
                  type="number"
                  placeholder="0"
                  value={newInvoiceItemsCount}
                  onChange={(e) => setNewInvoiceItemsCount(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setNewInvoiceAmount("");
                  setNewInvoiceItemsCount("");
                }}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!selectedSupplierId || !newInvoiceAmount) return;
                  const amount = parseFloat(newInvoiceAmount);
                  const itemsCount = parseInt(newInvoiceItemsCount) || 0;

                  try {
                    const result = await api.createSupplierInvoice({
                      supplierId: selectedSupplierId,
                      amount,
                      itemsCount,
                    });

                    const newInvoice: SupplierInvoice = {
                      id: result.id,
                      supplierId: selectedSupplierId,
                      amount,
                      status: "A payer",
                      createdAt: new Date().toISOString(),
                      itemsCount,
                    };

                    setState((prev) => ({
                      ...prev,
                      invoices: [newInvoice, ...prev.invoices],
                    }));

                    addAuditLog(
                      "SUPPLIER",
                      `Nouvelle facture créée`,
                      `Montant: ${amount.toFixed(2)} DH - ${itemsCount} articles`,
                    );

                    setShowInvoiceModal(false);
                    setNewInvoiceAmount("");
                    setNewInvoiceItemsCount("");
                  } catch (error) {
                    console.error("Failed to create invoice", error);
                    alert("Erreur lors de la création de la facture");
                  }
                }}
                disabled={
                  !newInvoiceAmount || parseFloat(newInvoiceAmount) <= 0
                }
                className="h-16 bg-orange-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-30"
              >
                {t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg flex flex-col shadow-2xl my-auto">
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 flex items-center gap-3">
              <Layers className="text-blue-600" />{" "}
              {state.inventory.find((a) => a.id === editingArticle.id)
                ? t("common.edit")
                : t("common.new")}{" "}
              {t("ticket.article")}
            </h2>

            <div className="space-y-6 mb-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                    {t("common.article_name") || "Nom de l'article"}
                  </p>
                  <input
                    type="text"
                    value={editingArticle.name}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        name: e.target.value,
                      })
                    }
                    className="w-full bg-transparent border-none text-lg font-black uppercase focus:ring-0 p-0"
                  />
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                    Nom (Arabe)
                  </p>
                  <input
                    type="text"
                    value={editingArticle.name_ar || ""}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        name_ar: e.target.value,
                      })
                    }
                    className="w-full bg-transparent border-none text-lg font-black focus:ring-0 p-0 font-arabic"
                    dir="rtl"
                  />
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                    {t("common.base_price") || "Prix de base"} (DH)
                  </p>
                  <input
                    type="number"
                    value={editingArticle.basePrice}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        basePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-transparent border-none text-lg font-black focus:ring-0 p-0 text-blue-600"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">
                  {t("ticket.category") || "Catégorie"}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {state.categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setEditingArticle({
                          ...editingArticle,
                          categoryId: cat.id,
                        })
                      }
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        editingArticle.categoryId === cat.id
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-white text-gray-400"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">
                  {t("common.image_url")}
                </p>
                <ArticleImageDropbox
                  image={editingArticle.image}
                  onImageChange={(image) =>
                    setEditingArticle({ ...editingArticle, image })
                  }
                />
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">
                  {t("common.service_prices") || "Prix Spécifiques par Service"}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {state.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-col gap-1 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        {service.image ? (
                          <img
                            src={service.image}
                            alt={service.name}
                            className="w-6 h-6 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-[14px]">
                            {SERVICE_ICONS[service.id]}
                          </span>
                        )}
                        <span className="text-[8px] font-black uppercase text-gray-500">
                          {language === "ar" && t(`stock_client.${service.id}`) !== `stock_client.${service.id}` ? t(`stock_client.${service.id}`) : service.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder={`${(editingArticle.basePrice * (service.multiplier ?? 1)).toFixed(0)}`}
                          value={
                            editingArticle.servicePrices?.[service.id] ?? ""
                          }
                          onChange={(e) => {
                            const val =
                              e.target.value === ""
                                ? undefined
                                : parseFloat(e.target.value);
                            const newPrices = {
                              ...(editingArticle.servicePrices || {}),
                            };
                            if (val === undefined) delete newPrices[service.id];
                            else newPrices[service.id] = val;
                            setEditingArticle({
                              ...editingArticle,
                              servicePrices: newPrices,
                            });
                          }}
                          className="w-full bg-transparent border-none text-[12px] font-black text-blue-600 focus:ring-0 p-0"
                        />
                        <span className="text-[8px] font-black text-gray-300">
                          DH
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] font-bold text-gray-400 mt-4 uppercase italic leading-tight">
                  {t("common.auto_price_note") ||
                    "Laissez vide pour prix auto : (Base + Prix × Multiplicateur)"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setEditingArticle(null)}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveArticle}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all"
              >
                <Save className="inline-block mr-2" size={18} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpenseArticleModal && editingExpenseArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg flex flex-col shadow-2xl my-auto">
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 flex items-center gap-3">
              <Tag className="text-blue-600" />{" "}
              {editingExpenseArticle.id ? "Modifier Article" : "Nouvel Article"}
            </h2>

            <div className="space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  Nom de l'article
                </p>
                <input
                  type="text"
                  value={editingExpenseArticle.name || ""}
                  onChange={(e) =>
                    setEditingExpenseArticle({
                      ...editingExpenseArticle,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border-none text-lg font-black uppercase focus:ring-0 p-0"
                  placeholder="Ex: Gaz, Javel 5L..."
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  Image de l'article
                </p>
                <ArticleImageDropbox
                  image={editingExpenseArticle.image || ""}
                  onImageChange={(image) =>
                    setEditingExpenseArticle({
                      ...editingExpenseArticle,
                      image,
                    } as any)
                  }
                  showUrlInput={false}
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  Prix Unitaire (DH)
                </p>
                <input
                  type="number"
                  value={editingExpenseArticle.price || ""}
                  onChange={(e) =>
                    setEditingExpenseArticle({
                      ...editingExpenseArticle,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-transparent border-none text-lg font-black focus:ring-0 p-0 text-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => {
                  setShowExpenseArticleModal(false);
                  setEditingExpenseArticle(null);
                }}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!editingExpenseArticle.name || editingExpenseArticle.price === undefined) return;
                  try {
                    if (editingExpenseArticle.id) {
                      await api.updateExpenseArticle(editingExpenseArticle.id, editingExpenseArticle as any);
                      setState(prev => ({
                        ...prev,
                        expenseArticles: prev.expenseArticles.map(a => a.id === editingExpenseArticle.id ? (editingExpenseArticle as ExpenseArticle) : a)
                      }));
                      addAuditLog("SYSTEM", "Article de dépense modifié", `Nom: ${editingExpenseArticle.name}`);
                    } else {
                      const res = await api.createExpenseArticle(editingExpenseArticle as any);
                      const newArt = { ...editingExpenseArticle, id: res.id } as ExpenseArticle;
                      setState(prev => ({
                        ...prev,
                        expenseArticles: [...prev.expenseArticles, newArt]
                      }));
                      addAuditLog("SYSTEM", "Nouvel article de dépense ajouté", `Nom: ${editingExpenseArticle.name}`);
                    }
                    setShowExpenseArticleModal(false);
                    setEditingExpenseArticle(null);
                  } catch (e) {
                    console.error(e);
                    alert("Erreur lors de l'enregistrement");
                  }
                }}
                disabled={!editingExpenseArticle.name}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                <Save className="inline-block mr-2" size={18} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketQueue.length > 0 && (
        <TicketView
          order={ticketQueue[0].order}
          type={ticketQueue[0].type}
          supplierId={ticketQueue[0].supplierId}
          services={state.services}
          suppliers={state.suppliers}
          onClose={() => setTicketQueue((prev) => prev.slice(1))}
        />
      )}
      {showStockModal && editingStockItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
              <Package size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-8 tracking-tighter text-center">
              {editingStockItem.id ? t("common.edit") : t("common.new")}{" "}
              {t("ticket.product") || "Produit"}
            </h2>

            <div className="w-full space-y-6 mb-10">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  Nom du Produit
                </p>
                <input
                  type="text"
                  placeholder="Ex: Lessive Liquide"
                  value={editingStockItem.name || ""}
                  onChange={(e) =>
                    setEditingStockItem({
                      ...editingStockItem,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border-none text-xl font-black uppercase focus:ring-0 p-0 text-gray-800"
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  Nom (Arabe)
                </p>
                <input
                  type="text"
                  placeholder="مثال: مسحوق غسيل"
                  value={editingStockItem.name_ar || ""}
                  onChange={(e) =>
                    setEditingStockItem({
                      ...editingStockItem,
                      name_ar: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800 font-arabic"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                    {t("stock.quantity")}
                  </p>
                  <input
                    type="number"
                    value={editingStockItem.quantity ?? 0}
                    onChange={(e) =>
                      setEditingStockItem({
                        ...editingStockItem,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-gray-800"
                  />
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                    {t("stock.alert_threshold") || "Seuil Alerte"}
                  </p>
                  <input
                    type="number"
                    value={editingStockItem.minQuantity ?? 5}
                    onChange={(e) =>
                      setEditingStockItem({
                        ...editingStockItem,
                        minQuantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-red-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("stock.unit_price")}
                </p>
                <input
                  type="number"
                  placeholder="0.00"
                  value={editingStockItem.unitPrice ?? 0}
                  onChange={(e) =>
                    setEditingStockItem({
                      ...editingStockItem,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-transparent border-none text-xl font-black focus:ring-0 p-0 text-blue-600"
                  step="0.01"
                />
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {t("ticket.supplier")}
                </p>
                <select
                  className="w-full bg-transparent border-none text-sm font-black uppercase focus:ring-0 p-0 text-gray-800"
                  value={editingStockItem.supplierId || ""}
                  onChange={(e) =>
                    setEditingStockItem({
                      ...editingStockItem,
                      supplierId: e.target.value,
                    })
                  }
                >
                  <option value="">{t("common.none")}</option>
                  {state.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => setShowStockModal(false)}
                className="h-16 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs active:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!editingStockItem.name) return;
                  try {
                    if (editingStockItem.id) {
                      await api.updateStockItem(
                        editingStockItem.id,
                        editingStockItem,
                      );
                      const updatedItems = state.stockItems.map((i) =>
                        i.id === editingStockItem.id
                          ? ({ ...i, ...editingStockItem } as StockItem)
                          : i,
                      );
                      setState((prev) => ({
                        ...prev,
                        stockItems: updatedItems,
                      }));
                    } else {
                      const newItem =
                        await api.createStockItem(editingStockItem);
                      setState((prev) => ({
                        ...prev,
                        stockItems: [...prev.stockItems, newItem],
                      }));
                    }
                    setShowStockModal(false);
                    setEditingStockItem(null);
                  } catch (e) {
                    console.error("Failed to save stock item", e);
                    alert("Erreur lors de l'enregistrement");
                  }
                }}
                disabled={!editingStockItem.name}
                className="h-16 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-30"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-6 text-center">
              {t("common.new")} {t("machines.machine")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">
                  {t("common.machine_name") || "Nom de la machine"}
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lave-Linge 1"
                  value={newMachine.name}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, name: e.target.value })
                  }
                  className="w-full h-12 px-4 bg-gray-50 rounded-xl font-bold border-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">
                  Nom (Arabe)
                </label>
                <input
                  type="text"
                  placeholder="مثال: غسالة 1"
                  value={newMachine.name_ar || ""}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, name_ar: e.target.value })
                  }
                  className="w-full h-12 px-4 bg-gray-50 rounded-xl font-bold border-none font-arabic"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">
                  {t("common.type")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setNewMachine({ ...newMachine, type: "washer" })
                    }
                    className={`h-12 rounded-xl font-black uppercase text-xs border ${newMachine.type === "washer" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-400"}`}
                  >
                    {t("machines.washer")}
                  </button>
                  <button
                    onClick={() =>
                      setNewMachine({ ...newMachine, type: "dryer" })
                    }
                    className={`h-12 rounded-xl font-black uppercase text-xs border ${newMachine.type === "dryer" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-400"}`}
                  >
                    {t("machines.dryer")}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">
                  {t("machines.capacity")}
                </label>
                <select
                  value={newMachine.capacity}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, capacity: e.target.value })
                  }
                  className="w-full h-12 px-4 bg-gray-50 rounded-xl font-bold border-none"
                >
                  <option value="10kg">10 KG</option>
                  <option value="14kg">14 KG</option>
                  <option value="18kg">18 KG</option>
                  <option value="20kg">20 KG</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => setShowMachineModal(false)}
                className="h-14 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateMachine}
                className="h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-200"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
      {showPlacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black uppercase text-gray-900 mb-2">
              {t("placement.title")}
            </h2>
            <p className="text-gray-500 text-xs mb-6 font-medium">
              {t("placement.subtitle")}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {placementZoneIds.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlacementSelection(p)}
                  className="aspect-square rounded-2xl bg-gray-50 hover:bg-violet-50 border-2 border-gray-100 hover:border-violet-500 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
                >
                  <span className="text-2xl font-black text-gray-300 group-hover:text-violet-600 transition-colors leading-tight text-center px-1">
                    {placementZoneNames[p] ?? t("placement.zone") + " " + p}
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 group-hover:text-violet-400">
                    {p}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowPlacementModal(false);
                setItemForPlacement(null);
              }}
              className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold uppercase py-3 rounded-xl text-xs transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {showProfileModal && state.currentUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black uppercase text-gray-800 mb-6 tracking-tighter">
              Mon profil
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nom</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Rôle</label>
                <p className="px-4 py-3 rounded-xl bg-gray-50 text-gray-700 font-bold uppercase text-sm">
                  {state.currentUser.role}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold uppercase text-sm hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.updateUser(state.currentUser!.id, { name: profileForm.name, phone: profileForm.phone || undefined });
                    setState((prev) => ({
                      ...prev,
                      currentUser: { ...prev.currentUser!, name: profileForm.name, phone: profileForm.phone },
                      users: (prev.users || []).map((u) =>
                        u.id === state.currentUser!.id ? { ...u, name: profileForm.name, phone: profileForm.phone } : u
                      ),
                    }));
                    setShowProfileModal(false);
                  } catch (e) {
                    alert("Erreur lors de la mise à jour du profil.");
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold uppercase text-sm hover:bg-indigo-700 transition"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreditModal && creditItemForDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300 relative">
            <h2 className="text-2xl font-black uppercase text-gray-900 mb-2 leading-none">
              Confirmation de Paiement
            </h2>
            <p className="text-gray-500 text-xs mb-6 font-medium">
              Cet article a été marqué comme <span className="font-bold text-gray-800">Crédit</span>. Comment le client va-t-il procéder au paiement lors de la livraison ?
            </p>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-bold text-gray-600 uppercase">Total:</span>
                <span className="font-black text-gray-900">{creditItemForDelivery.orderTotal.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-600 uppercase">Reste à payer:</span>
                <span className="font-black text-red-500">{(creditItemForDelivery.orderTotal - creditItemForDelivery.orderPaid).toFixed(2)} DH</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={async () => {
                  if (!state.currentUser) {
                    alert("Veuillez d'abord choisir un utilisateur");
                    return;
                  }
                  // Marquer comme payé sur place (enregistrer le paiement complet + mettre à jour status)
                  try {
                    await api.updateOrderPaid(creditItemForDelivery.orderId, creditItemForDelivery.orderTotal);
                    
                    // Use local updateItemStatus to correctly trigger state updates and audit logs
                    await updateItemStatus(creditItemForDelivery.orderId, creditItemForDelivery.itemId, "livré");
                    
                    addAuditLog(
                      "PAYMENT",
                      "Paiement sur place",
                      `Le reste de ${(creditItemForDelivery.orderTotal - creditItemForDelivery.orderPaid).toFixed(2)} DH a été payé lors de la livraison.`,
                      undefined,
                      creditItemForDelivery.orderId
                    );
                    setShowCreditModal(false);
                  } catch (e) {
                    alert("Erreur lors de la mise à jour");
                  }
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase py-4 rounded-xl text-xs transition-colors shadow-lg active:scale-95"
              >
                Paiement sur place
              </button>
              
              <button
                onClick={() => {
                  updateItemStatus(creditItemForDelivery.orderId, creditItemForDelivery.itemId, "livré");
                  setShowCreditModal(false);
                }}
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-600 font-black uppercase py-4 rounded-xl text-xs transition-colors"
              >
                Crédit après livraison (Plus Tard)
              </button>
            </div>

            <button
              onClick={() => setShowCreditModal(false)}
              className="mt-4 w-full bg-transparent hover:bg-gray-50 text-gray-400 font-bold uppercase py-3 rounded-xl text-[10px] transition-colors"
            >
              Fermer sans changer
            </button>
          </div>
        </div>
      )}

      {/* Pas de service – Confirmation du montant à déduire */}
      {showNoServiceModal && noServiceItemData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black uppercase text-gray-800 mb-2 tracking-tighter">
              {t("tracking.no_service_modal_title") || "Pas de service"}
            </h2>
            <p className="text-sm text-gray-500 mb-1">
              {noServiceItemData.itemName}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {t("tracking.no_service_modal_subtitle") || "Montant à déduire des Fonds de Caisse si déjà payé (DH)"}
            </p>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
              {t("tracking.no_service_amount_label") || "Montant (DH)"}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={noServiceAmount}
              onChange={(e) => setNoServiceAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNoServiceModal(false);
                  setNoServiceItemData(null);
                  setNoServiceAmount("");
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold uppercase text-sm hover:bg-gray-50 transition"
              >
                {t("common.cancel") || "Annuler"}
              </button>
              <button
                onClick={async () => {
                  const amount = parseFloat(noServiceAmount);
                  if (isNaN(amount) || amount < 0) {
                    alert(t("tracking.no_service_invalid_amount") || "Montant invalide");
                    return;
                  }
                  try {
                    await updateItemStatus(noServiceItemData.orderId, noServiceItemData.itemId, "no_service", amount);
                    setShowNoServiceModal(false);
                    setNoServiceItemData(null);
                    setNoServiceAmount("");
                    await loadData();
                  } catch (e) {
                    alert(e?.message || (t("tracking.no_service_error") || "Erreur lors de la mise à jour"));
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold uppercase text-sm hover:bg-red-600 transition"
              >
                {t("tracking.no_service_confirm_btn") || "Confirmer (pas de service)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avance – choisir le montant payé avant impression du ticket */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black uppercase text-gray-800 mb-2 tracking-tighter">
              {t("pos.advance_modal_title") || "Montant de l'avance"}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {t("pos.advance_modal_subtitle") || `Total: ${finalOrderTotal.toFixed(2)} DH. Saisissez le montant reçu maintenant.`}
            </p>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
              {t("pos.advance_modal_label") || "Montant de l'avance (DH)"}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={advanceAmountInput}
              onChange={(e) => setAdvanceAmountInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdvanceModal(false);
                  setAdvanceAmountInput("");
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold uppercase text-sm hover:bg-gray-50 transition"
              >
                {t("common.cancel") || "Annuler"}
              </button>
              <button
                onClick={() => {
                  const amount = parseFloat(advanceAmountInput);
                  if (isNaN(amount) || amount <= 0 || amount > finalOrderTotal) {
                    alert(
                      t("pos.advance_modal_invalid_amount") ||
                        "Montant invalide (doit être > 0 et ≤ total).",
                    );
                    return;
                  }
                  try {
                    handleFinishOrder("avance", amount);
                    setShowAdvanceModal(false);
                    setAdvanceAmountInput("");
                  } catch (e: any) {
                    alert(
                      e?.message ||
                        t("pos.advance_modal_error") ||
                        "Erreur lors de la création de la commande.",
                    );
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold uppercase text-sm hover:bg-indigo-700 transition"
              >
                {t("pos.advance_modal_confirm_btn") || "Confirmer l'avance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article perdu – Remboursement */}
      {showLostModal && lostItemData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black uppercase text-gray-800 mb-2 tracking-tighter">
              {t("tracking.lost_modal_title") || "Article perdu – Remboursement"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {lostItemData.itemName}
            </p>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
              {t("tracking.lost_modal_amount_label") || "Montant du remboursement (DH)"}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={lostReimbursementAmount}
              onChange={(e) => setLostReimbursementAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLostModal(false);
                  setLostItemData(null);
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold uppercase text-sm hover:bg-gray-50 transition"
              >
                {t("common.cancel") || "Annuler"}
              </button>
              <button
                onClick={async () => {
                  const amount = parseFloat(lostReimbursementAmount);
                  if (isNaN(amount) || amount < 0) {
                    alert(t("tracking.lost_modal_invalid_amount") || "Montant invalide");
                    return;
                  }
                  try {
                    await updateItemStatus(lostItemData.orderId, lostItemData.itemId, "lost", amount);
                    setShowLostModal(false);
                    setLostItemData(null);
                    setLostReimbursementAmount("");
                    await loadData();
                  } catch (e) {
                    alert(t("tracking.lost_modal_error") || "Erreur lors de la mise à jour");
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold uppercase text-sm hover:bg-red-600 transition"
              >
                {t("tracking.lost_modal_confirm_btn") || "Confirmer (perdu)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier measurement (maison) */}
      {showSupplierMeasureModal && supplierMeasureItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black uppercase text-gray-800 mb-2 tracking-tighter">
              Article fournisseur – Mesures
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {supplierMeasureItem.articleName}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Largeur (m)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={measureWidth}
                  onChange={(e) => setMeasureWidth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Hauteur (m)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={measureHeight}
                  onChange={(e) => setMeasureHeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Surface (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={measureSurface}
                  onChange={(e) => setMeasureSurface(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
            </div>

            <div className="text-[11px] font-bold text-gray-500 mb-4">
              {(() => {
                const s = parseFloat(measureSurface || "0");
                const w = parseFloat(measureWidth || "0");
                const h = parseFloat(measureHeight || "0");
                const area = s > 0 ? s : w > 0 && h > 0 ? w * h : 0;
                const spm = parseFloat(supplierPricePerM2 || "0");
                const cpm = parseFloat(clientPricePerM2 || "0");
                const supplierTotal = area > 0 && spm > 0 ? spm * area : 0;
                const clientTotal = area > 0 && cpm > 0 ? cpm * area : 0;
                return (
                  <>
                    <div>Surface: {area > 0 ? area.toFixed(2) : "-"} m²</div>
                    <div>Fournisseur: {supplierTotal > 0 ? supplierTotal.toFixed(2) : "-"} DH</div>
                    <div>Client: {clientTotal > 0 ? clientTotal.toFixed(2) : "-"} DH</div>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSupplierMeasureModal(false);
                  setSupplierMeasureItem(null);
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold uppercase text-sm hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!supplierMeasureItem) return;
                  const s = parseFloat(measureSurface || "0");
                  const w = parseFloat(measureWidth || "0");
                  const h = parseFloat(measureHeight || "0");
                  const area = s > 0 ? s : w * h;
                  if (!(area > 0)) {
                    alert("Veuillez saisir des mesures valides.");
                    return;
                  }
                  const article = state.inventory.find(
                    (a) => a.id === supplierMeasureItem.articleId,
                  );
                  const service = state.services.find(
                    (s) => s.id === supplierMeasureItem.serviceId,
                  );
                  const specific =
                    (article as any)?.servicePrices?.[
                      supplierMeasureItem.serviceId
                    ];
                  const clientPerM2 =
                    specific ??
                    ((article?.basePrice ?? 0) *
                      (service?.multiplier ?? 1));
                  const supplierPerM2 = parseFloat(supplierPricePerM2 || "0");
                  const supplierTotal = supplierPerM2 * area;
                  const clientTotal = clientPerM2 * area;

                  try {
                    // Update client price (unit + total)
                    await api.updateItemPrice(
                      supplierMeasureItem.itemId,
                      clientPerM2,
                      clientTotal,
                    );

                    // Update supplier price on item so expense uses this amount
                    if (supplierMeasureItem.supplierId) {
                      await api.updateOrderItemSupplier(
                        supplierMeasureItem.itemId,
                        supplierMeasureItem.supplierId,
                        supplierTotal,
                      );
                    }

                    // Mark as received from supplier (status -> repassage) and trigger supplier expense
                    const defaultUser =
                      state.users.find((u) => u.role === "admin") ||
                      state.users[0];
                    const activeUser = state.currentUser || defaultUser;
                    await api.updateItemStatus(
                      supplierMeasureItem.orderId,
                      supplierMeasureItem.itemId,
                      "repassage",
                      undefined,
                      undefined,
                      undefined,
                      activeUser?.id,
                      activeUser?.name,
                    );

                    await loadData();
                    setShowSupplierMeasureModal(false);
                    setSupplierMeasureItem(null);
                  } catch (e) {
                    console.error(e);
                    alert("Erreur lors de la mise à jour des prix.");
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold uppercase text-sm hover:bg-emerald-600 transition"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Ticket Modal */}
      {editingOrder && (
        <EditTicketModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onUpdated={async () => {
            const orders = await api.getOrders();
            setState((prev) => ({
              ...prev,
              orders: orders.map((o: any) => ({
                ...o,
                ticketId: o.ticketId || o.id,
                clientName: o.clientId ? prev.clients.find((c) => c.id === o.clientId)?.name : undefined,
                items: o.items.map((it: any) => ({
                  id: it.id,
                  articleId: it.articleId,
                  articleName:
                    prev.inventory.find((a) => a.id === it.articleId)?.name ||
                    it.articleId,
                  articleName_ar: prev.inventory.find(
                    (a) => a.id === it.articleId,
                  )?.name_ar,
                  categoryId:
                    prev.inventory.find((a) => a.id === it.articleId)
                      ?.categoryId || "homme",
                  image:
                    prev.inventory.find((a) => a.id === it.articleId)?.image ||
                    "",
                  quantity: it.quantity,
                  serviceId: it.service || "lavage",
                  price: it.totalPrice ?? it.unitPrice * it.quantity,
                  width: it.width,
                  height: it.height,
                  isSupplierItem: !!it.supplierId,
                  supplierId: it.supplierId,
                  supplierPrice: it.supplierPrice,
                  barcode: it.id,
                  status: it.status || "reçu",
                  placement: it.placement,
                  assignedTo: it.assignedTo,
                  processedBy: it.processedBy,
                })),
              })),
            }));
          }}
        />
      )}
    </div>
  );
};

export default App;
