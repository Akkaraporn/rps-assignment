import { expect, test, type Page } from '@playwright/test';

const MOVES = ['ROCK', 'PAPER', 'SCISSORS'] as const;
const BEATS: Record<string, string> = { ROCK: 'SCISSORS', PAPER: 'ROCK', SCISSORS: 'PAPER' };

const score = (page: Page) => page.getByTestId('your-score');
const highScore = (page: Page) => page.getByTestId('high-score');
const botCard = (page: Page) => page.getByTestId('bot-card');
const moveButton = (page: Page, move: string) => page.getByTestId(`move-${move}`);

function readNumber(text: string | null): number {
  return Number((text ?? '').replace(/\D/g, ''));
}

async function playRound(page: Page, move: (typeof MOVES)[number]) {
  const before = readNumber(await score(page).textContent());
  await moveButton(page, move).click();

  await expect(botCard(page)).not.toHaveText('???');
  const botMove = (await botCard(page).textContent())?.trim() ?? '';
  const after = readNumber(await score(page).textContent());

  return { before, after, botMove };
}

test('ปุ่มถูกล็อกระหว่างแสดงผล แล้วปลดเองเมื่อครบเวลา', async ({ page }) => {
  await page.goto('/');
  await expect(botCard(page)).toHaveText('???');

  await moveButton(page, 'ROCK').click();

  for (const move of MOVES) {
    await expect(moveButton(page, move)).toBeDisabled();
  }
  await expect(botCard(page)).not.toHaveText('???');

  await expect(botCard(page)).toHaveText('???', { timeout: 5000 });
  for (const move of MOVES) {
    await expect(moveButton(page, move)).toBeEnabled();
  }
});

test('คะแนนเปลี่ยนตามกติกาทุกตา', async ({ page }) => {
  await page.goto('/');
  await expect(score(page)).toHaveText('0 turn');

  for (let i = 0; i < 5; i++) {
    const { before, after, botMove } = await playRound(page, 'ROCK');

    const expected =
      botMove === 'ROCK' ? before : BEATS.ROCK === botMove ? before + 1 : 0;

    expect(after, `ROCK vs ${botMove}`).toBe(expected);
    await expect(botCard(page)).toHaveText('???', { timeout: 5000 });
  }
});

test('High Score เด้งหาผู้เล่นอื่นแบบ real-time', async ({ browser }) => {
  const watcher = await browser.newContext();
  const player = await browser.newContext();
  const watcherPage = await watcher.newPage();
  const playerPage = await player.newPage();

  await watcherPage.goto('/');
  await playerPage.goto('/');

  const startHigh = readNumber(await watcherPage.getByTestId('high-score').textContent());

  let current = 0;
  for (let i = 0; i < 12 && current <= startHigh; i++) {
    const { after } = await playRound(playerPage, 'ROCK');
    current = after;
    await expect(botCard(playerPage)).toHaveText('???', { timeout: 5000 });
  }
  expect(current, 'ทำสถิติใหม่ไม่สำเร็จใน 12 ตา').toBeGreaterThan(startHigh);

  await expect(highScore(watcherPage)).toHaveText(`${current} turn`, { timeout: 10_000 });

  await watcher.close();
  await player.close();
});