// แผ่นรายละเอียดที่เลื่อนขึ้นจากด้านล่าง: ใบเสร็จ · ค่าใช้จ่าย · ใบส่งของ · ภาษา · สาขา · ออกจากระบบ
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api, inBranch } from '../api';
import { dFull, dWeek, hhmm, money, nf, pcs } from '../format';
import { useLang } from '../i18n';
import { payMeta, sourceLabel, statusMeta } from '../meta';
import { useApp, type SheetState } from '../state';
import { useC } from '../theme';
import type { OrderDetail, ShipmentDetail } from '../types';
import { Icon } from './Icon';
import { ErrorBox, KV, Loading, MoreBtn, Muted, PrimaryBtn, Sheet, SheetTitle, T, Table, Tag } from './ui';

export function Sheets() {
  const { sheet, openSheet } = useApp();
  const close = () => openSheet(null);
  return (
    <Sheet visible={!!sheet} onClose={close}>
      {sheet ? <SheetBody s={sheet} close={close} /> : null}
    </Sheet>
  );
}

function SheetBody({ s, close }: { s: NonNullable<SheetState>; close: () => void }) {
  switch (s.kind) {
    case 'bill': return <BillSheet id={s.row.id} branchId={s.row.branchId} close={close} />;
    case 'expense': return <ExpenseSheet s={s} close={close} />;
    case 'shipment': return <ShipmentSheet id={s.row.id} close={close} />;
    case 'lang': return <LangSheet close={close} />;
    case 'logout': return <LogoutSheet close={close} />;
    case 'branch': return <BranchSheet allowAll={s.allowAll} close={close} />;
  }
}

function useDetail<T>(fn: () => Promise<T>) {
  const [st, setSt] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    let live = true;
    fn().then((data) => live && setSt({ data, error: null }), (e: Error) => live && setSt({ data: null, error: e.message }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return st;
}

// ---------------------------------------------------------------- ใบเสร็จ
function BillSheet({ id, branchId, close }: { id: number; branchId?: number; close: () => void }) {
  const c = useC();
  const { t, lang } = useLang();
  const { branchName, me } = useApp();
  const { data: b, error } = useDetail<OrderDetail>(() => inBranch(branchId ?? me.branchId, () => api.orderDetail(id)));
  if (error) return <><ErrorBox error={error} /><MoreBtn label={t('ปิด', 'Close')} onPress={close} /></>;
  if (!b) return <Loading />;
  const st = statusMeta(b.status, t);
  const pay = payMeta(b.paymentMethod, t, c);
  const qty = b.items.reduce((a, i) => a + i.qty, 0);
  const vat = b.vat ?? 0;
  const base = b.vatBase ?? b.total - vat;
  return (
    <View>
      <View style={[st0.head, { borderBottomColor: c.line }]}>
        <Tag kind={st.kind}>{st.label}</Tag>
        <T display w={600} size={28} style={b.status === 'void' ? { textDecorationLine: 'line-through', opacity: 0.55 } : undefined}>{money(b.total)}</T>
        <Muted>{b.orderNo}</Muted>
        <Muted>{dFull(b.createdAt, lang)}</Muted>
        <Muted>{hhmm(b.createdAt)} {t('น. (เวลาประเทศไทย)', '(Thailand time, GMT+7)')} · {branchName(branchId ?? me.branchId)}</Muted>
      </View>
      <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: c.line }}>
        {b.items.map((i, k) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <T size={13.5}>{i.name}</T>
              <Muted size={12}>{[i.color !== '-' ? i.color : '', i.size !== '-' ? i.size : '', i.extra].filter(Boolean).join(' / ')}{' · '}{i.qty} × {money(i.unitPrice)}</Muted>
            </View>
            <T size={13.5} w={600}>{money(i.lineTotal)}</T>
          </View>
        ))}
      </View>
      <KV label={t(`รวม (${pcs(qty, lang)})`, `Subtotal (${pcs(qty, lang)})`)} value={money(b.subtotal)} />
      {b.discount ? <KV label={`${t('ส่วนลด', 'Discount')}${b.promoCode ? ` ${b.promoCode}` : ''}`} value={'−' + money(b.discount)} /> : null}
      {b.fee ? <KV label={t(`ค่าธรรมเนียม${pay.name}`, `${pay.name} fee`)} value={(b.feePayer === 'shop' ? '' : '+') + money(b.fee)} /> : null}
      <KV label={t('ฐานภาษี (มูลค่าก่อน VAT)', 'Tax base (before VAT)')} value={money(base)} />
      <KV label={t(`VAT ${b.vatRate ?? 7}% (รวมในราคาแล้ว)`, `VAT ${b.vatRate ?? 7}% (included)`)} value={money(vat)} />
      <KV strong label={t('ยอดสุทธิ', 'Total')} value={money(b.total)} />
      <KV label={t('ชำระโดย', 'Paid by')} value={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={pay.icon} size={18} color={pay.color} />
          <T size={13.5} w={600}>{pay.name}</T>
        </View>
      } />
      <KV label={t('พนักงาน', 'Staff')} value={b.salesperson || '—'} />
      <KV label={t('ลูกค้า', 'Customer')} value={b.customerName || '—'} />
      {b.voidReason ? <KV label={t('เหตุผลยกเลิก', 'Void reason')} value={b.voidReason} /> : null}
      {b.edits?.length ? b.edits.map((e) => (
        <KV key={e.id} label={`${e.kind === 'credit' ? t('คืนสินค้า', 'Refund') : e.kind === 'void' ? t('ยกเลิก', 'Void') : t('แก้ไข', 'Edit')} · ${hhmm(e.editedAt)}`}
          value={<View style={{ alignItems: 'flex-end' }}><T size={13.5} w={600}>{e.diff ? money(e.diff) : e.summary}</T><Muted size={12}>{[e.staff, e.reason].filter(Boolean).join(' · ')}</Muted></View>} />
      )) : null}
      <MoreBtn label={t('ปิด', 'Close')} onPress={close} />
    </View>
  );
}

// ---------------------------------------------------------------- ค่าใช้จ่าย
function ExpenseSheet({ s, close }: { s: Extract<NonNullable<SheetState>, { kind: 'expense' }>; close: () => void }) {
  const c = useC();
  const { t, lang } = useLang();
  const e = s.row;
  const voided = !!e.voidedAt;
  return (
    <View>
      <View style={[st0.head, { borderBottomColor: c.line }]}>
        {voided ? <Tag kind="bad">{t('ยกเลิก', 'Cancelled')}</Tag> : <Tag kind="good">{t('สำเร็จ', 'Completed')}</Tag>}
        <T display w={600} size={28} style={voided ? { textDecorationLine: 'line-through', opacity: 0.55 } : undefined}>{money(e.amount)}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="wallet" size={18} color={c.c3} />
          <T size={13.5} w={600}>{e.category}</T>
        </View>
        {e.refNo ? <Muted>{e.refNo}</Muted> : null}
      </View>
      {e.items?.length > 1
        ? <View style={{ paddingTop: 8 }}><Table head={[{ t: t('รายการ', 'Item') }, { t: t('จำนวน', 'Qty'), r: true }, { t: t('บาท', 'THB'), r: true }]}
            rows={e.items.map((i) => [i.description, `${nf(i.qty)} ${i.unit}`, money(i.amount)])} /></View>
        : <KV label={t('รายละเอียด', 'Description')} value={e.description || '—'} />}
      <KV label={t('วันที่', 'Date')} value={dFull(e.date || e.createdAt, lang)} />
      <KV label={t('เวลา', 'Time')} value={`${hhmm(e.createdAt)} ${t('น.', '')}`.trim()} />
      <KV label={t('สาขา', 'Branch')} value={e.branchName} />
      <KV label={t('ลงโดย', 'Recorded by')} value={`${e.staff}${e.shiftNo ? ` · ${t('กะ', 'shift')} #${e.shiftNo}` : ''}`} />
      <KV label={t('จ่ายจาก', 'Paid from')} value={sourceLabel(e.source, t)} />
      {e.vendor ? <KV label={t('ร้านค้า/ผู้รับเงิน', 'Vendor')} value={e.vendor} /> : null}
      {voided ? <KV label={t('ยกเลิกโดย', 'Cancelled by')} value={`${e.voidedBy ?? ''}${e.voidReason ? ` · ${e.voidReason}` : ''}`} /> : null}
      <Muted style={{ marginTop: 10, lineHeight: 20 }}>
        {e.source === 'drawer' ? t('รายการนี้หักออกจากเงินที่ควรมีในลิ้นชักของกะนั้นแล้ว · ', 'Already deducted from that shift\'s expected drawer cash. · ') : ''}
        {t('แก้ไขหรือยกเลิกทำที่ POS แอพนี้แสดงผลอย่างเดียว', 'Edit or cancel on the POS. This app is read-only.')}
      </Muted>
      <MoreBtn label={t('ปิด', 'Close')} onPress={close} />
    </View>
  );
}

// ---------------------------------------------------------------- ใบส่งของ
function ShipmentSheet({ id, close }: { id: number; close: () => void }) {
  const c = useC();
  const { t, lang } = useLang();
  const { data, error } = useDetail<ShipmentDetail>(() => api.shipment(id));
  if (error) return <><ErrorBox error={error} /><MoreBtn label={t('ปิด', 'Close')} onPress={close} /></>;
  if (!data) return <Loading />;
  const x = data.shipment;
  const total = data.items.reduce((a, i) => a + i.qty, 0);
  return (
    <View>
      <View style={[st0.head, { borderBottomColor: c.line }]}>
        {x.status === 'shipped' ? <Tag kind="good">{t('ส่งแล้ว', 'Shipped')}</Tag> : x.status === 'cancelled' ? <Tag kind="bad">{t('ยกเลิก', 'Cancelled')}</Tag> : <Tag kind="warn">{t('กำลังจัดของ', 'Packing')}</Tag>}
        <T display w={600} size={28}>{pcs(total, lang)}</T>
        <Muted>{x.docNo}</Muted>
        <Muted>{x.sourceBranchName || t('โรงงาน', 'Factory')} → {x.destBranchName ?? '—'}</Muted>
      </View>
      <KV label={t('สร้างเมื่อ', 'Created')} value={`${dWeek(x.createdAt, lang)} · ${hhmm(x.createdAt)}${x.createdBy ? ` · ${x.createdBy}` : ''}`} />
      <KV label={t('ส่งออก', 'Shipped')} value={x.shippedAt ? `${dWeek(x.shippedAt, lang)} · ${hhmm(x.shippedAt)}${x.shippedBy ? ` · ${x.shippedBy}` : ''}` : t('ยังไม่ส่ง', 'Not yet')} />
      <KV label={t('ถุง/กล่อง', 'Bags/boxes')} value={nf(x.bags)} />
      {x.note ? <KV label={t('หมายเหตุ', 'Note')} value={x.note} /> : null}
      <View style={{ paddingTop: 8 }}>
        <Table
          head={[{ t: t('สินค้า', 'Product'), flex: 2 }, { t: t('สี / ไซซ์', 'Colour / size'), flex: 1.3 }, { t: t('จำนวน', 'Qty'), r: true, flex: 0.7 }]}
          rows={data.items.map((i) => [`${i.productSku ?? i.sku} ${i.name}`, [i.color, i.size, i.extra].filter((v) => v && v !== '-').join(' ') || '—', nf(i.qty)])}
          foot={[t('รวม', 'Total'), '', nf(total)]}
        />
      </View>
      <MoreBtn label={t('ปิด', 'Close')} onPress={close} />
    </View>
  );
}

// ---------------------------------------------------------------- ภาษา
function LangSheet({ close }: { close: () => void }) {
  const c = useC();
  const { lang, setLang, t } = useLang();
  const { toast } = useApp();
  const opt = (k: 'en' | 'th', big: string, small: string) => {
    const on = lang === k;
    return (
      <Pressable key={k} onPress={() => { close(); if (!on) { setLang(k); toast(k === 'th' ? 'เปลี่ยนเป็นภาษาไทยแล้ว' : 'Switched to English'); } }}
        accessibilityRole="button" accessibilityState={{ selected: on }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: on ? c.accentSoft : c.surface2, borderWidth: 2, borderColor: on ? c.accent : 'transparent' }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accent : c.surface }}>
          <T size={15} w={700} color={on ? c.accentInk : c.fg}>{k.toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T size={18} w={600}>{big}</T>
          <Muted size={13}>{small}</Muted>
        </View>
        {on ? <Icon name="check" size={26} color={c.accent} width={2.6} /> : null}
      </Pressable>
    );
  };
  return (
    <View>
      <SheetTitle>Language · ภาษา</SheetTitle>
      <View style={{ gap: 10 }}>
        {opt('en', 'English', 'อังกฤษ')}
        {opt('th', 'ไทย', 'Thai')}
      </View>
      <Muted style={{ marginTop: 12, marginHorizontal: 2 }}>{t('ตัวเลขและสกุลเงินแสดงเหมือนกันทั้งสองภาษา แอพจะจำภาษาที่เลือกไว้', 'Numbers and currency look the same in both languages. Your choice is remembered.')}</Muted>
    </View>
  );
}

// ---------------------------------------------------------------- สาขา
function BranchSheet({ allowAll, close }: { allowAll: boolean; close: () => void }) {
  const c = useC();
  const { t } = useLang();
  const { branches, branch, setBranch } = useApp();
  const items: { id: 'all' | number; name: string; sub: string }[] = [
    ...(allowAll ? [{ id: 'all' as const, name: t('ทุกสาขา', 'All branches'), sub: t(`${branches.length} สาขา`, `${branches.length} branches`) }] : []),
    ...branches.map((b) => ({ id: b.id, name: b.name, sub: `${b.code}${b.isMain ? ` · ${t('สาขาหลัก', 'Main')}` : ''}` })),
  ];
  return (
    <View>
      <SheetTitle>{t('เลือกสาขา', 'Choose branch')}</SheetTitle>
      {items.map((it, i) => {
        const on = branch === it.id;
        return (
          <Pressable key={String(it.id)} onPress={() => { setBranch(it.id); close(); }} accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === items.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
            <Icon name="store" size={20} color={on ? c.accent : c.muted} />
            <View style={{ flex: 1 }}>
              <T size={14.5} w={on ? 600 : 400}>{it.name}</T>
              <Muted size={12}>{it.sub}</Muted>
            </View>
            {on ? <Icon name="check" size={22} color={c.accent} width={2.4} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- ออกจากระบบ
function LogoutSheet({ close }: { close: () => void }) {
  const { t } = useLang();
  const { logout } = useApp();
  return (
    <View>
      <SheetTitle>{t('ออกจากระบบ?', 'Sign out?')}</SheetTitle>
      <Muted style={{ marginHorizontal: 2, lineHeight: 20 }}>
        {t('ต้องกรอก License และ PIN อีกครั้งเพื่อเข้าใช้ · เครื่องนี้ยังนับใน License จนกว่าผู้ดูแลจะลบออกที่แผงควบคุม License',
          'You\'ll need the license and PIN to sign in again. This device stays on the license until an admin removes it in the License control panel.')}
      </Muted>
      <PrimaryBtn danger label={t('ออกจากระบบ', 'Sign out')} onPress={() => { close(); logout(); }} />
      <MoreBtn label={t('ยกเลิก', 'Cancel')} onPress={close} />
    </View>
  );
}

const st0 = StyleSheet.create({
  head: { alignItems: 'center', gap: 2, paddingBottom: 14, borderBottomWidth: 1, borderStyle: 'dashed' },
});
