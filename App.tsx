// โครงแอปหลัก: License → PIN → หน้าหลัก/รายงาน/สต็อก/ตั้งค่า (แถบเมนูล่าง + ปุ่มซิงค์)
import { IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-thai';
import { Prompt_500Medium, Prompt_600SemiBold, Prompt_700Bold } from '@expo-google-fonts/prompt';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, RefreshControl, ScrollView, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { loadActivity } from './src/activity';
import { api, conn, license, loadConn, onApiEvents, saveConn, setSessionBranch } from './src/api';
import { BottomNav, Toast } from './src/components/Chrome';
import { Sheets } from './src/components/Sheets';
import { isoLocal, stamp } from './src/format';
import { LangProvider, useLang } from './src/i18n';
import type { Period } from './src/period';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LicenseScreen, PinScreen } from './src/screens/LoginScreen';
import { ReportScreen, ReportsScreen } from './src/screens/ReportsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StockScreen } from './src/screens/StockScreen';
import { AppCtx, type AppState, type BranchSel, type SheetState, type Sub, type Tab } from './src/state';
import { store } from './src/storage';
import { dark, light, ThemeContext, useC } from './src/theme';
import type { Branch, Me } from './src/types';

export default function App() {
  const scheme = useColorScheme();
  const pal = scheme === 'dark' ? dark : light;
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold,
    Prompt_500Medium, Prompt_600SemiBold, Prompt_700Bold,
  });
  // ฟอนต์โหลดไม่ได้ (ออฟไลน์) → ใช้ฟอนต์ระบบแทน ไม่ค้างหน้าโหลด
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(h);
  }, []);
  const ready = fontsLoaded || !!fontError || fontTimeout;
  return (
    <ThemeContext.Provider value={pal}>
      <LangProvider>
        <SafeAreaProvider>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: pal.bg }}>
            <StatusBar style={pal.dark ? 'light' : 'dark'} />
            {ready ? <Gate /> : <Splash />}
          </SafeAreaView>
        </SafeAreaProvider>
      </LangProvider>
    </ThemeContext.Provider>
  );
}

function Splash() {
  const c = useC();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={c.accent} />
    </View>
  );
}

/** เลือกหน้า: เปิดแอป → License → PIN → แอป */
function Gate() {
  const { lang, setLang } = useLang();
  const [stage, setStage] = useState<'boot' | 'license' | 'pin' | 'app'>('boot');
  const [me, setMe] = useState<Me | null>(null);
  const [reason, setReason] = useState('');
  const toggleLang = () => setLang(lang === 'th' ? 'en' : 'th');

  useEffect(() => {
    onApiEvents({
      onAuthExpired: () => { conn.token = null; saveConn(); setMe(null); setStage('pin'); },
      onLicenseBlocked: (msg) => { conn.token = null; saveConn(); setMe(null); setReason(msg); setStage('license'); },
    });
    (async () => {
      await loadConn();
      if (!conn.license && !conn.directUrl) return setStage('license');
      // ตรวจ license ทุกครั้งที่เปิดแอป (หมดอายุ/ถูกระงับ → กลับหน้า license · เน็ตหลุด = ใช้ต่อ)
      if (conn.license && !conn.directUrl) {
        try {
          const r = await license.check(conn.license.code);
          conn.license = { ...conn.license, ...r, code: conn.license.code };
          await saveConn();
        } catch (e) {
          if (license.isBlocking(e)) {
            setReason((e as Error).message);
            return setStage('license');
          }
        }
      }
      if (!conn.token) return setStage('pin');
      try {
        setMe(await api.me());
        setStage('app');
      } catch {
        setStage('pin');
      }
    })();
  }, []);

  if (stage === 'boot') return <Splash />;
  if (stage === 'license') return <LicenseScreen reason={reason} onLang={toggleLang} onDone={() => { setReason(''); setStage('pin'); }} />;
  if (stage === 'pin' || !me) {
    return (
      <PinScreen onLang={toggleLang} onLogin={(m) => { setMe(m); setStage('app'); }}
        onChangeLicense={async () => { conn.directUrl = ''; conn.token = null; await saveConn(); setStage('license'); }} />
    );
  }
  return (
    <Main key={me.id} me={me} onLogout={async () => {
      await api.logout().catch(() => {});
      conn.token = null;
      conn.license = null;
      conn.directUrl = '';
      await saveConn();
      setMe(null);
      setStage('license');
    }} />
  );
}

function Main({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const c = useC();
  const { t } = useLang();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shopName, setShopName] = useState(conn.license?.shop ?? '');
  const [branch, setBranch] = useState<BranchSel>('all');
  const [period, setPeriod] = useState<Period>('today');
  const [hide, setHide] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [tab, setTab] = useState<Tab>('home');
  const [report, setReport] = useState<string | null>(null);
  const [from, setFrom] = useState<Tab>('home');
  const [sub, setSub] = useState<Sub>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [seen, setSeen] = useState('');
  const [unread, setUnread] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // สาขาที่เข้าได้ + ชื่อร้าน + เวลาที่เปิดดูกิจกรรมล่าสุด
  useEffect(() => {
    setSessionBranch(me.branchId);
    api.branches().then(
      (r) => {
        const list = r.list.length ? r.list : [{ id: me.branchId, name: conn.license?.shop ?? 'POS', code: 'MAIN', isMain: true }];
        setBranches(list);
        if (list.length === 1) setBranch(list[0].id);
      },
      // อ่านรายชื่อสาขาไม่ได้ → ใช้สาขาของ session อย่างเดียว
      () => { setBranches([{ id: me.branchId, name: conn.license?.shop ?? 'POS', code: 'MAIN', isMain: true }]); setBranch(me.branchId); },
    );
    if (!shopName) api.authConfig().then((r) => setShopName(r.shop.name)).catch(() => {});
    store.get<string>('seen', '').then(setSeen);
    store.get<boolean>('hide', false).then(setHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  // จำนวนกิจกรรมใหม่ (ป้ายบนกระดิ่ง) — นับใหม่ทุกครั้งที่ซิงค์
  useEffect(() => {
    if (!branches.length || tab === 'activity') return;
    let live = true;
    loadActivity(me, branches, t, c)
      .then((ev) => live && setUnread(ev.filter((e) => stamp(e.at) > seen).length))
      .catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, refreshKey, seen]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    // ให้ทุกหน้าเริ่มโหลดก่อน แล้วหยุดหมุนเมื่อเซิร์ฟเวอร์ตอบ
    try {
      await api.me();
      setLastSync(new Date());
      toast(t('อัปเดตข้อมูลล่าสุดจาก POS แล้ว', 'Latest data received from POS'));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setTimeout(() => setSyncing(false), 600);
    }
  }, [t, toast]);

  const go = useCallback((x: Tab) => {
    if (x === 'activity') setFrom((f) => (tab === 'activity' ? f : tab));
    setTab(x);
    setReport(null);
    setSub(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  const openReport = useCallback((id: string, b?: BranchSel) => {
    if (b !== undefined) setBranch(b);
    setReport(id);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const back = useCallback(() => {
    if (sheet) { setSheet(null); return true; }
    if (report) { setReport(null); return true; }
    if (sub) { setSub(null); return true; }
    if (tab === 'activity') { setTab(from === 'activity' ? 'home' : from); return true; }
    if (tab !== 'home') { setTab('home'); return true; }
    return false;
  }, [sheet, report, sub, tab, from]);

  // ปุ่มย้อนกลับของ Android
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', back);
    return () => h.remove();
  }, [back]);

  const branchName = useCallback((id: BranchSel | undefined | null) => {
    if (id === 'all' || id == null) return t('ทุกสาขา', 'All branches');
    return branches.find((b) => b.id === id)?.name ?? `#${id}`;
  }, [branches, t]);

  const state: AppState = useMemo(() => ({
    me, shopName, branches, branchName, branch, setBranch, period, setPeriod,
    hide, setHide: (v: boolean) => { setHide(v); store.set('hide', v); },
    refreshKey, sync, syncing, lastSync,
    tab, go, report, openReport, sub, setSub, back,
    sheet, openSheet: setSheet, toast,
    seen, markSeen: () => { const s = isoLocal(new Date()); setSeen(s); store.set('seen', s); }, unread, setUnread,
    logout: onLogout,
  }), [me, shopName, branches, branchName, branch, period, hide, refreshKey, sync, syncing, lastSync, tab, go, report, openReport, sub, back, sheet, toast, seen, unread, onLogout]);

  let page;
  if (report) page = <ReportScreen key={report} id={report} />;
  else if (tab === 'home') page = <HomeScreen />;
  else if (tab === 'reports') page = <ReportsScreen />;
  else if (tab === 'stock') page = <StockScreen />;
  else if (tab === 'activity') page = <ActivityScreen />;
  else page = <SettingsScreen />;

  return (
    <AppCtx.Provider value={state}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={sync} tintColor={c.accent} colors={[c.accent]} />}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 120, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {branches.length ? page : <View style={{ paddingTop: 120 }}><ActivityIndicator color={c.accent} /></View>}
        </ScrollView>
        <BottomNav />
        <Toast msg={msg} />
        <Sheets />
      </View>
    </AppCtx.Provider>
  );
}
