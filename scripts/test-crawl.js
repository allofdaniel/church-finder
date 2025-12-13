import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const TEST_COUNT = 50; // 테스트용 50건만
const CONCURRENT_PAGES = 10;
const TIMEOUT = 12000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 카카오맵 크롤링
async function scrapeKakao(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await sleep(1500);

        return await page.evaluate(() => {
            const result = { website: null, serviceTime: null };

            // 홈페이지 - 다양한 선택자 시도
            const selectors = [
                'a.link_detail',
                'a.link_homepage',
                'a[href*="http"]:not([href*="kakao"])'
            ];

            for (const sel of selectors) {
                const links = document.querySelectorAll(sel);
                for (const link of links) {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('http') &&
                        !href.includes('kakao.com') &&
                        !href.includes('map.kakao')) {
                        result.website = href;
                        break;
                    }
                }
                if (result.website) break;
            }

            // 영업시간
            const timeEl = document.querySelector('.txt_operation, .list_operation, .time_operation');
            if (timeEl) result.serviceTime = timeEl.innerText.trim().substring(0, 300);

            return result;
        });
    } catch {
        return null;
    }
}

async function main() {
    console.log(`🧪 테스트 크롤링 (${TEST_COUNT}건)...\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const filePath = path.join(DATA_DIR, 'churches.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const testData = data.slice(0, TEST_COUNT);

    const results = [];

    for (let i = 0; i < testData.length; i += CONCURRENT_PAGES) {
        const batch = testData.slice(i, i + CONCURRENT_PAGES);

        const batchResults = await Promise.all(
            batch.map(async (facility) => {
                const page = await browser.newPage();
                try {
                    await page.setRequestInterception(true);
                    page.on('request', (req) => {
                        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                            req.abort();
                        } else {
                            req.continue();
                        }
                    });

                    const detail = await scrapeKakao(page, facility.kakaoUrl);
                    if (detail?.website) facility.website = detail.website;
                    if (detail?.serviceTime) facility.serviceTime = detail.serviceTime;
                } catch { }
                await page.close();
                return facility;
            })
        );

        results.push(...batchResults);
        console.log(`⏳ ${results.length}/${TEST_COUNT} 완료`);
    }

    await browser.close();

    // 결과 출력
    const withWebsite = results.filter(r => r.website).length;
    const withTime = results.filter(r => r.serviceTime).length;

    console.log('\n=== 테스트 결과 ===');
    console.log(`홈페이지: ${withWebsite}/${TEST_COUNT}건 (${(withWebsite / TEST_COUNT * 100).toFixed(1)}%)`);
    console.log(`예배시간: ${withTime}/${TEST_COUNT}건 (${(withTime / TEST_COUNT * 100).toFixed(1)}%)`);

    // 샘플 출력
    console.log('\n=== 샘플 (홈페이지 있는 교회) ===');
    results.filter(r => r.website).slice(0, 5).forEach(r => {
        console.log(`${r.name}: ${r.website}`);
    });

    // 테스트 결과 저장
    fs.writeFileSync(
        path.join(DATA_DIR, 'test-result.json'),
        JSON.stringify(results, null, 2)
    );
    console.log('\n💾 테스트 결과 저장: test-result.json');
}

main().catch(console.error);
