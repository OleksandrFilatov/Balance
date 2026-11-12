import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {berlinToday} from '../src/lib/calendar-dates';
import {formatMoney} from '../src/lib/money';

test('goal cards calculate contributions from remaining savings and refresh when deadline changes',async({page},info)=>{
 expect((await page.request.get('/api/health')).headers()['x-balance-test-database']).toBe('isolated');
 const user='ui-test',password='isolated-browser-tests-only-12345',headers={Authorization:'Basic '+Buffer.from(user+':'+password).toString('base64')};
 async function read(path:string){const r=await page.request.get('/api'+path,{headers});expect(r.ok(),await r.text()).toBe(true);return r.status()===204?null:r.json();}
 async function write(path:string,data:unknown){const csrf=await read('/csrf');const r=await page.request.post('/api'+path,{headers:{...headers,[csrf.headerName]:csrf.token,'Idempotency-Key':randomUUID()},data});expect(r.ok(),await r.text()).toBe(true);return r.status()===204?null:r.json();}
 function deadline(months:number){const today=new Date(berlinToday()+'T12:00:00Z'),day=today.getUTCDate();today.setUTCDate(1);today.setUTCMonth(today.getUTCMonth()+months);const last=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+1,0)).getUTCDate();today.setUTCDate(Math.min(day,last));return today.toISOString().slice(0,10);}
 const suffix=info.project.name+Date.now(),bank=await write('/accounts',{name:'Goal plan '+suffix,type:'BANK',currency:'EUR',initialBalance:'1000'}),before=await read('/balances');
 const goal=await write('/savings',{name:'Deadline '+suffix,description:'',target:'1000',currency:'EUR',deadline:deadline(2),monthlyPlan:'25'});
 await page.goto('/savings');await page.getByLabel('Имя пользователя',{exact:true}).fill(user);await page.getByLabel('Пароль',{exact:true}).fill(password);await page.getByRole('button',{name:'Войти в Balance',exact:true}).click();
 const card=page.locator('.goal-card').filter({has:page.getByRole('heading',{name:goal.name,exact:true})});await expect(card.getByTestId('goal-required-monthly')).toContainText(formatMoney('333.34'));
 await write('/savings/'+goal.id+'/allocate',{accountId:bank.id,amount:'100',note:'Synthetic reserve'});await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(card.getByTestId('goal-required-monthly')).toContainText(formatMoney('300.00'));
 await card.getByRole('button',{name:'Редактировать: '+goal.name,exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Дата достижения',{exact:true}).fill(deadline(1));await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(card.getByTestId('goal-required-monthly')).toContainText(formatMoney('450.00'));
 await card.getByRole('link',{name:goal.name,exact:true}).click();await expect(page.locator('.goal-detail').first().getByTestId('goal-required-monthly')).toContainText(formatMoney('450.00'));expect(await read('/balances')).toEqual(before);
 await page.getByRole('combobox',{name:'Язык интерфейса',exact:true}).selectOption('en');await expect(page.getByTestId('goal-deadline-plan')).toContainText('First contribution now');await expect(page.getByTestId('goal-required-monthly')).toContainText('450.00');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

