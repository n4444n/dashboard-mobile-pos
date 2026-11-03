// รายการรายงาน + ตัวช่วยแปลงข้อมูลเป็นกราฟ
import type { IconName } from '../../components/Icon';
import { dAxis, isoDate } from '../../format';
import type { Lang } from '../../i18n';
import type { Palette } from '../../theme';
import type { Dashboard } from '../../types';

export type ReportId =
  | 'summary' | 'hourly' | 'payment' | 'bills'
  | 'products' | 'category' | 'sizecolor' | 'stock' | 'shipments'
  | 'expenses' | 'shifts' | 'branches' | 'staff'
  | 'profit' | 'returns';

export type Group = 'sales' | 'products' | 'people' | 'finance';
export interface ReportDef {
  id: ReportId;
  g: Group;
  icon: IconName;
  color: (c: Palette) => string;
  t: [string, string];
  d: [string, string];
  /** endpoint ที่หน้านี้เรียก */
  ep: string;
  /** ไม่มีตัวเลือกช่วงเวลา/สาขา */
  noFilter?: boolean;
  /** เลือก "ทุกสาขา" ไม่ได้ (ข้อมูลเป็นของสาขาเดียว) */
  single?: boolean;
  /** ต้องมีสิทธิ์เมนูนี้ใน POS */
  perm?: 'shifts' | 'expenses' | 'shipments' | 'stock' | 'history';
}

export const REPORTS: ReportDef[] = [
  { id: 'summary', g: 'sales', icon: 'trend', color: (c) => c.c1, t: ['สรุปยอดขาย', 'Sales summary'], d: ['ยอดสุทธิ บิล ค่าเฉลี่ย เทียบช่วงก่อน', 'Net sales, bills, averages vs. prior period'], ep: '/api/dashboard' },
  { id: 'hourly', g: 'sales', icon: 'clock', color: (c) => c.c6, t: ['ยอดขายรายชั่วโมง', 'Sales by hour'], d: ['ช่วงเวลาขายดี ใช้จัดคนเข้ากะ', 'Peak hours for staff scheduling'], ep: '/api/dashboard' },
  { id: 'payment', g: 'sales', icon: 'card', color: (c) => c.c5, t: ['ช่องทางชำระเงิน', 'Payment methods'], d: ['เงินสด QR บัตร โอน', 'Cash, QR, card, transfer'], ep: '/api/dashboard' },
  { id: 'bills', g: 'sales', icon: 'receipt', color: (c) => c.c2, t: ['รายการบิลขาย', 'Sales bills'], d: ['ค้นหาและดูใบเสร็จทุกบิล', 'Search and view every receipt'], ep: '/api/history', perm: 'history' },
  { id: 'products', g: 'products', icon: 'hanger', color: (c) => c.c1, t: ['สินค้าขายดี', 'Best sellers'], d: ['อันดับตามยอดเงินและจำนวนชิ้น', 'Ranked by revenue and units'], ep: '/api/dashboard' },
  { id: 'category', g: 'products', icon: 'pie', color: (c) => c.c3, t: ['ยอดขายตามหมวดหมู่', 'Sales by category'], d: ['สัดส่วนยอดขายแต่ละหมวด', 'Share of sales per category'], ep: '/api/dashboard' },
  { id: 'sizecolor', g: 'products', icon: 'ruler', color: (c) => c.c4, t: ['ไซซ์และสีขายดี', 'Sizes & colours'], d: ['วางแผนสั่งผลิตให้ตรงไซซ์', 'Plan production by size mix'], ep: '/api/dashboard' },
  { id: 'stock', g: 'products', icon: 'box', color: (c) => c.c5, t: ['สินค้าคงคลัง', 'Inventory'], d: ['สต็อกตามไซซ์/สี ใกล้หมด มูลค่าสต็อก', 'Stock by size/colour, low stock, value'], ep: '/api/stock/skus', noFilter: true, perm: 'stock' },
  { id: 'shipments', g: 'products', icon: 'truck', color: (c) => c.c3, t: ['ส่งของจากโรงงาน', 'Factory shipments'], d: ['ใบส่งของ จำนวนชิ้นที่เข้าแต่ละสาขา', 'Delivery notes and units per branch'], ep: '/api/shipments', perm: 'shipments' },
  { id: 'expenses', g: 'people', icon: 'wallet', color: (c) => c.c3, t: ['ค่าใช้จ่ายในร้าน', 'Store expenses'], d: ['รายการที่พนักงานลงจากเครื่อง POS', 'Expenses staff log on the POS'], ep: '/api/expenses', perm: 'expenses' },
  { id: 'shifts', g: 'people', icon: 'calendar', color: (c) => c.c6, t: ['ปิดกะ / เงินในลิ้นชัก', 'Shift close & cash drawer'], d: ['เงินสดที่ควรมี เทียบที่นับได้', 'Expected vs. counted cash'], ep: '/api/shifts', perm: 'shifts' },
  { id: 'branches', g: 'people', icon: 'store', color: (c) => c.c1, t: ['เปรียบเทียบสาขา', 'Branch comparison'], d: ['ยอดขาย บิล กำไร แต่ละสาขา', 'Sales, bills and profit per branch'], ep: '/api/dashboard?branch=<id>' },
  { id: 'staff', g: 'people', icon: 'users', color: (c) => c.c2, t: ['ยอดขายตามพนักงาน', 'Sales by staff'], d: ['พนักงานขายคนไหนทำยอดได้เท่าไร', 'Sales per salesperson'], ep: '/api/dashboard' },
  { id: 'profit', g: 'finance', icon: 'coin', color: (c) => c.c2, t: ['กำไร-ต้นทุน', 'Profit & cost'], d: ['กำไรขั้นต้น ค่าใช้จ่าย กำไรสุทธิ', 'Gross profit, expenses, net profit'], ep: '/api/dashboard' },
  { id: 'returns', g: 'finance', icon: 'undo', color: (c) => c.c3, t: ['คืนสินค้า / ยกเลิกบิล', 'Refunds & voids'], d: ['จำนวน มูลค่า และรายการ', 'Count, value and bills'], ep: '/api/dashboard + /api/history', perm: 'history' },
];
export const RGROUP: Record<Group, [string, string]> = {
  sales: ['ยอดขาย', 'Sales'],
  products: ['สินค้า', 'Products'],
  people: ['พนักงานและสาขา', 'Staff & branches'],
  finance: ['การเงิน', 'Finance'],
};
export const reportDef = (id: string) => REPORTS.find((r) => r.id === id);

/** ชั่วโมงที่ร้านเปิดขาย (ตัดช่วงกลางคืนที่ไม่มีบิลออก) */
export function hourWindow<H extends { hour: number; sales: number; bills: number }>(hours: H[], day?: string): H[] {
  const active = hours.filter((h) => h.bills || h.sales);
  let a = active.length ? active[0].hour : 9;
  let b = active.length ? active[active.length - 1].hour : 21;
  a = Math.min(a, 10);
  b = Math.max(b, 20);
  // วันนี้: ยังไม่ถึงชั่วโมงไหนก็ยังไม่แสดง (ไม่ให้กราฟตกเป็น 0)
  if (day && day === isoDate(new Date())) b = Math.max(a, Math.min(b, new Date().getHours()));
  return hours.filter((h) => h.hour >= a && h.hour <= b);
}

/** ข้อมูลกราฟแนวโน้ม (รายชั่วโมงเมื่อดูวันเดียว · รายวันเมื่อหลายวัน) */
export function seriesChart(d: Dashboard, _lang: Lang, field: 'sales' | 'profit' = 'sales') {
  if (d.range.granularity === 'hour') {
    const pts = d.series.map((s) => ({ hour: +s.key, sales: s[field], bills: s.bills }));
    const w = hourWindow(pts, d.range.to);
    return { vals: w.map((x) => x.sales), labels: w.map((x) => `${x.hour}:00`), every: 2, keys: w.map((x) => x.hour) };
  }
  const n = d.series.length;
  return { vals: d.series.map((s) => s[field]), labels: d.series.map((s) => (d.range.granularity === 'day' ? dAxis(s.key) : s.key)), every: n > 10 ? 7 : 1, keys: d.series.map((s) => s.key) };
}
