const API_URL = "http://localhost:3333";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    let message = `API ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string") message = body.error;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// GET all from DB (cache-bust so deleted orders/items always reflect DB)
export async function getOrders() {
  const res = await fetch(`${API_URL}/orders?_=${Date.now()}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}
export async function getCategories() {
  return request<any[]>(`/categories`);
}

export async function createCategory(data: {
  name: string;
  name_ar?: string;
  image?: string;
  color?: string;
}) {
  return request<{
    id: string;
    name: string;
    name_ar?: string;
    image: string;
    color: string;
  }>(`/categories`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: string,
  data: { name?: string; name_ar?: string; image?: string; color?: string },
) {
  return request<any>(`/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string) {
  return request<void>(`/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
export async function getServices() {
  return request<any[]>(`/services`);
}
export async function getArticles() {
  return request<any[]>(`/articles`);
}

export async function createArticle(data: {
  id?: string;
  name: string;
  name_ar?: string;
  categoryId: string;
  image?: string;
  basePrice: number;
  stock?: number;
  supplierCost?: number;
}) {
  return request<any>(`/articles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateArticle(
  id: string,
  data: {
    name?: string;
    name_ar?: string;
    categoryId?: string;
    image?: string;
    basePrice?: number;
    stock?: number;
    supplierCost?: number;
  },
) {
  return request<any>(`/articles/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteArticle(id: string) {
  return request<void>(`/articles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
export async function getUsers() {
  return request<any[]>(`/users`);
}
export async function getSuppliers() {
  return request<any[]>(`/suppliers`);
}

export async function createSupplier(data: { name: string; name_ar?: string; logo?: string; contact?: string }) {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to create supplier');
  }
  return res.json();
}

export async function updateSupplier(id: string, data: { name?: string; name_ar?: string; logo?: string; contact?: string }) {
  const res = await fetch(`${API_URL}/suppliers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = (err as { error?: string }).error || 'Failed to update supplier';
    const e = new Error(message) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export async function deleteSupplier(id: string) {
  const res = await fetch(`${API_URL}/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete supplier');
}

export async function getArticlePricesBySupplier(supplierId: string) {
  const res = await fetch(`${API_URL}/suppliers/${encodeURIComponent(supplierId)}/article-prices`);
  if (!res.ok) throw new Error('Failed to fetch article prices');
  const data = await res.json();
  return data.prices as Record<string, number>;
}

export async function setArticlePricesBySupplier(
  supplierId: string,
  prices: Record<string, number>,
) {
  const res = await fetch(
    `${API_URL}/suppliers/${encodeURIComponent(supplierId)}/article-prices`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prices }),
    },
  );
  if (!res.ok) throw new Error('Failed to save article prices');
  return res.json();
}

export async function getMachines() {
  return request<any[]>(`/machines`);
}
export async function getClients() {
  return request<any[]>(`/clients`);
}

export async function createClient(data: { name: string; phone?: string; address?: string }) {
  return request<{
    id: string;
    name: string;
    phone: string;
    address: string;
    createdAt: string;
  }>(`/clients`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClient(
  id: string,
  data: { name?: string; phone?: string; address?: string; notificationsEnabled?: boolean; discountRate?: number; note?: string },
) {
  return request<{
    id: string;
    name: string;
    phone: string;
    address: string;
    notificationsEnabled: boolean;
    createdAt: string;
  }>(`/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: string) {
  return request<void>(`/clients/${id}`, { method: "DELETE" });
}

// Notifications (in-app)
export async function getNotifications(userId: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return request<any[]>(`/notifications${qs}`);
}

export async function createNotification(data: {
  userId?: string | null;
  type: string;
  title: string;
  body: string;
}) {
  return request<any>(`/notifications`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function markNotificationRead(id: string) {
  return request<void>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(userId: string) {
  return request<void>(`/notifications/read-all`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// Old stock (client + placement + article + service + barcode for Suivi)
export async function getOldStockItems() {
  return request<any[]>(`/old-stock`);
}

export async function createOldStockItem(data: {
  clientId: string | null;
  placement?: string;
  articleId?: string | null;
  articleName: string;
  serviceId?: string | null;
  barcode: string;
}) {
  return request<any>(`/old-stock`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteOldStockItem(id: string) {
  return request<void>(`/old-stock/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateOldStockStatus(id: string, status: 'prêt' | 'livré') {
  return request<any>(`/old-stock/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createUser(data: {
  name: string;
  role?: "admin" | "cashier";
  pin?: string;
  avatar?: string;
  salary?: number;
  phone?: string;
}) {
  return request<any>(`/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    role?: string;
    pin?: string;
    avatar?: string;
    salary?: number;
    phone?: string;
  },
) {
  return request<any>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string) {
  return request<void>(`/users/${id}`, { method: "DELETE" });
}
export async function getTransactions() {
  return request<any[]>(`/transactions`);
}
export async function getAuditLogs() {
  return request<any[]>(`/audit-logs`);
}
export async function createAuditLog(data: {
  type: string;
  action: string;
  details?: string;
  userId?: string;
  userName?: string;
  orderId?: string;
}) {
  return request<any>(`/audit-logs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function getSupplierInvoicesList() {
  return request<any[]>(`/supplier-invoices`);
}

export async function createOrder(orderData: any) {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  if (!res.ok) {
    throw new Error("Failed to create order");
  }

  return res.json();
}

export async function updateOrderItemSupplier(
  itemId: string,
  supplierId: string | null,
  supplierPrice: number | null,
) {
  const res = await fetch(`${API_URL}/orders/items/${itemId}/supplier`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supplierId, supplierPrice }),
  });

  if (!res.ok) {
    throw new Error("Failed to update supplier");
  }

  return res.json();
}

// Supplier Invoices API
export async function getSupplierInvoices(supplierId?: string) {
  const url = supplierId
    ? `${API_URL}/supplier-invoices?supplierId=${supplierId}`
    : `${API_URL}/supplier-invoices`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function createSupplierInvoice(data: {
  supplierId: string;
  amount: number;
  itemsCount?: number;
}) {
  const res = await fetch(`${API_URL}/supplier-invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create invoice");
  return res.json();
}

export async function updateSupplierInvoice(
  id: string,
  data: { status?: string; amount?: number },
) {
  const res = await fetch(`${API_URL}/supplier-invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update invoice");
  return res.json();
}

export async function deleteSupplierInvoice(id: string) {
  const res = await fetch(`${API_URL}/supplier-invoices/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete invoice");
  return res.json();
}

// Stock / Products API
export async function getStock() {
  return request<any[]>("/stock");
}

export async function createStockItem(data: any) {
  const res = await fetch(`${API_URL}/stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create stock item");
  return res.json();
}

export async function updateItemStatus(
  orderId: string,
  itemId: string,
  status: string,
  placement?: string,
  assignedTo?: string,
  processedBy?: string,
  userId?: string,
  userName?: string,
  reimbursementAmount?: number,
) {
  const body: Record<string, unknown> = {
    status,
    placement,
    assignedTo,
    processedBy,
    userId,
    userName,
  };
  if (reimbursementAmount != null && (status === "lost" || status === "no_service")) {
    body.reimbursementAmount = reimbursementAmount;
  }
  const res = await fetch(`${API_URL}/orders/items/${itemId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update item status");
  return res.json();
}

export async function updateStockItem(id: string, data: any) {
  const res = await fetch(`${API_URL}/stock/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update stock item");
  return res.json();
}

export async function deleteStockItem(id: string) {
  const res = await fetch(`${API_URL}/stock/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete stock item");
  return res.json();
}

export async function createMachine(data: {
  name: string;
  name_ar?: string;
  type: "washer" | "dryer";
  capacity: string;
}) {
  const res = await fetch(`${API_URL}/machines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create machine");
  return res.json();
}

export async function deleteMachine(id: string) {
  const res = await fetch(`${API_URL}/machines/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete machine");
  return res.json(); // or void
}

export async function updateMachineStatus(
  id: string,
  status: string,
  timeRemaining?: number,
  program?: string,
) {
  const res = await fetch(`${API_URL}/machines/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, timeRemaining, program }),
  });
  if (!res.ok) throw new Error("Failed to update machine status");
  return res.json();
}

// --- Admin: Edit ticket ---
export async function updateItemPrice(
  itemId: string,
  unitPrice: number,
  totalPrice: number,
) {
  const res = await fetch(`${API_URL}/orders/items/${itemId}/price`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unitPrice, totalPrice }),
  });
  if (!res.ok) throw new Error("Failed to update item price");
  return res.json();
}

export async function removeOrderItem(itemId: string) {
  const res = await fetch(`${API_URL}/orders/items/${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove item");
  return res.json();
}

export async function updateOrderPaid(ticketId: string, paid: number) {
  const res = await fetch(`${API_URL}/orders/${ticketId}/paid`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paid }),
  });
  if (!res.ok) throw new Error("Failed to update paid amount");
}

export async function notifySuppliersOnPrint(ticketId: string) {
  const res = await fetch(`${API_URL}/orders/${encodeURIComponent(ticketId)}/notify-suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to notify suppliers");
  return res.json();
}

export async function sendTicketPdfToClient(ticketId: string, language: string) {
  const res = await fetch(`${API_URL}/orders/${encodeURIComponent(ticketId)}/send-ticket-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to send ticket PDF");
  }
  return res.json();
}

// --- Expense Articles ---
export async function getExpenseArticles() {
  const res = await fetch(`${API_URL}/expense-articles`);
  if (!res.ok) throw new Error("Failed to fetch expense articles");
  return res.json();
}

export async function createExpenseArticle(data: { name: string; price: number; image?: string }) {
  const res = await fetch(`${API_URL}/expense-articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create expense article");
  return res.json();
}

export async function updateExpenseArticle(id: string, data: { name: string; price: number; image?: string }) {
  const res = await fetch(`${API_URL}/expense-articles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update expense article");
  return res.json();
}

export async function deleteExpenseArticle(id: string) {
  const res = await fetch(`${API_URL}/expense-articles/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete expense article");
  return res.json();
}
