// หน้ารายงานทั้งหมด (ตารางไทล์แบ่งกลุ่ม) + หน้ารายงานแต่ละตัว (ตัวกรองช่วงเวลา/สาขา + เนื้อหา + กล่อง API)
import { Pressable, View } from 'react-native';
import { conn } from '../api';
import { TopHeader } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { ApiBox, Empty, Gap, Muted, PageTitle, Panel, PeriodChips, SelectBox, SubHeader, T } from '../components/ui';
import { useLang } from '../i18n';
import { rangeOf } from '../period';
import { useApp } from '../state';
import { alpha, shadow, useC } from '../theme';
import { BODIES } from './reports/Bodies';
import { REPORTS, RGROUP, reportDef, type Group } from './reports/common';

/** มีสิทธิ์เปิดรายงานนี้ใน POS ไหม */
function useAllowed() {
  const { me } = useApp();
  return (perm?: string) => !perm || (me.perms as Record<string, string>)[perm] !== 'none';
}

export function ReportsScreen() {
  const c = useC();
  const { t } = useLang();
  const { openReport } = useApp();
  const allowed = useAllowed();
  const list = REPORTS.filter((r) => allowed(r.perm));
  return (
    <View>
      <TopHeader />
      <PageTitle title={t('รายงานทั้งหมด', 'All reports')} sub={t(`${list.length} รายงาน คำนวณจากข้อมูลบิลที่ POS ส่งเข้ามา`, `${list.length} reports built from the bills your POS sends`)} />
      {(Object.keys(RGROUP) as Group[]).map((g) => {
        const items = list.filter((r) => r.g === g);
        if (!items.length) return null;
        return (
          <View key={g} style={{ marginTop: 8, marginBottom: 14 }}>
            <T size={12} w={600} color={c.muted} style={{ letterSpacing: 0.7, marginBottom: 10 }}>{t(...RGROUP[g]).toUpperCase()}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {items.map((r) => {
                const col = r.color(c);
                return (
                  <Pressable key={r.id} onPress={() => openReport(r.id)} accessibilityRole="button"
                    style={({ pressed }) => [{ flexBasis: '47%', flexGrow: 1, backgroundColor: c.surface, borderRadius: 18, padding: 14, gap: 8, opacity: pressed ? 0.85 : 1 }, shadow(c)]}>
                    <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(col, 0.15) }}>
                      <Icon name={r.icon} size={20} color={col} />
                    </View>
                    <T size={14} w={600} lh={18}>{t(...r.t)}</T>
                    <T size={12} color={c.muted} lh={17}>{t(...r.d)}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ReportScreen({ id }: { id: string }) {
  const { t } = useLang();
  const { period, setPeriod, branch, branchName, openSheet, back, branches } = useApp();
  const allowed = useAllowed();
  const def = reportDef(id);
  if (!def) return <View><SubHeader title="?" onBack={back} /><Panel><Empty text={t('ไม่พบรายงานนี้', 'Report not found')} /></Panel></View>;
  if (!allowed(def.perm)) {
    return (
      <View>
        <SubHeader title={t(...def.t)} onBack={back} />
        <Panel><Empty icon="lock" text={t('PIN ที่ใช้เข้าระบบไม่มีสิทธิ์เปิดเมนูนี้ใน POS — ให้ผู้ดูแลเพิ่มสิทธิ์ที่ พนักงาน › การจัดการสิทธิ์', 'Your PIN has no access to this menu on the POS. Ask an admin to grant it in Staff › Permissions.')} /></Panel>
      </View>
    );
  }
  const r = rangeOf(period);
  const showBranch = def.id !== 'branches' && branches.length > 1;
  const b = def.single && branch === 'all' ? branches[0]?.id ?? 'all' : branch;
  const Body = BODIES[def.id];
  const hdr = [`Authorization: Bearer ••••`, ...(conn.license?.route && !conn.directUrl ? [`X-POS-Shop: ${conn.license.route}`] : [])];
  return (
    <View>
      <SubHeader title={t(...def.t)} onBack={back} />
      {def.noFilter ? null : (
        <View style={{ gap: 10, marginBottom: 16 }}>
          <PeriodChips value={period} onChange={setPeriod} />
          {showBranch ? <SelectBox label={branchName(b)} onPress={() => openSheet({ kind: 'branch', allowAll: !def.single })} /> : null}
        </View>
      )}
      {Body({ r, branch: b })}
      <ApiBox
        path={def.noFilter || def.id === 'shipments' ? def.ep : `${def.ep}${def.ep.includes('?') ? '&' : '?'}from=${r.from}&to=${r.to}`}
        headers={hdr}
        note={def.ep.startsWith('/api/dashboard')
          ? t('รายงานรวมของ POS · เลือกสาขาด้วย ?branch=all หรือรหัสสาขา', 'POS summary report · choose the branch with ?branch=all or a branch id')
          : t('ข้อมูลของสาขาที่เลือกใน session · ดูทุกสาขา = เรียกทีละสาขาแล้วรวมผล', 'Data for the session\'s branch · all branches = called once per branch, then merged')}
      />
      <Gap h={4} />
      {branch === 'all' && !def.single && def.id !== 'branches' ? null : <Muted size={12}>{branchName(b)}</Muted>}
    </View>
  );
}
