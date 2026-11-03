// หน้าหลัก: ยอดขายสุทธิ · การ์ดสาขา (ปัดซ้าย-ขวา) · ปุ่มลัด · ตัวเลขสำคัญ · กราฟ · บิลล่าสุด
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { api, historyMerged } from '../api';
import { BillRow } from '../components/BillRow';
import { AreaChart } from '../components/Charts';
import { LiveDot, TopHeader } from '../components/Chrome';
import { Icon, type IconName } from '../components/Icon';
import { Delta, Empty, ErrorBox, Kpi, Loading, Muted, Panel, PeriodChips, SectionHead, T } from '../components/ui';
import { billsN, hhmm, isoLocal, m0, money, nf } from '../format';
import { useLang } from '../i18n';
import { periodCmp, periodLabel, rangeOf } from '../period';
import { useApp, useLoad, type BranchSel } from '../state';
import { alpha, useC, type Palette } from '../theme';
import type { Dashboard } from '../types';
import { seriesChart } from './reports/common';

export function HomeScreen() {
  const c = useC();
  const { t, lang } = useLang();
  const app = useApp();
  const { period, setPeriod, branch, setBranch, branches, hide, setHide, lastSync, openReport, go } = app;
  const r = rangeOf(period);
  const cards: { id: BranchSel; name: string; tag: string; code: string }[] = useMemo(
    () => [
      ...(branches.length > 1 ? [{ id: 'all' as const, name: t('ทุกสาขา', 'All branches'), tag: t(`${branches.length} สาขา`, `${branches.length} branches`), code: 'ALL' }] : []),
      ...branches.map((b) => ({ id: b.id, name: b.name, tag: b.isMain ? t('สาขาหลัก', 'Main') : t('หน้าร้าน', 'Store'), code: b.code })),
    ],
    [branches, t],
  );

  // รายงานรวมของทุกการ์ด (ทุกสาขา + แต่ละสาขา)
  const dash = useLoad(async () => {
    const out: Record<string, Dashboard> = {};
    await Promise.all(cards.map(async (cd) => { out[String(cd.id)] = await api.dashboard({ from: r.from, to: r.to, branch: cd.id }); }));
    return out;
  }, [r.from, r.to, cards.length]);
  const cur = branch === 'all' && cards[0]?.id !== 'all' ? String(cards[0]?.id) : String(branch);
  const d = dash.data?.[cur];

  const bills = useLoad(
    () => historyMerged(branch === 'all' ? branches.map((b) => b.id) : [branch], { from: r.from, to: r.to, limit: 6 }),
    [r.from, r.to, branch, branches.length],
  );

  const hidden = (s: string) => (hide ? '฿ ••••••' : s);
  const k = d?.kpis;
  const p = d?.prev;
  const chart = d ? seriesChart(d, lang) : null;
  const low = d ? d.stock.low + d.stock.out : 0;

  return (
    <View>
      <TopHeader />
      <T size={13.5} color={c.muted}>{t('ยอดขายสุทธิ', 'Net sales')} {periodLabel(period, t)} · {app.branchName(branch)}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2, marginBottom: 6 }}>
        <T display w={700} size={34} lh={42} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, letterSpacing: -0.5 }}>{k ? hidden(money(k.sales)) : '฿ —'}</T>
        <Pressable onPress={() => setHide(!hide)} hitSlop={10} accessibilityLabel={hide ? t('แสดงยอดเงิน', 'Show amounts') : t('ซ่อนยอดเงิน', 'Hide amounts')}>
          <Icon name={hide ? 'eyeoff' : 'eye'} size={20} color={c.muted} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {k && p ? <Delta cur={k.sales} prev={p.sales} /> : null}
        <Muted>{periodCmp(period, t)}</Muted>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <LiveDot />
        <Muted size={12}>{t(`รับข้อมูลจาก POS ล่าสุด ${hhmm(isoLocal(lastSync))} น.`, `Last POS update ${hhmm(isoLocal(lastSync))}`)}</Muted>
      </View>

      <View style={{ marginTop: 14 }}><PeriodChips value={period} onChange={setPeriod} /></View>

      <Carousel cards={cards} data={dash.data} active={cur} onActive={(id) => setBranch(id)} hide={hide} />

      {dash.error && !dash.data ? <ErrorBox error={dash.error} onRetry={dash.reload} /> : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
        <QA icon="chart" label={t('รายงานทั้งหมด', 'All reports')} onPress={() => go('reports')} />
        <QA icon="receipt" label={t('บิลขาย', 'Bills')} onPress={() => openReport('bills')} />
        <QA icon="box" label={t('สต็อกใกล้หมด', 'Low stock')} n={low} onPress={() => go('stock')} />
      </View>

      {k && p ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18, marginTop: 26 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14 }}>
          <Kpi style={kw} icon="receipt" label={t('จำนวนบิล', 'Bills')} value={nf(k.bills)} foot={<Delta cur={k.bills} prev={p.bills} />} />
          <Kpi style={kw} icon="tag" label={t('เฉลี่ยต่อบิล', 'Avg. ticket')} value={m0(k.aov)} foot={<Delta cur={k.aov} prev={p.aov} />} />
          <Kpi style={kw} icon="coin" label={t('กำไรขั้นต้น', 'Gross profit')} value={hide ? '••••' : m0(k.profit)} foot={<Muted>margin {k.margin.toFixed(1)}%</Muted>} />
          <Kpi style={kw} icon="hanger" label={t('ชิ้นต่อบิล', 'Units per bill')} value={k.upt.toFixed(2)} foot={<Delta cur={k.upt} prev={p.upt} />} />
          <Kpi style={kw} icon="percent" label={t('ส่วนลดรวม', 'Discounts')} value={hide ? '••••' : m0(k.discount)} foot={<Delta cur={k.discount} prev={p.discount} invert />} />
          <Kpi style={kw} icon="undo" label={t('คืน/ยกเลิก', 'Refunds/voids')} value={nf((d?.returns.voids ?? 0) + (d?.returns.edits ?? 0))} foot={<Muted>{m0(d?.returns.refunded ?? 0)}</Muted>} />
        </ScrollView>
      ) : dash.loading ? <Loading /> : null}

      <SectionHead title={r.days === 1 ? t('ยอดขายตามชั่วโมง', 'Sales by hour') : t('ยอดขายรายวัน', 'Daily sales')} link={t('ดูรายงาน', 'View report')} onLink={() => openReport('summary')} />
      <Panel>{chart ? <AreaChart vals={chart.vals} labels={chart.labels} every={chart.every} /> : <Loading pad={30} />}</Panel>

      <SectionHead title={t('บิลล่าสุด', 'Latest bills')} link={t('ดูทั้งหมด', 'See all')} onLink={() => openReport('bills')} />
      <Panel tight>
        {bills.data ? (
          bills.data.rows.length ? bills.data.rows.slice(0, 6).map((b, i, a) => <BillRow key={`${b.branchId}-${b.id}`} b={b} last={i === a.length - 1} />)
            : <Empty text={t('ยังไม่มีบิลในช่วงนี้', 'No bills in this period yet')} />
        ) : bills.error ? <Empty icon="alert" text={bills.error} /> : <Loading pad={24} />}
      </Panel>
    </View>
  );
}
const kw = { width: 150, flexBasis: undefined, flexGrow: 0 } as const;

function QA({ icon, label, onPress, n }: { icon: IconName; label: string; onPress: () => void; n?: number }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, minHeight: 76, borderRadius: 18, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, opacity: pressed ? 0.8 : 1 })}>
      <Icon name={icon} size={24} color={c.accent} />
      <T size={12.5} w={500} style={{ textAlign: 'center' }}>{label}</T>
      {n ? (
        <View style={{ position: 'absolute', top: 8, right: 10, backgroundColor: c.bad, borderRadius: 99, paddingHorizontal: 6, minWidth: 18, alignItems: 'center' }}>
          <T size={11} w={700} color="#fff" lh={18}>{n > 99 ? '99+' : n}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------- การ์ดสาขา
const grads = (c: Palette): [string, string][] => [[c.accent2, c.accent], [c.navy2, c.navy], [c.teal2, c.teal], [c.c5, '#4A3A8C'], [c.c3, '#9A5A12'], [c.c6, '#28608F']];

function Carousel({ cards, data, active, onActive, hide }: {
  cards: { id: BranchSel; name: string; tag: string; code: string }[];
  data: Record<string, Dashboard> | null;
  active: string;
  onActive: (id: BranchSel) => void;
  hide: boolean;
}) {
  const c = useC();
  const { t, lang } = useLang();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520);
  const cw = Math.round(W * 0.82);
  const step = cw + 10;
  const side = (W - cw) / 2;
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, cards.findIndex((x) => String(x.id) === active));
  useEffect(() => {
    ref.current?.scrollTo({ x: idx * step, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cards.length]);
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(cards.length - 1, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (String(cards[i].id) !== active) onActive(cards[i].id);
  };
  const go = (i: number) => {
    ref.current?.scrollTo({ x: i * step, animated: true });
    onActive(cards[i].id);
  };
  const G = grads(c);
  return (
    <View>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast" disableIntervalMomentum
        onMomentumScrollEnd={onEnd} onScrollEndDrag={(e) => { if (!e.nativeEvent.velocity?.x) onEnd(e); }}
        style={{ marginHorizontal: -18, marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: side, gap: 10, paddingTop: 8, paddingBottom: 18 }}>
        {cards.map((cd, i) => {
          const x = data?.[String(cd.id)]?.kpis;
          const on = i === idx;
          const [g1, g2] = G[i % G.length];
          return (
            <Pressable key={String(cd.id)} onPress={() => go(i)} accessibilityLabel={`${cd.name} ${x ? m0(x.sales) : ''}`}
              style={{ width: cw, aspectRatio: 1.58, borderRadius: 22, overflow: 'hidden', padding: 18, transform: [{ scale: on ? 1 : 0.93 }], opacity: on ? 1 : 0.72, shadowColor: '#28328C', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: on ? 4 : 0 }}>
              <Svg style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`bc${i}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={g1} />
                    <Stop offset="1" stopColor={g2} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#bc${i})`} />
                <Circle cx={cw - 35} cy={25} r={65} fill="rgba(255,255,255,0.09)" />
                <Circle cx={cw - 110} cy={cw / 1.58 + 30} r={40} fill="rgba(255,255,255,0.09)" />
              </Svg>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <T size={14.5} w={600} color="#fff" numberOfLines={1} style={{ flexShrink: 1 }}>{cd.name}</T>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 99, paddingHorizontal: 8 }}>
                  <T size={11} w={500} color={alpha('#FFFFFF', 0.85)}>{cd.tag}</T>
                </View>
              </View>
              <View style={{ marginTop: 'auto' }}>
                <T size={12} color={alpha('#FFFFFF', 0.8)}>{t('ยอดขายสุทธิ', 'Net sales')}</T>
                <T display w={600} size={26} color="#fff" numberOfLines={1} adjustsFontSizeToFit>{x ? (hide ? '฿ ••••••' : m0(x.sales)) : '…'}</T>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <T size={12} color={alpha('#FFFFFF', 0.85)}>{cd.code} · {x ? billsN(x.bills, lang) : '—'}</T>
                <T size={12} color={alpha('#FFFFFF', 0.85)}>{t('เฉลี่ย', 'avg.')} {x ? (hide ? '••••' : m0(x.aov)) : '—'}</T>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {cards.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
          {cards.map((cd, i) => (
            <Pressable key={String(cd.id)} onPress={() => go(i)} accessibilityLabel={cd.name} style={{ paddingVertical: 6, paddingHorizontal: 3 }}>
              <View style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: 99, backgroundColor: i === idx ? c.accent : c.line }} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
