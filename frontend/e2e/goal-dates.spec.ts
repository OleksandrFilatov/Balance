import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {berlinToday} from '../src/lib/calendar-dates';
import {navigateTo} from './helpers';
import {formatMoney,cents,decimal} from '../src/lib/money';

test('dated goal is saved and unfunded monthly contributions appear in payments',async({page},info)=>{
 expect((await page.request.get('/api/health')).headers()['x-balance-test-database']).toBe('isolated');
 const headers={Authorization:'Basic '+Buffer.from('ui-test:isolated-browser-tests-only-12345').toString('base64')};
 async function read(path:string){const r=await page.request.get('/api'+path,{headers});expect(r.ok(),await r.text()).toBe(true);return r.json();}
 async function post(path:string,data:unknown){const csrf=await read('/csrf');const r=await page.request.post('/api'+path,{headers:{...headers,[csrf.headerName]:csrf.token,'Idempotency-Key':randomUUID()},data});expect(r.ok(),await r.text()).toBe(true);return r.status()===204?null:r.json();}
 const month=berlinToday().slice(0,7),start=month+'-01',date=new Date(start+'T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+2);const end=date.toISOString().slice(0,10),name='Dated '+info.project.name+' '+Date.now();
 const bank=await post('/accounts',{name,type:'BANK',currency:'EUR',initialBalance:'1000'}),before=await read('/balances'),base=await read('/money?currency=EUR');
 await page.goto('/savings');await page.getByLabel('Имя пользователя',{exact:true}).fill('ui-test');await page.getByLabel('Пароль',{exact:true}).fill('isolated-browser-tests-only-12345');await page.getByRole('button',{name:'Войти в Balance',exact:true}).click();
 await page.getByRole('button',{name:'Новая цель',exact:true}).click();const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Название цели',{exact:true}).fill(name);await dialog.getByLabel('Целевая сумма, EUR',{exact:true}).fill('300.01');await dialog.getByLabel('Дата начала цели',{exact:true}).fill(start);await dialog.getByLabel('Дата окончания цели',{exact:true}).fill(end);
 await dialog.screenshot({path:info.outputPath('goal-dates-editor.png'),animations:'disabled'});await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0);
 const goal=(await read('/savings')).find((g:any)=>g.name===name);expect(goal.startDate).toBe(start);expect(goal.deadline).toBe(end);expect(goal.monthlyContribution).toBe(100.01);
 await navigateTo(page,'/money');await expect(page.getByTestId('mandatory-goals')).toHaveText(formatMoney(decimal(cents(String(base.breakdown.goals.amount))+10001n)));
 await post('/savings/'+goal.id+'/allocate',{accountId:bank.id,amount:'40',note:'Synthetic contribution'});await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.getByTestId('mandatory-goals')).toHaveText(formatMoney(decimal(cents(String(base.breakdown.goals.amount))+6001n)));
 await navigateTo(page,'/savings');const card=page.locator('.goal-card').filter({has:page.getByRole('heading',{name,exact:true})});await card.getByRole('button',{name:'Приостановить цель: '+name,exact:true}).click();await expect(card.getByTestId('goal-paused')).toBeVisible();
 await navigateTo(page,'/money');await expect(page.getByTestId('mandatory-goals')).toHaveText(formatMoney(String(base.breakdown.goals.amount)));
 await navigateTo(page,'/savings');await card.getByRole('button',{name:'Возобновить цель: '+name,exact:true}).click();await expect(card.getByTestId('goal-paused')).toHaveCount(0);await expect(card.getByRole('button',{name:'Приостановить цель: '+name,exact:true})).toBeEnabled();
 const resumed=(await read('/savings')).find((g:any)=>g.id===goal.id);expect(resumed.startDate).toBe(start);expect(resumed.deadline).toBe(end);expect(resumed.reserved).toBe(40);
 await navigateTo(page,'/money');await expect(page.getByTestId('mandatory-goals')).toHaveText(formatMoney(decimal(cents(String(base.breakdown.goals.amount))+6001n)));
 expect(await read('/balances')).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
