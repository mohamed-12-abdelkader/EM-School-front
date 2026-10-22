import { ModuleListPage } from '@/components/modules/ModuleListPage';

export default function Page() {
  return (
    <ModuleListPage
      title="المكتبة"
      subtitle="الكتب والإعارة والمتأخرات"
      group="وحدات إضافية"
      type="generic"
      entity="الكتب"
    />
  );
}
