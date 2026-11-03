// ชิ้นส่วนหน้าจอที่ใช้ซ้ำ (แผง การ์ดตัวเลข ชิป ป้าย ตาราง แผ่นเลื่อนขึ้น ฯลฯ) — ตาม class ในไฟล์แบบ
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pctChange } from '../format';
import { useT } from '../i18n';
import { PERIODS, periodLabel, type Period } from '../period';
import { F, alpha, shadow, useC } from '../theme';
import { Icon, type IconName } from './Icon';

// ---------------------------------------------------------------- ตัวอักษร
type W = 400 | 500 | 600 | 700;
export function T({
  children, size = 14, w = 400, display, color, style, lh, ...rest
}: TextProps & { size?: number; w?: W; display?: boolean; color?: string; lh?: number; style?: StyleProp<TextStyle> }) {
  const c = useC();
  const fontFamily = display
    ? w >= 700 ? F.display700 : w >= 600 ? F.display600 : F.display500
    : w >= 600 ? F.body600 : w >= 500 ? F.body500 : F.body;
  return (
    <Text {...rest} style={[{ fontFamily, fontSize: size, color: color ?? c.fg, lineHeight: lh ?? Math.round(size * (display ? 1.3 : 1.5)) }, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- แผง / การ์ด
export function Panel({ children, tight, style }: { children: ReactNode; tight?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useC();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 20, padding: tight ? 0 : 16, paddingHorizontal: tight ? 14 : 16, paddingVertical: tight ? 2 : 16 }, shadow(c), style]}>
      {children}
    </View>
  );
}
export function PanelTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  const c = useC();
  return (
    <View style={{ marginBottom: 10 }}>
      <T size={14.5} w={600}>{children}</T>
      {sub ? <T size={12.5} color={c.muted} style={{ marginTop: 2 }}>{sub}</T> : null}
    </View>
  );
}
export const Gap = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;

/** การ์ดตัวเลข (KPI) */
export function Kpi({ icon, label, value, foot, wide, style }: { icon: IconName; label: string; value: string; foot?: ReactNode; wide?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useC();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 18, padding: 14, minWidth: 0 }, wide ? { width: '100%' } : { flexBasis: '47%', flexGrow: 1 }, shadow(c), style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={15} color={c.muted} />
        <T size={12.5} color={c.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</T>
      </View>
      <T display w={600} size={20} style={{ marginVertical: 4 }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      {foot}
    </View>
  );
}
export const KpiGrid = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>;

/** ▲ 12.3% / ▼ 4.0% เทียบช่วงก่อน (invert = ลดลงคือดี เช่น ส่วนลด) */
export function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  const c = useC();
  const t = useT();
  const v = pctChange(cur, prev);
  if (v === null) {
    if (!cur) return null;
    return <Pill bg={c.goodSoft} fg={c.good} text={t('ใหม่', 'New')} />;
  }
  const up = v >= 0;
  const good = invert ? !up : up;
  return <Pill bg={good ? c.goodSoft : c.badSoft} fg={good ? c.good : c.bad} text={`${up ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}%`} />;
}
function Pill({ bg, fg, text }: { bg: string; fg: string; text: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 1 }}>
      <T size={12} w={600} color={fg}>{text}</T>
    </View>
  );
}
export function Muted({ children, size = 12.5, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useC();
  return <T size={size} color={c.muted} style={style}>{children}</T>;
}

/** ป้ายสถานะ */
export function Tag({ kind, children }: { kind: 'good' | 'bad' | 'warn' | 'mute' | 'accent'; children: ReactNode }) {
  const c = useC();
  const m = { good: [c.goodSoft, c.good], bad: [c.badSoft, c.bad], warn: [c.warnSoft, c.warn], mute: [c.surface2, c.muted], accent: [c.accentSoft, c.accent] }[kind];
  return (
    <View style={{ backgroundColor: m[0], borderRadius: 99, paddingHorizontal: 8, paddingVertical: 1, alignSelf: 'flex-start' }}>
      <T size={11.5} w={600} color={m[1]} numberOfLines={1}>{children}</T>
    </View>
  );
}

// ---------------------------------------------------------------- ชิป
export function Chip({ label, on, onPress, count }: { label: string; on?: boolean; onPress: () => void; count?: number }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 99, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line, flexDirection: 'row', gap: 6, alignItems: 'center' }}
    >
      <T size={13} w={500} color={on ? c.accentInk : c.muted}>{label}</T>
      {count !== undefined ? <T size={11} w={600} color={on ? alpha('#FFFFFF', 0.8) : c.muted}>{count}</T> : null}
    </Pressable>
  );
}
export function Chips({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={{ gap: 8, padding: 2 }}>
      {children}
    </ScrollView>
  );
}
export function PeriodChips({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const t = useT();
  return (
    <Chips>
      {PERIODS.map((p) => <Chip key={p} label={periodLabel(p, t)} on={value === p} onPress={() => onChange(p)} />)}
    </Chips>
  );
}

// ---------------------------------------------------------------- ปุ่ม / ช่องกรอก
export function IconBtn({ icon, onPress, label, badge, size = 48 }: { icon: IconName; onPress: () => void; label: string; badge?: number; size?: number }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityRole="button" hitSlop={4}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, shadow(c)]}>
      <Icon name={icon} size={22} color={c.fg} />
      {badge ? (
        <View style={{ position: 'absolute', top: 2, right: 0, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 99, backgroundColor: c.bad, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <T size={10} w={700} color="#fff" lh={12}>{badge > 99 ? '99+' : badge}</T>
        </View>
      ) : null}
    </Pressable>
  );
}
export function Link({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
      <T size={13.5} w={600} color={c.accent}>{children}</T>
    </Pressable>
  );
}
export function MoreBtn({ label, onPress, color, bg, disabled }: { label: string; onPress: () => void; color?: string; bg?: string; disabled?: boolean }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => ({ marginTop: 10, padding: 11, borderRadius: 12, backgroundColor: bg ?? c.surface2, alignItems: 'center', opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}>
      <T size={14} w={600} color={color ?? c.accent}>{label}</T>
    </Pressable>
  );
}
export function PrimaryBtn({ label, onPress, disabled, busy, danger }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; danger?: boolean }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button"
      style={({ pressed }) => ({ marginTop: 14, height: 50, borderRadius: 14, backgroundColor: danger ? c.bad : c.accent, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 })}>
      {busy ? <ActivityIndicator color="#fff" size="small" /> : null}
      <T size={15} w={600} color="#fff">{label}</T>
    </Pressable>
  );
}
export function Input(props: ComponentProps<typeof TextInput> & { invalid?: boolean }) {
  const c = useC();
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...rest}
      style={[{ borderWidth: 1, borderColor: invalid ? c.bad : c.line, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.fg, fontFamily: F.body }, style]}
    />
  );
}
/** ตัวเลือกแบบ select (กดแล้วเปิดแผ่นเลือก) */
export function SelectBox({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: 12, paddingVertical: 9, paddingLeft: 12, paddingRight: 12, flexDirection: 'row', alignItems: 'center' }}>
      <T size={13.5} style={{ flex: 1 }} numberOfLines={1}>{label}</T>
      <Icon name="down" size={14} color={c.muted} width={2.5} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- แถวข้อมูล
export function KV({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
      {typeof label === 'string' ? <T size={13.5} color={strong ? c.fg : c.muted} w={strong ? 600 : 400}>{label}</T> : label}
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
        {typeof value === 'string' ? <T size={13.5} w={600} style={{ textAlign: 'right' }}>{value}</T> : value}
      </View>
    </View>
  );
}
export function Empty({ text, icon }: { text: string; icon?: IconName }) {
  const c = useC();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 22, gap: 8 }}>
      {icon ? <Icon name={icon} size={26} color={c.muted} /> : null}
      <T size={13} color={c.muted} style={{ textAlign: 'center' }}>{text}</T>
    </View>
  );
}
export function Callout({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.accentSoft, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }}>
      <Icon name={icon} size={20} color={c.accent} />
      <View style={{ flex: 1 }}>
        <T display w={600} size={14.5}>{title}</T>
        {sub ? <T size={12} color={c.muted}>{sub}</T> : null}
      </View>
    </View>
  );
}
export function SectionHead({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }}>
      <T display w={600} size={18}>{title}</T>
      {link && onLink ? <Link onPress={onLink}>{link}</Link> : null}
    </View>
  );
}
export function DayHead({ children }: { children: ReactNode }) {
  const c = useC();
  return <T size={11.5} w={600} color={c.muted} style={{ paddingTop: 12, letterSpacing: 0.4 }}>{children}</T>;
}

// ---------------------------------------------------------------- ตาราง
export interface Col { t: string; r?: boolean; flex?: number }
export function Table({ head, rows, foot }: { head: Col[]; rows: (string | ReactNode)[][]; foot?: (string | ReactNode)[] }) {
  const c = useC();
  const cell = (v: string | ReactNode, i: number, bold?: boolean, key?: string | number) => (
    <View key={key ?? i} style={{ flex: head[i]?.flex ?? (i === 0 ? 1.5 : 1), alignItems: head[i]?.r ? 'flex-end' : 'flex-start', paddingHorizontal: 4, minWidth: 0 }}>
      {typeof v === 'string' || typeof v === 'number'
        ? <T size={13} w={bold ? 600 : 400} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{v}</T>
        : v}
    </View>
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
        {head.map((h, i) => (
          <View key={i} style={{ flex: h.flex ?? (i === 0 ? 1.5 : 1), alignItems: h.r ? 'flex-end' : 'flex-start', paddingHorizontal: 4 }}>
            <T size={12} w={500} color={c.muted} numberOfLines={1}>{h.t}</T>
          </View>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: ri === rows.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
          {r.map((v, i) => cell(v, i, false, i))}
        </View>
      ))}
      {foot ? (
        <View style={{ flexDirection: 'row', paddingVertical: 9, borderTopWidth: 1.5, borderTopColor: c.fg }}>
          {foot.map((v, i) => cell(v, i, true, i))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- สถานะโหลด
export function Loading({ pad = 40 }: { pad?: number }) {
  const c = useC();
  return <View style={{ paddingVertical: pad, alignItems: 'center' }}><ActivityIndicator color={c.accent} /></View>;
}
export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  const c = useC();
  const t = useT();
  return (
    <Panel>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
        <Icon name="alert" size={26} color={c.bad} />
        <T size={14} w={600} style={{ textAlign: 'center' }}>{t('โหลดข้อมูลไม่สำเร็จ', 'Could not load data')}</T>
        <T size={12.5} color={c.muted} style={{ textAlign: 'center' }}>{error}</T>
      </View>
      {onRetry ? <MoreBtn label={t('ลองอีกครั้ง', 'Try again')} onPress={onRetry} /> : null}
    </Panel>
  );
}

// ---------------------------------------------------------------- กล่อง API (แสดง endpoint ที่หน้านี้เรียก)
export function ApiBox({ path, headers, note }: { path: string; headers?: string[]; note?: string }) {
  const c = useC();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button"
      style={{ marginTop: 18, backgroundColor: c.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: c.goodSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 11, fontWeight: '700', color: c.good }}>GET</Text>
        </View>
        <Text style={{ flex: 1, fontFamily: F.mono, fontSize: 12, color: c.fg }}>{path}</Text>
        <Icon name="code" size={18} color={c.muted} />
      </View>
      {open ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          {headers?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {headers.map((h) => (
                <View key={h} style={{ backgroundColor: c.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: c.fg }}>{h}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {note ? <T size={12.5} color={c.muted} lh={20}>{note}</T> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------- แผ่นเลื่อนขึ้น (bottom sheet)
export function Sheet({ visible, onClose, children, label }: { visible: boolean; onClose: () => void; children: ReactNode; label?: string }) {
  const c = useC();
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel="close" />
        <View accessibilityLabel={label} style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <ScrollView contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 24 + ins.bottom }} showsVerticalScrollIndicator={false}>
            <View style={{ width: 42, height: 5, borderRadius: 99, backgroundColor: c.line, alignSelf: 'center', marginBottom: 14 }} />
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function SheetTitle({ children }: { children: ReactNode }) {
  return <T display w={600} size={19} style={{ marginHorizontal: 2, marginBottom: 14 }}>{children}</T>;
}

// ---------------------------------------------------------------- ส่วนหัวของหน้าย่อย
export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 18 }}>
      <IconBtn icon="back" onPress={onBack} label={t('กลับ', 'Back')} size={44} />
      <T display w={600} size={19} style={{ flex: 1 }} numberOfLines={2}>{title}</T>
    </View>
  );
}
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  const c = useC();
  return (
    <View style={{ marginBottom: 14 }}>
      <T display w={600} size={24}>{title}</T>
      {sub ? <T size={12.5} color={c.muted} style={{ marginTop: 2 }}>{sub}</T> : null}
    </View>
  );
}
