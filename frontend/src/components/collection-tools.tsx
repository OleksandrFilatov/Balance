import { t as tr } from "@/i18n";
import {ChevronLeft,ChevronRight,Search} from "lucide-react";
import {Input} from "./ui/input";
import {Button} from "./ui/button";

export function CollectionSearch({value,onChange,label,count}:{value:string;onChange:(value:string)=>void;label:string;count:number}){
 return <div className="collection-search"><label><Search size={16}/><Input value={value} onChange={e=>onChange(e.target.value)} placeholder={label} aria-label={label}/></label><span>{count}{" "}{tr("записей")}</span></div>;
}
export function CollectionPages({page,total,onChange}:{page:number;total:number;onChange:(page:number)=>void}){
 if(total<=1)return null;
 return <nav className="collection-pages" aria-label={tr("Страницы списка")}><Button variant="secondary" size="small" disabled={page===0} onClick={()=>onChange(page-1)}><ChevronLeft size={16}/>{tr("Назад")}</Button><span>{page+1} / {total}</span><Button variant="secondary" size="small" disabled={page+1>=total} onClick={()=>onChange(page+1)}>{tr("Далее")}<ChevronRight size={16}/></Button></nav>;
}
