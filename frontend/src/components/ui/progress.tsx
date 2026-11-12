import { getLocale } from "@/i18n";
import type {CSSProperties} from "react";
import {cn} from "@/lib/utils";

export function ProgressBar({value,label,className,tone="accent",caption=false}:{value:string|number|null;label:string;className?:string;tone?:"accent"|"success"|"warning";caption?:boolean}) {
  // Number is used only for presentation; financial amounts and percentages come from Java.
  const parsed=Number(value??0),percent=Number.isFinite(parsed)?Math.max(0,Math.min(100,parsed)):0;
  return <div className={cn("balance-progress",className)} data-tone={tone}>
    {caption&&<div className="balance-progress-caption"><span>{label}</span><strong>{new Intl.NumberFormat(getLocale(),{maximumFractionDigits:1}).format(Number.isFinite(parsed)?parsed:0)}%</strong></div>}
    <div className="balance-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={{"--progress":percent+"%"} as CSSProperties}><span className="balance-progress-fill"/></div>
  </div>;
}
