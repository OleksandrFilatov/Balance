import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useMutation } from "@tanstack/react-query";
import { moneyApi, useMoney } from "@/api/money";
import { useAccounts, useRefreshFinance } from "@/api/queries";
import { Card } from "./ui/card";
import { Field, Select } from "./ui/input";
import { ErrorNotice } from "./feedback";

export function DefaultAccount() {
  const accounts = useAccounts(), money = useMoney(), refresh = useRefreshFinance();
  const update = useMutation({ mutationFn: (id: string) => moneyApi.ensure(id), onSuccess: () => refresh(), retry: false });
  const active = accounts.data?.filter(a => a.active) ?? [];
  if (active.length < 2) return null;
  return <Card className="daily-panel default-account">
    <Field label={tr("Откуда обычно тратить")}>
      <Select value={money.data?.defaultAccountId ?? ""} disabled={update.isPending} onChange={e => { if (e.target.value) update.mutate(e.target.value); }}>
        <option value="" disabled>{tr("Выберите счёт")}</option>
        {active.map(a => <option key={a.id} value={a.id}>{categoryName(a)} · {a.currency}</option>)}
      </Select>
    </Field>
    <ErrorNotice error={money.error ?? update.error}/>
  </Card>;
}
