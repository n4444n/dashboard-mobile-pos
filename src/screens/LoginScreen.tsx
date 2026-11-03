// เข้าสู่ระบบ 2 ขั้น: (1) กรอก License (เหมือนโปรแกรม POS .exe)  (2) PIN พนักงานที่มีสิทธิ์ดูรายงาน
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { api, conn, DEFAULT_LICENSE_SERVER, license, saveConn } from '../api';
import { Icon } from '../components/Icon';
import { Input, Muted, PrimaryBtn, Sheet, SheetTitle, T } from '../components/ui';
import { useLang } from '../i18n';
import { shadow, useC } from '../theme';
import type { Me } from '../types';

const KEY_LEN = 13;
/** POS-XXXX-XXXX (พิมพ์เล็ก/ขีด/ช่องว่างได้) */
export function fmtKey(v: string) {
  let s = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  while (s.startsWith('POS')) s = s.slice(3);
  s = s.slice(0, 8);
  return s ? 'POS-' + s.slice(0, 4) + (s.length > 4 ? '-' + s.slice(4) : '') : '';
}

function Shell({ children, onLang }: { children: ReactNode; onLang: () => void }) {
  const c = useC();
  const { lang } = useLang();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingBottom: 30, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'flex-end', paddingTop: 10 }}>
          <Pressable onPress={onLang} accessibilityRole="button" accessibilityLabel="Language / ภาษา"
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingLeft: 13, paddingRight: 16, borderRadius: 99, backgroundColor: c.surface }, shadow(c)]}>
            <Icon name="globe" size={22} color={c.accent} />
            <T size={15} w={700}>{lang === 'th' ? 'TH' : 'EN'}</T>
          </Pressable>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Hero({ sub }: { sub: string }) {
  const c = useC();
  return (
    <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 34 }}>
      <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="hanger" size={34} color={c.accentInk} />
      </View>
      <T display w={700} size={28}>Tally</T>
      <T size={14} color={c.muted} style={{ textAlign: 'center', marginTop: 4 }}>{sub}</T>
    </View>
  );
}

// ---------------------------------------------------------------- 1) License
export function LicenseScreen({ onDone, onLang, reason }: { onDone: () => void; onLang: () => void; reason?: string }) {
  const c = useC();
  const { t } = useLang();
  const [key, setKey] = useState(conn.license?.code ?? '');
  const [err, setErr] = useState(reason ?? '');
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState(false);
  const ok = key.length === KEY_LEN;
  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await license.activate(key);
      conn.license = { ...r, code: r.code || key };
      conn.directUrl = '';
      conn.token = null;
      await saveConn();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell onLang={onLang}>
      <Hero sub={t('รายงานยอดขายจาก POS ของร้านคุณ', 'Sales reports from your store\'s POS')} />
      <T size={14} w={600} style={{ marginBottom: 8 }}>License</T>
      <Input value={key} onChangeText={(v) => { setKey(fmtKey(v)); if (err) setErr(''); }} placeholder="POS-XXXX-XXXX" autoCapitalize="characters" autoCorrect={false}
        maxLength={KEY_LEN} invalid={!!err} onSubmitEditing={submit} returnKeyType="go"
        style={{ height: 56, fontSize: 19, letterSpacing: 3, textAlign: 'center', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }} />
      {err ? <T size={13} color={c.bad} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">{err}</T> : null}
      <Muted size={13} style={{ marginTop: 12, lineHeight: 20 }}>
        {t('ใช้ License เดียวกับโปรแกรม POS ของร้าน ดูได้จากแผงควบคุม License หรือถามผู้ดูแลร้าน', 'Use the same license as your store\'s POS program. Find it in the License control panel or ask your store admin.')}
      </Muted>
      <PrimaryBtn label={busy ? t('กำลังตรวจสอบ…', 'Checking…') : t('ถัดไป', 'Next')} onPress={submit} disabled={!ok} busy={busy} />
      <Pressable onPress={() => setServer(true)} style={{ alignSelf: 'center', marginTop: 18, padding: 6 }}>
        <T size={13.5} w={600} color={c.accent}>{t('ตั้งค่าเซิร์ฟเวอร์', 'Server settings')}</T>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Muted size={12} style={{ textAlign: 'center', marginTop: 24 }}>
        {t(`ตรวจสอบ License กับ ${conn.licenseServer.replace(/^https?:\/\//, '')} · แอพนี้นับเป็น 1 เครื่อง`, `License checked with ${conn.licenseServer.replace(/^https?:\/\//, '')} · this app counts as 1 device`)}
      </Muted>
      <ServerSheet visible={server} onClose={() => setServer(false)} onDirect={onDone} />
    </Shell>
  );
}

/** ตั้งที่อยู่เซิร์ฟเวอร์ license / ต่อเซิร์ฟเวอร์ POS ตรง (ทดสอบในเครื่อง) */
function ServerSheet({ visible, onClose, onDirect }: { visible: boolean; onClose: () => void; onDirect: () => void }) {
  const c = useC();
  const { t } = useLang();
  const [lic, setLic] = useState(conn.licenseServer);
  const [direct, setDirect] = useState(conn.directUrl);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (visible) { setLic(conn.licenseServer); setDirect(conn.directUrl); setErr(''); }
  }, [visible]);
  const url = (v: string) => /^https?:\/\/[^\s/]+/i.test(v.trim());
  const save = async () => {
    if (lic && !url(lic)) return setErr(t('ที่อยู่ต้องขึ้นต้นด้วย http:// หรือ https://', 'Address must start with http:// or https://'));
    if (direct && !url(direct)) return setErr(t('ที่อยู่ต้องขึ้นต้นด้วย http:// หรือ https://', 'Address must start with http:// or https://'));
    conn.licenseServer = lic.trim().replace(/\/+$/, '') || DEFAULT_LICENSE_SERVER;
    conn.directUrl = direct.trim().replace(/\/+$/, '');
    if (conn.directUrl) conn.token = null;
    await saveConn();
    onClose();
    if (conn.directUrl) onDirect();
  };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetTitle>{t('ตั้งค่าเซิร์ฟเวอร์', 'Server settings')}</SheetTitle>
      <T size={13.5} w={600} style={{ marginBottom: 6 }}>{t('เซิร์ฟเวอร์ License', 'License server')}</T>
      <Input value={lic} onChangeText={setLic} placeholder={DEFAULT_LICENSE_SERVER} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      <Muted size={12} style={{ marginTop: 6, marginBottom: 16 }}>{t('ใช้งานจริง: https://pos.sh0p.tech · ทดสอบในเครื่อง (run-test.bat): http://<IP เครื่อง PC>:3100', 'Production: https://pos.sh0p.tech · local test (run-test.bat): http://<PC IP>:3100')}</Muted>
      <T size={13.5} w={600} style={{ marginBottom: 6 }}>{t('ต่อเซิร์ฟเวอร์ POS ตรง (โหมดทดสอบ)', 'Direct POS server (test mode)')}</T>
      <Input value={direct} onChangeText={setDirect} placeholder="http://192.168.1.20:3000" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      <Muted size={12} style={{ marginTop: 6 }}>{t('เว้นว่าง = ใช้ License ตามปกติ · ใส่ที่อยู่ = ข้าม License แล้วเข้าหน้า PIN ของเซิร์ฟเวอร์นี้ทันที', 'Leave empty to use the license. Fill in to skip the license and go straight to this server\'s PIN screen.')}</Muted>
      {err ? <T size={13} color={c.bad} style={{ marginTop: 10 }}>{err}</T> : null}
      <PrimaryBtn label={t('บันทึก', 'Save')} onPress={save} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- 2) PIN
export function PinScreen({ onLogin, onChangeLicense, onLang }: { onLogin: (me: Me) => void; onChangeLicense: () => void; onLang: () => void }) {
  const c = useC();
  const { t } = useLang();
  const [pin, setPin] = useState('');
  const [len, setLen] = useState(6);
  const [shop, setShop] = useState(conn.license?.shop ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.authConfig().then((r) => { setLen(r.pinLength || 6); if (r.shop?.name) setShop(r.shop.name); }).catch((e: Error) => setErr(e.message));
  }, []);
  const submit = async (p = pin) => {
    if (p.length < 4 || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.login(p);
      if (r.staff.perms?.reports === 'none') {
        conn.token = r.token;
        await api.logout().catch(() => {});
        conn.token = null;
        setErr(t(`${r.staff.name} ไม่มีสิทธิ์ดูรายงาน — ใช้ PIN ผู้จัดการหรือผู้ดูแลระบบ`, `${r.staff.name} cannot view reports — use a manager or admin PIN`));
        setPin('');
        return;
      }
      conn.token = r.token;
      await saveConn();
      onLogin(r.staff);
    } catch (e) {
      setErr((e as Error).message);
      setPin('');
    } finally {
      setBusy(false);
    }
  };
  const fresh = conn.license?.created && conn.license.managerPin;
  return (
    <Shell onLang={onLang}>
      <Hero sub={shop || t('เข้าสู่ระบบร้าน', 'Sign in to your shop')} />
      <T size={14} w={600} style={{ marginBottom: 8 }}>{t('PIN พนักงาน', 'Staff PIN')}</T>
      <Input value={pin} onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, len); setPin(d); if (err) setErr(''); if (d.length === len) submit(d); }}
        placeholder={'•'.repeat(len)} keyboardType="number-pad" secureTextEntry maxLength={len} invalid={!!err} onSubmitEditing={() => submit()}
        style={{ height: 56, fontSize: 22, letterSpacing: 8, textAlign: 'center' }} />
      {err ? <T size={13} color={c.bad} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">{err}</T> : null}
      {fresh ? (
        <View style={{ backgroundColor: c.accentSoft, borderRadius: 14, padding: 12, marginTop: 12 }}>
          <T size={13} w={600}>{t(`ร้านเปิดใหม่ · PIN ผู้จัดการเริ่มต้น: ${conn.license?.managerPin}`, `New shop · default manager PIN: ${conn.license?.managerPin}`)}</T>
          <Muted size={12}>{t('เปลี่ยน PIN ได้ที่ POS › พนักงาน', 'Change it in POS › Staff')}</Muted>
        </View>
      ) : null}
      <Muted size={13} style={{ marginTop: 12, lineHeight: 20 }}>
        {t('ใช้ PIN เดียวกับที่เข้าเครื่อง POS · ต้องเป็นพนักงานที่มีสิทธิ์ "รายงาน" (ผู้จัดการ/ผู้ดูแลระบบ)', 'Use the same PIN as on the POS. The staff member needs "Reports" access (manager/admin).')}
      </Muted>
      <PrimaryBtn label={busy ? t('กำลังเข้าสู่ระบบ…', 'Signing in…') : t('เข้าสู่ระบบ', 'Sign in')} onPress={() => submit()} disabled={pin.length < 4} busy={busy} />
      <Pressable onPress={onChangeLicense} style={{ alignSelf: 'center', marginTop: 18, padding: 6 }}>
        <T size={13.5} w={600} color={c.accent}>{conn.directUrl ? t('เปลี่ยนเซิร์ฟเวอร์', 'Change server') : t('เปลี่ยน License', 'Change license')}</T>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Muted size={12} style={{ textAlign: 'center', marginTop: 24 }}>
        {conn.directUrl ? t(`โหมดทดสอบ · ${conn.directUrl}`, `Test mode · ${conn.directUrl}`) : `License POS-••••-${conn.license?.code.slice(-4) ?? ''}`}
      </Muted>
    </Shell>
  );
}
