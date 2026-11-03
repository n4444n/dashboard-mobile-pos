// ชนิดข้อมูลจากเซิร์ฟเวอร์ POS (คัดมาจาก POS src/types.ts + src/api.ts รุ่น 1.0.33 — เฉพาะที่แอปรายงานใช้)

export type PaymentMethod = 'cash' | 'promptpay' | 'card' | 'transfer';
export type OrderStatus = 'paid' | 'edited' | 'void';
export type Role = 'admin' | 'manager' | 'sales' | 'parttime';
export type PermLevel = 'none' | 'view' | 'edit';
export type Feature = 'sales' | 'history' | 'shifts' | 'promos' | 'expenses' | 'stock' | 'shipments' | 'reports' | 'taxReport' | 'staff' | 'branches' | 'settings';

/** พนักงานที่เข้าสู่ระบบ (GET /api/auth/me) */
export interface Me {
  id: number;
  name: string;
  role: Role;
  perms: Record<Feature, PermLevel>;
  canVoid: boolean;
  branchId: number;
  branchIds: number[];
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string;
  isMain: boolean;
  current?: boolean;
}

export interface Kpis {
  sales: number;
  bills: number;
  units: number;
  discount: number;
  profit: number;
  margin: number;
  aov: number;
  upt: number;
  /** คืนเงินด้วยใบลดหนี้ (หักในยอดขายแล้ว) */
  refund?: number;
  creditNotes?: number;
}

export interface SeriesPoint {
  key: string;
  sales: number;
  bills: number;
  units: number;
  profit: number;
}

/** GET /api/dashboard?from=&to=&branch=all|<id> */
export interface Dashboard {
  range: { from: string; to: string; days: number; granularity: 'hour' | 'day' | 'month' };
  prevRange: { from: string; to: string };
  kpis: Kpis;
  prev: Kpis;
  expenses?: { total: number; count: number; prev: number; top: { category: string; name: string; total: number }[] };
  series: SeriesPoint[];
  prevSeries: SeriesPoint[];
  topProducts: { id: number; name: string; sku: string; art: string; tint: string; categoryId: string; category: string; units: number; sales: number }[];
  sizes: { label: string; units: number; sales: number }[];
  colors: { label: string; hex: string; units: number; sales: number }[];
  categories: { id: string; label: string; units: number; sales: number }[];
  payments: { method: PaymentMethod; bills: number; sales: number; fees?: number }[];
  hours: { hour: number; bills: number; sales: number }[];
  staff: { name: string; bills: number; sales: number }[];
  lowStock: { variantId: number; productId: number; name: string; art: string; size: string; color: string; colorHex: string; stock: number; sold30: number }[];
  stock: { out: number; low: number; variants: number; units: number; value: number };
  returns: { edits: number; voids: number; creditNotes?: number; refunded: number; collected: number };
  recent: { id: number; orderNo: string; createdAt: string; customerName: string | null; salesperson: string | null; total: number; paymentMethod: PaymentMethod; status: OrderStatus; itemCount: number }[];
}

/** แถวบิล (GET /api/history) — branchId เติมในแอปตอนรวมหลายสาขา */
export interface HistoryRow {
  id: number;
  orderNo: string;
  createdAt: string;
  customerName: string | null;
  salesperson: string | null;
  orderType: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  editCount: number;
  itemCount: number;
  branchId?: number;
}
export interface HistorySummary {
  count: number;
  sales: number;
  voided: number;
  edited: number;
}

export interface OrderItem {
  name: string;
  sku: string;
  size: string;
  color: string;
  extra?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  colorHex?: string | null;
}
export interface OrderEdit {
  id: number;
  kind: 'edit' | 'void' | 'credit';
  editedAt: string;
  staff: string;
  reason: string;
  summary: string;
  oldTotal: number;
  newTotal: number;
  diff: number;
}
/** GET /api/orders/:id */
export interface OrderDetail {
  id: number;
  orderNo: string;
  customerName?: string | null;
  salesperson?: string | null;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  promoCode: string | null;
  fee?: number;
  feePayer?: 'customer' | 'shop';
  paymentMethod: PaymentMethod;
  createdAt?: string;
  vatRate?: number | null;
  vatBase?: number | null;
  exemptAmount?: number;
  status: OrderStatus;
  voidReason: string | null;
  items: OrderItem[];
  edits: OrderEdit[];
}

/** GET /api/shifts */
export interface Shift {
  id: number;
  shiftNo: number;
  businessDate: string;
  status: 'open' | 'closed';
  openedAt: string;
  openedBy: string;
  openingCash: number;
  closedAt: string | null;
  closedBy: string | null;
  countedCash: number | null;
  expectedCash: number;
  diff: number | null;
  closeNote: string | null;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  totalSales: number;
  billCount: number;
  byMethod: Record<PaymentMethod, number>;
  branchId?: number;
}
export interface ShiftSummary {
  count: number;
  totalSales: number;
  cashSales: number;
  match: number;
  short: number;
  over: number;
  netDiff: number;
}

/** GET /api/expenses */
export type ExpenseSource = 'drawer' | 'transfer' | 'card' | 'owner';
export interface ExpenseCategory { id: string; name: string; icon: string; color: string }
export interface Expense {
  id: number;
  branchId: number;
  branchName: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  source: ExpenseSource;
  vendor: string;
  refNo: string;
  note: string;
  shiftNo: number | null;
  staff: string;
  createdAt: string;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  items: { description: string; category: string; qty: number; unit: string; unitPrice: number; amount: number }[];
}
export interface ExpenseList {
  rows: Expense[];
  summary: {
    count: number;
    total: number;
    bySource: { source: ExpenseSource; total: number; count: number }[];
    byCategory: { category: string; total: number; count: number }[];
    byDay: { date: string; total: number }[];
  };
  categories: ExpenseCategory[];
  sources: Record<ExpenseSource, string>;
}

/** GET /api/shipments */
export interface Shipment {
  id: number;
  docNo: string;
  destBranchId: number;
  destBranchName: string | null;
  sourceBranchId: number | null;
  sourceBranchName: string | null;
  bags: number;
  note: string | null;
  status: 'draft' | 'shipped' | 'cancelled';
  createdBy: string | null;
  createdAt: string;
  shippedBy: string | null;
  shippedAt: string | null;
  units: number;
  lines: number;
  heldAt: string | null;
}
export interface ShipmentList { list: Shipment[]; cancelled: Shipment[]; keepDays: number; branches: { id: number; name: string; code: string; isMain: boolean }[] }
export interface ShipmentItem { variantId: number; qty: number; sku: string; size: string; color: string; extra: string; name: string; label: string; productSku?: string }
export interface ShipmentDetail { shipment: Shipment; items: ShipmentItem[] }

/** GET /api/stock/skus */
export interface SkuCell {
  id: number;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  extra: string;
  stock: number;
  active: boolean;
  price: number;
  cost?: number;
}
export interface SkuProduct {
  id: number;
  code: string;
  name: string;
  categoryId: string;
  category: string | null;
  active: boolean;
  lowStock: number;
  variants: SkuCell[];
}
export interface SkuPage {
  total: number;
  skus: number;
  units: number;
  page: number;
  pages: number;
  limit: number;
  products: SkuProduct[];
}

/** คำตอบจากเซิร์ฟเวอร์ license (POST /api/activate, /api/check) */
export interface LicenseInfo {
  ok: true;
  code: string;
  shop: string;
  url: string;
  route: string;
  expiresAt: string | null;
  daysLeft: number | null;
  maxMachines: number;
  machines: number;
  created?: boolean;
  managerPin?: string;
}
