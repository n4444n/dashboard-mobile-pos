// แถวบิล: ไอคอนช่องทางชำระ | เลขบิล … ยอด / วันเวลา · สาขา … จำนวนชิ้น
import { Pressable, StyleSheet, View } from 'react-native';
import { dWeek, hhmm, money, pcs } from '../format';
import { useLang } from '../i18n';
import { payMeta, sourceLabel, statusMeta } from '../meta';
import { useApp } from '../state';
import { alpha, useC } from '../theme';
import type { Expense, HistoryRow } from '../types';
import { Icon } from './Icon';
import { T, Tag } from './ui';

export function BillRow({ b, last }: { b: HistoryRow; last?: boolean }) {
  const c = useC();
  const { t, lang } = useLang();
  const { openSheet, branchName, branches } = useApp();
  const pay = payMeta(b.paymentMethod, t, c);
  const st = statusMeta(b.status, t);
  return (
    <Pressable
      onPress={() => openSheet({ kind: 'bill', row: b })}
      accessibilityLabel={`${b.orderNo}, ${money(b.total)}, ${pay.name}`}
      style={({ pressed }) => [s.row, { borderBottomColor: c.line, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.pay, { backgroundColor: alpha(pay.color, 0.14) }]}>
        <Icon name={pay.icon} size={22} color={pay.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={s.line}>
          <T display w={600} size={14} numberOfLines={1} style={{ flexShrink: 1 }}>{b.orderNo}</T>
          <T display w={600} size={15} style={[{ marginLeft: 'auto' }, b.status === 'void' && { textDecorationLine: 'line-through', opacity: 0.55 }]}>{money(b.total)}</T>
        </View>
        <View style={s.line}>
          <T size={12.5} color={c.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
            {dWeek(b.createdAt, lang)} · {hhmm(b.createdAt)}
            {branches.length > 1 && b.branchId ? `  •  ${branchName(b.branchId)}` : ''}
          </T>
          {b.status !== 'paid' ? <Tag kind={st.kind}>{st.label}</Tag> : null}
          <View style={{ marginLeft: 'auto', backgroundColor: c.surface2, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 1 }}>
            <T size={12} w={500}>{pcs(b.itemCount, lang)}</T>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function ExpenseRow({ e, last }: { e: Expense; last?: boolean }) {
  const c = useC();
  const { t, lang } = useLang();
  const { openSheet } = useApp();
  const voided = !!e.voidedAt;
  return (
    <Pressable onPress={() => openSheet({ kind: 'expense', row: e })}
      style={({ pressed }) => [s.row, { borderBottomColor: c.line, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[s.pay, { backgroundColor: alpha(c.c3, 0.14) }]}>
        <Icon name="wallet" size={22} color={c.c3} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={s.line}>
          <T display w={600} size={14} numberOfLines={1} style={{ flexShrink: 1 }}>{e.category || t('ค่าใช้จ่าย', 'Expense')}</T>
          <T display w={600} size={15} style={[{ marginLeft: 'auto' }, voided && { textDecorationLine: 'line-through', opacity: 0.55 }]}>{money(e.amount)}</T>
        </View>
        <View style={s.line}>
          <T size={12.5} color={c.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{dWeek(e.createdAt || e.date, lang)} · {hhmm(e.createdAt)} · {e.branchName}</T>
          {voided ? <View style={{ marginLeft: 'auto' }}><Tag kind="bad">{t('ยกเลิก', 'Cancelled')}</Tag></View> : null}
        </View>
        <T size={12} color={c.muted} numberOfLines={1}>{[e.description, sourceLabel(e.source, t)].filter(Boolean).join(' · ')}</T>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pay: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
});
