import { expect, test } from "@playwright/test";
import { navigateTo, toggleTheme, selectMonth } from "./helpers";

test("Батрачка keeps the supplied scene isolated, usable and persistent", async ({ page }, info) => {
  expect((await page.request.get("/api/health")).headers()["x-balance-test-database"]).toBe("isolated");
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const username = process.env.BALANCE_TEST_USERNAME!;
  const password = process.env.BALANCE_TEST_PASSWORD!;
  const headers = { Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64") };
  const balances = await (await page.request.get("/api/balances", { headers })).json();
  await page.addInitScript(() => {
    if (window !== window.top) return;
    // Old manually chosen dates must no longer filter or gate completed shifts.
    localStorage.setItem("balance-batrachka-state-v1", JSON.stringify({date:"2099-01-01",drawnDays:999}));
    localStorage.setItem("balance-batrachka-work-state-v2", JSON.stringify({date:"2099-01-01",drawnDays:999}));
  });
  await page.goto("/batrachka");
  await page.getByLabel("Имя пользователя", { exact: true }).fill(username);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Balance", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Батрачка", exact: true })).toBeVisible();
  const frame = page.frameLocator('iframe[title="Батрачка — Не смотри"]');
  await expect(frame.locator("#dateGate")).toHaveCount(0);
  await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 0");
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "allow-scripts");
  await expect.poll(() => frame.locator("body").evaluate(() => {
    try { void window.parent.document; return false; } catch { return true; }
  })).toBe(true);
  // Host messages cannot overwrite the scene's animation preference.
  await page.evaluate(() => window.postMessage({ type: "balance:batrachka-state", state: { drawnDays: 999 } }, "*"));
  expect(await page.evaluate(() => Number(localStorage.getItem("balance-batrachka-animation-v3") ?? "0"))).toBe(0);
  await frame.getByRole("button", { name: "Выключить звук", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Включить звук", exact: true })).toHaveAttribute("aria-pressed", "false");
  await frame.getByRole("button", { name: "Посмотреть в дверной глазок", exact: true }).click();
  await expect(frame.locator("#experience")).toHaveClass(/is-looking/);
  await frame.getByRole("button", { name: "Отойти от двери", exact: true }).click();
  await expect(frame.locator("#experience")).not.toHaveClass(/is-looking/);
  const geometry = await frame.locator("#room").evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, centreY: rect.y + rect.height / 2, viewportY: innerHeight / 2 };
  });
  expect(Math.abs(geometry.x)).toBeLessThan(1);
  expect(Math.abs(geometry.centreY - geometry.viewportY)).toBeLessThan(1);
  await page.screenshot({ path: info.outputPath("batrachka-light.png"), fullPage: true, animations: "disabled" });
  await navigateTo(page, "/money");
  await navigateTo(page, "/batrachka");
  await expect(frame.locator("#dateGate")).toHaveCount(0);
  await toggleTheme(page, true);
  if (info.project.name === "iphone") await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await frame.locator("body").evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(frame.getByRole("button", { name: "сменить дату", exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("batrachka-dark.png"), fullPage: true, animations: "disabled" });
  expect(await (await page.request.get("/api/balances", { headers })).json()).toEqual(balances);
  expect(errors).toEqual([]);
});


test("all work-day marks automatically populate the scene without choosing a date", async ({page}, info) => {
  expect((await page.request.get("/api/health")).headers()["x-balance-test-database"]).toBe("isolated");
  const username=process.env.BALANCE_TEST_USERNAME!,password=process.env.BALANCE_TEST_PASSWORD!;
  const headers:Record<string,string>={Authorization:"Basic "+Buffer.from(username+":"+password).toString("base64")};
  const csrf=await (await page.request.get("/api/csrf",{headers})).json();headers[csrf.headerName]=csrf.token;
  const year=info.project.name==="desktop"?"2024":"2025",month=year+"-10",first=month+"-01",second=month+"-02",earlier=year+"-09-30";
  async function read(path:string){const r=await page.request.get("/api"+path,{headers});expect(r.ok(),await r.text()).toBe(true);return r.json();}
  async function mark(date:string,completed:boolean){const m=await read("/work-calendar/"+date.slice(0,7));const r=await page.request.put(`/api/work-calendar/${m.month}/days/${date}/mark`,{headers,data:{completed,version:m.settings.version}});expect(r.ok(),await r.text()).toBe(true);}
  async function refresh(){await page.evaluate(()=>document.dispatchEvent(new Event("visibilitychange")));}
  const before=await read("/balances");
  try {
    await mark(earlier,true);
    await page.goto("/batrachka");await page.getByLabel("Имя пользователя",{exact:true}).fill(username);await page.getByLabel("Пароль",{exact:true}).fill(password);await page.getByRole("button",{name:"Войти в Balance",exact:true}).click();
    const frame=page.frameLocator('iframe[title="Батрачка — Не смотри"]');
    await expect(frame.locator("#dateGate")).toHaveCount(0);
    await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 1");
    await expect(frame.locator("#dateCanvas")).toHaveAttribute("data-first-work-date",earlier);
    await navigateTo(page,"/work-calendar");await selectMonth(page,month,"Месяц смен");await page.getByRole("button",{name:"Отметить смену: "+first,exact:true}).click();await expect(page.getByRole("button",{name:"Снять отметку: "+first,exact:true})).toHaveAttribute("aria-pressed","true");
    await navigateTo(page,"/batrachka");await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 2");
    await frame.getByRole("button",{name:"Посмотреть в дверной глазок",exact:true}).click();await expect(frame.locator("#tallyCanvas")).toHaveAttribute("data-drawn-work-days","2");
    await mark(second,true);await refresh();await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 3");await expect(frame.locator("#tallyCanvas")).toHaveAttribute("data-drawn-work-days","3");
    await mark(first,false);await refresh();await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 2");await expect(frame.locator("#tallyCanvas")).toHaveAttribute("data-drawn-work-days","2");
    const m=await read("/work-calendar/"+month);const reset=await page.request.delete(`/api/work-calendar/${month}/days/${second}?version=${m.settings.version}`,{headers});expect(reset.ok()).toBe(true);await refresh();await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 1");
    await mark(earlier,false);await refresh();await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 0");await expect(frame.locator("#dateCanvas")).toHaveAttribute("data-first-work-date","");await expect(frame.locator("#tallyCanvas")).toHaveAttribute("data-drawn-work-days","0");
    expect(await read("/balances")).toEqual(before);
  } finally {for(const date of [earlier,first,second])await mark(date,false);}
});

test("saved tallies are visibly inside the lens on every opening",async({page},info)=>{
  expect((await page.request.get("/api/health")).headers()["x-balance-test-database"]).toBe("isolated");
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem("balance-batrachka-animation-v3","2");});
  await page.route("**/api/work-calendar/completed-days",route=>route.fulfill({json:{from:"2026-11-09",through:"2026-11-10",total:2}}));
  await page.goto("/batrachka");
  await page.getByLabel("Имя пользователя",{exact:true}).fill(process.env.BALANCE_TEST_USERNAME!);
  await page.getByLabel("Пароль",{exact:true}).fill(process.env.BALANCE_TEST_PASSWORD!);
  await page.getByRole("button",{name:"Войти в Balance",exact:true}).click();
  await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 2");
  const frame=page.frameLocator('iframe[title="Батрачка — Не смотри"]');
  const visibleInk=()=>frame.locator("#tallyCanvas").evaluate(el=>{
    const canvas=el as HTMLCanvasElement,rect=canvas.getBoundingClientRect(),lens=document.getElementById("hallway")!.getBoundingClientRect();
    const pixels=canvas.getContext("2d")!.getImageData(0,0,canvas.width,canvas.height).data;
    let visible=0,ink=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4;
      if(pixels[i+3]<100||pixels[i]<pixels[i+1]+30)continue;
      ink++;
      const dx=rect.left+(x+.5)*rect.width/canvas.width-(lens.left+lens.width/2),dy=rect.top+(y+.5)*rect.height/canvas.height-(lens.top+lens.height/2);
      if(Math.hypot(dx,dy)<lens.width*.42)visible++;
    }
    return {visible,ratio:ink?visible/ink:0};
  });
  for(let opening=0;opening<2;opening++){
    await frame.getByRole("button",{name:"Посмотреть в дверной глазок",exact:true}).click();
    await expect(frame.getByRole("button",{name:"Отойти от двери",exact:true})).toBeEnabled();
    await expect(frame.locator("#tallyCanvas")).toHaveAttribute("data-drawn-work-days","2");
    await expect.poll(async()=>(await visibleInk()).visible).toBeGreaterThan(20);
    await expect.poll(async()=>(await visibleInk()).ratio).toBeGreaterThan(.85);
    if(info.project.name==="desktop"){
      const box=await frame.locator("#hallway").boundingBox();
      await page.mouse.move(box!.x+5,box!.y+box!.height/2);await page.mouse.move(box!.x+box!.width-5,box!.y+box!.height/2);
      const before=await frame.locator("#hallwayWorld").evaluate(el=>getComputedStyle(el).transform);
      await page.mouse.move(box!.x+box!.width*.2,box!.y+box!.height*.5);
      await expect.poll(()=>frame.locator("#hallwayWorld").evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
      await page.mouse.move(0,0);
      await expect.poll(async()=>(await visibleInk()).ratio).toBeGreaterThan(.85);
    }
    if(opening===1)await page.screenshot({path:info.outputPath("visible-tallies.png"),animations:"disabled"});
    await frame.getByRole("button",{name:"Отойти от двери",exact:true}).click();
    await expect(frame.locator("#experience")).not.toHaveClass(/is-looking/);
  }
});


test("eight months of shifts fit on the wall with spare capacity",async({page},info)=>{
  expect((await page.request.get("/api/health")).headers()["x-balance-test-database"]).toBe("isolated");
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem("balance-batrachka-animation-v3","250");});
  await page.route("**/api/work-calendar/completed-days",route=>route.fulfill({json:{from:"2026-01-01",through:"2026-11-10",total:250}}));
  await page.goto("/batrachka");
  await page.getByLabel("Имя пользователя",{exact:true}).fill(process.env.BALANCE_TEST_USERNAME!);
  await page.getByLabel("Пароль",{exact:true}).fill(process.env.BALANCE_TEST_PASSWORD!);
  await page.getByRole("button",{name:"Войти в Balance",exact:true}).click();
  await expect(page.getByTestId("batrachka-work-total")).toHaveText("Отмечено рабочих дней: 250");
  const frame=page.frameLocator('iframe[title="Батрачка — Не смотри"]');
  await frame.getByRole("button",{name:"Посмотреть в дверной глазок",exact:true}).click();
  await expect(frame.getByRole("button",{name:"Отойти от двери",exact:true})).toBeEnabled();
  await expect(frame.locator("#tallyCanvas")).toHaveAttribute("data-drawn-work-days","250");
  const ink=await frame.locator("#tallyCanvas").evaluate(el=>{
    const c=el as HTMLCanvasElement,p=c.getContext("2d")!.getImageData(0,0,c.width,c.height).data;
    let n=0,left=c.width,right=0,top=c.height,bottom=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(p[i+3]>100&&p[i]>p[i+1]+30){n++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
    return {n,left,right,top,bottom,width:c.width,height:c.height};
  });
  expect(ink.n).toBeGreaterThan(1000);expect(ink.left).toBeGreaterThan(0);expect(ink.top).toBeGreaterThan(0);expect(ink.right).toBeLessThan(ink.width-1);expect(ink.bottom).toBeLessThan(ink.height-1);
  await page.screenshot({path:info.outputPath("250-work-days.png"),animations:"disabled"});
});
