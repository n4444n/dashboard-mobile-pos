// เนื้อหาของแต่ละรายงาน (คำนวณจากข้อมูลจริงของเซิร์ฟเวอร์ POS)
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api, historyMerged, inBranch, shiftsMerged } from '../../api';
import { BillRow, ExpenseRow } from '../../components/BillRow';
import { AreaChart, BarChart, DonutWrap, HBars } from '../../components/Charts';
import { Icon } from '../../components/Icon';
import {
  Callout, Chip, Chips, Delta, Empty, ErrorBox, Gap, Input, Kpi, KpiGrid, Loading, MoreBtn, Muted, Panel, PanelTitle, T, Table, Tag,
} from '../../components/ui';
import { billsN, dAxis, dShort, dWeek, hhmm, m0, money, nf, pcs, shortN, stamp } from '../../format';
import { useLang } from '../../i18n';
import { payMeta } from '../../meta';
import type { Range } from '../../period';
import { useApp, useLoad, type BranchSel } from '../../state';
import { alpha, series as palette, useC } from '../../theme';
import { StockBody } from '../StockScreen';
import { hourWindow, seriesChart, type ReportId } from './common';

export interface BodyProps { r: Range; branch: BranchSel }

/** รายงานรวมของสาขาที่เลือก */
function useDash(r: Range, branch: BranchSel) {
  return useLoad(() => api.dashboard({ from: r.from, to: r.to, branch }), [r.from, r.to, branch]);
}
function Wrap<D>({ s, children }: { s: { data: D | null; error: string | null; loading: boolean; reload: () => void }; children: (d: D) => ReactNode }) {
  if (s.data) return <>{children(s.data)}</>;
  if (s.error) return <ErrorBox error={s.error} onRetry={s.reload} />;
  return <Loading />;
}
const branchIds = (branch: BranchSel, all: { id: number }[]) => (branch === 'all' ? all.map((b) => b.id) : [branch]);

// ---------------------------------------------------------------- ยอดขาย
function Summary({ r, branch }: BodyProps) {
  const { t, lang } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const a = d.kpis, p = d.prev;
      const ch = seriesChart(d, lang);
      const hour = d.range.granularity === 'hour';
      const rows = hour
        ? hourWindow(d.series.map((x) => ({ hour: +x.key, sales: x.sales, bills: x.bills })), d.range.to).map((x) => [`${x.hour}:00–${x.hour}:59`, nf(x.bills), money(x.sales)])
        : d.series.slice().reverse().map((x) => [dWeek(x.key, lang) || x.key, nf(x.bills), money(x.sales)]);
      return (
        <>
          <KpiGrid>
            <Kpi wide icon="trend" label={t('ยอดขายสุทธิ', 'Net sales')} value={money(a.sales)} foot={<Delta cur={a.sales} prev={p.sales} />} />
            <Kpi icon="receipt" label={t('จำนวนบิล', 'Bills')} value={nf(a.bills)} foot={<Delta cur={a.bills} prev={p.bills} />} />
            <Kpi icon="tag" label={t('เฉลี่ยต่อบิล', 'Avg. ticket')} value={money(a.aov)} foot={<Delta cur={a.aov} prev={p.aov} />} />
            <Kpi icon="hanger" label={t('ชิ้นต่อบิล (UPT)', 'Units per bill (UPT)')} value={a.upt.toFixed(2)} foot={<Delta cur={a.upt} prev={p.upt} />} />
            <Kpi icon="box" label={t('จำนวนชิ้นที่ขาย', 'Units sold')} value={nf(a.units)} foot={<Delta cur={a.units} prev={p.units} />} />
            <Kpi icon="percent" label={t('ส่วนลดรวม', 'Discounts')} value={m0(a.discount)} foot={<Delta cur={a.discount} prev={p.discount} invert />} />
            <Kpi icon="undo" label={t('คืนเงิน (ใบลดหนี้)', 'Refunds (credit notes)')} value={m0(a.refund ?? 0)} foot={<Muted>{t(`${nf(a.creditNotes ?? 0)} ใบ`, `${nf(a.creditNotes ?? 0)} notes`)}</Muted>} />
          </KpiGrid>
          <Gap />
          <Panel><PanelTitle>{t('แนวโน้มยอดขาย', 'Sales trend')}</PanelTitle><AreaChart vals={ch.vals} labels={ch.labels} every={ch.every} /></Panel>
          <Gap />
          <Panel>
            <PanelTitle>{hour ? t('แยกรายชั่วโมง', 'By hour') : t('แยกรายวัน', 'By day')}</PanelTitle>
            <Table head={[{ t: hour ? t('ชั่วโมง', 'Hour') : t('วันที่', 'Date') }, { t: t('บิล', 'Bills'), r: true }, { t: t('ยอดสุทธิ', 'Net sales'), r: true }]}
              rows={rows} foot={[t('รวม', 'Total'), nf(a.bills), money(a.sales)]} />
          </Panel>
        </>
      );
    }}</Wrap>
  );
}

function Hourly({ r, branch }: BodyProps) {
  const { t } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const days = Math.max(1, d.range.days);
      const w = hourWindow(d.hours, d.range.days === 1 ? d.range.to : undefined).map((h) => ({ ...h, sales: h.sales / days, bills: h.bills / days }));
      const vals = w.map((h) => h.sales);
      const mi = vals.indexOf(Math.max(...vals));
      const open = w.filter((h) => h.bills > 0);
      const lo = open.length ? open.reduce((a, b) => (b.sales < a.sales ? b : a)) : w[0];
      const pd = days > 1 ? t('/วัน', '/day') : '';
      return (
        <>
          {w[mi] && w[mi].sales > 0 ? (
            <Callout icon="clock" title={t(`ขายดีสุด ${w[mi].hour}:00–${w[mi].hour}:59 น.`, `Busiest: ${w[mi].hour}:00–${w[mi].hour}:59`)}
              sub={t(`เฉลี่ย ${m0(w[mi].sales)} / ชม. · เงียบสุด ${lo.hour}:00 น.`, `Avg. ${m0(w[mi].sales)}/hr · quietest ${lo.hour}:00`)} />
          ) : null}
          <Panel>
            <PanelTitle>{days > 1 ? t('ยอดขายเฉลี่ยต่อวันตามชั่วโมง', 'Average daily sales by hour') : t('ยอดขายตามชั่วโมง', 'Sales by hour')}</PanelTitle>
            <BarChart vals={vals} labels={w.map((h) => String(h.hour))} fmtTop={m0} />
          </Panel>
          <Gap />
          <Panel>
            <PanelTitle>{t('รายละเอียด', 'Details')}</PanelTitle>
            <Table head={[{ t: t('ช่วงเวลา', 'Hour') }, { t: t('บิล', 'Bills') + pd, r: true }, { t: t('ยอดขาย', 'Sales') + pd, r: true }]}
              rows={w.map((h) => [`${h.hour}:00`, h.bills.toFixed(days > 1 ? 1 : 0), money(h.sales)])} />
          </Panel>
        </>
      );
    }}</Wrap>
  );
}

function Payment({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const rows = d.payments.filter((p) => p.bills || p.sales).map((p) => ({ ...p, m: payMeta(p.method, t, c) }));
      const tot = rows.reduce((a, p) => a + p.sales, 0);
      const fees = rows.reduce((a, p) => a + (p.fees ?? 0), 0);
      return (
        <>
          <KpiGrid>
            <Kpi wide icon="coin" label={t('ยอดรับชำระทั้งหมด', 'Total collected')} value={money(tot)} />
            <Kpi icon="receipt" label={t('จำนวนบิล', 'Bills')} value={nf(d.kpis.bills)} />
            <Kpi icon="card" label={t('ค่าธรรมเนียม', 'Fees')} value={m0(fees)} />
          </KpiGrid>
          <Gap />
          <Panel>
            <PanelTitle>{t('สัดส่วนยอดรับชำระ', 'Share of amount collected')}</PanelTitle>
            {rows.length ? <DonutWrap parts={rows.map((p) => ({ l: p.m.name, v: p.sales, c: p.m.color }))} center={shortN(tot)} sub={t('บาท', 'THB')} /> : <Empty text={t('ยังไม่มีการชำระในช่วงนี้', 'No payments in this period')} />}
          </Panel>
          <Gap />
          <Panel>
            <PanelTitle>{t('แยกตามช่องทาง', 'By method')}</PanelTitle>
            {rows.map((p, i) => (
              <View key={p.method} style={[st.row, { borderBottomColor: c.line, borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                <View style={[st.av, { backgroundColor: alpha(p.m.color, 0.16) }]}><Icon name={p.m.icon} size={20} color={p.m.color} /></View>
                <View style={{ flex: 1 }}>
                  <T size={14.5} w={600}>{p.m.name}</T>
                  <Muted size={12}>{billsN(p.bills, lang)}</Muted>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T display w={600} size={15}>{money(p.sales)}</T>
                  {p.fees ? <Muted size={12}>{t('ค่าธรรมเนียม', 'fees')} {money(p.fees)}</Muted> : null}
                </View>
              </View>
            ))}
          </Panel>
        </>
      );
    }}</Wrap>
  );
}

function Bills({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const { branches } = useApp();
  const [q, setQ] = useState('');
  const [qd, setQd] = useState('');
  const [status, setStatus] = useState<'' | 'paid' | 'edited' | 'void'>('');
  const [n, setN] = useState(30);
  useEffect(() => {
    const h = setTimeout(() => { setQd(q.trim()); setN(30); }, 350);
    return () => clearTimeout(h);
  }, [q]);
  const s = useLoad(() => historyMerged(branchIds(branch, branches), { from: r.from, to: r.to, q: qd, status, limit: n }), [r.from, r.to, branch, qd, status, n]);
  const F: ['' | 'paid' | 'edited' | 'void', string][] = [['', t('ทั้งหมด', 'All')], ['paid', t('ชำระแล้ว', 'Paid')], ['edited', t('แก้ไข/คืน', 'Edited')], ['void', t('ยกเลิก', 'Voids')]];
  const rows = s.data?.rows.slice(0, n) ?? [];
  return (
    <>
      <Input value={q} onChangeText={setQ} placeholder={t('ค้นหาเลขบิล ชื่อสินค้า ลูกค้า หรือพนักงาน', 'Search bill no., product, customer or staff')} returnKeyType="search" autoCorrect={false} />
      <Gap h={10} />
      <Chips>{F.map(([k, l]) => <Chip key={k || 'all'} label={l} on={status === k} onPress={() => { setStatus(k); setN(30); }} />)}</Chips>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, marginHorizontal: 2 }}>
        <Muted>{s.data ? billsN(s.data.summary.count, lang) : ' '}</Muted>
        <Muted>{s.data ? `${t('ยอดขาย', 'Sales')} ${m0(s.data.summary.sales)}` : ''}</Muted>
      </View>
      {s.error && !s.data ? <ErrorBox error={s.error} onRetry={s.reload} /> : (
        <Panel tight>
          {s.data ? (rows.length ? rows.map((b, i) => <BillRow key={`${b.branchId}-${b.id}`} b={b} last={i === rows.length - 1} />)
            : <Empty text={t('ไม่พบบิลที่ตรงกับการค้นหา', 'No bills match your search')} />) : <Loading pad={24} />}
        </Panel>
      )}
      {s.data && s.data.summary.count > n ? (
        <MoreBtn label={s.loading ? t('กำลังโหลด…', 'Loading…') : t(`แสดงเพิ่มอีก ${Math.min(30, s.data.summary.count - n)} บิล`, `Show ${Math.min(30, s.data.summary.count - n)} more`)} onPress={() => setN(n + 30)} disabled={s.loading} />
      ) : null}
      {s.data && rows.length ? <Muted size={12} style={{ marginTop: 8, textAlign: 'center', color: c.muted }}>{t('แตะบิลเพื่อดูใบเสร็จ', 'Tap a bill to see the receipt')}</Muted> : null}
    </>
  );
}

// ---------------------------------------------------------------- สินค้า
function Products({ r, branch }: BodyProps) {
  const c = useC();
  const { t } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const bySales = d.topProducts.slice().sort((a, b) => b.sales - a.sales);
      const cols = palette(c);
      const catIdx = new Map(d.categories.map((x, i) => [x.id, i]));
      return d.topProducts.length ? (
        <>
          <Panel>
            <PanelTitle>{t('10 อันดับขายดี (เรียงตามยอดเงิน)', 'Top 10 sellers (by revenue)')}</PanelTitle>
            <HBars rows={bySales.map((x, i) => ({ l: `${i + 1}. ${x.name}`, s: x.sku, v: x.sales, d: m0(x.sales), c: cols[(catIdx.get(x.categoryId) ?? 0) % cols.length] }))} />
          </Panel>
          <Gap />
          <Panel>
            <PanelTitle>{t('ขายดีตามจำนวนชิ้น', 'Top by units')}</PanelTitle>
            <Table head={[{ t: t('สินค้า', 'Product'), flex: 2.2 }, { t: t('ชิ้น', 'Units'), r: true, flex: 0.8 }, { t: t('ยอดขาย', 'Sales'), r: true }]}
              rows={d.topProducts.map((x) => [x.name, nf(x.units), m0(x.sales)])} />
          </Panel>
        </>
      ) : <Panel><Empty icon="hanger" text={t('ยังไม่มียอดขายสินค้าในช่วงนี้', 'No product sales in this period')} /></Panel>;
    }}</Wrap>
  );
}

function Category({ r, branch }: BodyProps) {
  const c = useC();
  const { t } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const cols = palette(c);
      const parts = d.categories.map((x, i) => ({ l: x.label, v: x.sales, c: cols[i % cols.length], q: x.units }));
      const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
      return parts.length ? (
        <>
          <Panel><PanelTitle>{t('สัดส่วนยอดขาย', 'Share of sales')}</PanelTitle><DonutWrap parts={parts} center={shortN(tot)} sub={t('บาท', 'THB')} /></Panel>
          <Gap />
          <Panel>
            <PanelTitle>{t('รายละเอียดหมวดหมู่', 'Category details')}</PanelTitle>
            <Table head={[{ t: t('หมวด', 'Category'), flex: 1.8 }, { t: t('ชิ้น', 'Units'), r: true, flex: 0.7 }, { t: t('ยอดขาย', 'Sales'), r: true }, { t: '%', r: true, flex: 0.7 }]}
              rows={parts.map((p) => [p.l, nf(p.q), m0(p.v), ((p.v / tot) * 100).toFixed(1) + '%'])} />
          </Panel>
        </>
      ) : <Panel><Empty icon="pie" text={t('ยังไม่มียอดขายในช่วงนี้', 'No sales in this period')} /></Panel>;
    }}</Wrap>
  );
}

function SizeColor({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const sizes = d.sizes, colors = d.colors;
      const su = sizes.reduce((a, x) => a + x.units, 0) || 1;
      const best = sizes[0];
      return (
        <>
          {best ? <Callout icon="ruler" title={t(`ไซซ์ขายดีสุด ${best.label}`, `Best-selling size: ${best.label}`)} sub={t(`${pcs(best.units, lang)} · ${((best.units / su) * 100).toFixed(0)}% ของชิ้นที่ขาย`, `${pcs(best.units, lang)} · ${((best.units / su) * 100).toFixed(0)}% of units sold`)} /> : null}
          <Panel>
            <PanelTitle sub={t('จำนวนชิ้นที่ขาย (หักคืนแล้ว)', 'Units sold (net of returns)')}>{t('ไซซ์', 'Sizes')}</PanelTitle>
            {sizes.length ? <BarChart vals={sizes.map((x) => x.units)} labels={sizes.map((x) => x.label)} fmtTop={(v) => nf(v)} /> : <Empty text={t('ไม่มีข้อมูล', 'No data')} />}
            {sizes.length ? <Table head={[{ t: t('ไซซ์', 'Size') }, { t: t('ชิ้น', 'Units'), r: true }, { t: '%', r: true }, { t: t('ยอดขาย', 'Sales'), r: true }]}
              rows={sizes.map((x) => [x.label, nf(x.units), ((x.units / su) * 100).toFixed(1) + '%', m0(x.sales)])} /> : null}
          </Panel>
          <Gap />
          <Panel>
            <PanelTitle>{t('สีขายดี', 'Best-selling colours')}</PanelTitle>
            {colors.length ? (
              <View style={{ gap: 12 }}>
                {colors.map((x, i) => {
                  const mx = colors[0].units || 1;
                  return (
                    <View key={i}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: x.hex || c.line, borderWidth: 1, borderColor: alpha(c.dark ? '#FFFFFF' : '#000000', 0.15) }} />
                        <T size={13.5} style={{ flex: 1 }} numberOfLines={1}>{x.label}</T>
                        <T size={13.5} w={600}>{pcs(x.units, lang)}</T>
                      </View>
                      <View style={{ height: 8, borderRadius: 99, backgroundColor: c.surface2, overflow: 'hidden', marginTop: 4 }}>
                        <View style={{ height: '100%', width: `${(x.units / mx) * 100}%`, backgroundColor: c.accent, borderRadius: 99 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : <Empty text={t('ไม่มีข้อมูล', 'No data')} />}
          </Panel>
        </>
      );
    }}</Wrap>
  );
}

function Shipments({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const { openSheet } = useApp();
  const s = useLoad(() => api.shipments(), []);
  return (
    <Wrap s={s}>{(d) => {
      const inR = (x: string | null) => !!x && x.slice(0, 10) >= r.from && x.slice(0, 10) <= r.to;
      const list = d.list.filter((x) => (branch === 'all' || x.destBranchId === branch) && (x.status === 'draft' || inR(x.shippedAt ?? x.createdAt)));
      const shipped = list.filter((x) => x.status === 'shipped');
      const drafts = list.filter((x) => x.status === 'draft');
      return (
        <>
          <KpiGrid>
            <Kpi icon="truck" label={t('ส่งแล้ว (ใบ)', 'Shipped (notes)')} value={nf(shipped.length)} />
            <Kpi icon="box" label={t('จำนวนชิ้นที่ส่ง', 'Units shipped')} value={nf(shipped.reduce((a, x) => a + x.units, 0))} />
            <Kpi wide icon="clock" label={t('กำลังจัดของ / พักไว้', 'Packing / on hold')} value={nf(drafts.length)} foot={<Muted>{pcs(drafts.reduce((a, x) => a + x.units, 0), lang)}</Muted>} />
          </KpiGrid>
          <Gap />
          <Panel tight>
            {list.length ? list.map((x, i) => (
              <Pressable key={x.id} onPress={() => openSheet({ kind: 'shipment', row: x })}
                style={[st.row, { borderBottomColor: c.line, borderBottomWidth: i === list.length - 1 ? 0 : StyleSheet.hairlineWidth, paddingVertical: 12 }]}>
                <View style={[st.pay, { backgroundColor: alpha(c.c5, 0.14) }]}><Icon name="truck" size={22} color={c.c5} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <T display w={600} size={14} numberOfLines={1} style={{ flexShrink: 1 }}>{x.docNo}</T>
                    <T display w={600} size={15} style={{ marginLeft: 'auto' }}>{pcs(x.units, lang)}</T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Muted numberOfLines={1} style={{ flexShrink: 1 }}>{dWeek(x.shippedAt ?? x.createdAt, lang)} · {hhmm(x.shippedAt ?? x.createdAt)} · → {x.destBranchName ?? '—'}</Muted>
                    <View style={{ marginLeft: 'auto' }}>{x.status === 'shipped' ? <Tag kind="good">{t('ส่งแล้ว', 'Shipped')}</Tag> : <Tag kind="warn">{x.heldAt ? t('พักไว้', 'On hold') : t('กำลังจัด', 'Packing')}</Tag>}</View>
                  </View>
                </View>
              </Pressable>
            )) : <Empty icon="truck" text={t('ไม่มีใบส่งของในช่วงนี้', 'No delivery notes in this period')} />}
          </Panel>
        </>
      );
    }}</Wrap>
  );
}

// ---------------------------------------------------------------- พนักงานและสาขา
function Expenses({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const [n, setN] = useState(20);
  const s = useLoad(
    () => (branch === 'all' ? api.expenses({ from: r.from, to: r.to, branch: 'all' }) : inBranch(branch, () => api.expenses({ from: r.from, to: r.to }))),
    [r.from, r.to, branch],
  );
  return (
    <Wrap s={s}>{(d) => {
      const cols = palette(c);
      const live = d.rows.filter((e) => !e.voidedAt);
      return (
        <>
          <KpiGrid>
            <Kpi wide icon="wallet" label={t('ค่าใช้จ่ายรวม', 'Total expenses')} value={money(d.summary.total)} foot={<Muted>{t(`${nf(d.summary.count)} รายการ`, `${nf(d.summary.count)} entries`)}</Muted>} />
            {d.summary.bySource.slice(0, 2).map((x) => (
              <Kpi key={x.source} icon={x.source === 'drawer' ? 'cash' : 'bank'} label={d.sources[x.source] ?? x.source} value={m0(x.total)} />
            ))}
          </KpiGrid>
          <Gap />
          {d.summary.byCategory.length ? (
            <Panel>
              <PanelTitle>{t('แยกตามหมวด', 'By category')}</PanelTitle>
              <HBars rows={d.summary.byCategory.map((x, i) => ({ l: x.category, s: t(`${x.count} รายการ`, `${x.count}×`), v: x.total, d: m0(x.total), c: cols[i % cols.length] }))} />
            </Panel>
          ) : null}
          <Gap />
          <Panel tight>
            {d.rows.length ? d.rows.slice(0, n).map((e, i, a) => <ExpenseRow key={e.id} e={e} last={i === a.length - 1} />) : <Empty icon="wallet" text={t('ไม่มีค่าใช้จ่ายในช่วงนี้', 'No expenses in this period')} />}
          </Panel>
          {d.rows.length > n ? <MoreBtn label={t(`แสดงเพิ่มอีก ${Math.min(20, d.rows.length - n)} รายการ`, `Show ${Math.min(20, d.rows.length - n)} more`)} onPress={() => setN(n + 20)} /> : null}
          {live.length !== d.rows.length ? <Muted size={12} style={{ marginTop: 8 }}>{t('รายการที่ยกเลิกแสดงขีดฆ่า ไม่รวมในยอด', 'Cancelled entries are struck through and not counted')}</Muted> : null}
          {branch === 'all' ? <Muted size={12} style={{ marginTop: 6 }}>{t(`ทุกสาขา · ${dShort(r.from, lang)} – ${dShort(r.to, lang)}`, `All branches · ${dShort(r.from, lang)} – ${dShort(r.to, lang)}`)}</Muted> : null}
        </>
      );
    }}</Wrap>
  );
}

function Shifts({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const { branches, branchName } = useApp();
  const s = useLoad(() => shiftsMerged(branchIds(branch, branches), { from: r.from, to: r.to, limit: 100 }), [r.from, r.to, branch]);
  return (
    <Wrap s={s}>{(rows) => {
      const closed = rows.filter((x) => x.status === 'closed');
      const match = closed.filter((x) => !x.diff).length;
      const short = closed.filter((x) => (x.diff ?? 0) < 0);
      const over = closed.filter((x) => (x.diff ?? 0) > 0);
      const net = closed.reduce((a, x) => a + (x.diff ?? 0), 0);
      return (
        <>
          <KpiGrid>
            <Kpi icon="check" label={t('เงินตรงยอด', 'Balanced')} value={`${nf(match)}/${nf(closed.length)}`} />
            <Kpi icon="alert" label={t('ขาด / เกิน', 'Short / over')} value={`${nf(short.length)} / ${nf(over.length)}`} />
            <Kpi wide icon="cash" label={t('ส่วนต่างสุทธิ', 'Net difference')} value={money(net)} foot={rows.some((x) => x.status === 'open') ? <Tag kind="accent">{t('มีกะที่เปิดอยู่', 'A shift is open')}</Tag> : undefined} />
          </KpiGrid>
          <Gap />
          <Panel tight>
            {rows.length ? rows.map((x, i) => {
              const diff = x.diff ?? 0;
              return (
                <View key={`${x.branchId}-${x.id}`} style={{ paddingVertical: 12, borderBottomColor: c.line, borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T display w={600} size={14}>{t('กะ', 'Shift')} #{x.shiftNo}</T>
                    <Muted size={12} style={{ flexShrink: 1 }} numberOfLines={1}>{x.openedBy}{branches.length > 1 ? ` · ${branchName(x.branchId)}` : ''}</Muted>
                    <View style={{ marginLeft: 'auto' }}>
                      {x.status === 'open' ? <Tag kind="accent">{t('เปิดอยู่', 'Open')}</Tag> : !diff ? <Tag kind="good">{t('เงินตรงยอด', 'Balanced')}</Tag>
                        : <Tag kind="bad">{diff < 0 ? t(`ขาด ${m0(-diff)}`, `Short ${m0(-diff)}`) : t(`เกิน ${m0(diff)}`, `Over ${m0(diff)}`)}</Tag>}
                    </View>
                  </View>
                  <Muted size={12.5} style={{ marginTop: 4 }}>
                    {dWeek(x.openedAt, lang)} {hhmm(x.openedAt)}{x.closedAt ? ` – ${hhmm(x.closedAt)}` : ''} · {billsN(x.billCount, lang)} · {t('ยอดขาย', 'sales')} {m0(x.totalSales)}
                  </Muted>
                  {x.status === 'closed' ? (
                    <Muted size={12.5}>{t('เงินสดที่ควรมี', 'Expected cash')} {money(x.expectedCash)} · {t('นับได้', 'counted')} {money(x.countedCash ?? 0)}</Muted>
                  ) : null}
                </View>
              );
            }) : <Empty icon="calendar" text={t('ไม่มีกะในช่วงนี้', 'No shifts in this period')} />}
          </Panel>
        </>
      );
    }}</Wrap>
  );
}

function Branches({ r }: BodyProps) {
  const c = useC();
  const { t } = useLang();
  const { branches } = useApp();
  const s = useLoad(async () => Promise.all(branches.map(async (b) => ({ b, d: await api.dashboard({ from: r.from, to: r.to, branch: b.id }) }))), [r.from, r.to, branches.length]);
  return (
    <Wrap s={s}>{(list) => {
      const cols = palette(c);
      const tot = list.reduce((a, x) => a + x.d.kpis.sales, 0);
      return (
        <>
          <Panel>
            <PanelTitle sub={t(`รวม ${money(tot)}`, `Total ${money(tot)}`)}>{t('ยอดขายสุทธิแต่ละสาขา', 'Net sales by branch')}</PanelTitle>
            <HBars rows={list.map((x, i) => ({ l: x.b.name, s: x.b.code, v: x.d.kpis.sales, d: m0(x.d.kpis.sales), c: cols[i % cols.length] }))} />
          </Panel>
          <Gap />
          <Panel>
            <PanelTitle>{t('เทียบตัวเลขสำคัญ', 'Key numbers')}</PanelTitle>
            <Table head={[{ t: t('สาขา', 'Branch'), flex: 1.4 }, { t: t('บิล', 'Bills'), r: true, flex: 0.7 }, { t: t('เฉลี่ย', 'Avg.'), r: true }, { t: t('กำไร', 'Profit'), r: true }]}
              rows={list.map((x) => [x.b.name, nf(x.d.kpis.bills), m0(x.d.kpis.aov), m0(x.d.kpis.profit)])}
              foot={[t('รวม', 'Total'), nf(list.reduce((a, x) => a + x.d.kpis.bills, 0)), '', m0(list.reduce((a, x) => a + x.d.kpis.profit, 0))]} />
          </Panel>
          <Gap />
          {list.map((x) => (
            <View key={x.b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <T size={13} style={{ flex: 1 }}>{x.b.name}</T>
              <Delta cur={x.d.kpis.sales} prev={x.d.prev.sales} />
            </View>
          ))}
        </>
      );
    }}</Wrap>
  );
}

function Staff({ r, branch }: BodyProps) {
  const c = useC();
  const { t, lang } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const cols = palette(c);
      return d.staff.length ? (
        <>
          <Panel>
            <PanelTitle>{t('ยอดขายตามพนักงาน', 'Sales by staff')}</PanelTitle>
            <HBars rows={d.staff.map((x, i) => ({ l: x.name, s: billsN(x.bills, lang), v: x.sales, d: m0(x.sales), c: cols[i % cols.length] }))} />
          </Panel>
          <Gap />
          <Panel>
            <Table head={[{ t: t('พนักงาน', 'Staff'), flex: 1.6 }, { t: t('บิล', 'Bills'), r: true, flex: 0.7 }, { t: t('เฉลี่ย/บิล', 'Avg.'), r: true }, { t: t('ยอดขาย', 'Sales'), r: true }]}
              rows={d.staff.map((x) => [x.name, nf(x.bills), m0(x.bills ? x.sales / x.bills : 0), m0(x.sales)])} />
          </Panel>
        </>
      ) : <Panel><Empty icon="users" text={t('ยังไม่มียอดขายในช่วงนี้', 'No sales in this period')} /></Panel>;
    }}</Wrap>
  );
}

// ---------------------------------------------------------------- การเงิน
function Profit({ r, branch }: BodyProps) {
  const { t, lang } = useLang();
  const s = useDash(r, branch);
  return (
    <Wrap s={s}>{(d) => {
      const a = d.kpis, p = d.prev;
      const exp = d.expenses?.total ?? 0;
      const net = a.profit - exp;
      const ch = seriesChart(d, lang, 'profit');
      const hour = d.range.granularity === 'hour';
      return (
        <>
          <KpiGrid>
            <Kpi wide icon="coin" label={t('กำไรขั้นต้น (หลังหัก VAT และต้นทุน)', 'Gross profit (ex-VAT, after cost)')} value={money(a.profit)} foot={<Delta cur={a.profit} prev={p.profit} />} />
            <Kpi icon="percent" label="Margin" value={`${a.margin.toFixed(1)}%`} foot={<Muted>{t('ก่อน', 'prev.')} {p.margin.toFixed(1)}%</Muted>} />
            <Kpi icon="trend" label={t('ยอดขายสุทธิ', 'Net sales')} value={m0(a.sales)} />
            <Kpi icon="wallet" label={t('ค่าใช้จ่ายร้าน', 'Store expenses')} value={m0(exp)} foot={d.expenses ? <Delta cur={exp} prev={d.expenses.prev} invert /> : undefined} />
            <Kpi icon="coin" label={t('กำไรสุทธิ', 'Net profit')} value={m0(net)} foot={d.expenses ? <Delta cur={net} prev={p.profit - d.expenses.prev} /> : undefined} />
          </KpiGrid>
          <Gap />
          <Panel><PanelTitle>{t('กำไรขั้นต้น', 'Gross profit')}</PanelTitle><AreaChart vals={ch.vals} labels={ch.labels} every={ch.every} /></Panel>
          <Gap />
          {!hour ? (
            <Panel>
              <PanelTitle>{t('แยกรายวัน', 'By day')}</PanelTitle>
              <Table head={[{ t: t('วันที่', 'Date') }, { t: t('ยอดขาย', 'Sales'), r: true }, { t: t('กำไร', 'Profit'), r: true }]}
                rows={d.series.slice().reverse().map((x) => [dAxis(x.key), m0(x.sales), m0(x.profit)])} foot={[t('รวม', 'Total'), m0(a.sales), m0(a.profit)]} />
            </Panel>
          ) : null}
          {d.expenses?.top?.length ? (
            <>
              <Gap />
              <Panel>
                <PanelTitle>{t('ค่าใช้จ่ายสูงสุด', 'Largest expenses')}</PanelTitle>
                <Table head={[{ t: t('หมวด', 'Category') }, { t: t('รายการ', 'Item'), flex: 1.5 }, { t: t('บาท', 'THB'), r: true }]} rows={d.expenses.top.map((x) => [x.category, x.name, m0(x.total)])} />
              </Panel>
            </>
          ) : null}
          <Muted size={12} style={{ marginTop: 10, lineHeight: 19 }}>{t('ต้นทุนมาจากราคาทุนที่ตั้งไว้ในสต็อกของ POS · สินค้าที่ไม่ได้ตั้งทุนนับทุนเป็น 0', 'Cost comes from the cost price set in POS stock; items without a cost count as 0.')}</Muted>
        </>
      );
    }}</Wrap>
  );
}

function Returns({ r, branch }: BodyProps) {
  const { t, lang } = useLang();
  const { branches } = useApp();
  const s = useDash(r, branch);
  const list = useLoad(async () => {
    const ids = branchIds(branch, branches);
    const [v, e] = [await historyMerged(ids, { from: r.from, to: r.to, status: 'void', limit: 20 }), await historyMerged(ids, { from: r.from, to: r.to, status: 'edited', limit: 20 })];
    return [...v.rows, ...e.rows].sort((a, b) => (stamp(a.createdAt) < stamp(b.createdAt) ? 1 : -1));
  }, [r.from, r.to, branch]);
  return (
    <Wrap s={s}>{(d) => (
      <>
        <KpiGrid>
          <Kpi icon="ban" label={t('ยกเลิกบิล', 'Voided bills')} value={nf(d.returns.voids)} />
          <Kpi icon="undo" label={t('แก้ไข/คืนสินค้า', 'Edits/returns')} value={nf(d.returns.edits + (d.returns.creditNotes ?? 0))} />
          <Kpi icon="cash" label={t('คืนเงินลูกค้า', 'Refunded')} value={m0(d.returns.refunded)} />
          <Kpi icon="coin" label={t('เก็บเงินเพิ่ม', 'Collected extra')} value={m0(d.returns.collected)} />
        </KpiGrid>
        <Gap />
        <Panel tight>
          {list.data ? (list.data.length ? list.data.map((b, i, a) => <BillRow key={`${b.branchId}-${b.id}`} b={b} last={i === a.length - 1} />)
            : <Empty icon="check" text={t('ไม่มีบิลที่ยกเลิกหรือแก้ไขในช่วงนี้', 'No voided or edited bills in this period')} />)
            : list.error ? <Empty icon="alert" text={list.error} /> : <Loading pad={24} />}
        </Panel>
        <Muted size={12} style={{ marginTop: 8 }}>{t(`นับตามวันที่ทำรายการ · ${billsN(list.data?.length ?? 0, lang)}`, `Counted by the date of the change · ${billsN(list.data?.length ?? 0, lang)}`)}</Muted>
      </>
    )}</Wrap>
  );
}

export const BODIES: Record<ReportId, (p: BodyProps) => ReactNode> = {
  summary: (p) => <Summary {...p} />,
  hourly: (p) => <Hourly {...p} />,
  payment: (p) => <Payment {...p} />,
  bills: (p) => <Bills {...p} />,
  products: (p) => <Products {...p} />,
  category: (p) => <Category {...p} />,
  sizecolor: (p) => <SizeColor {...p} />,
  stock: () => <StockBody />,
  shipments: (p) => <Shipments {...p} />,
  expenses: (p) => <Expenses {...p} />,
  shifts: (p) => <Shifts {...p} />,
  branches: (p) => <Branches {...p} />,
  staff: (p) => <Staff {...p} />,
  profit: (p) => <Profit {...p} />,
  returns: (p) => <Returns {...p} />,
};

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  av: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pay: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
