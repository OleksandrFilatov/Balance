import { t as tr } from "@/i18n";
import {useRef,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {request,api} from "@/api/client";
import {financeKey,useRefreshFinance} from "@/api/queries";
import {useAuth} from "@/providers/auth";
import {Dialog} from "./ui/dialog";
import {Button} from "./ui/button";
import {Field,Input} from "./ui/input";
import {ErrorNotice} from "./feedback";
export function OwnerSetup(){
 const status=useQuery({queryKey:[...financeKey,"owner"],queryFn:()=>request<{registered:boolean}>("/owner")});
 const [dismissed,setDismissed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<Error|null>(null);
 const guard=useRef(false),auth=useAuth(),refresh=useRefreshFinance();
 if(!status.data||status.data.registered||dismissed)return null;
 return <Dialog open title={tr("Ваш личный аккаунт")} description={tr("Придумайте имя и пароль. Аккаунт сохраняется на этом компьютере — создавать его заново не потребуется.")} onClose={()=>setDismissed(true)} busy={busy}>
 <form className="form-stack" onSubmit={async e=>{e.preventDefault();if(guard.current)return;const form=new FormData(e.currentTarget),username=String(form.get("username")).trim(),password=String(form.get("password"));if(password!==form.get("repeat")){setError(new Error(tr("Пароли не совпадают")));return;}guard.current=true;setBusy(true);setError(null);try{await api.registerOwner(username,password);await auth.login(username,password);await refresh();setDismissed(true);}catch(error){setError(error as Error);}finally{guard.current=false;setBusy(false);}}}>
 <Field label={tr("Ваше имя")}><Input name="username" autoComplete="username" maxLength={100} required disabled={busy}/></Field>
 <Field label={tr("Ваш пароль")}><Input name="password" type="password" autoComplete="new-password" maxLength={1024} required disabled={busy}/></Field>
 <Field label={tr("Повторите пароль")}><Input name="repeat" type="password" autoComplete="new-password" maxLength={1024} required disabled={busy}/></Field>
 <ErrorNotice error={error}/><Button type="submit" disabled={busy}>{tr("Создать мой аккаунт")}</Button>
 </form></Dialog>;
}
