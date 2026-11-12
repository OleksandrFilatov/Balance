import { expect, type Page } from "@playwright/test";
import { decodeJson } from "../src/api/client";
export async function selectMonth(page: Page, value: string, label = "Месяц баланса") {
  await page.getByRole("button", {name: label, exact: true}).click();
  const picker = page.getByRole("dialog", {name: "Выберите месяц", exact: true});
  const target = Number(value.slice(0,4));
  for (let step=0; step<200; step++) {
    const year=Number(await picker.locator(".month-picker-year strong").innerText());
    if(year===target)break;
    await picker.getByRole("button",{name:year<target?"Следующий год":"Предыдущий год",exact:true}).click();
  }
  const names=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  await picker.getByRole("button", {name:names[Number(value.slice(5))-1]+" "+target,exact:true}).click();
  await expect(page.getByRole("button",{name:label,exact:true})).toHaveAttribute("data-month",value);
}
export async function navigateTo(page: Page, path: string) {
  const primary = page
    .locator('nav a[href="' + path + '"]')
    .filter({ visible: true });
  if (await primary.count()) await primary.first().click();
  else {
    const more=page.getByRole("button", {name:"Ещё",exact:true});
    let clicked=false;
    if(await more.isVisible()){
      await more.click();
      const link=page.getByRole("dialog").locator('nav a[href="'+path+'"]');
      if(await link.count()){await link.click();clicked=true;}
      else await page.getByRole("button",{name:"Закрыть окно",exact:true}).click();
    }
    if(!clicked)await page.evaluate(path=>{history.pushState(null,"",path);window.dispatchEvent(new PopStateEvent("popstate"));},path);
  }
  await page.waitForURL((url) => url.pathname === (path.split("?")[0]==="/settings"?"/categories":path.split("?")[0]));
}
export async function toggleTheme(page: Page, dark: boolean) {
  await page
    .getByRole("button", {
      name: dark ? "Включить тёмную тему" : "Включить светлую тему",
      exact: true,
    })
    .click();
  if (dark) await expect(page.locator("html")).toHaveClass(/dark/);
  else await expect(page.locator("html")).not.toHaveClass(/dark/);
}
export async function readApi<T = Record<string, string>>(
  page: Page,
  path: string,
): Promise<T> {
  const response = await page.request.get("/api" + path, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from("ui-test:isolated-browser-tests-only-12345").toString(
          "base64",
        ),
    },
  });
  expect(response.ok()).toBe(true);
  return decodeJson(await response.text()) as T;
}
