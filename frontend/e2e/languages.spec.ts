import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {navigateTo} from './helpers';
const user='ui-test',password='isolated-browser-tests-only-12345';
for(const [locale,language,label,heading] of [['de-DE','de','Sprache der Oberfläche','Willkommen zurück.'],['en-GB','en','Interface language','Welcome back.'],['ru-RU','ru','Язык интерфейса','С возвращением.']]){
 test.describe('device '+locale,()=>{test.use({locale});test('detects device language and remembers manual choice',async({page})=>{
  await page.goto('/');await expect(page.locator('html')).toHaveAttribute('lang',language);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:label,exact:true}).selectOption('en');await expect(page.locator('html')).toHaveAttribute('lang','en');await page.reload();await expect(page.getByRole('heading',{name:'Welcome back.',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Interface language',exact:true}).selectOption('auto');await expect(page.locator('html')).toHaveAttribute('lang',language);
 });});
}
test('switching all sections keeps login, financial data and custom names',async({page})=>{
 expect((await page.request.get('/api/health')).headers()['x-balance-test-database']).toBe('isolated');
 const headers={Authorization:'Basic '+Buffer.from(user+':'+password).toString('base64')};
 const read=async(path:string)=>(await page.request.get('/api'+path,{headers})).json();
 const before=await read('/balances');
 await page.goto('/');await page.getByLabel('Имя пользователя',{exact:true}).fill(user);await page.getByLabel('Пароль',{exact:true}).fill(password);await page.getByRole('button',{name:'Войти в Balance',exact:true}).click();await expect(page.getByTestId('total-balance')).toBeVisible();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('combobox',{name:'Язык интерфейса',exact:true}).selectOption('en');await expect(page.getByTestId('total-balance')).toBeVisible();
 for(const [path,title] of [['/money','My money'],['/household','Bills & household'],['/debts','Debts'],['/savings','Savings'],['/calendar','Payment calendar'],['/statistics','Statistics'],['/work-calendar','My shifts']]){await navigateTo(page,path);await expect(page.locator('main h1')).toHaveText(title);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await navigateTo(page,'/household');await page.getByRole('button',{name:'Members',exact:true}).click();let d=page.getByRole('dialog');await d.getByLabel('Your name',{exact:true}).fill('Sam');await d.getByLabel("Second member's name",{exact:true}).fill('Kim');await d.getByRole('button',{name:'Save names',exact:true}).click();await expect(d).toHaveCount(0);await expect(page.getByRole('button',{name:'Total: Kim',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Interface language',exact:true}).selectOption('de');await expect(page.locator('main h1')).toHaveText('Haushalt & Fixkosten');await expect(page.getByRole('button',{name:'Summe: Kim',exact:true})).toBeVisible();
 expect((await read('/money/household-profile')).partnerName).toBe('Kim');expect(await read('/balances')).toEqual(before);expect(errors).toEqual([]);
 await page.screenshot({path:test.info().outputPath('languages-household.png'),fullPage:true});
});
test('English and German catalogs have identical keys and valid placeholders',()=>{
 const en=JSON.parse(readFileSync('src/i18n/en.json','utf8')),de=JSON.parse(readFileSync('src/i18n/de.json','utf8'));expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());expect(Object.keys(en).length).toBeGreaterThan(1300);
 for(const key of Object.keys(en))for(const value of [en[key],de[key]]){expect(typeof value).toBe('string');expect(value.length).toBeGreaterThan(0);expect(value.match(/\{\d+\}/g)?.sort()??[]).toEqual(key.match(/\{\d+\}/g)?.sort()??[]);}
});
