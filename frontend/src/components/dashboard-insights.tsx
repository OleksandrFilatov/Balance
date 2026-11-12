import { categoryName } from "@/i18n/category-names";
import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import {Link} from "react-router";
import {ArrowUpRight,Target,Check} from "lucide-react";
import {useGoals} from "@/api/savings";
import {formatMoney} from "@/lib/money";
import {ProgressBar} from "./ui/progress";
import {ErrorNotice,Loading} from "./feedback";

export function DashboardInsights(){
 const q=useGoals(),rows=q.data?.filter(g=>g.status!=="ARCHIVED").sort((a,b)=>(Number(a.forecast.percent)>=100?1:0)-(Number(b.forecast.percent)>=100?1:0)||(a.deadline??"9999").localeCompare(b.deadline??"9999")||a.name.localeCompare(b.name,"ru")).slice(0,6)??[];
 return <section className="home-goal-widgets" aria-label={tr("Мои цели")}><div className="panel-heading"><div><span className="eyebrow-label">{tr("Шаг за шагом")}</span><h2>{tr("Мои цели")}</h2></div><Link className="text-link" to="/savings">{tr("Все цели")}{" "}<ArrowUpRight size={15}/></Link></div>
 {q.error?<ErrorNotice error={q.error}/>:!q.data?<Loading label={tr("Загружаем ваши цели")}/>:!rows.length?<Link to="/savings" className="home-goal-empty"><Target size={20}/><span>{tr("Добавьте цель — здесь появится ваш прогресс")}</span><ArrowUpRight size={16}/></Link>:<div className="home-goal-grid">{rows.map((g,index)=>{const complete=Number(g.forecast.percent)>=100;return <Link key={g.id} to={"/savings/"+g.id} className="home-goal-widget" data-testid="dashboard-goal" data-tone={index%3}>
  <div className="home-goal-top"><span className="home-goal-symbol">{complete?<Check size={18}/>:<Target size={18}/>}</span><span>{complete?tr("Достигнута"):g.deadline?new Intl.DateTimeFormat(getLocale(),{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(g.deadline+"T12:00:00Z")):tr("В вашем темпе")}</span><ArrowUpRight size={15}/></div>
  <h3>{categoryName(g)}</h3><div className="home-goal-value"><strong>{formatMoney(g.reserved,g.currency)}</strong><span>{tr("из")}{" "}{formatMoney(g.target,g.currency)}</span></div>
  <ProgressBar value={g.forecast.percent} label={tr("Цель: ")+g.name} tone={complete?"success":"accent"}/><div className="home-goal-bottom"><span>{complete?tr("Цель достигнута"):tr("Осталось ")+formatMoney(g.forecast.remaining,g.currency)}</span><b>{new Intl.NumberFormat(getLocale(),{maximumFractionDigits:1}).format(Number(g.forecast.percent))}%</b></div>
 </Link>;})}</div>}</section>;
}
