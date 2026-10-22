import { ModuleListPage } from '@/components/modules/ModuleListPage';

export default function Page() {
  return (
    <ModuleListPage
      title="المصروفات التشغيلية"
      subtitle="تسجيل وتصنيف مصروفات التشغيل"
      group="المالية والحسابات"
      type="generic"
      entity="المصروفات"
    />
  );
}
