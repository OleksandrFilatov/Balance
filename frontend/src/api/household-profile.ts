import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey } from "./queries";
import { t as tr } from "@/i18n";

export interface HouseholdProfile { firstName: string | null; partnerName: string | null; version: number }
export function useHouseholdProfile() {
  return useQuery({queryKey: [...financeKey, "household-profile"],
    queryFn: ({signal}) => request<HouseholdProfile>("/money/household-profile", {signal})});
}
export function useHouseholdNames() {
  const profile = useHouseholdProfile();
  return {mine: profile.data?.firstName ?? tr("Я"), partner: profile.data?.partnerName ?? tr("Партнёр")};
}
export const saveHouseholdProfile = (body: HouseholdProfile) => write<HouseholdProfile>("/money/household-profile", "PUT", body);
