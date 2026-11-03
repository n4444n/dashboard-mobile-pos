// สี · ฟอนต์ · เงา ของแอป (ตามแบบ Tally_POS_Reports.html) — สว่าง/มืดตามเครื่อง
import { createContext, useContext } from 'react';
import { Platform } from 'react-native';

export const light = {
  bg: '#F3F4FA', surface: '#FFFFFF', surface2: '#ECEEFB', fg: '#161A2B', muted: '#6A6F88', line: '#E2E4F0',
  accent: '#5466F5', accent2: '#7C8BFF', accentInk: '#FFFFFF', accentSoft: '#E5E8FE',
  navy: '#1F2537', navy2: '#363F5C', teal: '#1C9C8E', teal2: '#3CC2B2',
  good: '#1A9465', goodSoft: '#DCF3E9', bad: '#D23F56', badSoft: '#FBE2E6', warn: '#B9740F', warnSoft: '#FBEED6',
  c1: '#5466F5', c2: '#1FA899', c3: '#EE9B2F', c4: '#E2546B', c5: '#8A68EE', c6: '#4F9BD9',
  scrim: 'rgba(10,12,25,0.45)', shadowColor: '#263078', shadowOpacity: 0.08,
  dark: false,
};
export type Palette = typeof light;

export const dark: Palette = {
  bg: '#0E1120', surface: '#171B2D', surface2: '#21263C', fg: '#ECEEF8', muted: '#9BA1BC', line: '#2A3049',
  accent: '#7282FF', accent2: '#5466F5', accentInk: '#FFFFFF', accentSoft: '#252B52',
  navy: '#2A3150', navy2: '#3B4570', teal: '#167E73', teal2: '#25A797',
  good: '#45C792', goodSoft: '#163428', bad: '#F2697D', badSoft: '#3B1C25', warn: '#E9AA4C', warnSoft: '#3A2C14',
  c1: '#7282FF', c2: '#33C2B2', c3: '#F2AE4E', c4: '#F2697D', c5: '#A487F7', c6: '#6BB1EA',
  scrim: 'rgba(0,0,0,0.6)', shadowColor: '#000000', shadowOpacity: 0.35,
  dark: true,
};

export const ThemeContext = createContext<Palette>(light);
export const useC = () => useContext(ThemeContext);

/** สีโปร่งใสจากสีหลัก (แทน color-mix ของ CSS) — hex 6 หลัก + alpha 0–1 */
export function alpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * ฟอนต์: Prompt (หัวข้อ/ตัวเลขใหญ่) + IBM Plex Sans Thai (เนื้อหา)
 * บนมือถือแต่ละน้ำหนักเป็นฟอนต์คนละไฟล์ → เลือก fontFamily ตามน้ำหนัก
 */
export const F = {
  body: 'IBMPlexSansThai_400Regular',
  body500: 'IBMPlexSansThai_500Medium',
  body600: 'IBMPlexSansThai_600SemiBold',
  display500: 'Prompt_500Medium',
  display600: 'Prompt_600SemiBold',
  display700: 'Prompt_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 18, xxl: 20, card: 22, pill: 999 };

/** เงาของการ์ด/แผง */
export const shadow = (c: Palette) =>
  Platform.select({
    web: { boxShadow: c.dark ? '0 8px 24px rgba(0,0,0,.35)' : '0 8px 24px rgba(38,48,120,.08)' } as object,
    default: { shadowColor: c.shadowColor, shadowOpacity: c.shadowOpacity, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  });

/** สีประจำหมวด/ช่องทาง (ใช้ซ้ำในกราฟ) */
export const series = (c: Palette) => [c.c1, c.c2, c.c3, c.c4, c.c5, c.c6, c.warn, c.teal, c.navy2];
