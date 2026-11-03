// การตั้งค่า: ภาษา · ระบบ License · ตั้งค่า API (การเชื่อมต่อ + รายการ API) · ออกจากระบบ
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_VERSION, api, conn, shopBase } from '../api';
import { TopHeader } from '../components/Chrome';
import { Icon, type IconName } from '../components/Icon';
import { DayHead, Gap, KV, MoreBtn, Muted, PageTitle, Panel, PanelTitle, SubHeader, T, Tag } from '../components/ui';
import { dShort } from '../format';
import { useLang } from '../i18n';
import { useApp } from '../state';
import { F, alpha, useC } from '../theme';

const ROLE: Record<string, [string, string]> = {
  admin: ['ผู้ดูแลระบบ', 'Administrator'],
  manager: ['ผู้จัดการ', 'Manager'],
  sales: ['พนักงานขาย', 'Sales staff'],
  parttime: ['พนักงานพาร์ทไทม์', 'Part-time staff'],
};

function SetRow({ icon, title, sub, onPress, color, chev = true, last }: { icon: IconName; title: ReactNode; sub: string; onPress: () => void; color?: string; chev?: boolean; last?: boolean }) {
  const c = useC();
  const col = color ?? c.accent;
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(col, 0.14) }}>
        <Icon name={icon} size={20} color={col} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <T size={15} w={600}>{title}</T> : title}
        <T size={12.5} color={c.muted} numberOfLines={1}>{sub}</T>
      </View>
      {chev ? <Icon name="chev" size={18} color={c.muted} /> : null}
    </Pressable>
  );
}

export function SettingsScreen() {
  const c = useC();
  const { t, lang } = useLang();
  const { sub, setSub, openSheet, me, shopName } = useApp();
  if (sub === 'license') return <LicenseView />;
  if (sub === 'api') return <ApiView />;
  const lic = conn.license;
  const left = lic?.daysLeft;
  return (
    <View>
      <TopHeader />
      <PageTitle title={t('การตั้งค่า', 'Settings')} />
      <Panel tight>
        <SetRow icon="globe" title={t('ภาษาในระบบ', 'Language')} sub={lang === 'th' ? 'ไทย (Thai)' : 'English (อังกฤษ)'} onPress={() => openSheet({ kind: 'lang' })} />
        <SetRow icon="lock" title={t('ระบบ License', 'License')}
          sub={lic ? `POS-••••-${lic.code.slice(-4)} · ${left == null ? t('ไม่มีวันหมดอายุ', 'No expiry') : left <= 14 ? t(`เหลือ ${left} วัน`, `${left} days left`) : t('ใช้งานอยู่', 'Active')}` : t('โหมดทดสอบ (ต่อเซิร์ฟเวอร์ตรง)', 'Test mode (direct server)')}
          onPress={() => setSub('license')} />
        <SetRow icon="plug" title={t('ตั้งค่า API', 'API settings')} sub={t('API ของเราเอง · Clothing POS', 'Our own API · Clothing POS')} onPress={() => setSub('api')} last />
      </Panel>
      <Gap />
      <Panel tight>
        <SetRow icon="logout" color={c.bad} chev={false} last
          title={<T size={15} w={600} color={c.bad}>{t('ออกจากระบบ', 'Sign out')}</T>}
          sub={t(`${me.name} · ${t(...(ROLE[me.role] ?? [me.role, me.role]))}`, `${me.name} · ${t(...(ROLE[me.role] ?? [me.role, me.role]))}`)}
          onPress={() => openSheet({ kind: 'logout' })} />
      </Panel>
      <T size={12} color={c.muted} style={{ textAlign: 'center', marginTop: 18 }}>Tally {APP_VERSION} · {shopName}</T>
    </View>
  );
}

function LicenseView() {
  const c = useC();
  const { t, lang } = useLang();
  const { setSub } = useApp();
  const lic = conn.license;
  const left = lic?.daysLeft ?? null;
  const near = left != null && left <= 14;
  return (
    <View>
      <SubHeader title={t('ระบบ License', 'License')} onBack={() => setSub(null)} />
      <Panel>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={14.5} w={600}>License</T>
          {lic ? <Tag kind={near ? 'warn' : 'good'}>{near ? t('ใกล้หมดอายุ', 'Expiring soon') : t('ใช้งานอยู่', 'Active')}</Tag> : <Tag kind="mute">{t('โหมดทดสอบ', 'Test mode')}</Tag>}
        </View>
        {lic ? (
          <>
            <KV label="License" value={<Mono>{`POS-••••-${lic.code.slice(-4)}`}</Mono>} />
            <KV label={t('ร้าน', 'Shop')} value={<T size={13.5} w={600}>{lic.shop} · <Mono>{lic.route}</Mono></T>} />
            <KV label={t('เครื่องที่ใช้', 'Devices')} value={`${lic.machines}/${lic.maxMachines}`} />
            <KV label={t('อายุคงเหลือ', 'Time left')} value={lic.expiresAt ? t(`${left} วัน · ถึง ${dShort(lic.expiresAt, lang)}`, `${left} days · until ${dShort(lic.expiresAt, lang)}`) : t('ไม่มีวันหมดอายุ', 'No expiry')} />
            <View style={{ height: 8, borderRadius: 99, backgroundColor: c.surface2, overflow: 'hidden', marginVertical: 6 }}>
              <View style={{ height: '100%', width: `${lic.expiresAt && left != null ? Math.max(3, Math.min(100, (left / Math.max(left, 60)) * 100)) : 100}%`, backgroundColor: near ? c.warn : c.good, borderRadius: 99 }} />
            </View>
            <KV label={t('ระบบ License', 'License server')} value={<Mono>{conn.licenseServer.replace(/^https?:\/\//, '')}</Mono>} />
          </>
        ) : (
          <KV label={t('เซิร์ฟเวอร์', 'Server')} value={<Mono>{conn.directUrl}</Mono>} />
        )}
        <Muted style={{ marginTop: 6, lineHeight: 20 }}>
          {t('ใช้ License เดียวกับโปรแกรม POS (.exe) แอพนี้นับเป็น 1 เครื่อง · ลบเครื่องออกได้ที่แผงควบคุม License',
            'Same license as the POS program (.exe). This app counts as 1 device; remove it in the License control panel.')}
        </Muted>
      </Panel>
    </View>
  );
}

const CATALOG: { g: [string, string]; items: [string, string, [string, string]][] }[] = [
  { g: ['ยอดขายและบิล', 'Sales & bills'], items: [
    ['GET', '/api/dashboard?from=&to=&branch=', ['สรุปยอดขาย กำไร ช่องทางชำระ สินค้า หมวด ไซซ์/สี พนักงาน รายชั่วโมง', 'Summary, profit, payments, products, categories, sizes/colours, staff, hourly']],
    ['GET', '/api/history?from=&to=&q=&status=', ['บิลทุกใบ ค้นหา และกรองสถานะ', 'Every bill, search and status filter']],
    ['GET', '/api/orders/{id}', ['ใบเสร็จ 1 บิล (สินค้า ส่วนลด VAT การแก้ไข)', 'One receipt (items, discount, VAT, edits)']],
  ] },
  { g: ['สินค้าคงคลัง', 'Inventory'], items: [
    ['GET', '/api/stock/skus?q=&status=&page=', ['สต็อกตามสี/ไซซ์ ใกล้หมด หมด', 'Stock by colour/size, low, out']],
    ['GET', '/api/shipments', ['ใบส่งของจากโรงงาน', 'Factory delivery notes']],
  ] },
  { g: ['ร้านและพนักงาน', 'Store & staff'], items: [
    ['GET', '/api/shifts?from=&to=', ['กะการขาย / เงินในลิ้นชัก', 'Shifts and cash drawer']],
    ['GET', '/api/expenses?from=&to=&branch=all', ['ค่าใช้จ่ายในร้าน', 'Store expenses']],
    ['GET', '/api/branches', ['สาขาที่เข้าได้', 'Branches you can access']],
    ['POST', '/api/branches/switch', ['สลับสาขาของ session (ดูบิล/กะ/สต็อกของสาขานั้น)', 'Switch the session branch (bills/shifts/stock)']],
  ] },
  { g: ['เข้าสู่ระบบ', 'Sign-in'], items: [
    ['POST', '<license>/api/activate', ['กรอก License → ที่อยู่ร้าน + ชื่อย่อร้าน', 'Enter license → shop address + route']],
    ['POST', '<license>/api/check', ['ตรวจ License ทุกครั้งที่เปิดแอป', 'License check on every launch']],
    ['POST', '/api/auth/login', ['PIN พนักงาน → token', 'Staff PIN → token']],
  ] },
];

function ApiView() {
  const c = useC();
  const { t } = useLang();
  const { setSub, me, toast } = useApp();
  const used = CATALOG.reduce((a, g) => a + g.items.length, 0);
  const prov = (name: string, sub: string, on: boolean, code: string) => (
    <Pressable key={code} onPress={() => (on ? null : toast(t('ยังไม่รองรับผู้ให้บริการนี้ในเวอร์ชันนี้', 'This provider is not supported in this version yet')))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line, opacity: on ? 1 : 0.6 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accent : c.surface2 }}>
        <T size={12} w={700} color={on ? c.accentInk : c.muted}>{code}</T>
      </View>
      <View style={{ flex: 1 }}>
        <T size={14.5} w={600}>{name}</T>
        <Muted size={12}>{sub}</Muted>
      </View>
      {on ? <Icon name="check" size={22} color={c.accent} width={2.4} /> : <Tag kind="mute">{t('เร็วๆ นี้', 'Soon')}</Tag>}
    </Pressable>
  );
  return (
    <View>
      <SubHeader title={t('ตั้งค่า API', 'API settings')} onBack={() => setSub(null)} />
      <Panel>
        <PanelTitle sub={t('แอปอ่านข้อมูลจาก API ของผู้ให้บริการ POS ที่เลือก', 'The app reads data from the selected POS provider\'s API')}>{t('แหล่งข้อมูล', 'Data source')}</PanelTitle>
        {prov(t('API ของเราเอง', 'Our own API'), 'Clothing POS · ' + (shopBase().replace(/^https?:\/\//, '') || '—'), true, 'OWN')}
        {prov('POSPOS', 'POSPOS Developer API · go.pospos.co', false, 'PP')}
        {prov('Wongnai POS', t('ต้องขอสิทธิ์ API จาก Wongnai', 'API access requested from Wongnai'), false, 'WN')}
      </Panel>
      <Gap />
      <Panel>
        <PanelTitle>{t('การเชื่อมต่อ', 'Connection')}</PanelTitle>
        <KV label="Base URL" value={<Mono>{shopBase() || '—'}</Mono>} />
        {conn.license && !conn.directUrl ? <KV label="X-POS-Shop" value={<Mono>{conn.license.route}</Mono>} /> : null}
        <KV label={t('ยืนยันตัวตน', 'Auth')} value={<Mono>Authorization: Bearer ••••</Mono>} />
        <KV label={t('เข้าระบบโดย', 'Signed in as')} value={`${me.name} · ${t(...(ROLE[me.role] ?? [me.role, me.role]))}`} />
        <KV label={t('สิทธิ์รายงาน', 'Reports access')} value={me.perms.reports === 'none' ? t('ไม่มี', 'None') : me.perms.reports === 'edit' ? t('เต็ม', 'Full') : t('ดูอย่างเดียว', 'View only')} />
        <KV label={t('รหัสเครื่อง', 'Device ID')} value={<Mono>{conn.machineId.slice(0, 14)}…</Mono>} />
      </Panel>
      <Gap />
      <Panel>
        <PanelTitle sub={t(`${used} รายการ · แอปอ่านอย่างเดียว ไม่แก้ข้อมูลใน POS`, `${used} endpoints · read-only, never changes POS data`)}>{t('API ที่ Clothing POS เปิดให้เข้าถึง', 'APIs Clothing POS opens')}</PanelTitle>
        {CATALOG.map((g) => (
          <View key={g.g[0]}>
            <DayHead>{t(...g.g)}</DayHead>
            {g.items.map(([m, p, d], i) => (
              <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: i === g.items.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
                <View style={{ backgroundColor: m === 'GET' ? c.goodSoft : c.accentSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginTop: 1 }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, fontWeight: '700', color: m === 'GET' ? c.good : c.accent }}>{m}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Mono>{p}</Mono>
                  <Muted size={12}>{t(...d)}</Muted>
                </View>
              </View>
            ))}
          </View>
        ))}
        <MoreBtn label={t('ทดสอบการเชื่อมต่อ', 'Test connection')} onPress={async () => {
          const t0 = Date.now();
          try {
            await api.me();
            toast(t(`เชื่อมต่อ POS ได้ปกติ (${Date.now() - t0} ms)`, `POS connection OK (${Date.now() - t0} ms)`));
          } catch (e) {
            toast((e as Error).message);
          }
        }} />
      </Panel>
    </View>
  );
}

function Mono({ children }: { children: ReactNode }) {
  const c = useC();
  return <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.fg, textAlign: 'right' }}>{children}</Text>;
}
