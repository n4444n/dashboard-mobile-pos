// ส่วนหัวของแอป (โลโก้ ภาษา กระดิ่ง) + แถบเมนูล่าง (มีปุ่มซิงค์ตรงกลาง) + ข้อความแจ้ง (toast)
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../i18n';
import { useApp, type Tab } from '../state';
import { alpha, shadow, useC } from '../theme';
import { Icon, type IconName } from './Icon';
import { IconBtn, T } from './ui';

export function TopHeader() {
  const c = useC();
  const { t, lang } = useLang();
  const { shopName, branches, unread, openSheet, go } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 18 }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="hanger" size={22} color={c.accentInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T display w={700} size={20} lh={23}>Tally</T>
        <T size={12} color={c.muted} numberOfLines={1}>{shopName} · {t(`${branches.length} สาขา`, `${branches.length} ${branches.length === 1 ? 'branch' : 'branches'}`)}</T>
      </View>
      <Pressable onPress={() => openSheet({ kind: 'lang' })} accessibilityRole="button" accessibilityLabel={`Language / ภาษา: ${lang === 'th' ? 'ไทย' : 'English'}`}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingLeft: 13, paddingRight: 16, borderRadius: 99, backgroundColor: c.surface }, shadow(c)]}>
        <Icon name="globe" size={22} color={c.accent} />
        <T size={15} w={700}>{lang === 'th' ? 'TH' : 'EN'}</T>
      </Pressable>
      <IconBtn icon="bell" label={t(`การแจ้งเตือน ${unread} รายการใหม่`, `Notifications, ${unread} new`)} badge={unread} onPress={() => go('activity')} />
    </View>
  );
}

export function BottomNav() {
  const c = useC();
  const { t } = useLang();
  const ins = useSafeAreaInsets();
  const { tab, report, sub, go, sync, syncing } = useApp();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!syncing) return;
    spin.setValue(0);
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [syncing, spin]);
  const item = (id: Tab, icon: IconName, label: string) => {
    const on = tab === id && !report && !(id === 'settings' && sub);
    return (
      <Pressable key={id} onPress={() => go(id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8 }}>
        <Icon name={icon} size={22} color={on ? c.accent : c.muted} />
        <T size={11} w={on ? 600 : 400} color={on ? c.accent : c.muted}>{label}</T>
      </Pressable>
    );
  };
  return (
    <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: ins.bottom, flexDirection: 'row', alignItems: 'center', minHeight: 68 + ins.bottom }, shadow(c)]}>
      {item('home', 'home', t('หน้าหลัก', 'Home'))}
      {item('reports', 'chart', t('รายงาน', 'Reports'))}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable onPress={sync} disabled={syncing} accessibilityRole="button" accessibilityLabel={t('ดึงข้อมูลล่าสุดจาก POS', 'Fetch latest from POS')}
          style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginTop: -34, shadowColor: c.accent, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
          <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
            <Icon name="sync" size={26} color={c.accentInk} />
          </Animated.View>
        </Pressable>
      </View>
      {item('stock', 'box', t('สต็อก', 'Stock'))}
      {item('settings', 'gear', t('การตั้งค่า', 'Settings'))}
    </View>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  const c = useC();
  const ins = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 96 + ins.bottom, alignItems: 'center' }}>
      <View style={{ backgroundColor: c.fg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, maxWidth: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}>
        <T size={13} color={c.bg} style={{ textAlign: 'center' }}>{msg}</T>
      </View>
    </View>
  );
}

/** จุดเขียว "ออนไลน์" ข้างเวลาซิงค์ล่าสุด */
export function LiveDot() {
  const c = useC();
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.good, shadowColor: c.good, shadowOpacity: 0.5, shadowRadius: 4, borderWidth: 2, borderColor: alpha(c.good, 0.25) }} />;
}
