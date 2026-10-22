import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AppModal,
  Button,
  DateField,
  EmptyState,
  Input,
  PageHeader,
  useToast,
} from '@/components/ui';
import {
  ChipSelect,
  FormError,
  FormLabel,
  SegmentControl,
} from '@/components/admin';
import {
  cancelInstallment,
  createInstallmentPlan,
  getStudentFeeAccount,
  listOverdueInstallments,
  listPayments,
  recordPayment,
  reversePayment,
  updateInstallmentDueDate,
} from '@/api/fees';
import { listStudents } from '@/api/students';
import { ApiError } from '@/api/client';
import type {
  Installment,
  Payment,
  PaymentMethod,
  StudentFeeAccountResponse,
} from '@/types/fees';
import type { SchoolStudent } from '@/types/students';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const CURRENT_YEAR = '2025/2026';
const PAGE_SIZE = 30;

type TabKey = 'account' | 'payments' | 'overdue';

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};
const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: 'account', label: 'حساب الطالب' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'overdue', label: 'المتأخرات' },
];

const METHOD_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'نقدي' },
  { id: 'bank_transfer', label: 'تحويل' },
  { id: 'card', label: 'بطاقة' },
  { id: 'online', label: 'إلكتروني' },
  { id: 'other', label: 'أخرى' },
];

const METHOD_LABEL: Record<string, string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل',
  card: 'بطاقة',
  online: 'إلكتروني',
  other: 'أخرى',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'معلق',
  partial: 'جزئي',
  paid: 'مدفوع',
  overdue: 'متأخر',
  cancelled: 'ملغى',
  completed: 'مكتمل',
  posted: 'مسجّل',
  reversed: 'معكوس',
  refunded: 'مسترد',
};

function money(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;
}

function statusColor(status: string) {
  if (status === 'paid' || status === 'posted' || status === 'completed')
    return colors.success;
  if (status === 'overdue' || status === 'reversed') return colors.danger;
  if (status === 'partial') return colors.warning ?? colors.primary;
  return colors.textMuted;
}

export default function InstallmentsPage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [tab, setTab] = useState<TabKey>('account');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [studentQuery, setStudentQuery] = useState('');
  const [studentHits, setStudentHits] = useState<SchoolStudent[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(
    null,
  );
  const [account, setAccount] = useState<StudentFeeAccountResponse | null>(
    null,
  );

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [overdue, setOverdue] = useState<Installment[]>([]);
  const [overdueTotal, setOverdueTotal] = useState(0);

  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    total_amount: '',
    count: '3',
    first_due_date: '',
    interval_days: '30',
    title: '',
  });
  const [planError, setPlanError] = useState('');
  const [planSaving, setPlanSaving] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    method: 'cash' as PaymentMethod,
    reference: '',
    notes: '',
    installment_ids: [] as number[],
  });
  const [payError, setPayError] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  const [dueTarget, setDueTarget] = useState<Installment | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [dueSaving, setDueSaving] = useState(false);
  const [dueError, setDueError] = useState('');

  const [cancelTarget, setCancelTarget] = useState<Installment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const [reverseTarget, setReverseTarget] = useState<Payment | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseSaving, setReverseSaving] = useState(false);

  useEffect(() => {
    const q = studentQuery.trim();
    if (q.length < 2) {
      setStudentHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const data = await listStudents({
          search: q,
          academic_year: year.trim() || CURRENT_YEAR,
          limit: 15,
        });
        if (!cancelled) setStudentHits(data.students ?? []);
      } catch {
        if (!cancelled) setStudentHits([]);
      } finally {
        if (!cancelled) setSearchingStudents(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [studentQuery, year]);

  const loadAccount = useCallback(
    async (studentId: number, soft?: boolean) => {
      if (!soft) setLoading(true);
      try {
        const data = await getStudentFeeAccount(
          studentId,
          year.trim() || CURRENT_YEAR,
        );
        setAccount(data);
      } catch (e) {
        setAccount(null);
        showToast(
          e instanceof ApiError ? e.message : 'تعذر تحميل حساب الطالب',
          'danger',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast, year],
  );

  const loadPayments = useCallback(
    async (soft?: boolean) => {
      if (!soft) setLoading(true);
      try {
        const data = await listPayments({
          student_id: selectedStudent?.id,
          limit: PAGE_SIZE,
          skip: 0,
        });
        setPayments(data.payments ?? []);
        setPaymentsTotal(data.total ?? 0);
      } catch (e) {
        showToast(
          e instanceof ApiError ? e.message : 'تعذر تحميل المدفوعات',
          'danger',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedStudent?.id, showToast],
  );

  const loadOverdue = useCallback(
    async (soft?: boolean) => {
      if (!soft) setLoading(true);
      try {
        const data = await listOverdueInstallments({
          academic_year: year.trim() || CURRENT_YEAR,
          limit: PAGE_SIZE,
          skip: 0,
        });
        setOverdue(data.overdue ?? []);
        setOverdueTotal(data.total ?? 0);
      } catch (e) {
        showToast(
          e instanceof ApiError ? e.message : 'تعذر تحميل المتأخرات',
          'danger',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast, year],
  );

  useEffect(() => {
    if (tab === 'payments') loadPayments();
    else if (tab === 'overdue') loadOverdue();
    else if (tab === 'account' && selectedStudent) {
      loadAccount(selectedStudent.id);
    }
  }, [tab, selectedStudent, loadAccount, loadPayments, loadOverdue]);

  const selectStudent = (s: SchoolStudent) => {
    setSelectedStudent(s);
    setStudentQuery(s.name);
    setStudentHits([]);
    setTab('account');
    loadAccount(s.id);
  };

  const onCreatePlan = async () => {
    if (!selectedStudent) return;
    const total = Number(planForm.total_amount);
    const count = Number(planForm.count);
    if (!total || total <= 0) {
      setPlanError('أدخل إجمالي المبلغ');
      return;
    }
    if (!count || count < 1) {
      setPlanError('عدد الأقساط يجب أن يكون 1 على الأقل');
      return;
    }
    if (!planForm.first_due_date.trim()) {
      setPlanError('تاريخ أول قسط مطلوب');
      return;
    }
    setPlanSaving(true);
    setPlanError('');
    try {
      await createInstallmentPlan({
        student_id: selectedStudent.id,
        academic_year: year.trim() || CURRENT_YEAR,
        title: planForm.title.trim() || null,
        total_amount: total,
        count,
        first_due_date: planForm.first_due_date.trim(),
        interval_days: Number(planForm.interval_days) || 30,
      });
      showToast('تم إنشاء خطة الأقساط', 'success');
      setPlanOpen(false);
      loadAccount(selectedStudent.id, true);
    } catch (e) {
      setPlanError(e instanceof ApiError ? e.message : 'تعذر إنشاء الخطة');
    } finally {
      setPlanSaving(false);
    }
  };

  const onRecordPayment = async () => {
    if (!selectedStudent) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) {
      setPayError('أدخل مبلغ الدفع');
      return;
    }
    setPaySaving(true);
    setPayError('');
    try {
      const res = await recordPayment({
        student_id: selectedStudent.id,
        academic_year: year.trim() || CURRENT_YEAR,
        amount,
        method: payForm.method,
        reference: payForm.reference.trim() || null,
        notes: payForm.notes.trim() || null,
        installment_ids:
          payForm.installment_ids.length > 0
            ? payForm.installment_ids
            : undefined,
        idempotency_key: `pay-${selectedStudent.id}-${Date.now()}`,
      });
      showToast(res.message || 'تم تسجيل الدفعة', 'success');
      setPayOpen(false);
      loadAccount(selectedStudent.id, true);
      if (tab === 'payments') loadPayments(true);
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : 'تعذر تسجيل الدفعة');
    } finally {
      setPaySaving(false);
    }
  };

  const onUpdateDue = async () => {
    if (!dueTarget || !dueDate.trim()) {
      setDueError('أدخل تاريخ الاستحقاق');
      return;
    }
    setDueSaving(true);
    setDueError('');
    try {
      await updateInstallmentDueDate(dueTarget.id, dueDate.trim());
      showToast('تم تحديث تاريخ الاستحقاق', 'success');
      setDueTarget(null);
      if (selectedStudent) loadAccount(selectedStudent.id, true);
      if (tab === 'overdue') loadOverdue(true);
    } catch (e) {
      setDueError(e instanceof ApiError ? e.message : 'تعذر التحديث');
    } finally {
      setDueSaving(false);
    }
  };

  const onCancelInstallment = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelSaving(true);
    try {
      await cancelInstallment(cancelTarget.id, cancelReason.trim());
      showToast('تم إلغاء القسط', 'success');
      setCancelTarget(null);
      setCancelReason('');
      if (selectedStudent) loadAccount(selectedStudent.id, true);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'تعذر الإلغاء', 'danger');
    } finally {
      setCancelSaving(false);
    }
  };

  const onReverse = async () => {
    if (!reverseTarget || !reverseReason.trim()) return;
    setReverseSaving(true);
    try {
      await reversePayment(reverseTarget.id, reverseReason.trim());
      showToast('تم عكس الدفعة', 'success');
      setReverseTarget(null);
      setReverseReason('');
      loadPayments(true);
      if (selectedStudent) loadAccount(selectedStudent.id, true);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'تعذر العكس', 'danger');
    } finally {
      setReverseSaving(false);
    }
  };

  const openPayModal = () => {
    const openInstallments =
      account?.installments.filter(
        (i) =>
          Number(i.paid_amount) < Number(i.amount) && i.status !== 'cancelled',
      ) ?? [];
    setPayForm({
      amount: '',
      method: 'cash',
      reference: '',
      notes: '',
      installment_ids: openInstallments.slice(0, 1).map((i) => i.id),
    });
    setPayError('');
    setPayOpen(true);
  };

  const togglePayInstallment = (id: number) => {
    setPayForm((f) => ({
      ...f,
      installment_ids: f.installment_ids.includes(id)
        ? f.installment_ids.filter((x) => x !== id)
        : [...f.installment_ids, id],
    }));
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader
        title="الأقساط والمدفوعات"
        subtitle={
          tab === 'account'
            ? selectedStudent
              ? selectedStudent.name
              : 'اختر طالباً لعرض حسابه'
            : tab === 'payments'
              ? `${paymentsTotal} دفعة`
              : `${overdueTotal} قسط متأخر`
        }
        actions={
          selectedStudent && tab === 'account' ? (
            <View style={styles.headerActions}>
              <Button
                label="خطة أقساط"
                variant="outline"
                size="sm"
                onPress={() => {
                  setPlanForm({
                    total_amount: String(
                      Number(
                        account?.account?.balance_due ??
                          account?.account?.balance ??
                          0,
                      ) || '',
                    ),
                    count: '3',
                    first_due_date: '',
                    interval_days: '30',
                    title: '',
                  });
                  setPlanError('');
                  setPlanOpen(true);
                }}
              />
              <Button label="تسجيل دفعة" size="sm" onPress={openPayModal} />
            </View>
          ) : undefined
        }
      />

      <SegmentControl value={tab} options={TAB_OPTIONS} onChange={setTab} />

      <View style={styles.toolbar}>
        <Input
          value={year}
          onChangeText={setYear}
          placeholder={CURRENT_YEAR}
          icon="Calendar"
        />
        {tab === 'account' || tab === 'payments' ? (
          <>
            <Input
              value={studentQuery}
              onChangeText={(v) => {
                setStudentQuery(v);
                if (selectedStudent && v !== selectedStudent.name) {
                  setSelectedStudent(null);
                  setAccount(null);
                }
              }}
              placeholder="بحث باسم الطالب..."
              icon="Search"
            />
            {searchingStudents ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
            {studentHits.length > 0 ? (
              <View style={styles.hits}>
                {studentHits.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => selectStudent(s)}
                    style={styles.hit}
                  >
                    <Text style={styles.hitTitle}>{s.name}</Text>
                    <Text style={styles.hitMeta}>
                      {s.grade_name} · {s.classroom_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {tab === 'account' && account && !loading ? (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>إجمالي الرسوم</Text>
            <Text style={styles.summaryValue}>
              {money(account.account.total_fees)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>المدفوع</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {money(account.account.total_paid)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>المتبقي</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {money(account.account.balance_due ?? account.account.balance)}
            </Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}
    </View>
  );

  type ListItem =
    | { kind: 'section'; title: string }
    | { kind: 'item'; data: StudentFeeAccountResponse['items'][0] }
    | { kind: 'installment'; data: Installment }
    | { kind: 'payment'; data: Payment }
    | { kind: 'overdue'; data: Installment };

  let listData: ListItem[] = [];
  if (tab === 'account' && account) {
    if (account.items.length) {
      listData.push({ kind: 'section', title: 'بنود المصروفات' });
      account.items.forEach((d) => listData.push({ kind: 'item', data: d }));
    }
    if (account.installments.length) {
      listData.push({ kind: 'section', title: 'الأقساط' });
      account.installments.forEach((d) =>
        listData.push({ kind: 'installment', data: d }),
      );
    }
    if (account.payments.length) {
      listData.push({ kind: 'section', title: 'آخر المدفوعات' });
      account.payments.slice(0, 10).forEach((d) =>
        listData.push({ kind: 'payment', data: d }),
      );
    }
  } else if (tab === 'payments') {
    listData = payments.map((d) => ({ kind: 'payment' as const, data: d }));
  } else if (tab === 'overdue') {
    listData = overdue.map((d) => ({ kind: 'overdue' as const, data: d }));
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'section') {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    }
    if (item.kind === 'item') {
      const d = item.data;
      return (
        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>{d.name}</Text>
            <Text style={styles.rowMeta}>
              {money(d.net_amount ?? d.amount ?? d.original_amount)}
              {d.due_date ? ` · استحقاق ${d.due_date}` : ''}
            </Text>
          </View>
          <Text style={styles.amountText}>
            {money(
              d.remaining_amount ??
                Number(d.net_amount ?? d.amount ?? 0) -
                  Number(d.paid_amount ?? 0),
            )}
          </Text>
        </View>
      );
    }
    if (item.kind === 'installment') {
      const d = item.data;
      const remaining = Number(d.amount) - Number(d.paid_amount);
      return (
        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>
              قسط {d.sequence_no ?? ''}
              {d.plan_title ? ` · ${d.plan_title}` : ''}
            </Text>
            <Text style={styles.rowMeta}>
              {money(d.amount)} · مدفوع {money(d.paid_amount)} · استحقاق{' '}
              {d.due_date}
            </Text>
          </View>
          <View style={styles.rowTrailing}>
            <Text style={[styles.statusText, { color: statusColor(d.status) }]}>
              {STATUS_LABEL[d.status] || d.status}
            </Text>
            {remaining > 0 && d.status !== 'cancelled' ? (
              <Pressable
                onPress={() => {
                  setDueTarget(d);
                  setDueDate(d.due_date?.slice(0, 10) ?? '');
                  setDueError('');
                }}
                style={styles.miniBtn}
              >
                <Text style={styles.miniBtnText}>تاريخ</Text>
              </Pressable>
            ) : null}
            {Number(d.paid_amount) === 0 && d.status !== 'cancelled' ? (
              <Pressable
                onPress={() => {
                  setCancelTarget(d);
                  setCancelReason('');
                }}
                style={styles.miniBtnDanger}
              >
                <Text style={styles.miniBtnDangerText}>إلغاء</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    }
    if (item.kind === 'payment') {
      const d = item.data;
      const reversed = d.status === 'reversed' || d.status === 'refunded';
      return (
        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>
              {money(d.amount)}
              {d.receipt_number ? ` · ${d.receipt_number}` : ''}
            </Text>
            <Text style={styles.rowMeta}>
              {d.student_name ? `${d.student_name} · ` : ''}
              {METHOD_LABEL[String(d.method)] || d.method}
              {d.paid_at ? ` · ${String(d.paid_at).slice(0, 16).replace('T', ' ')}` : ''}
              {d.notes ? ` · ${d.notes}` : ''}
            </Text>
          </View>
          <View style={styles.rowTrailing}>
            <Text
              style={[
                styles.statusText,
                { color: statusColor(String(d.status || 'completed')) },
              ]}
            >
              {STATUS_LABEL[String(d.status || 'completed')] || d.status}
            </Text>
            {!reversed && tab === 'payments' ? (
              <Pressable
                onPress={() => {
                  setReverseTarget(d);
                  setReverseReason('');
                }}
                style={styles.miniBtnDanger}
              >
                <Text style={styles.miniBtnDangerText}>عكس</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    }
    // overdue
    const d = item.data;
    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{d.student_name || `طالب #${d.student_id}`}</Text>
          <Text style={styles.rowMeta}>
            متبقي {money(d.remaining ?? Number(d.amount) - Number(d.paid_amount))}
            {` · استحقاق ${d.due_date}`}
            {d.grade_name ? ` · ${d.grade_name}` : ''}
            {d.classroom_name ? ` · ${d.classroom_name}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setDueTarget(d);
            setDueDate(String(d.due_date).slice(0, 10));
            setDueError('');
          }}
          style={styles.miniBtn}
        >
          <Text style={styles.miniBtnText}>تاريخ</Text>
        </Pressable>
      </View>
    );
  };

  const empty =
    !loading &&
    ((tab === 'account' && !selectedStudent) ||
      (tab === 'account' && selectedStudent && listData.length === 0) ||
      (tab === 'payments' && payments.length === 0) ||
      (tab === 'overdue' && overdue.length === 0));

  return (
    <View style={styles.root} {...rtlProps}>
      <FlatList
        data={loading ? [] : listData}
        keyExtractor={(item, index) => {
          if (item.kind === 'section') return `s-${item.title}-${index}`;
          return `${item.kind}-${item.data.id}-${index}`;
        }}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          empty ? styles.contentEmpty : null,
        ]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          empty ? (
            <EmptyState
              icon="Banknote"
              title={
                tab === 'account' && !selectedStudent
                  ? 'ابحث عن طالب'
                  : tab === 'overdue'
                    ? 'لا توجد أقساط متأخرة'
                    : tab === 'payments'
                      ? 'لا توجد مدفوعات'
                      : 'لا توجد بيانات مالية'
              }
              description={
                tab === 'account' && !selectedStudent
                  ? 'ابحث باسم الطالب لعرض الحساب والأقساط وتسجيل الدفعات'
                  : tab === 'account'
                    ? 'خصّص مصروفاً من صفحة المصروفات أو أنشئ خطة أقساط'
                    : undefined
              }
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              if (tab === 'account' && selectedStudent) {
                loadAccount(selectedStudent.id, true);
              } else if (tab === 'payments') loadPayments(true);
              else if (tab === 'overdue') loadOverdue(true);
              else setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      />

      <AppModal
        visible={planOpen}
        title="خطة أقساط جديدة"
        description="تقسيم متساوٍ لإجمالي المبلغ على عدد الأقساط."
        confirmLabel={planSaving ? 'جارٍ...' : 'إنشاء'}
        onConfirm={() => {
          if (!planSaving) onCreatePlan();
        }}
        onClose={() => {
          if (!planSaving) setPlanOpen(false);
        }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <FormLabel>العنوان (اختياري)</FormLabel>
            <Input
              value={planForm.title}
              onChangeText={(title) => setPlanForm((f) => ({ ...f, title }))}
              placeholder="أقساط المصروفات"
            />
            <FormLabel>الإجمالي</FormLabel>
            <Input
              value={planForm.total_amount}
              onChangeText={(total_amount) =>
                setPlanForm((f) => ({ ...f, total_amount }))
              }
              keyboardType="decimal-pad"
              placeholder="15000"
            />
            <FormLabel>عدد الأقساط</FormLabel>
            <Input
              value={planForm.count}
              onChangeText={(count) => setPlanForm((f) => ({ ...f, count }))}
              keyboardType="number-pad"
              placeholder="3"
            />
            <DateField
              label="أول استحقاق"
              value={planForm.first_due_date}
              onChange={(first_due_date) =>
                setPlanForm((f) => ({ ...f, first_due_date }))
              }
              placeholder="اختر تاريخ أول قسط"
            />
            <FormLabel>الفترة بالأيام</FormLabel>
            <Input
              value={planForm.interval_days}
              onChangeText={(interval_days) =>
                setPlanForm((f) => ({ ...f, interval_days }))
              }
              keyboardType="number-pad"
              placeholder="30"
            />
            <FormError message={planError} />
          </View>
        </ScrollView>
      </AppModal>

      <AppModal
        visible={payOpen}
        title="تسجيل دفعة"
        confirmLabel={paySaving ? 'جارٍ...' : 'تسجيل'}
        onConfirm={() => {
          if (!paySaving) onRecordPayment();
        }}
        onClose={() => {
          if (!paySaving) setPayOpen(false);
        }}
      >
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <FormLabel>المبلغ</FormLabel>
            <Input
              value={payForm.amount}
              onChangeText={(amount) => setPayForm((f) => ({ ...f, amount }))}
              keyboardType="decimal-pad"
              placeholder="5000"
            />
            <FormLabel>طريقة الدفع</FormLabel>
            <ChipSelect
              required
              options={METHOD_OPTIONS}
              value={payForm.method}
              onChange={(next) => {
                if (typeof next === 'string') {
                  setPayForm((f) => ({
                    ...f,
                    method: next as PaymentMethod,
                  }));
                }
              }}
            />
            <FormLabel>مرجع (اختياري)</FormLabel>
            <Input
              value={payForm.reference}
              onChangeText={(reference) =>
                setPayForm((f) => ({ ...f, reference }))
              }
              placeholder="رقم التحويل"
            />
            <FormLabel>ملاحظات</FormLabel>
            <Input
              value={payForm.notes}
              onChangeText={(notes) => setPayForm((f) => ({ ...f, notes }))}
              placeholder="دفعة أول قسط"
            />
            {account?.installments.some(
              (i) => Number(i.paid_amount) < Number(i.amount),
            ) ? (
              <>
                <FormLabel>توزيع على أقساط (اختياري)</FormLabel>
                {account.installments
                  .filter((i) => Number(i.paid_amount) < Number(i.amount))
                  .map((i) => {
                    const on = payForm.installment_ids.includes(i.id);
                    return (
                      <Pressable
                        key={i.id}
                        onPress={() => togglePayInstallment(i.id)}
                        style={[styles.hit, on && styles.hitOn]}
                      >
                        <Text style={styles.hitTitle}>
                          قسط {i.sequence_no} · متبقي{' '}
                          {money(Number(i.amount) - Number(i.paid_amount))}
                        </Text>
                        <Text style={styles.hitMeta}>استحقاق {i.due_date}</Text>
                      </Pressable>
                    );
                  })}
              </>
            ) : null}
            <FormError message={payError} />
          </View>
        </ScrollView>
      </AppModal>

      <AppModal
        visible={!!dueTarget}
        title="تعديل تاريخ الاستحقاق"
        confirmLabel={dueSaving ? 'جارٍ...' : 'حفظ'}
        onConfirm={() => {
          if (!dueSaving) onUpdateDue();
        }}
        onClose={() => {
          if (!dueSaving) setDueTarget(null);
        }}
      >
        <View style={styles.form}>
          <DateField
            label="التاريخ"
            value={dueDate}
            onChange={setDueDate}
            placeholder="اختر تاريخ الاستحقاق"
          />
          <FormError message={dueError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!cancelTarget}
        title="إلغاء القسط؟"
        description="يُلغى فقط إن لم يُدفع منه شيء."
        confirmLabel={cancelSaving ? 'جارٍ...' : 'إلغاء القسط'}
        danger
        onConfirm={() => {
          if (!cancelSaving && cancelReason.trim()) onCancelInstallment();
        }}
        onClose={() => {
          if (!cancelSaving) setCancelTarget(null);
        }}
      >
        <View style={styles.form}>
          <FormLabel>السبب</FormLabel>
          <Input
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder="انسحاب / خطأ"
          />
        </View>
      </AppModal>

      <AppModal
        visible={!!reverseTarget}
        title="عكس الدفعة؟"
        description="لا تُحذف المدفوعات — يُستخدم العكس."
        confirmLabel={reverseSaving ? 'جارٍ...' : 'عكس'}
        danger
        onConfirm={() => {
          if (!reverseSaving && reverseReason.trim()) onReverse();
        }}
        onClose={() => {
          if (!reverseSaving) setReverseTarget(null);
        }}
      >
        <View style={styles.form}>
          <FormLabel>السبب</FormLabel>
          <Input
            value={reverseReason}
            onChangeText={setReverseReason}
            placeholder="تسجيل خاطئ"
          />
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    writingDirection: 'rtl',
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  contentMobile: {
    paddingHorizontal: spacing.lg,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    paddingTop: spacing.xl,
    gap: spacing.xl,
    marginBottom: spacing.lg,
    writingDirection: 'rtl',
  },
  headerActions: {
    flexDirection: rowRtl,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  toolbar: {
    gap: spacing.md,
  },
  hits: {
    gap: 4,
  },
  hit: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: 2,
  },
  hitOn: {
    backgroundColor: colors.primarySoft,
  },
  hitTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  hitMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summary: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryItem: {
    flexGrow: 1,
    minWidth: 100,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  summaryValue: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  loader: {
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  row: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    writingDirection: 'rtl',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  rowTrailing: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  amountText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  miniBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  miniBtnDanger: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft ?? '#FEE2E2',
  },
  miniBtnDangerText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.danger,
  },
  form: { gap: spacing.md },
  formScroll: { maxHeight: 420 },
});
