import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useHouseholdNames } from "@/api/household-profile";
import { HouseholdMembers } from "@/components/household-members";
import { useEffect, useLayoutEffect, useState } from "react";
import {useMutation} from "@tanstack/react-query";
import { Link } from "react-router";
import {
  Plus,
  Droplets,
  Utensils,
  House,
  Zap,
  Wifi,
  ChevronRight,
  ChevronUp,
  ReceiptText,
} from "lucide-react";
import { useHousehold } from "@/api/money";
import { useRecurring, type Rule } from "@/api/recurring";
import { useAccounts, useCategories, useTransactions,useRefreshFinance } from "@/api/queries";
import { monthRange,monthName } from "@/lib/dates";
import {calendarLabel} from "@/lib/calendar-dates";
import { formatMoney,cents,decimal } from "@/lib/money";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Loading } from "@/components/feedback";
import { HouseBill, HouseBillForm, frequencyNames } from "@/components/house-bills";
import { MoneyList } from "@/components/money-list";
import { useHouseholdPlan,useHouseholdBills,prepareHouseholdBills } from "@/api/household-plan";
import { HouseholdIncome } from "@/components/household-income";
import {HouseholdMonthPayments} from "@/components/household-month-payments";
import {MoneyMonth,useMoneyMonth} from "@/components/money-month";
const known: Record<string, string> = {
  "00000000-0000-0000-0001-000000000002": "rent",
  "00000000-0000-0000-0001-000000000003": "electricity",
  "00000000-0000-0000-0004-000000000001": "water",
  "00000000-0000-0000-0001-000000000004": "internet",
  "00000000-0000-0000-0001-000000000001": "food",
  "00000000-0000-0000-0004-000000000002": "subscriptions",
};
const fixedSections = () => ([
  { key: "water", name: tr("Вода"), icon: Droplets },
  { key: "food", name: tr("Еда"), icon: Utensils },
  { key: "rent", name: tr("Аренда"), icon: House },
  { key: "electricity", name: tr("Электричество"), icon: Zap },
  { key: "internet", name: tr("Интернет"), icon: Wifi },
]);
export function HouseholdPage() {
  const names=useHouseholdNames();
  const selectedMonth=useMoneyMonth(),{month}=selectedMonth;
  const [person,setPerson]=useState<"mine"|"ira">("mine");
  const [editingGroup,setEditingGroup]=useState<"FIXED"|"EXTRA">("EXTRA");
  const [editing, setEditing] = useState<string | true | null>(null),
    [expanded, setExpanded] = useState<string | null>(null);
  const query = useHousehold(month),
    rules = useRecurring(),
    accounts = useAccounts(),
    categories = useCategories(),
    history = useTransactions({
      scope: "HOUSEHOLD",
      type: "EXPENSE",
      ...monthRange(month),
      size: 10,
    });
  const plan=useHouseholdPlan(month);
  const statement=useHouseholdBills(month),refresh=useRefreshFinance();
  const prepare=useMutation({mutationFn:()=>prepareHouseholdBills(month),onSuccess:()=>refresh(),retry:false});
  const sources=rules.data?.map(r=>r.id+":"+r.version).join(",");
  useEffect(()=>{if(sources!==undefined)prepare.mutate();},[month,sources,plan.data?.version]);
  const sectionPlan=(key:string)=>{
    if(!plan.data?.configured)return "—";
    const items=plan.data.items.filter(i=>i.split==="PROPORTIONAL"&&bucket(i.categoryId,i.name)===key);
    return formatMoney(decimal(items.reduce((sum,i)=>sum+cents(i[person]??"0"),0n)));
  };
  const bills =
    rules.data?.filter(
      (r) =>
        r.template.type === "EXPENSE" &&
        r.template.scope === "HOUSEHOLD" &&
        (r.status !== "ARCHIVED" || plan.data?.items.some(i=>i.templateId===r.id)),
    ) ?? [];
  const bucket = (id: string,name="") => {
    const aliases:Record<string,string>={"вода":"water","еда":"food","продукты":"food","аренда":"rent","электричество":"electricity","интернет":"internet","подписки":"subscriptions"};
    return aliases[name.trim().toLowerCase()]??known[id]??aliases[categories.data?.find(c=>c.id===id)?.name.trim().toLowerCase()??""]??"other";
  };
  const selected = fixedSections().find((s) => s.key === expanded),
    selectedData = query.data?.sections.find((s) => s.key === expanded),
    selectedBills = bills.filter(
      (r) => r.template.householdSplit === "PROPORTIONAL" && bucket(r.template.categoryId,r.template.name) === expanded,
    );
  const customBills = bills.filter(
    (r) => r.template.householdSplit === "EQUAL",
  );
  const nextExtraMonth=customBills.filter(r=>r.status==="ACTIVE"&&r.currency==="EUR"&&r.template.firstDate.slice(0,7)>month).map(r=>r.template.firstDate.slice(0,7)).sort()[0];
  const customFixed=bills.filter(r=>r.template.householdSplit==="PROPORTIONAL"&&!fixedSections().some(s=>s.key===bucket(r.template.categoryId,r.template.name)));
  const presentation=(rule:Rule)=>{
    const item=plan.data?.items.find(i=>i.templateId===rule.id),scheduled=!!item&&cents(item.total)>0n;
    return {
      scheduled,
      total:scheduled?item!.total:item?.paymentAmount??rule.template.amount,
      mine:scheduled?item!.mine:item?.paymentMine,
      ira:scheduled?item!.ira:item?.paymentIra,
      note:scheduled?null:rule.status!=="ACTIVE"?tr("Расписание не активно — в итог месяца не входит"):rule.template.firstDate.slice(0,7)>month?tr("Первая оплата ")+calendarLabel(rule.template.firstDate)+tr(". В этот месяц не входит."):rule.template.endDate&&rule.template.endDate<month+"-01"?tr("Срок завершён ")+calendarLabel(rule.template.endDate)+tr(". В этот месяц не входит."):!item&&plan.isFetching?tr("Обновляем расчёт…"):tr("В выбранном месяце оплата не запланирована."),
    };
  };
  const selectedCustomBill = [...customFixed,...customBills].find((r) => "bill:" + r.id === expanded);
  const detailName = selected?.name ?? selectedCustomBill?.template.name;
  const detailBills = selectedCustomBill ? [selectedCustomBill] : selectedBills;
  useLayoutEffect(() => {
    if (expanded && matchMedia("(max-width:800px)").matches)
      document
        .getElementById("household-category-detail")
        ?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [expanded]);
  return (
    <>
      <PageHeading
        title={tr("Коммуналка и дом")}
        description={tr("Оплата счетов и повседневные расходы на дом.")}
      />
      <div className="daily-toolbar">
        <MoneyMonth {...selectedMonth} onChange={selectedMonth.setMonth} label={tr("Месяц домашних расходов")} household/>
        <Link className="text-link" to="/calendar">{" "}{tr("Календарь оплат →")}{" "}</Link>
      </div>
      <HouseholdMembers/>
      <ErrorNotice error={plan.error}/>
      <ErrorNotice error={statement.error??prepare.error}/>
      {plan.data&&<HouseholdIncome key={month} plan={plan.data} restriction={statement.data?.schedules.some(s=>s.month===month&&cents(s.deferred)>0n)?"DEFERRED":statement.data?.payments.some(p=>p.month===month&&!p.cancelled)?"PAID":undefined} onReviewPayments={()=>{setPerson("mine");requestAnimationFrame(()=>{const el=document.getElementById("household-settlement");el?.scrollIntoView({behavior:"smooth",block:"start"});el?.focus({preventScroll:true});});}}/>}
      {query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : !query.data ? (
        <Loading />
      ) : (
        <>
          <div className="household-person-totals" role="group" aria-label={tr("Выберите, чьи платежи показать")}>
            {(["mine","ira"] as const).map(p=><Card key={p} className={"daily-total household-person-total "+(person===p?"is-selected":"")} role="button" tabIndex={0} aria-pressed={person===p} onClick={()=>setPerson(p)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setPerson(p);}}} aria-label={p==="mine"?tr("Мой итог"):tr("Итог: {0}",names.partner)}>
              <span className="household-person-label">{p==="mine"?tr("К оплате · {0}",names.mine):tr("Доля: {0} · {1}",names.partner,monthName(month))} <span className={"person-selection-mark "+(person===p?"selected":"")} aria-hidden="true">{person===p?"✓":""}</span></span>
              <strong data-testid={person===p?"household-spent":undefined}><span data-testid={"household-total-"+p}>{statement.data?.contribution[p]!=null?formatMoney(statement.data.contribution[p]!):"—"}</span></strong>
              {p==="mine"&&<dl className="household-total-parts">
                <div><dt>{tr("За выбранный месяц")}</dt><dd data-testid={"household-current-"+p}>{statement.data?.current.remaining[p]!=null?formatMoney(statement.data.current.remaining[p]!):"—"}</dd></div>
                <div><dt>{tr("Долг прошлых месяцев")}</dt><dd data-testid={"household-previous-"+p}>{statement.data?.previous[p]!=null?formatMoney(statement.data.previous[p]!):"—"}</dd></div>
              </dl>}
              {p==="ira"&&<p className="form-note ira-month-note">{tr("Только выбранный месяц. Без переноса задолженности.")}</p>}
              <dl className="household-total-parts household-month-plan-parts" aria-label={tr("План выбранного месяца")}>
                <div><dt>{tr("Постоянные платежи")}</dt><dd data-testid={"household-fixed-"+p}>{plan.data?.fixed[p]!=null?formatMoney(plan.data.fixed[p]!):"—"}</dd></div>
                <div><dt>{tr("Дополнительные · 50/50")}</dt><dd data-testid={"household-extra-"+p}>{plan.data?.additional[p]!=null?formatMoney(plan.data.additional[p]!):"—"}</dd></div>
              </dl>
              {nextExtraMonth&&plan.data&&cents(plan.data.additional.total)===0n&&<UpcomingExtraNote month={month} nextMonth={nextExtraMonth} person={p} onOpen={()=>setPerson(p)}/>}
            </Card>)}
          </div>
          {statement.data&&<div id="household-settlement" tabIndex={-1}><HouseholdMonthPayments key={month+person} statement={statement.data} person={person}/></div>}
          {plan.data?.fixed.mine===null&&<p className="form-note">{tr("Укажите зарплаты выше для постоянных платежей. Дополнительные покупки уже поделены пополам.")}</p>}
          <div className="household-group-toolbar"><h2 className="household-group-heading">{tr("Постоянные платежи")}{" "}<span>{tr("По доходам")}</span></h2><Button variant="secondary" size="small" onClick={()=>{setEditingGroup("FIXED");setEditing(true);}}><Plus size={16}/>{tr("Добавить постоянный платёж")}</Button></div>
          <div className="home-sections">
            {fixedSections().map((section) => {
              const s = query.data.sections.find((s) => s.key === section.key);
              if (!s) return null;
              const Icon = section.icon;
              return (
                <div
                  key={s.key}
                  className="home-section"
                  data-category-key={s.key}
                >
                  <button
                    type="button"
                    className={
                      "home-category-button " +
                      (expanded === s.key ? "selected" : "")
                    }
                    aria-label={section.name}
                    aria-expanded={expanded === s.key}
                    aria-controls="household-category-detail"
                    onClick={() =>
                      setExpanded(expanded === s.key ? null : s.key)
                    }
                  >
                    <span className="home-category-icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="home-category-name">{categoryName(section)}</span>
                    <span className="section-spent">
                      {sectionPlan(s.key)} <small>{tr("к оплате за месяц")}</small>
                    </span>
                    <ChevronRight
                      className="home-category-arrow"
                      size={17}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              );
            })}
            {customFixed.map(r=>{
              const view=presentation(r),share=person==="mine"?view.mine:view.ira;
              return <div className="home-section" key={r.id} data-payment-id={r.id} data-period-status={view.scheduled?"scheduled":"outside-month"}>
                <button type="button" className={"home-category-button "+(expanded==="bill:"+r.id?"selected":"")} aria-label={r.template.name} aria-expanded={expanded==="bill:"+r.id} aria-controls="household-category-detail" onClick={()=>setExpanded(expanded==="bill:"+r.id?null:"bill:"+r.id)}>
                  <span className="home-category-icon"><ReceiptText size={22}/></span><span className="home-category-name">{categoryName(r.template)}</span>
                  <span className="section-spent" data-testid={"fixed-share-"+r.id}>{share!=null?formatMoney(share):"—"}<small>{view.scheduled?tr("доля за месяц · по доходам"):tr("доля платежа · по доходам")}</small></span>
                  {view.note&&<span className="additional-payment-note">{view.note}</span>}<ChevronRight className="home-category-arrow" size={17}/>
                </button>
                {!view.scheduled&&r.template.firstDate.slice(0,7)>month&&<Link className="household-schedule-link" to={"/household?month="+r.template.firstDate.slice(0,7)}>{tr("Показать")}{" "}{monthName(r.template.firstDate.slice(0,7))} →</Link>}
              </div>;
            })}
          </div>
          <div className="household-group-toolbar"><h2 className="household-group-heading">{tr("Дополнительные расходы")}{" "}<span>50/50</span></h2><Button variant="secondary" size="small" onClick={()=>{setEditingGroup("EXTRA");setEditing(true);}}><Plus size={16}/>{tr("Добавить дополнительный расход")}</Button></div>
          <div className="home-sections additional-expenses">
            {customBills.map((r) => {
              const key = "bill:" + r.id;
              const item = plan.data?.items.find(i=>i.templateId===r.id),view=presentation(r);
              return (
                <div key={key} className="home-section" data-payment-id={r.id} data-period-status={view.scheduled?"scheduled":"outside-month"}>
                  <button
                    type="button"
                    className={"home-category-button " + (expanded === key ? "selected" : "")}
                    aria-label={r.template.name}
                    aria-expanded={expanded === key}
                    aria-controls="household-category-detail"
                    onClick={() => setExpanded(expanded === key ? null : key)}
                  >
                    <span className="home-category-icon">
                      <ReceiptText size={22} aria-hidden="true" />
                    </span>
                    <span className="home-category-name">{categoryName(r.template)}</span>
                    <span className="section-spent">
                      <span data-testid={"extra-full-"+r.id}>{formatMoney(view.total,r.currency)}</span>
                      <small>{view.scheduled?tr("полная сумма за месяц"):tr("полная сумма платежа")}</small>
                    </span>
                    <span className="additional-share-lines">
                      <span>{tr("Мне · 50%")}<strong data-testid={"extra-mine-"+r.id}>{view.mine!=null?formatMoney(view.mine,r.currency):"—"}</strong></span>
                      <span>{tr("{0} · 50%",names.partner)}<strong data-testid={"extra-ira-"+r.id}>{view.ira!=null?formatMoney(view.ira,r.currency):"—"}</strong></span>
                    </span>
                    {r.template.endDate&&view.scheduled&&<span className="additional-payment-note">{tr("Платить до")}{" "}{calendarLabel(r.template.endDate)}{" "}{tr("включительно")}</span>}{view.note&&<span className="additional-payment-note" data-testid={"payment-period-note-"+r.id}>{view.note}</span>}
                    {view.scheduled&&item&&item.total!==item.paymentAmount&&<span className="additional-payment-note">{tr("Платёж")}{" "}{formatMoney(item.paymentAmount,r.currency)} · {frequencyNames()[r.template.frequency]?.toLowerCase()}</span>}
                    <ChevronRight className="home-category-arrow" size={17} aria-hidden="true" />
                  </button>
                  {!view.scheduled&&r.template.firstDate.slice(0,7)>month&&<Link className="household-schedule-link" to={"/household?month="+r.template.firstDate.slice(0,7)}>{tr("Показать")}{" "}{monthName(r.template.firstDate.slice(0,7))} →</Link>}
                </div>
              );
            })}
          </div>
          {!customBills.length&&<p className="quiet-empty">{tr("Здесь будут дополнительные покупки, поделённые пополам.")}</p>}
          {detailName && (selectedData || selectedCustomBill) && (
            <Card
              id="household-category-detail"
              className="daily-panel home-category-detail"
              role="region"
              aria-label={tr("Платежи: ") + detailName}
            >
              <div className="panel-heading">
                <h2>{detailName}</h2>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setExpanded(null)}
                >
                  <ChevronUp size={16} />{" "}{tr("Свернуть")}{" "}</Button>
              </div>
              {detailBills.map((r) => (
                <HouseBill
                  key={r.id}
                  rule={r}
                  hideName={r.template.name === detailName}
                  monthly
                  selectedMonth={month}
                />
              ))}
              {!detailBills.length && selectedData && (
                <div className="category-empty">
                  <p className="form-note">{" "}{tr("Добавьте сумму и дату постоянного платежа.")}{" "}</p>
                  <Button
                    variant="secondary"
                    disabled={!selectedData.categoryId}
                    onClick={() => setEditing(selectedData.categoryId!)}
                  >
                    <Plus size={16} />{" "}{tr("Указать сумму")}{" "}</Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}
      <ErrorNotice error={rules.error ?? categories.error} />
      <details className="daily-details">
        <summary>{tr("История домашних расходов")}</summary>
        <Card className="daily-panel">
          <ErrorNotice error={history.error ?? accounts.error} />
          {history.data && accounts.data && categories.data ? (
            <>
              <MoneyList
                transactions={history.data.content}
                accounts={accounts.data}
                categories={categories.data}
              />
              {!history.data.content.length && (
                <p className="quiet-empty">{tr("Домашних расходов пока нет.")}</p>
              )}
              <Link
                className="text-link"
                to={
                  "/transactions?scope=HOUSEHOLD&type=EXPENSE&from=" +
                  monthRange(month).from +
                  "&to=" +
                  monthRange(month).to
                }
              >{" "}{tr("Вся история →")}{" "}</Link>
            </>
          ) : (
            <Loading />
          )}
        </Card>
      </details>
      {editing && (
        <HouseBillForm
          categoryId={typeof editing === "string" ? editing : undefined}
          group={editingGroup}
          selectedMonth={month}
          onCreated={firstDate=>{if(firstDate.slice(0,7)>month)selectedMonth.setMonth(firstDate.slice(0,7));}}
          fixedName={
            typeof editing === "string"
              ? fixedSections().find(
                  (s) =>
                    query.data?.sections.find((r) => r.key === s.key)
                      ?.categoryId === editing,
                )?.name
              : undefined
          }
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}

function UpcomingExtraNote({month,nextMonth,person,onOpen}:{month:string;nextMonth:string;person:"mine"|"ira";onOpen:()=>void}){
 const q=useHouseholdPlan(nextMonth),amount=q.data?.additional[person];
 return <div className="household-upcoming-extra" data-testid={"household-upcoming-extra-"+person}><span>{tr("За")}{" "}{monthName(month)}{" "}{tr("дополнительных начислений нет.")}</span><Link to={"/household?month="+nextMonth} onClick={e=>{e.stopPropagation();onOpen();}} onKeyDown={e=>e.stopPropagation()}><span>{tr("План на")}{" "}{monthName(nextMonth)}</span><strong>{amount!=null?formatMoney(amount):q.error?tr("Открыть счета"):tr("Считаем…")}<ChevronRight size={14}/></strong></Link></div>;
}
