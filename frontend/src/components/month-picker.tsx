import { t as tr } from "@/i18n";
import {useId,useRef,useState} from "react";
import * as Popover from "@radix-ui/react-dialog";
import {CalendarDays,ChevronDown,ChevronLeft,ChevronRight} from "lucide-react";
import {monthName} from "@/lib/dates";
import {berlinToday,moveCalendar} from "@/lib/calendar-dates";
import {Button} from "./ui/button";

const names = () => ([tr("Январь"),tr("Февраль"),tr("Март"),tr("Апрель"),tr("Май"),tr("Июнь"),tr("Июль"),tr("Август"),tr("Сентябрь"),tr("Октябрь"),tr("Ноябрь"),tr("Декабрь")]);
export function MonthPicker({value,onChange,label="Выбрать месяц",min="0001-01",max="9999-12",navigation=true}:{value:string;onChange:(value:string)=>void;label?:string;min?:string;max?:string;navigation?:boolean}){
 const [open,setOpen]=useState(false),[year,setYear]=useState(Number(value.slice(0,4))),[position,setPosition]=useState({top:0,left:0,width:310});
 const trigger=useRef<HTMLButtonElement>(null),heading=useId(),current=berlinToday().slice(0,7);
 function changeOpen(next:boolean){
  if(next&&trigger.current){const rect=trigger.current.getBoundingClientRect(),width=Math.min(310,innerWidth-24);setPosition({width,left:Math.max(12,Math.min(rect.left,innerWidth-width-12)),top:Math.max(12,rect.bottom+8+320<innerHeight?rect.bottom+8:Math.min(rect.top-320,innerHeight-332))});setYear(Number(value.slice(0,4)));}
  setOpen(next);
 }
 return <div className="month-picker-control">{navigation&&<Button variant="ghost" size="icon" aria-label={tr("Предыдущий месяц: ")+label} disabled={value<=min} onClick={()=>onChange(moveCalendar(value+"-01","month",-1).slice(0,7))}><ChevronLeft size={16}/></Button>}<Popover.Root open={open} onOpenChange={changeOpen} modal={false}>
  <Popover.Trigger asChild><Button ref={trigger} variant="secondary" className="month-picker-trigger" aria-label={label} aria-description={monthName(value)} data-month={value}><CalendarDays size={16}/><span>{monthName(value)}</span><ChevronDown size={14}/></Button></Popover.Trigger>
  <Popover.Portal><Popover.Content className="month-picker-popover" style={{top:position.top,left:position.left,width:position.width}} aria-labelledby={heading} onOpenAutoFocus={event=>{event.preventDefault();requestAnimationFrame(()=>document.getElementById(heading)?.closest('[role="dialog"]')?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus());}}>
   <Popover.Title id={heading} className="sr-only">{tr("Выберите месяц")}</Popover.Title><Popover.Description className="sr-only">{tr("Все месяцы выбранного года. Стрелки переключают год.")}</Popover.Description>
   <div className="month-picker-year"><Button variant="ghost" size="icon" aria-label={tr("Предыдущий год")} disabled={year<=Number(min.slice(0,4))} onClick={()=>setYear(year-1)}><ChevronLeft size={17}/></Button><strong aria-live="polite">{year}</strong><Button variant="ghost" size="icon" aria-label={tr("Следующий год")} disabled={year>=Number(max.slice(0,4))} onClick={()=>setYear(year+1)}><ChevronRight size={17}/></Button></div>
   <div className="month-picker-grid">{names().map((name,index)=>{const month=String(year).padStart(4,"0")+"-"+String(index+1).padStart(2,"0");return <Button key={month} variant="ghost" aria-label={name+" "+year} aria-pressed={month===value} disabled={month<min||month>max} className={month===current?"is-current-month":""} onClick={()=>{onChange(month);setOpen(false);}}>{name}</Button>;})}</div>
   {current>=min&&current<=max&&<Button variant="ghost" size="small" className="month-picker-today" onClick={()=>{onChange(current);setOpen(false);}}>{tr("Текущий месяц")}</Button>}
  </Popover.Content></Popover.Portal>
 </Popover.Root>{navigation&&<Button variant="ghost" size="icon" aria-label={tr("Следующий месяц: ")+label} disabled={value>=max} onClick={()=>onChange(moveCalendar(value+"-01","month",1).slice(0,7))}><ChevronRight size={16}/></Button>}</div>;
}
