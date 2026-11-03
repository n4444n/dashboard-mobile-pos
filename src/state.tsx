// สถานะกลางของแอป: พนักงานที่เข้าระบบ สาขา ช่วงเวลา การนำทาง แผ่นรายละเอียด (sheet) และข้อความแจ้ง (toast)
import { createContext, useCallback, useContext, useEffect, useRef, useState, type DependencyList } from 'react';
import type { Period } from './period';
import type { Branch, Expense, HistoryRow, Me, Shipment } from './types';

export type Tab = 'home' | 'reports' | 'stock' | 'settings' | 'activity';
export type Sub = 'license' | 'api' | null;
export type BranchSel = 'all' | number;

/** แผ่นที่เลื่อนขึ้นจากด้านล่าง */
export type SheetState =
  | { kind: 'bill'; row: Pick<HistoryRow, 'id' | 'orderNo' | 'total' | 'status'> & { branchId?: number } }
  | { kind: 'expense'; row: Expense }
  | { kind: 'shipment'; row: Shipment }
  | { kind: 'lang' }
  | { kind: 'logout' }
  | { kind: 'branch'; allowAll: boolean }
  | null;

export interface AppState {
  me: Me;
  shopName: string;
  branches: Branch[];
  branchName: (id: BranchSel | undefined | null) => string;
  /** สาขาที่ดูอยู่ (การ์ดหน้าหลัก + ตัวเลือกในรายงาน) */
  branch: BranchSel;
  setBranch: (b: BranchSel) => void;
  period: Period;
  setPeriod: (p: Period) => void;
  /** ซ่อนยอดเงิน (ปุ่มตา) */
  hide: boolean;
  setHide: (v: boolean) => void;
  /** เปลี่ยนค่านี้ = ทุกหน้าโหลดข้อมูลใหม่ */
  refreshKey: number;
  sync: () => Promise<void>;
  syncing: boolean;
  lastSync: Date;
  // การนำทาง
  tab: Tab;
  go: (t: Tab) => void;
  report: string | null;
  openReport: (id: string, branch?: BranchSel) => void;
  sub: Sub;
  setSub: (s: Sub) => void;
  back: () => boolean;
  // แผ่นรายละเอียด / แจ้งเตือน
  sheet: SheetState;
  openSheet: (s: SheetState) => void;
  toast: (msg: string) => void;
  /** การแจ้งเตือน: เวลาที่เปิดดูล่าสุด + จำนวนใหม่ */
  seen: string;
  markSeen: () => void;
  unread: number;
  setUnread: (n: number) => void;
  logout: () => void;
}

export const AppCtx = createContext<AppState | null>(null);
export function useApp() {
  const s = useContext(AppCtx);
  if (!s) throw new Error('useApp must be used inside AppCtx');
  return s;
}

/** โหลดข้อมูลแบบ async (โหลดใหม่เมื่อ deps เปลี่ยน หรือกดซิงค์) */
export function useLoad<T>(fn: () => Promise<T>, deps: DependencyList) {
  const { refreshKey } = useApp();
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [n, setN] = useState(0);
  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => my === seq.current && setState({ data, error: null, loading: false }),
      (e: Error) => my === seq.current && setState((s) => ({ data: s.data, error: e.message || String(e), loading: false })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...state, reload };
}
