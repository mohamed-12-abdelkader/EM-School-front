import { ModuleListPage } from '@/components/modules/ModuleListPage';

export default function Page() {
  return (
    <ModuleListPage
      title="ملفات الطلاب"
      subtitle="المستندات والمرفقات الرسمية"
      group="شؤون الطلاب"
      type="generic"
      entity="الملفات"
    />
  );
}
