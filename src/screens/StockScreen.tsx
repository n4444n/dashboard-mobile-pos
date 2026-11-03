// สินค้าคงคลัง: มูลค่าสต็อก · ใกล้หมด · หมด · รายการสินค้าพร้อมจำนวนตามสี/ไซซ์
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, inBranch } from '../api';
import { TopHeader } from '../components/Chrome';
import {
  ApiBox, Chip, Chips, Empty, ErrorBox, Gap, Input, Kpi, KpiGrid, Loading, MoreBtn, Muted, PageTitle, Panel, PanelTitle, SelectBox, T,
} from '../components/ui';
import { hhmm, isoLocal, m0, nf, pcs } from '../format';
import { useLang } from '../i18n';
import { rangeOf } from '../period';
import { useApp, useLoad } from '../state';
import { useC } from '../theme';
import type { SkuProduct } from '../types';

export function StockScreen() {
  const { t } = useLang();
  return (
    <View>
      <TopHeader />
      <PageTitle title={t('สินค้าคงคลัง', 'Inventory')} />
      <StockBody />
      <ApiBox path="/api/stock/skus?status=&q=&page=" headers={['Authorization: Bearer ••••']} note={t('สต็อกเป็นของแต่ละสาขา — เลือกสาขาด้านบน', 'Stock is per branch — choose the branch above')} />
    </View>
  );
}

/** เนื้อหาหน้าสต็อก (ใช้ทั้งแท็บสต็อกและรายงาน "สินค้าคงคลัง") */
export function StockBody() {
  const { t, lang } = useLang();
  const { branch, me, branches, branchName, openSheet, lastSync } = useApp();
  const b = branch === 'all' ? me.branchId : branch;
  const [status, setStatus] = useState<'' | 'low' | 'out'>('');
  const [q, setQ] = useState('');
  const [qd, setQd] = useState('');
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    const h = setTimeout(() => { setQd(q.trim()); setLimit(20); }, 350);
    return () => clearTimeout(h);
  }, [q]);
  const today = rangeOf('today');
  const sum = useLoad(() => api.dashboard({ from: today.from, to: today.to, branch: b }), [b]);
  const list = useLoad(() => inBranch(b, () => api.skus({ q: qd, status, sort: 'stock', dir: 'asc', page: 1, limit })), [b, qd, status, limit]);
  const st = sum.data?.stock;
  return (
    <View>
      <Muted style={{ marginTop: -8, marginBottom: 12 }}>{t(`ข้อมูล ณ ${hhmm(isoLocal(lastSync))} น. วันนี้`, `As of ${hhmm(isoLocal(lastSync))} today`)}</Muted>
      {branches.length > 1 ? <><SelectBox label={branchName(b)} onPress={() => openSheet({ kind: 'branch', allowAll: false })} /><Gap /></> : null}
      {st ? (
        <KpiGrid>
          <Kpi wide icon="box" label={t('มูลค่าสต็อก (ทุน)', 'Stock value (at cost)')} value={m0(st.value)} foot={<Muted>{pcs(st.units, lang)} · {t(`${nf(st.variants)} SKU`, `${nf(st.variants)} SKUs`)}</Muted>} />
          <Kpi icon="alert" label={t('ไซซ์/สีใกล้หมด', 'Low variants')} value={nf(st.low)} />
          <Kpi icon="ban" label={t('หมดสต็อก', 'Out of stock')} value={nf(st.out)} />
        </KpiGrid>
      ) : sum.error ? <ErrorBox error={sum.error} onRetry={sum.reload} /> : <Loading pad={20} />}
      <Gap />
      <Panel>
        <PanelTitle sub={t('สีส้ม = ต่ำกว่าจุดแจ้งเตือน · สีแดง = หมด · เรียงจากคงเหลือน้อยก่อน', 'Orange = below alert level · red = sold out · lowest stock first')}>
          {t('สต็อกตามแบบ ไซซ์ และสี', 'Stock by style, size and colour')}
        </PanelTitle>
        <Input value={q} onChangeText={setQ} placeholder={t('ค้นหารหัสหรือชื่อสินค้า', 'Search product code or name')} autoCorrect={false} returnKeyType="search" />
        <Gap h={10} />
        <Chips>
          <Chip label={t('ทั้งหมด', 'All')} on={status === ''} onPress={() => { setStatus(''); setLimit(20); }} />
          <Chip label={t('ใกล้หมด', 'Low')} on={status === 'low'} onPress={() => { setStatus('low'); setLimit(20); }} count={st?.low} />
          <Chip label={t('หมด', 'Out')} on={status === 'out'} onPress={() => { setStatus('out'); setLimit(20); }} count={st?.out} />
        </Chips>
        <Gap h={4} />
        {list.data ? (
          list.data.products.length
            ? list.data.products.map((p, i, a) => <StockItem key={p.id} p={p} last={i === a.length - 1} />)
            : <Empty icon="box" text={t('ไม่พบสินค้า', 'No products found')} />
        ) : list.error ? <Empty icon="alert" text={list.error} /> : <Loading pad={24} />}
      </Panel>
      {list.data && list.data.total > list.data.products.length ? (
        <MoreBtn label={list.loading ? t('กำลังโหลด…', 'Loading…') : t(`แสดงเพิ่ม (${nf(list.data.products.length)}/${nf(list.data.total)})`, `Show more (${nf(list.data.products.length)}/${nf(list.data.total)})`)}
          onPress={() => setLimit(Math.min(200, limit + 20))} disabled={list.loading || limit >= 200} />
      ) : null}
    </View>
  );
}

function StockItem({ p, last }: { p: SkuProduct; last: boolean }) {
  const c = useC();
  const { t, lang } = useLang();
  const vs = p.variants.filter((v) => v.active);
  const tot = vs.reduce((a, v) => a + v.stock, 0);
  const lowN = vs.filter((v) => v.stock > 0 && v.stock <= p.lowStock).length;
  const outN = vs.filter((v) => v.stock <= 0).length;
  return (
    <View style={{ paddingVertical: 11, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={14.5} w={600} numberOfLines={1}>{p.name}</T>
          <Muted size={12}>{p.code}{p.category ? ` · ${p.category}` : ''}</Muted>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T display w={600} size={15}>{pcs(tot, lang)}</T>
          {outN || lowN ? (
            <T size={12} color={outN ? c.bad : c.warn}>
              {[outN ? t(`หมด ${outN}`, `${outN} out`) : '', lowN ? t(`ใกล้หมด ${lowN}`, `${lowN} low`) : ''].filter(Boolean).join(' · ')}
            </T>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {vs.map((v) => {
          const out = v.stock <= 0, low = !out && v.stock <= p.lowStock;
          const label = [v.color !== '-' ? v.color : '', v.size !== '-' ? v.size : '', v.extra].filter(Boolean).join(' ') || v.sku;
          return (
            <View key={v.id} style={{ borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: out ? c.badSoft : low ? c.warnSoft : c.surface2 }}>
              <T size={11.5} w={out || low ? 600 : 400} color={out ? c.bad : low ? c.warn : c.muted}>{label} · {v.stock}</T>
            </View>
          );
        })}
      </View>
    </View>
  );
}
