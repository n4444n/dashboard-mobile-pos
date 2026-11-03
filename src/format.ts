// รูปแบบตัวเลข เงิน วันที่ (เวลาไทย) — ใช้ร่วมทุกหน้า
import type { Lang } from './i18n';

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ฿1,234.00 */
export const money = (n: number) => (n < 0 ? '−฿' : '฿') + nf2.format(Math.abs(n || 0));
/** ฿1,234 */
export const m0 = (n: number) => (n < 0 ? '−฿' : '฿') + nf0.format(Math.abs(Math.round(n || 0)));
/** 1,234 */
export const nf = (n: number) => nf0.format(Math.round(n || 0));
/** 12K · 1.2M (แกนกราฟ / ยอดในวงกลม) */
export function shortN(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return nf0.format(n);
}
/** เปอร์เซ็นต์เปลี่ยนแปลง (null = ไม่มีค่าเดิมให้เทียบ) */
export const pctChange = (cur: number, prev: number) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : null);

const MTH = {
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const MTH_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = {
  th: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const DOW_FULL = {
  th: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** แยกวันเวลาจากเซิร์ฟเวอร์ POS ('2026-11-02 21:31:05' เป็นเวลาไทยอยู่แล้ว) */
export function parts(s: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s ?? '');
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  return { y, mo, d, h: +(m[4] ?? 0), mi: +(m[5] ?? 0), s: +(m[6] ?? 0), dow: new Date(Date.UTC(y, mo, d)).getUTCDay() };
}
/** ค่าเรียงลำดับเวลา (ใช้รวมบิลหลายสาขา) */
export const stamp = (s: string) => (s ?? '').replace('T', ' ').slice(0, 19);

const pad = (n: number) => String(n).padStart(2, '0');
/** 21:31 */
export const hhmm = (s: string | null | undefined) => {
  const p = parts(s);
  return p ? `${pad(p.h)}:${pad(p.mi)}` : '';
};
/** จ. 2 พ.ย. · Mon 2 Nov */
export const dWeek = (s: string | null | undefined, lang: Lang) => {
  const p = parts(s);
  return p ? `${DOW[lang][p.dow]} ${p.d} ${MTH[lang][p.mo]}` : '';
};
/** 2 พ.ย. 2569 · 2 Nov 2026 */
export const dShort = (s: string | null | undefined, lang: Lang) => {
  const p = parts(s);
  return p ? `${p.d} ${MTH[lang][p.mo]} ${lang === 'th' ? p.y + 543 : p.y}` : '';
};
/** วันจันทร์ที่ 2 พฤศจิกายน 2569 · Monday, 2 Nov 2026 */
export const dFull = (s: string | null | undefined, lang: Lang) => {
  const p = parts(s);
  if (!p) return '';
  return lang === 'th' ? `วัน${DOW_FULL.th[p.dow]}ที่ ${p.d} ${MTH_FULL[p.mo]} ${p.y + 543}` : `${DOW_FULL.en[p.dow]}, ${p.d} ${MTH.en[p.mo]} ${p.y}`;
};
/** ป้ายแกนกราฟรายวัน: 2/11 */
export const dAxis = (s: string) => {
  const p = parts(s);
  return p ? `${p.d}/${p.mo + 1}` : s;
};

/** วันที่ในเครื่อง → 'YYYY-MM-DD' */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** เวลาในเครื่อง → 'YYYY-MM-DD HH:MM:SS' (เทียบกับเวลาจาก POS) */
export const isoLocal = (d: Date) => `${isoDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export const pcs = (n: number, lang: Lang) => (lang === 'th' ? `${nf(n)} ชิ้น` : `${nf(n)} ${n === 1 ? 'pc' : 'pcs'}`);
export const billsN = (n: number, lang: Lang) => (lang === 'th' ? `${nf(n)} บิล` : `${nf(n)} ${n === 1 ? 'bill' : 'bills'}`);
