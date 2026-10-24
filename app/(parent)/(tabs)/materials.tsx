import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { useParentChild } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  formatShortDate,
  rowRtl,
} from '@/components/parent/ui';
import { getParentChildMaterials } from '@/services/parentPortal';
import type { ParentMaterial } from '@/types/parentPortal';

export default function ParentMaterialsTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const { children, selectedChild, selectedChildId, setSelectedChildId } =
    useParentChild();

  const [materials, setMaterials] = useState<ParentMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (soft = false) => {
      if (!selectedChildId) {
        setMaterials([]);
        setLoading(false);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await getParentChildMaterials(selectedChildId);
        setMaterials(data.materials);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل المواد');
        if (!soft) setMaterials([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedChildId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            wide && { maxWidth: 880, alignSelf: 'center', width: '100%' },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={t.guardian}
            />
          }
        >
          <Text style={styles.title}>المواد الدراسية</Text>
          <Text style={styles.sub}>
            {selectedChild
              ? `مواد صف ${selectedChild.name} — مثل: اللغة العربية leo`
              : 'اختر ابناً لعرض المواد'}
          </Text>

          <ChildSwitcher
            children={children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
          />

          {loading ? (
            <LoadingBlock label="جارٍ تحميل المواد..." />
          ) : error ? (
            <EmptyHint title="تعذر التحميل" body={error} />
          ) : materials.length === 0 ? (
            <EmptyHint
              title="لا مواد منشورة"
              body="عندما ينشر المعلّم دروساً لمادة ابنك ستظهر هنا باسم المادة والمعلّم."
            />
          ) : (
            <View style={styles.list}>
              {materials.map((material, i) => (
                <FadeIn key={`${material.subjectId}-${material.teacherId}`} delay={Math.min(i, 10) * 35}>
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/(parent)/material/${selectedChildId}/${material.subjectId}` as never,
                      )
                    }
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
                  >
                    <View style={[styles.cardInner, { flexDirection: rowRtl as 'row' }]}>
                      <View style={styles.icon}>
                        <Icon name="BookOpen" size={22} color={t.guardian} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {material.name}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {material.lessonsCount} درس
                          {material.attachmentsCount
                            ? ` · ${material.attachmentsCount} مرفق`
                            : ''}
                          {material.lastPublishedAt
                            ? ` · ${formatShortDate(material.lastPublishedAt)}`
                            : ''}
                        </Text>
                      </View>
                      <Icon name="ChevronLeft" size={20} color={t.inkMute} />
                    </View>
                  </Pressable>
                </FadeIn>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 110 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 24,
    color: t.ink,
    textAlign: 'right',
  },
  sub: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    marginTop: -6,
    lineHeight: 22,
  },
  list: { gap: 10 },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    ...t.shadow.card,
  },
  cardInner: { alignItems: 'center', gap: 12 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: t.guardianSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    textAlign: 'right',
  },
  cardMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 6,
  },
});
