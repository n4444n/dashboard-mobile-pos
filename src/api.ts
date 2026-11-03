// เรียก API ของเซิร์ฟเวอร์ POS ร้าน + เซิร์ฟเวอร์ license (เหมือนแอป .exe ของ POS)
//
//   1) POST <license>/api/activate  { code, machineId, machineName } → ที่อยู่ร้าน (url) + ชื่อย่อร้าน (route)
//   2) ทุกคำขอไปที่ <url>/api/... แนบ X-POS-Shop: <route> + X-POS-Machine: <machineId> (ประตูส่งต่อไปร้านที่ถูกต้อง)
//   3) POST /api/auth/login { pin } → token → Authorization: Bearer <token>
//
// ข้อมูลบิล/กะ/สต็อก เป็นของ "สาขาที่เลือกอยู่" ใน session → ดูสาขาอื่นต้องสลับสาขาก่อน (inBranch)
// รายงานรวม (/api/dashboard) เลือกสาขาด้วย ?branch=all|<id> ได้เลย
import { Platform } from 'react-native';
import { store } from './storage';
import type {
  Branch, Dashboard, ExpenseList, HistoryRow, HistorySummary, LicenseInfo, Me, OrderDetail, Shift, ShiftSummary,
  ShipmentDetail, ShipmentList, SkuPage,
} from './types';

/** เซิร์ฟเวอร์ license เริ่มต้น (ตั้งใหม่ได้ที่หน้าเข้าสู่ระบบ › ตั้งค่าเซิร์ฟเวอร์) */
export const DEFAULT_LICENSE_SERVER = 'https://pos.sh0p.tech';
export const APP_VERSION = '1.0.0';

export interface Conn {
  /** ที่อยู่เซิร์ฟเวอร์ license เช่น https://pos.sh0p.tech หรือ http://192.168.1.20:3100 (ทดสอบในเครื่อง) */
  licenseServer: string;
  /** โหมดทดสอบ: ต่อเซิร์ฟเวอร์ POS ตรง (ไม่ผ่าน license) เช่น http://192.168.1.20:3000 */
  directUrl: string;
  license: LicenseInfo | null;
  machineId: string;
  token: string | null;
}

export const conn: Conn = { licenseServer: DEFAULT_LICENSE_SERVER, directUrl: '', license: null, machineId: '', token: null };

const clean = (u: string) => u.trim().replace(/\/+$/, '');

/** โหลดค่าที่จำไว้ในเครื่อง (เรียกครั้งเดียวตอนเปิดแอป) */
export async function loadConn() {
  const saved = await store.get<Partial<Conn>>('conn', {});
  Object.assign(conn, saved);
  if (!conn.licenseServer) conn.licenseServer = DEFAULT_LICENSE_SERVER;
  if (!conn.machineId) {
    // รหัสเครื่องของแอปนี้ (สุ่มครั้งเดียว แล้วจำไว้) — เซิร์ฟเวอร์ license นับเป็น 1 เครื่อง
    let id = 'm-';
    for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
    conn.machineId = id;
  }
  await saveConn();
  return conn;
}
export const saveConn = () => store.set('conn', conn);

/** ที่อยู่ API ของร้าน */
export const shopBase = () => clean(conn.directUrl || conn.license?.url || '');
export const machineName = () => `Tally ${APP_VERSION} · ${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'}`;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** เหตุการณ์ที่หน้าหลักต้องรู้: token หมดอายุ (กลับหน้า PIN) / license ใช้ไม่ได้ (กลับหน้า license) */
const handlers: { onAuthExpired?: () => void; onLicenseBlocked?: (msg: string) => void } = {};
export const onApiEvents = (h: typeof handlers) => Object.assign(handlers, h);
const LICENSE_BLOCKING = new Set(['EXPIRED', 'REVOKED', 'NOT_FOUND', 'MACHINE_UNKNOWN', 'MACHINE_LIMIT', 'SUSPENDED']);

function headers(extra?: HeadersInit): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conn.token) h.Authorization = `Bearer ${conn.token}`;
  if (!conn.directUrl && conn.license?.route) {
    h['X-POS-Shop'] = conn.license.route;
    h['X-POS-Machine'] = conn.machineId;
  }
  return { ...h, ...(extra as Record<string, string> | undefined) };
}

async function http<T>(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data as { ok?: boolean }).ok === false) {
      const d = data as { error?: string; code?: string };
      throw new ApiError(res.status, d.error ?? `HTTP ${res.status}`, d.code ?? res.headers.get('X-POS-License') ?? undefined);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError(0, 'เซิร์ฟเวอร์ไม่ตอบสนอง ลองใหม่อีกครั้ง', 'TIMEOUT');
    // บนเบราว์เซอร์: เซิร์ฟเวอร์ License/ประตูร้านไม่เปิด CORS → เบราว์เซอร์บล็อก (มือถือ/Expo Go ไม่โดน)
    if (Platform.OS === 'web') {
      throw new ApiError(0, 'เบราว์เซอร์บล็อกการเชื่อมต่อเซิร์ฟเวอร์นี้ (CORS) — ทดสอบบนมือถือด้วย Expo Go หรือใช้ "ตั้งค่าเซิร์ฟเวอร์ › ต่อเซิร์ฟเวอร์ POS ตรง" เช่น http://localhost:3000', 'NETWORK');
    }
    throw new ApiError(0, 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจอินเทอร์เน็ต', 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

/** เรียก API ของร้าน */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = shopBase();
  if (!base) throw new ApiError(0, 'ยังไม่ได้เชื่อมต่อร้าน', 'CONFIG');
  try {
    return await http<T>(base + path, { ...init, headers: headers(init.headers) });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401 && e.code === 'AUTH') handlers.onAuthExpired?.();
      else if (e.code && LICENSE_BLOCKING.has(e.code)) handlers.onLicenseBlocked?.(e.message);
    }
    throw e;
  }
}

function qs(f: object) {
  const p: string[] = [];
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== '') p.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
}

// ---------------------------------------------------------------- license
export const license = {
  /** กรอก license ครั้งแรก (อาจรอเซิร์ฟเวอร์สร้างร้านทดลองนานถึง 2–3 นาที) */
  activate: (code: string) =>
    http<LicenseInfo>(`${clean(conn.licenseServer)}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, machineId: conn.machineId, machineName: machineName() }),
    }, 150_000),
  /** ตรวจซ้ำทุกครั้งที่เปิดแอป (หมดอายุ/ถูกระงับ → กลับหน้า license) */
  check: (code: string) =>
    http<LicenseInfo>(`${clean(conn.licenseServer)}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, machineId: conn.machineId, machineName: machineName() }),
    }, 15_000),
  isBlocking: (e: unknown) => e instanceof ApiError && !!e.code && LICENSE_BLOCKING.has(e.code),
};

// ---------------------------------------------------------------- สลับสาขา (คิวเดียว ไม่ให้คำขอสลับสาขาซ้อนกัน)
let sessionBranch = 0;
let queue: Promise<unknown> = Promise.resolve();
export const setSessionBranch = (id: number) => {
  sessionBranch = id;
};
/** ทำงานในสาขาที่ระบุ (สลับสาขาของ session ก่อนถ้าจำเป็น) */
export function inBranch<T>(branchId: number, fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    if (branchId && branchId !== sessionBranch) {
      await request<{ branchId: number }>('/api/branches/switch', { method: 'POST', body: JSON.stringify({ id: branchId }) });
      sessionBranch = branchId;
    }
    return fn();
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

// ---------------------------------------------------------------- API ของร้าน
export const api = {
  login: (pin: string) => request<{ token: string; staff: Me }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  authConfig: () => request<{ pinLength: number; shop: { name: string } }>('/api/auth/config'),
  me: () => request<Me>('/api/auth/me'),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  branches: () => request<{ current: Branch | null; list: Branch[] }>('/api/branches'),
  dashboard: (f: { from: string; to: string; branch: 'all' | number }) => request<Dashboard>(`/api/dashboard${qs(f)}`),
  history: (f: { from?: string; to?: string; q?: string; status?: string; limit?: number; offset?: number }) =>
    request<{ rows: HistoryRow[]; summary: HistorySummary; limit: number; offset: number }>(`/api/history${qs(f)}`),
  orderDetail: (id: number) => request<OrderDetail>(`/api/orders/${id}`),
  shifts: (f: { from?: string; to?: string; limit?: number }) => request<{ rows: Shift[]; summary: ShiftSummary }>(`/api/shifts${qs(f)}`),
  expenses: (f: { from?: string; to?: string; branch?: string; voided?: string }) => request<ExpenseList>(`/api/expenses${qs(f)}`),
  shipments: () => request<ShipmentList>('/api/shipments'),
  shipment: (id: number) => request<ShipmentDetail>(`/api/shipments/${id}`),
  skus: (f: { q?: string; status?: string; sort?: string; dir?: string; page?: number; limit?: number }) => request<SkuPage>(`/api/stock/skus${qs(f)}`),
};

/** บิลของหลายสาขา: เรียกทีละสาขาแล้วรวม (เรียงใหม่สุดก่อน) */
export async function historyMerged(branchIds: number[], f: Parameters<typeof api.history>[0]) {
  const rows: HistoryRow[] = [];
  const summary: HistorySummary = { count: 0, sales: 0, voided: 0, edited: 0 };
  for (const id of branchIds) {
    const r = await inBranch(id, () => api.history(f));
    rows.push(...r.rows.map((x) => ({ ...x, branchId: id })));
    summary.count += r.summary.count;
    summary.sales += r.summary.sales;
    summary.voided += r.summary.voided;
    summary.edited += r.summary.edited;
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id));
  return { rows, summary };
}

/** กะของหลายสาขา */
export async function shiftsMerged(branchIds: number[], f: Parameters<typeof api.shifts>[0]) {
  const rows: Shift[] = [];
  for (const id of branchIds) {
    const r = await inBranch(id, () => api.shifts(f));
    rows.push(...r.rows.map((x) => ({ ...x, branchId: id })));
  }
  rows.sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
  return rows;
}
