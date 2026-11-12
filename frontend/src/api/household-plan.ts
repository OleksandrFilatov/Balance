import { t as tr } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey } from "./queries";
export interface HouseholdGroup {total:string;mine:string|null;ira:string|null}
export interface HouseholdItem {
 templateId:string;categoryId:string;name:string;split:"PROPORTIONAL"|"EQUAL";
 total:string;mine:string|null;ira:string|null;paymentAmount:string;paymentMine:string|null;paymentIra:string|null;
}
export interface HouseholdPlan {
 myReceiptDate:string;
 month:string;myIncome:string;iraIncome:string;version:number;configured:boolean;
 difference:string;total:string;mine:string|null;ira:string|null;
 lines:{categoryId:string;name:string;total:string;mine:string|null;ira:string|null;split:"PROPORTIONAL"|"EQUAL"}[];
 fixed:HouseholdGroup;additional:HouseholdGroup;minePercent:string|null;iraPercent:string|null;items:HouseholdItem[];
}
export function useHouseholdPlan(month:string) {
 return useQuery({queryKey:[...financeKey,"household-plan",month],queryFn:({signal})=>request<HouseholdPlan>("/money/household-plan?month="+month,{signal}),refetchInterval:15000});
}
export const saveHouseholdIncome=(month:string,mine:string,ira:string,version:number,myReceiptDate?:string)=>write<HouseholdPlan>("/money/household-plan?month="+month,"PUT",{mine,ira,version,myReceiptDate});
export interface BillAmounts {mine:string|null;ira:string|null}
export interface BillItem {id:string;month:string;templateId:string;date:string;categoryId:string;name:string;split:"PROPORTIONAL"|"EQUAL";amount:string;mine:string|null;mineRemaining:string|null;ira:string|null;minePaid:boolean;iraPaid:boolean;legacyTransactionId:string|null}
export interface BillMonth {month:string;planned:BillAmounts;remaining:BillAmounts;items:BillItem[]}
export interface BillPayment {id:string;month:string;person:"MINE"|"IRA";amount:string;operationDate:string;cancelled:boolean}
export interface BillSchedule {month:string;targetMonth:string|null;remaining:string|null;deferred:string;payable:string|null;version:number}
export interface HouseholdStatement {month:string;current:BillMonth;arrears:BillMonth[];previous:BillAmounts;total:BillAmounts;payments:BillPayment[];contribution:BillAmounts;schedules:BillSchedule[];deferralHistory:{id:string;month:string;targetMonth:string;amount:string;action:"DEFER"|"CANCEL";createdAt:string}[]}
export function useHouseholdBills(month:string){return useQuery({queryKey:[...financeKey,"household-bills",month],queryFn:({signal})=>request<HouseholdStatement>("/money/household-bills?month="+month,{signal})});}
export const prepareHouseholdBills=(month:string)=>write<HouseholdStatement>("/money/household-bills/prepare?month="+month,"POST",{});
export const payHouseholdMonth=(month:string,body:{person:"MINE"|"IRA";accountId:string|null;operationDate:string;expected:string;amount?:string},key:string)=>write<BillPayment>("/money/household-bills/pay?month="+month,"POST",body,key);
export const deferHouseholdMonth=(month:string,body:{amount:string;expected:string;version:number},key:string)=>write<BillSchedule>("/money/household-bills/defer?month="+month,"POST",body,key);
export const undoHouseholdDeferral=(schedule:BillSchedule)=>write<BillSchedule>("/money/household-bills/defer/cancel?month="+schedule.month,"POST",{version:schedule.version});
export const cancelHouseholdPayment=(id:string)=>write<BillPayment>("/money/household-bills/payments/"+id+"/cancel","POST",{reason:tr("Ошибочная отметка оплаты месяца")});
