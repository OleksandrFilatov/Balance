import { t as tr } from "@/i18n";
import {useState,type FormEvent} from "react";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {Clock3,Settings2,Sun,Moon,Trash2,Pencil,Check} from "lucide-react";
import {request,write} from "@/api/client";
import {financeKey} from "@/api/queries";
import {formatMoney,normalizeMoney} from "@/lib/money";
import {berlinToday,calendarLabel} from "@/lib/calendar-dates";
import {PageHeading} from "@/components/app-shell";
import {MonthPicker} from "@/components/month-picker";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {ProgressBar} from "@/components/ui/progress";
import {Dialog} from "@/components/ui/dialog";
import {Field,Input,Select} from "@/components/ui/input";
import {Loading,ErrorNotice} from "@/components/feedback";
import "@/styles/work-calendar.css";
interface Settings {hourlyRate:string;start:string;end:string;birthDate:string|null;saxony:boolean;children:string;childrenUnder25:string;healthExtra:string;version:number}
interface Day {date:string;working:boolean;start:string|null;end:string|null;paidMinutes:string;gross:string;custom:boolean;completed:boolean}
interface Payroll {net:string|null;tax:string|null;solidarity:string|null;pension:string|null;unemployment:string|null;health:string|null;care:string|null;note:string;status:string;taxYear:string|null}
interface Month {month:string;configured:boolean;settings:Settings;days:Day[];shifts:string;paidMinutes:string;hours:string;gross:string;payroll:Payroll;worked:{shifts:string;paidMinutes:string;hours:string;gross:string;payroll:Payroll;deductions:string|null};plannedDeductions:string|null;completionPercent:string}
const duration=(minutes:string)=>{const n=Number(minutes);return Math.floor(n/60)+tr(" ч ")+n%60+tr(" мин");};
export function WorkCalendarPage(){
 const [month,setMonth]=useState(berlinToday().slice(0,7)),[settings,setSettings]=useState(false),[day,setDay]=useState<Day|null>(null),cache=useQueryClient();
 const q=useQuery({queryKey:[...financeKey,"work-calendar",month],queryFn:({signal})=>request<Month>("/work-calendar/"+month,{signal})});
 const updated=async()=>{await cache.invalidateQueries({queryKey:[...financeKey,"work-calendar"]});};
 const mark=useMutation({mutationFn:(d:Day)=>write("/work-calendar/"+month+"/days/"+d.date+"/mark","PUT",{completed:!d.completed,version:q.data!.settings.version}),onSuccess:updated,retry:false});
 const m=q.data,unknownNet=m?.payroll.status==="SETTINGS_REQUIRED"?tr("Нужны параметры"):tr("Не рассчитано"),offset=m?(new Date(month+"-01T12:00:00Z").getUTCDay()+6)%7:0;
 return <><PageHeading title={tr("Мои смены")} description={tr("Рабочие часы и зарплата — отдельно от денег на счёте.")}/><div className="work-toolbar"><MonthPicker value={month} onChange={setMonth} label={tr("Месяц смен")} min="2020-01" max="2100-12"/><Button variant="secondary" onClick={()=>setSettings(true)} disabled={!m}><Settings2 size={16}/>{tr("Часы и ставка")}</Button></div>
 <ErrorNotice error={mark.error}/>{q.error?<ErrorNotice error={q.error} retry={()=>void q.refetch()}/>:!m?<Loading/>:<>
 {!m.configured&&<p className="form-note work-preview">{tr("Предварительный график: пн–пт,")}{" "}{m.settings.start.slice(0,5)}–{m.settings.end.slice(0,5)}{tr(". Проверьте время в «Часы и ставка». Пауза 30 минут уже вычтена.")}</p>}
 {m.payroll.net===null&&<section className="work-net-unavailable" data-testid="work-net-unavailable" role="note"><strong>{m.payroll.status==="UNSUPPORTED_YEAR"?tr("Нетто на ")+m.month.slice(0,4)+tr(" год пока не рассчитывается"):m.payroll.status==="SETTINGS_REQUIRED"?tr("Для нетто нужны параметры"):tr("Расчёт нетто недоступен для этих условий")}</strong><p>{payrollNote(m.payroll.note)}</p></section>}
 <Card className="work-earnings"><div className="work-earnings-heading"><div><span className="eyebrow-label">{tr("По вашим отметкам")}</span><h2>{tr("Работа и заработок")}</h2></div><span>{formatMoney(m.settings.hourlyRate)}{" "}{tr("/ час · пауза 30 мин")}</span></div>
 <div className="work-earned-focus"><span><Check size={18}/>{tr("Уже отработано")}</span><strong data-testid="work-earned-minutes">{duration(m.worked.paidMinutes)}</strong><span>{tr("Заработано до удержаний")}</span><strong data-testid="work-earned-gross">{formatMoney(m.worked.gross)}</strong></div>
 <ProgressBar value={m.completionPercent} label={tr("Отработано ")+duration(m.worked.paidMinutes)+tr(" из ")+duration(m.paidMinutes)} tone="success" caption/>
 <div className="work-earnings-table-wrap"><table className="work-earnings-table" aria-label={tr("Заработок по отметкам и план месяца")}><thead><tr><th scope="col">{tr("Показатель")}</th><th scope="col">{tr("Уже отработано")}</th><th scope="col">{tr("Весь месяц · план")}</th></tr></thead><tbody>
 <tr><th scope="row">{tr("Смены")}</th><td data-testid="work-earned-shifts">{m.worked.shifts}</td><td>{m.shifts}</td></tr>
 <tr><th scope="row">{tr("Часы без паузы")}</th><td>{duration(m.worked.paidMinutes)}</td><td>{duration(m.paidMinutes)}</td></tr>
 <tr><th scope="row">{tr("Брутто")}</th><td>{formatMoney(m.worked.gross)}</td><td><strong data-testid="work-gross">{formatMoney(m.gross)}</strong></td></tr>
 <tr><th scope="row">{tr("Удержания, оценка")}</th><td>{m.worked.deductions===null?unknownNet:formatMoney(m.worked.deductions)}</td><td>{m.plannedDeductions===null?unknownNet:formatMoney(m.plannedDeductions)}</td></tr>
 <tr className="work-net-row"><th scope="row">{tr("На руки, оценка")}</th><td><strong data-testid="work-earned-net">{m.worked.payroll.net===null?unknownNet:formatMoney(m.worked.payroll.net)}</strong></td><td><strong data-testid="work-net">{m.payroll.net===null?unknownNet:formatMoney(m.payroll.net)}</strong></td></tr>
 </tbody></table></div><p className="form-note">{tr("«Уже» — только зелёные смены. Нетто рассчитано при текущем заработке; окончательные удержания зависят от всей зарплаты месяца. Отметка не зачисляет деньги на счёт.")}</p></Card>
 <div className="work-layout"><Card className="work-calendar"><div className="work-weekdays">{[tr("Пн"),tr("Вт"),tr("Ср"),tr("Чт"),tr("Пт"),tr("Сб"),tr("Вс")].map(n=><span key={n}>{n}</span>)}</div><div className="work-grid">{Array.from({length:offset},(_,i)=><div key={"blank"+i} className="work-blank"/>)}{m.days.map(d=><div key={d.date} className={"work-day "+(d.working?"working":"off")+(d.custom?" custom":"")+(d.completed?" completed":"")+(d.date===berlinToday()?" today":"")}>
 <button type="button" className="work-day-date" aria-label={(d.completed?tr("Снять отметку: "):tr("Отметить смену: "))+d.date} aria-pressed={d.completed} disabled={!d.working||mark.isPending} onClick={()=>mark.mutate(d)}><span>{Number(d.date.slice(8))}</span>{d.completed?<Check size={13}/>:d.working?<span className="work-mark-circle"/>:null}</button>
 <button type="button" className="work-day-edit" aria-label={tr("Изменить смену: ")+d.date} onClick={()=>setDay(d)}>{d.working?<><b>{d.start?.slice(0,5)}<span>–{d.end?.slice(0,5)}</span></b><small>{formatMoney(d.gross)}</small>{d.completed&&<span className="work-marked-label">{tr("Отмечено")}</span>}</>:<small>{tr("Выходной")}</small>}</button>
 </div>)}</div><p className="form-note">{tr("Нажмите дату, чтобы отметить смену зелёным. Нажмите часы, чтобы изменить или удалить её. Ночная смена относится к дню начала. Праздники, отпуск и больничные уточняйте вручную.")}</p></Card><Card className="work-calculation"><h2>{tr("Удержания и нетто")}</h2>{m.payroll.net!==null&&<p>{payrollNote(m.payroll.note)}</p>}<div className="work-tax-table-wrap"><table className="work-tax-table"><thead><tr><th scope="col">{tr("Удержание")}</th><th scope="col">{tr("Уже")}</th><th scope="col">{tr("План")}</th></tr></thead><tbody>{([[tr("Подоходный налог"),"tax"],[tr("Солидарный сбор"),"solidarity"],[tr("Пенсионное"),"pension"],[tr("Безработица"),"unemployment"],[tr("Медицинское"),"health"],[tr("Уход"),"care"]] as const).map(([label,key])=><tr key={key}><th scope="row">{label}</th><td>{m.worked.payroll[key]===null?"—":formatMoney(m.worked.payroll[key]!)}</td><td>{m.payroll[key]===null?"—":formatMoney(m.payroll[key]!)}</td></tr>)}</tbody></table></div><p className="form-note">{tr("Обычная занятость · класс I · без церковного налога. Налоги считаются за месяц, поэтому дневное нетто не складывается в итоговое.")}</p>{m.payroll.status==="SETTINGS_REQUIRED"&&<Button variant="secondary" onClick={()=>setSettings(true)}>{tr("Уточнить параметры")}</Button>}</Card></div>
 {settings&&<SettingsForm month={m} close={()=>setSettings(false)} updated={updated}/>}{day&&<DayForm day={day} month={m} close={()=>setDay(null)} updated={updated}/>}
 </>}</>;
}
function ShiftTimes({initialStart,initialEnd}:{initialStart:string;initialEnd:string}){
 const [start,setStart]=useState(initialStart.slice(0,5)),[end,setEnd]=useState(initialEnd.slice(0,5));
 const preset=start==="06:00"&&end==="14:30"?"early":start==="14:30"&&end==="23:00"?"late":null;
 const [custom,setCustom]=useState(preset===null);
 const raw=(Number(end.slice(0,2))*60+Number(end.slice(3))-Number(start.slice(0,2))*60-Number(start.slice(3))+1440)%1440;
 return <div className="form-stack"><div className="shift-choices" role="group" aria-label={tr("Вариант смены")}>
  <Button variant="secondary" aria-label={tr("Утренняя 06:00–14:30")} aria-pressed={!custom&&preset==="early"} onClick={()=>{setStart("06:00");setEnd("14:30");setCustom(false);}}><Sun size={17}/><span>{tr("Утренняя")}<strong>06:00–14:30</strong></span></Button>
  <Button variant="secondary" aria-label={tr("Вечерняя 14:30–23:00")} aria-pressed={!custom&&preset==="late"} onClick={()=>{setStart("14:30");setEnd("23:00");setCustom(false);}}><Moon size={17}/><span>{tr("Вечерняя")}<strong>14:30–23:00</strong></span></Button>
  <Button variant="secondary" aria-label={tr("Редактировать Свои часы")} aria-pressed={custom} onClick={()=>setCustom(true)}><Pencil size={17}/><span>{tr("Редактировать")}<strong>{tr("Свои часы")}</strong></span></Button>
 </div>{custom?<div className="form-grid"><Field label={tr("Начало смены")}><Input type="time" name="start" value={start} onChange={e=>setStart(e.target.value)} required/></Field><Field label={tr("Конец смены")}><Input type="time" name="end" value={end} onChange={e=>setEnd(e.target.value)} required/></Field></div>:<><input type="hidden" name="start" value={start}/><input type="hidden" name="end" value={end}/></>}
 <p className="shift-paid-time" aria-live="polite">{raw>30?<><Clock3 size={16}/><span>{tr("К оплате")}{" "}<strong>{duration(String(raw-30))}</strong>{" "}{tr("· пауза 30 мин не оплачивается")}</span></>:tr("Укажите смену длиннее 30 минут.")}</p></div>;
}
function SettingsForm({month,close,updated}:{month:Month;close:()=>void;updated:()=>Promise<void>}){
 const s=month.settings,save=useMutation({mutationFn:(data:unknown)=>write("/work-calendar/"+month.month,"PUT",data),onSuccess:async()=>{await updated();close();},retry:false});
 const [error,setError]=useState<Error|null>(null);
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(save.isPending)return;const f=new FormData(e.currentTarget);try{setError(null);save.mutate({hourlyRate:normalizeMoney(String(f.get("rate"))),start:f.get("start"),end:f.get("end"),birthDate:f.get("birth")||null,saxony:f.get("state")==="saxony",children:Number(f.get("children")),childrenUnder25:Number(f.get("under25")),healthExtra:normalizeMoney(String(f.get("health")),false),version:s.version});}catch(e){setError(e as Error);}}
 return <Dialog open title={tr("Часы и ставка")} description={tr("Понедельник–пятница. Изменения касаются только выбранного месяца; отдельные изменённые дни сохраняются.")} onClose={close} busy={save.isPending}><form className="form-stack" onSubmit={submit}><fieldset disabled={save.isPending} className="form-stack"><ShiftTimes initialStart={s.start} initialEnd={s.end}/><Field label={tr("Ставка за час, €")}><Input name="rate" inputMode="decimal" defaultValue={s.hourlyRate} required/></Field><details open={!s.birthDate}><summary>{tr("Параметры нетто · класс I")}</summary><div className="form-stack"><Field label={tr("Дата рождения")}><Input type="date" name="birth" min="1900-01-01" max={berlinToday()} defaultValue={s.birthDate??""}/></Field><Field label={tr("Место работы")}><Select name="state" defaultValue={s.saxony?"saxony":"other"}><option value="other">{tr("Германия, кроме Саксонии")}</option><option value="saxony">{tr("Саксония")}</option></Select></Field><div className="form-grid"><Field label={tr("Всего детей")}><Input type="number" min="0" max="20" name="children" defaultValue={s.children} required/></Field><Field label={tr("Детей младше 25")}><Input type="number" min="0" max="5" name="under25" defaultValue={s.childrenUnder25} required/></Field></div><Field label={tr("Zusatzbeitrag страховки, %")}><Input name="health" inputMode="decimal" defaultValue={s.healthExtra} required/></Field><p className="form-note">{tr("Государственная страховка. 2,90% — средняя ставка 2026, проверьте значение вашей Krankenkasse. Церковный налог не начисляется.")}</p></div></details></fieldset><ErrorNotice error={error??save.error}/><div className="dialog-footer"><Button variant="secondary" onClick={close}>{tr("Отмена")}</Button><Button type="submit" disabled={save.isPending}>{tr("Сохранить месяц")}</Button></div></form></Dialog>;
}
function DayForm({day,month,close,updated}:{day:Day;month:Month;close:()=>void;updated:()=>Promise<void>}){
 const save=useMutation({mutationFn:(f:FormData|null)=>write("/work-calendar/"+month.month+"/days/"+day.date,"PUT",{working:f!==null,start:f?.get("start")??null,end:f?.get("end")??null,version:month.settings.version}),onSuccess:async()=>{await updated();close();},retry:false});
 const reset=useMutation({mutationFn:()=>write("/work-calendar/"+month.month+"/days/"+day.date+"?version="+month.settings.version,"DELETE"),onSuccess:async()=>{await updated();close();},retry:false});
 const busy=save.isPending||reset.isPending;
 return <Dialog open title={calendarLabel(day.date)} description={tr("Выберите смену. Изменится только этот день.")} onClose={close} busy={busy}><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!busy)save.mutate(new FormData(e.currentTarget));}}><fieldset className="form-stack" disabled={busy}><ShiftTimes initialStart={day.start??month.settings.start} initialEnd={day.end??month.settings.end}/></fieldset><ErrorNotice error={save.error??reset.error}/><div className="shift-day-actions">{day.custom&&<Button variant="ghost" size="small" disabled={busy} onClick={()=>reset.mutate()}>{tr("По обычному графику")}</Button>}{day.working&&<Button variant="ghost" size="small" className="shift-remove" disabled={busy} onClick={()=>save.mutate(null)}><Trash2 size={15}/>{tr("Удалить смену")}</Button>}</div><div className="dialog-footer"><Button variant="secondary" disabled={busy} onClick={close}>{tr("Отмена")}</Button><Button type="submit" disabled={busy}>{tr("Сохранить смену")}</Button></div></form></Dialog>;
}

function payrollNote(note:string) {
 const unsupported=/^В Balance пока нет расчёта нетто на (\d+) год\. Часы и брутто рассчитаны; налоги и страховые взносы за этот год пока не рассчитаны\.$/.exec(note);
 return unsupported?tr("Нетто за {0} пока недоступно. Часы и брутто рассчитаны; налоги и страховые взносы ещё не рассчитаны.",unsupported[1]):tr(note);
}
