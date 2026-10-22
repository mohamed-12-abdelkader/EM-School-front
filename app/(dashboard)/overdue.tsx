import { ModuleListPage } from '@/components/modules/ModuleListPage';

export default function Page() {
  return (
    <ModuleListPage
      title="المتأخرات والمستحقات"
      subtitle="قوائم المتابعة للأقساط المتأخرة"
      group="المالية والحسابات"
      type="overdue"
    />
  );
}
