import { test, showOverlay, withOverlay, zoomTo, createHumanCursor } from '@argo-video/cli';

// Records the REAL app (production build) in ?demo=replay: every Jev/LLM answer was captured live once.
test('surge-desk', async ({ page, narration }) => {
  test.setTimeout(240_000);
  await page.goto('/911?demo=replay');
  await page.locator('#jev').waitFor();
  await narration.startRecording(page);
  const cursor = await createHumanCursor(page, { seed: 'surge', size: 28 });
  const scroll = (sel: string) => page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), sel);

  // 1. Problem
  narration.mark('problem');
  await showOverlay(page, 'problem', narration.durationFor('problem'));

  // 2. The surge starts
  narration.mark('surge');
  await cursor.click(page.getByRole('button', { name: /Start call surge/ }));
  await page.waitForTimeout(narration.durationFor('surge'));

  // 3. Jev close-up while calls keep coming
  narration.mark('jev');
  await zoomTo(page, '#jev', { scale: 1.45, holdMs: narration.durationFor('jev') - 1000, narration });
  await page.waitForTimeout(narration.durationFor('jev'));

  // 4. Hidden emergencies in the immediate-response queue
  narration.mark('hidden');
  await page.getByRole('button', { name: /Start call surge|Resume surge/ }).waitFor({ timeout: 30_000 });
  await zoomTo(page, '#immediate', { scale: 1.3, holdMs: narration.durationFor('hidden') - 1000, narration });
  await page.waitForTimeout(narration.durationFor('hidden'));

  // 5. New intel from duplicates → supervisor approves
  narration.mark('intel');
  const t5 = narration.durationFor('intel');
  const step = t5 / 6;
  for (const name of [/Approve dispatch/, /Push to units/, /Push to units/, /Approve dispatch/, /Push to units/]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.count()) await cursor.click(b);
    await page.waitForTimeout(step - 400);
  }
  await page.waitForTimeout(step);

  // 6. Known-incident message, Jev-verified, approved
  narration.mark('ivr');
  await scroll('#ivr');
  await cursor.click(page.getByRole('button', { name: /Draft for/ }));
  await page.getByRole('button', { name: /Approve & play/ }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('ivr') * 0.55);
  await cursor.click(page.getByRole('button', { name: /Approve & play/ }));
  await page.waitForTimeout(narration.durationFor('ivr') * 0.45);

  // 7. Callback queue
  narration.mark('callbacks');
  await scroll('#callbacks');
  await page.waitForTimeout(narration.durationFor('callbacks'));

  // 8. Close
  narration.mark('close');
  await scroll('#incidents');
  await withOverlay(page, 'close', async () => {
    await page.waitForTimeout(narration.durationFor('close') - 500);
  });
});
