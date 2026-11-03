// ป้ายชื่อ/ไอคอน/สี ของช่องทางชำระ สถานะบิล ที่มาของค่าใช้จ่าย
import type { IconName } from './components/Icon';
import type { TFn } from './i18n';
import type { Palette } from './theme';
import type { ExpenseSource, OrderStatus, PaymentMethod } from './types';

export function payMeta(m: PaymentMethod | string, t: TFn, c: Palette): { name: string; icon: IconName; color: string } {
  switch (m) {
    case 'cash': return { name: t('เงินสด', 'Cash'), icon: 'cash', color: c.c2 };
    case 'promptpay': return { name: t('QR พร้อมเพย์', 'PromptPay QR'), icon: 'qr', color: c.c5 };
    case 'card': return { name: t('บัตรเครดิต/เดบิต', 'Credit/debit card'), icon: 'card', color: c.c1 };
    case 'transfer': return { name: t('โอนเงิน', 'Bank transfer'), icon: 'bank', color: c.c6 };
    default: return { name: String(m), icon: 'coin', color: c.muted };
  }
}

export function statusMeta(s: OrderStatus, t: TFn): { label: string; kind: 'good' | 'warn' | 'bad' } {
  if (s === 'void') return { label: t('ยกเลิก', 'Void'), kind: 'bad' };
  if (s === 'edited') return { label: t('แก้ไข/คืน', 'Edited'), kind: 'warn' };
  return { label: t('ชำระแล้ว', 'Paid'), kind: 'good' };
}

export function sourceLabel(s: ExpenseSource | string, t: TFn) {
  return ({ drawer: t('เงินสดในลิ้นชัก', 'From cash drawer'), transfer: t('โอนเงิน', 'Bank transfer'), card: t('บัตร', 'Card'), owner: t('เจ้าของจ่าย', 'Paid by owner') } as Record<string, string>)[s] ?? s;
}
