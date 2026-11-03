// ช่วงเวลาของรายงาน: วันนี้ · เมื่อวาน · 7 วัน · 30 วัน
import { isoDate } from './format';
import type { TFn } from './i18n';

export type Period = 'today' | 'yesterday' | '7d' | '30d';
export const PERIODS: Period[] = ['today', 'yesterday', '7d', '30d'];

export interface Range {
  from: string;
  to: string;
  days: number;
}

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** ช่วงวันที่ของ period (วันที่ตามเครื่อง = เวลาไทยเมื่อใช้ในไทย) */
export function rangeOf(p: Period, now = new Date()): Range {
  const today = isoDate(now);
  if (p === 'today') return { from: today, to: today, days: 1 };
  if (p === 'yesterday') {
    const y = isoDate(addDays(now, -1));
    return { from: y, to: y, days: 1 };
  }
  const n = p === '7d' ? 7 : 30;
  return { from: isoDate(addDays(now, -(n - 1))), to: today, days: n };
}

export const periodLabel = (p: Period, t: TFn) =>
  ({ today: t('วันนี้', 'Today'), yesterday: t('เมื่อวาน', 'Yesterday'), '7d': t('7 วัน', '7 days'), '30d': t('30 วัน', '30 days') })[p];

/** คำอธิบายช่วงที่เทียบ (เซิร์ฟเวอร์ POS เทียบกับช่วงยาวเท่ากันก่อนหน้า) */
export const periodCmp = (p: Period, t: TFn) =>
  ({
    today: t('เทียบเมื่อวานทั้งวัน', 'vs. all of yesterday'),
    yesterday: t('เทียบวันก่อนหน้า', 'vs. the day before'),
    '7d': t('เทียบ 7 วันก่อนหน้า', 'vs. previous 7 days'),
    '30d': t('เทียบ 30 วันก่อนหน้า', 'vs. previous 30 days'),
  })[p];
