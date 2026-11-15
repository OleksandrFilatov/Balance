import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Link} from "react-router";
import {request} from "@/api/client";
import {financeKey,useCategories} from "@/api/queries";
import {t} from "@/i18n";
import {categoryName} from "@/i18n/category-names";
import {calendarLabel} from "@/lib/calendar-dates";
import {monthName} from "@/lib/dates";
import {formatMoney} from "@/lib/money";
import {Button} from "./ui/button";
import {ErrorNotice} from "./feedback";

interface Source {id:string;name:string;date:string|null;amount:string;kind:string;href:string;categoryId:string|null}
export function ExpectedIncomeSources({month,currency}:{month:string;currency:string}){
 const [expanded,setExpanded]=useState(false),categories=useCategories();
 const q=useQuery({queryKey:[...financeKey,"cash-outlook",month,currency],queryFn:({signal})=>request<{expected:Source[]}>("/summary/outlook?"+new URLSearchParams({month,currency}),{signal})});
 if(q.error)return <ErrorNotice error={q.error} retry={()=>void q.refetch()}/>;
 if(!q.data)return <p className="income-source-state" role="status">{t("Загружаем источники доходов…")}</p>;
 if(!q.data.expected.length)return <p className="income-source-state">{t("Ожидаемых поступлений нет.")}</p>;
 const rows=q.data.expected;
 return <section className="expected-income-sources" aria-label={t("Откуда ожидаются деньги")} data-testid="expected-income-sources">
  <span className="income-sources-heading">{t("Откуда поступят")}</span>
  <ul>{(expanded?rows:rows.slice(0,4)).map(row=>{
   const plan=row.kind==="SALARY",salary=row.categoryId==="00000000-0000-0000-0002-000000000001";
   const category=categories.data?.find(c=>c.id===row.categoryId);
   const fallback=salary?t("Зарплата"):category?categoryName(category):t("Ожидаемый доход");
   const title=plan?t("Из плана зарплаты"):!row.name||row.name==="Ожидаемый доход"?fallback:row.name;
   const workMonth=plan&&/^salary\/\d{4}-\d{2}$/.test(row.id)?row.id.slice(7):null;
   return <li key={row.id}><Link to={row.href} className="expected-income-source" data-source-kind={plan?"PLAN":"OPERATION"}>
    <span className="income-source-copy"><strong>{title}</strong><small>{row.date?calendarLabel(row.date):t("Дата не указана")}{workMonth?" · "+t("за {0}",monthName(workMonth)):title!==fallback?" · "+fallback:""}</small>{plan&&<small className="income-plan-note">{t("Оставшаяся часть плана зарплаты")}</small>}</span>
    <b>{formatMoney(row.amount,currency)}</b>
   </Link></li>;
  })}</ul>
  {rows.length>4&&<Button variant="ghost" size="small" className="income-sources-more" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?t("Свернуть"):t("Ещё поступлений: {0}",rows.length-4)}</Button>}
 </section>;
}
