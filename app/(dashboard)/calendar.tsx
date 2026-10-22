import { ModuleListPage } from '@/components/modules/ModuleListPage';

export default function Page() {
  return (
    <ModuleListPage
      title="التقويم المدرسي"
      subtitle="مواعيد الامتحانات والاجتماعات والاستحقاقات"
      group="الرئيسية"
      type="calendar"
    />
  );
}
