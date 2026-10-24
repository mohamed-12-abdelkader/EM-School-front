import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchParentChildAttendance,
  fetchParentChildExams,
  fetchParentChildLesson,
  fetchParentChildLessons,
  fetchParentChildMaterial,
  fetchParentChildMaterials,
  fetchParentChildOpinions,
  fetchParentChildOverview,
  fetchParentChildTasks,
  fetchParentChildren,
  fetchParentDashboard,
} from '@/api/parentPortal';
import type { ParentChild, ParentDashboardData } from '@/types/parentPortal';

const SELECTED_CHILD_KEY = 'em_parent_selected_child';

export async function getParentDashboard() {
  return fetchParentDashboard();
}

export async function getParentChildren() {
  const data = await fetchParentChildren();
  return data.children;
}

export async function getParentChildOverview(childId: string) {
  return fetchParentChildOverview(childId);
}

export async function getParentChildAttendance(
  childId: string,
  opts?: { dateFrom?: string; dateTo?: string },
) {
  return fetchParentChildAttendance(childId, opts);
}

export async function getParentChildExams(childId: string) {
  return fetchParentChildExams(childId);
}

export async function getParentChildTasks(childId: string) {
  return fetchParentChildTasks(childId);
}

export async function getParentChildOpinions(childId: string) {
  return fetchParentChildOpinions(childId);
}

export async function getParentChildLessons(childId: string, subjectId?: string) {
  return fetchParentChildLessons(childId, subjectId);
}

export async function getParentChildMaterials(childId: string) {
  return fetchParentChildMaterials(childId);
}

export async function getParentChildMaterial(childId: string, subjectId: string) {
  return fetchParentChildMaterial(childId, subjectId);
}

export async function getParentChildLesson(childId: string, lessonId: string) {
  return fetchParentChildLesson(childId, lessonId);
}

export async function loadSelectedChildId(
  children: Array<Pick<ParentChild, 'id' | 'isPrimary'>>,
): Promise<string | null> {
  if (children.length === 0) return null;
  try {
    const saved = await AsyncStorage.getItem(SELECTED_CHILD_KEY);
    if (saved && children.some((c) => c.id === saved)) return saved;
  } catch {
    // ignore
  }
  const primary = children.find((c) => c.isPrimary);
  return primary?.id || children[0].id;
}

export async function saveSelectedChildId(childId: string) {
  try {
    await AsyncStorage.setItem(SELECTED_CHILD_KEY, childId);
  } catch {
    // ignore
  }
}

export function pickActiveChild(
  dashboard: ParentDashboardData | null,
  selectedId: string | null,
) {
  if (!dashboard?.children.length) return null;
  return (
    dashboard.children.find((c) => c.id === selectedId) ||
    dashboard.children.find((c) => c.isPrimary) ||
    dashboard.children[0]
  );
}

export const relationLabel: Record<string, string> = {
  father: 'أب',
  mother: 'أم',
  guardian: 'ولي أمر',
  other: 'قريب',
};

export const attendanceStatusLabel: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'بعذر',
};
