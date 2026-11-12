import { t as tr } from "@/i18n";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { CategoryManager } from "@/components/category-manager";

export function CategoriesPage() {
  return <>
    <PageHeading title={tr("Категории")} description={tr("Названия для ваших доходов и расходов.")} />
    <Card className="daily-panel"><CategoryManager /></Card>
  </>;
}
