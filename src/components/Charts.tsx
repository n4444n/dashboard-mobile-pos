// กราฟ: เส้น (พื้นที่) · แท่ง · วงกลม (โดนัท) · แท่งแนวนอน — แปลงจากฟังก์ชันวาด SVG ในไฟล์แบบ
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { shortN } from '../format';
import { F, useC } from '../theme';
import { T } from './ui';

function niceMax(m: number) {
  if (m <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(m));
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * p >= m) ?? 10) * p;
}
let gid = 0;

export function AreaChart({ vals, labels, every = 1, H = 160 }: { vals: number[]; labels: string[]; every?: number; H?: number }) {
  const c = useC();
  const W = 340, pl = 36, pr = 10, pt = 14, pb = 24;
  const nice = niceMax(Math.max(0, ...vals) * 1.08);
  const id = `g${++gid}`;
  const x = (i: number) => pl + (vals.length < 2 ? 0 : i / (vals.length - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - Math.max(0, v) / nice) * (H - pt - pb);
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const li = vals.length - 1;
  if (!vals.length) return null;
  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={c.accent} stopOpacity={0.28} />
            <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((f) => (
          <G0 key={f}>
            <Line x1={pl} x2={W - pr} y1={y(nice * f)} y2={y(nice * f)} stroke={c.line} strokeWidth={1} />
            <SvgText x={pl - 6} y={y(nice * f) + 3} textAnchor="end" fontSize={10} fill={c.muted} fontFamily={F.body}>{shortN(nice * f)}</SvgText>
          </G0>
        ))}
        <Path d={`${line} L${x(li)} ${H - pb} L${pl} ${H - pb}Z`} fill={`url(#${id})`} />
        <Path d={line} fill="none" stroke={c.accent} strokeWidth={2.2} strokeLinejoin="round" />
        <Circle cx={x(li)} cy={y(vals[li])} r={4.5} fill={c.surface} stroke={c.accent} strokeWidth={2.5} />
        {labels.map((l, i) =>
          i % every === 0 || (i === labels.length - 1 && (labels.length - 1) % every > every / 2) ? (
            <SvgText key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill={c.muted} fontFamily={F.body}>{l}</SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}
/** กลุ่มเปล่า (ใช้แทน <G> เพื่อลด prop ที่ไม่จำเป็น) */
const G0 = ({ children }: { children: ReactNode }) => <>{children}</>;

export function BarChart({ vals, labels, every = 1, H = 170, fmtTop }: { vals: number[]; labels: string[]; every?: number; H?: number; fmtTop?: (v: number) => string }) {
  const c = useC();
  const W = 340, pl = 36, pr = 6, pt = 18, pb = 24;
  const nice = niceMax(Math.max(0, ...vals) * 1.05);
  const n = vals.length || 1;
  const bw = (W - pl - pr) / n;
  const mx = vals.indexOf(Math.max(...vals));
  const y = (v: number) => pt + (1 - Math.max(0, v) / nice) * (H - pt - pb);
  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.5, 1].map((f) => (
          <G0 key={f}>
            <Line x1={pl} x2={W - pr} y1={y(nice * f)} y2={y(nice * f)} stroke={c.line} strokeWidth={1} />
            <SvgText x={pl - 6} y={y(nice * f) + 3} textAnchor="end" fontSize={10} fill={c.muted} fontFamily={F.body}>{shortN(nice * f)}</SvgText>
          </G0>
        ))}
        {vals.map((v, i) => {
          const x = pl + i * bw + bw * 0.18, w = bw * 0.64, yy = y(v);
          return (
            <G0 key={i}>
              <Rect x={x} y={yy} width={w} height={Math.max(0, H - pb - yy)} rx={Math.min(5, w / 2)} fill={i === mx && v > 0 ? c.accent : c.accentSoft} />
              {i === mx && v > 0 && fmtTop ? <SvgText x={x + w / 2} y={yy - 5} textAnchor="middle" fontSize={10} fontWeight="600" fill={c.fg} fontFamily={F.body600}>{fmtTop(v)}</SvgText> : null}
              {i % every === 0 ? <SvgText x={x + w / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={c.muted} fontFamily={F.body}>{labels[i]}</SvgText> : null}
            </G0>
          );
        })}
      </Svg>
    </View>
  );
}

export interface Part { l: string; v: number; c: string }
export function Donut({ parts, center, sub }: { parts: Part[]; center: string; sub: string }) {
  const c = useC();
  const tot = parts.reduce((a, p) => a + Math.max(0, p.v), 0) || 1;
  const r = 48, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <Svg width={132} height={132} viewBox="0 0 132 132">
      <Circle r={r} cx={66} cy={66} fill="none" stroke={c.surface2} strokeWidth={18} />
      {parts.map((p, i) => {
        const len = (Math.max(0, p.v) / tot) * C;
        const el = (
          <Circle key={i} r={r} cx={66} cy={66} fill="none" stroke={p.c} strokeWidth={18}
            strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 66 66)" />
        );
        off += len;
        return el;
      })}
      <SvgText x={66} y={64} textAnchor="middle" fontSize={15} fontWeight="600" fill={c.fg} fontFamily={F.display600}>{center}</SvgText>
      <SvgText x={66} y={81} textAnchor="middle" fontSize={10} fill={c.muted} fontFamily={F.body}>{sub}</SvgText>
    </Svg>
  );
}
export function Legend({ parts }: { parts: Part[] }) {
  const tot = parts.reduce((a, p) => a + Math.max(0, p.v), 0) || 1;
  return (
    <View style={{ flex: 1, minWidth: 150, gap: 8 }}>
      {parts.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.c }} />
          <T size={13} style={{ flex: 1 }} numberOfLines={1}>{p.l}</T>
          <T size={13} w={600}>{((Math.max(0, p.v) / tot) * 100).toFixed(1)}%</T>
        </View>
      ))}
    </View>
  );
}
export function DonutWrap({ parts, center, sub }: { parts: Part[]; center: string; sub: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <Donut parts={parts} center={center} sub={sub} />
      <Legend parts={parts} />
    </View>
  );
}

export function HBars({ rows }: { rows: { l: string; s?: string; v: number; d: string; c?: string }[] }) {
  const c = useC();
  const mx = Math.max(1, ...rows.map((r) => r.v));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
            <T size={13.5} numberOfLines={1} style={{ flex: 1 }}>
              {r.l}
              {r.s ? <T size={12} color={c.muted}>{`  ${r.s}`}</T> : null}
            </T>
            <T size={13.5} w={600}>{r.d}</T>
          </View>
          <View style={{ height: 8, borderRadius: 99, backgroundColor: c.surface2, overflow: 'hidden', marginTop: 3 }}>
            <View style={{ height: '100%', width: `${Math.max(0, (r.v / mx) * 100)}%`, borderRadius: 99, backgroundColor: r.c ?? c.accent }} />
          </View>
        </View>
      ))}
    </View>
  );
}
