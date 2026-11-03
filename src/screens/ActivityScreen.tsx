// กิจกรรมล่าสุดของร้าน (หน้ากระดิ่ง) — แตะรายการเพื่อเปิดบิล/ค่าใช้จ่าย/รายงานที่เกี่ยวข้อง
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EVT, loadActivity, type Ev, type EvGroup } from '../activity';
import { Icon } from '../components/Icon';
import { ApiBox, Chip, Chips, DayHead, Empty, ErrorBox, Gap, Loading, Muted, Panel, SubHeader, T } from '../components/ui';
import { hhmm, isoDate, stamp } from '../format';
import { useLang } from '../i18n';
import { useApp, useLoad } from '../state';
import { alpha, useC } from '../theme';

export function ActivityScreen() {
  const c = useC();
  const { t } = useLang();
  const app = useApp();
  const { me, branches, back, seen, markSeen, branchName, openSheet, openReport, go, setUnread } = app;
  const [f, setF] = useState<'all' | EvGroup>('all');
  // เวลาที่เปิดดูครั้งก่อน (รายการหลังจากนี้ = ใหม่)
  const [cut] = useState(seen);
  const s = useLoad(() => loadActivity(me, branches, t, c), [branches.length]);
  useEffect(() => {
    if (s.data) {
      markSeen();
      setUnread(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.data]);
  const all = s.data ?? [];
  const F: ['all' | EvGroup, string][] = [['all', t('ทั้งหมด', 'All')], ['sales', t('ยอดขาย', 'Sales')], ['returns', t('คืน/ยกเลิก', 'Refunds')], ['expense', t('ค่าใช้จ่าย', 'Expenses')], ['shifts', t('กะ/ลิ้นชัก', 'Shifts')], ['stock', t('สต็อก', 'Stock')]];
  const cnt = (g: 'all' | EvGroup) => all.filter((e) => g === 'all' || EVT[e.type].g === g).length;
  const list = all.filter((e) => f === 'all' || EVT[e.type].g === f);
  const nNew = all.filter((e) => stamp(e.at) > cut).length;
  const today = isoDate(new Date());
  const open = (e: Ev) => {
    if (e.bill) openSheet({ kind: 'bill', row: e.bill });
    else if (e.expense) openSheet({ kind: 'expense', row: e.expense });
    else if (e.shipment) openSheet({ kind: 'shipment', row: e.shipment });
    else if (e.report) openReport(e.report, e.branchId);
    else if (e.tab) go(e.tab);
  };
  let day: string | null = null;
  return (
    <View>
      <SubHeader title={t('กิจกรรมล่าสุดของร้าน', 'Store activity')} onBack={back} />
      <Muted style={{ marginTop: -8, marginBottom: 14 }}>{t(`ทุกสาขา · 2 วันล่าสุด · ใหม่ ${nNew} รายการ`, `All branches · last 2 days · ${nNew} new`)}</Muted>
      <Chips style={{ marginBottom: 14 }}>{F.map(([k, l]) => <Chip key={k} label={l} on={f === k} count={cnt(k)} onPress={() => setF(k)} />)}</Chips>
      {s.error && !s.data ? <ErrorBox error={s.error} onRetry={s.reload} /> : (
        <Panel tight>
          {!s.data ? <Loading pad={24} /> : list.length ? list.map((e, i) => {
            const m = EVT[e.type];
            const col = m.color(c);
            const isNew = stamp(e.at) > cut;
            const d = e.at.slice(0, 10);
            const head = d !== day ? (day = d, <DayHead key={`h${d}`}>{d === today ? t('วันนี้', 'Today') : t('เมื่อวาน', 'Yesterday')}</DayHead>) : null;
            return (
              <View key={e.key}>
                {head}
                <Pressable onPress={() => open(e)} style={({ pressed }) => [st.ev, { borderBottomColor: c.line, borderBottomWidth: i === list.length - 1 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 }]}>
                  <View style={[st.ic, { backgroundColor: alpha(col, 0.14) }]}><Icon name={m.icon} size={19} color={col} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={14} w={isNew ? 600 : 500} lh={19}>{e.title}</T>
                    {e.desc ? <T size={12.5} color={c.muted} lh={18}>{e.desc}</T> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <T size={11.5} color={c.muted}>{hhmm(e.at)}{e.branchId ? ` · ${branchName(e.branchId)}` : ''} ·</T>
                      <View style={{ backgroundColor: c.surface2, borderRadius: 5, paddingHorizontal: 5 }}><T size={10.5} color={c.muted}>{m.name}</T></View>
                    </View>
                  </View>
                  {isNew ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 6 }} /> : null}
                </Pressable>
              </View>
            );
          }) : <Empty text={t('ไม่มีกิจกรรมในหมวดนี้', 'No activity in this category')} />}
        </Panel>
      )}
      <Gap h={4} />
      <ApiBox path="/api/history · /api/shifts · /api/expenses · /api/shipments" note={t('แอปรวมกิจกรรมจาก API เหล่านี้ทุกครั้งที่เปิดหน้านี้หรือกดซิงค์ · ถ้าต้องการแจ้งเตือนแบบ push ให้ใช้ระบบแจ้งเตือน (Webhook) ของ POS', 'The app builds this feed from these APIs when you open it or sync. For push alerts, use the POS notification webhooks.')} />
    </View>
  );
}

const st = StyleSheet.create({
  ev: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12 },
  ic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
