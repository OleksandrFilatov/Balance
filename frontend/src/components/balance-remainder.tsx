import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import type {MoneyOverview,MoneyPeriod} from "@/api/money";
import {formatMoney} from "@/lib/money";
import {useState} from "react";
import {Link} from "react-router";
import {calendarLabel} from "@/lib/calendar-dates";
import {Dialog} from "./ui/dialog";
import {Button} from "./ui/button";
export function BalanceRemainder({money,testId,period}:{money:MoneyOverview;testId:string;period?:MoneyPeriod}){
 const [open,setOpen]=useState(false);
 if(period?.mode==="HISTORY")return <div className="balance-remainder"><span>{tr("Обязательных платежей проведено за месяц")}</span><strong className={money.afterMandatory===null?"balance-pending":""} data-testid={testId}>{formatMoney(period.paidMandatory,money.currency)}</strong><small>{tr("Уже учтены в остатке на конец месяца. Повторно не вычитаются.")}</small></div>;
 const forecast=period?.mode==="FORECAST";
 return <div className="balance-remainder"><span>{tr("После моих обязательных платежей")}</span><strong className={money.afterMandatory===null?"balance-pending":""} data-testid={testId}>{money.afterMandatory===null?tr("Нужно уточнить платежи"):formatMoney(money.afterMandatory,money.currency)}</strong><small>{money.afterMandatory===null?tr("Известно к оплате"):tr("К оплате до конца месяца")}: {formatMoney(money.mandatory,money.currency)}{" "}{tr("· коммуналка, личные платежи и долги")}</small><button type="button" className="deductions-open" onClick={()=>setOpen(true)}>{tr("Из чего складывается →")}</button>
 {open&&<Dialog open title={tr("Мои обязательные платежи")} description={forecast?tr("Платежи выбранного месяца. Ранние обязательства уже учтены в переносе остатка. Просмотр ничего не списывает."):tr("Неоплаченное до ")+calendarLabel(money.until)+tr(", включая просроченное. Это прогноз, деньги сейчас не списываются.")} onClose={()=>setOpen(false)}><div className="deductions-list">{money.deductions.length?money.deductions.map((item,i)=><Link key={item.type+item.date+i} to={item.href} onClick={()=>setOpen(false)}><div><span>{{DEBT:tr("Долг"),HOUSEHOLD:tr("Коммуналка · моя доля"),PERSONAL:tr("Личный платёж")}[item.type]}</span><strong>{categoryName(item)}</strong><small>{forecast?tr("В выбранном месяце"):calendarLabel(item.date)}</small></div><b>{item.amount===null?tr("Уточните долю"):formatMoney(item.amount,money.currency)}</b></Link>):<p className="quiet-empty">{tr("Неоплаченных обязательств за этот период нет.")}</p>}</div><div className="deductions-total"><span>{tr("Всего известных платежей")}</span><strong>{formatMoney(money.mandatory,money.currency)}</strong></div>{money.unknownObligations!=="0"&&<p className="warning-text">{tr("Есть платежи с неуточнённой суммой. Точный остаток пока не рассчитан.")}</p>}<Button variant="secondary" onClick={()=>setOpen(false)}>{tr("Понятно")}</Button></Dialog>}
 </div>;
}
