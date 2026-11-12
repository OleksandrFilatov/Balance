import { t as tr } from "@/i18n";
import { useState } from "react";
import { Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useHouseholdProfile, saveHouseholdProfile, type HouseholdProfile } from "@/api/household-profile";
import { useRefreshFinance } from "@/api/queries";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input } from "./ui/input";
import { ErrorNotice } from "./feedback";

export function HouseholdMembers() {
  const query = useHouseholdProfile();
  const [editing, setEditing] = useState<HouseholdProfile | null>(null);
  return <><Button variant="ghost" size="small" disabled={!query.data} onClick={() => setEditing(query.data!)}>
    <Users size={16}/>{tr("Участники")}{" "}</Button><ErrorNotice error={query.error}/>{editing && <MembersEditor profile={editing} onClose={() => setEditing(null)}/>}</>;
}
function MembersEditor({profile, onClose}: {profile: HouseholdProfile; onClose: () => void}) {
  const refresh = useRefreshFinance();
  const mutation = useMutation({mutationFn: saveHouseholdProfile, onSuccess: async () => { await refresh(); onClose(); }, retry: false});
  return <Dialog open title={tr("Участники домашних расходов")} onClose={onClose} busy={mutation.isPending}
    description={tr("Имена используются только для отображения. Доли, зарплаты и история платежей сохранятся.")}>
    <form className="form-stack" onSubmit={event => {
      event.preventDefault();
      if (mutation.isPending) return;
      const form = new FormData(event.currentTarget);
      mutation.mutate({firstName: String(form.get("firstName")).trim() || null,
        partnerName: String(form.get("partnerName")).trim() || null, version: profile.version});
    }}>
      <Field label={tr("Ваше имя")}><Input name="firstName" maxLength={60} defaultValue={profile.firstName ?? ""} placeholder={tr("Я")} disabled={mutation.isPending}/></Field>
      <Field label={tr("Имя второго участника")}><Input name="partnerName" maxLength={60} defaultValue={profile.partnerName ?? ""} placeholder={tr("Партнёр")} disabled={mutation.isPending}/></Field>
      <ErrorNotice error={mutation.error}/><div className="dialog-footer">
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>{tr("Отмена")}</Button>
        <Button type="submit" disabled={mutation.isPending}>{tr("Сохранить имена")}</Button>
      </div>
    </form>
  </Dialog>;
}
