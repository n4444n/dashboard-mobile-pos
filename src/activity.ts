// กิจกรรมล่าสุดของร้าน (2 วัน) — รวมจากบิล กะ ค่าใช้จ่าย การส่งของ และสต็อก
import { api, historyMerged, shiftsMerged } from './api';
import type { IconName } from './components/Icon';
import { isoDate, m0, nf, stamp } from './format';
import type { TFn } from './i18n';
import { payMeta, sourceLabel } from './meta';
import type { Palette } from './theme';
import type { Branch, Expense, HistoryRow, Me, Shipment } from './types';

export type EvGroup = 'sales' | 'returns' | 'expense' | 'shifts' | 'stock';
export interface Ev {
  key: string;
  type: 'sale' | 'refund' | 'void' | 'shiftopen' | 'shift' | 'shiftbad' | 'expense' | 'ship' | 'out' | 'low';
  at: string;
  branchId?: number;
  title: string;
  desc: string;
  bill?: HistoryRow;
  expense?: Expense;
  shipment?: Shipment;
  report?: string;
  tab?: 'stock';
}
export const EVT: Record<Ev['type'], { icon: IconName; color: (c: Palette) => string; g: EvGroup; name: string }> = {
  sale: { icon: 'trend', color: (c) => c.c1, g: 'sales', name: 'order.created' },
  refund: { icon: 'undo', color: (c) => c.warn, g: 'returns', name: 'order.edited' },
  void: { icon: 'ban', color: (c) => c.bad, g: 'returns', name: 'order.voided' },
  shiftopen: { icon: 'clock', color: (c) => c.c6, g: 'shifts', name: 'shift.opened' },
  shift: { icon: 'lock', color: (c) => c.c6, g: 'shifts', name: 'shift.closed' },
  shiftbad: { icon: 'cash', color: (c) => c.bad, g: 'shifts', name: 'shift.closed' },
  expense: { icon: 'wallet', color: (c) => c.c3, g: 'expense', name: 'expense.created' },
  ship: { icon: 'truck', color: (c) => c.c5, g: 'stock', name: 'shipment.shipped' },
  out: { icon: 'box', color: (c) => c.bad, g: 'stock', name: 'stock.out' },
  low: { icon: 'alert', color: (c) => c.warn, g: 'stock', name: 'stock.low' },
};

const can = (me: Me, f: string) => (me.perms as Record<string, string>)[f] !== 'none';

export async function loadActivity(me: Me, branches: Branch[], t: TFn, c: Palette): Promise<Ev[]> {
  const now = new Date();
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const from = isoDate(y), to = isoDate(now);
  const ids = branches.map((b) => b.id);
  const ev: Ev[] = [];

  // บิล: ยกเลิก / แก้ไข-คืน / บิลยอดสูง
  if (can(me, 'history')) {
    const h = await historyMerged(ids, { from, to, limit: 150 });
    const paid = h.rows.filter((b) => b.status !== 'void');
    const avg = paid.length ? paid.reduce((a, b) => a + b.total, 0) / paid.length : 0;
    const high = Math.max(2000, avg * 2.5);
    for (const b of h.rows) {
      const k = `b${b.branchId}-${b.id}`;
      if (b.status === 'void') ev.push({ key: k, type: 'void', at: b.createdAt, branchId: b.branchId, bill: b, title: t(`ยกเลิกบิล ${m0(b.total)}`, `Bill voided ${m0(b.total)}`), desc: [b.orderNo, b.salesperson].filter(Boolean).join(' · ') });
      else if (b.status === 'edited') ev.push({ key: k, type: 'refund', at: b.createdAt, branchId: b.branchId, bill: b, title: t(`แก้ไข/คืนสินค้า ${m0(b.total)}`, `Bill edited / refund ${m0(b.total)}`), desc: [b.orderNo, b.salesperson].filter(Boolean).join(' · ') });
      else if (b.total >= high) ev.push({ key: k, type: 'sale', at: b.createdAt, branchId: b.branchId, bill: b, title: t(`บิลยอดสูง ${m0(b.total)}`, `High-value sale ${m0(b.total)}`), desc: `${b.orderNo} · ${t(`${nf(b.itemCount)} ชิ้น`, `${nf(b.itemCount)} pcs`)} · ${payMeta(b.paymentMethod, t, c).name}` });
    }
  }
  // กะ: เปิด / ปิด (เงินตรง/ขาด/เกิน)
  if (can(me, 'shifts')) {
    for (const s of await shiftsMerged(ids, { from, to, limit: 50 })) {
      ev.push({ key: `so${s.branchId}-${s.id}`, type: 'shiftopen', at: s.openedAt, branchId: s.branchId, report: 'shifts', title: t(`เปิดกะ #${s.shiftNo}`, `Shift #${s.shiftNo} opened`), desc: `${s.openedBy} · ${t('เงินทอนตั้งต้น', 'float')} ${m0(s.openingCash)}` });
      if (s.status === 'closed' && s.closedAt) {
        const d = s.diff ?? 0;
        ev.push({
          key: `sc${s.branchId}-${s.id}`, type: d ? 'shiftbad' : 'shift', at: s.closedAt, branchId: s.branchId, report: 'shifts',
          title: d ? t(`ปิดกะ #${s.shiftNo} เงิน${d < 0 ? 'ขาด' : 'เกิน'} ${m0(Math.abs(d))}`, `Shift #${s.shiftNo} closed, cash ${d < 0 ? 'short' : 'over'} by ${m0(Math.abs(d))}`) : t(`ปิดกะ #${s.shiftNo} เงินตรงยอด`, `Shift #${s.shiftNo} closed, cash balanced`),
          desc: `${s.closedBy ?? s.openedBy} · ${t('ยอดขาย', 'Sales')} ${m0(s.totalSales)} · ${t(`${nf(s.billCount)} บิล`, `${nf(s.billCount)} bills`)}`,
        });
      }
    }
  }
  // ค่าใช้จ่าย
  if (can(me, 'expenses')) {
    const ex = await api.expenses({ from, to, branch: 'all' }).catch(() => null);
    for (const e of ex?.rows ?? []) {
      ev.push({ key: `e${e.id}`, type: 'expense', at: e.createdAt, branchId: e.branchId, expense: e, title: t(`ลงค่าใช้จ่าย ${m0(e.amount)} · ${e.category}`, `Expense ${m0(e.amount)} · ${e.category}`) + (e.voidedAt ? t(' (ยกเลิก)', ' (cancelled)') : ''), desc: [e.description, e.staff, sourceLabel(e.source, t)].filter(Boolean).join(' · ') });
    }
  }
  // ส่งของจากโรงงาน
  if (can(me, 'shipments')) {
    const sh = await api.shipments().catch(() => null);
    for (const s of sh?.list ?? []) {
      if (s.status === 'shipped' && s.shippedAt && s.shippedAt.slice(0, 10) >= from) {
        ev.push({ key: `s${s.id}`, type: 'ship', at: s.shippedAt, branchId: s.destBranchId, shipment: s, title: t(`ส่งของจากโรงงาน ${nf(s.units)} ชิ้น`, `Factory shipment, ${nf(s.units)} pcs`), desc: `${s.docNo} · → ${s.destBranchName ?? ''}` });
      }
    }
  }
  // สต็อกหมด / ใกล้หมด (ภาพรวม ณ ตอนนี้)
  const d = await api.dashboard({ from: to, to, branch: ids.length > 1 ? 'all' : ids[0] ?? 'all' }).catch(() => null);
  if (d) {
    d.lowStock.filter((x) => x.stock <= 0).slice(0, 6).forEach((x, i) => ev.push({ key: `o${x.variantId}`, type: 'out', at: `${to} 09:0${i + 1}:00`, tab: 'stock', title: t('สินค้าหมดสต็อก', 'Out of stock'), desc: `${x.name} · ${[x.color, x.size].filter((v) => v && v !== '-').join(' ')} · ${t(`ขาย ${x.sold30} ชิ้น/30 วัน`, `${x.sold30} sold in 30 days`)}` }));
    if (d.stock.low) ev.push({ key: 'low', type: 'low', at: `${to} 09:00:00`, tab: 'stock', title: t(`${nf(d.stock.low)} รายการต่ำกว่าจุดแจ้งเตือน`, `${nf(d.stock.low)} variants below alert level`), desc: t('ตรวจสต็อกตามไซซ์และสีก่อนสั่งผลิตรอบถัดไป', 'Check stock by size and colour before the next production order') });
  }
  return ev.filter((e) => e.at).sort((a, b) => (stamp(a.at) < stamp(b.at) ? 1 : -1));
}
