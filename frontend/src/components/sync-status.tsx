import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import {useEffect,useState} from "react";
import {useIsFetching,useQueryClient} from "@tanstack/react-query";
import {RefreshCw,WifiOff} from "lucide-react";
import {financeKey} from "@/api/queries";
export function SyncStatus(){
 const client=useQueryClient(),fetching=useIsFetching({queryKey:financeKey}),[online,setOnline]=useState(navigator.onLine),[last,setLast]=useState<number|null>(null);
 const failed=client.getQueryCache().findAll({queryKey:financeKey}).some(q=>q.getObserversCount()>0&&q.state.status==="error");
 useEffect(()=>{const change=()=>{setOnline(navigator.onLine);if(navigator.onLine)void client.invalidateQueries({queryKey:financeKey,refetchType:"active"});};window.addEventListener("online",change);window.addEventListener("offline",change);return()=>{window.removeEventListener("online",change);window.removeEventListener("offline",change);};},[client]);
 useEffect(()=>{if(!fetching&&!failed&&online)setLast(Date.now());},[fetching,failed,online]);
 const label=!online?tr("Нет сети"):failed?tr("Не удалось обновить"):fetching?tr("Обновляем данные"):last?tr("Обновлено в ")+new Intl.DateTimeFormat(getLocale(),{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"Europe/Berlin"}).format(last):tr("Ожидаем данные");
 return <button type="button" className={"sync-status "+(!online||failed?"sync-error":"")+(fetching?" sync-busy":"")} title={label+tr(". Изменения с других устройств проверяются каждые 30 секунд.")} aria-label={tr("Обновить данные. ")+label} disabled={!online||!!fetching} onClick={()=>void client.invalidateQueries({queryKey:financeKey,refetchType:"active"})}>{!online?<WifiOff size={15}/>:<RefreshCw size={15}/>}<span role="status" aria-live="polite">{label}</span></button>;
}
