import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const CONCURRENT_PAGES = 15;
const SAVE_INTERVAL = 500;
const TIMEOUT = 12000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 카카오맵 크롤링 (테스트에서 검증된 코드)
async function scrapeKakao(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await sleep(1500);

        return await page.evaluate(() => {
            const result = { website: null, serviceTime: null };

            const selectors = ['a.link_detail', 'a.link_homepage', 'a[href*="http"]:not([href*="kakao"])'];

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

            const timeEl = document.querySelector('.txt_operation, .list_operation, .time_operation');
            if (timeEl) result.serviceTime = timeEl.innerText.trim().substring(0, 300);

            return result;
        });
    } catch {
        return null;
    }
}

async function processFile(browser, fileName, startTime) {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) return;

    console.log(`\n📂 ${fileName} 처리 시작...`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const total = data.length;
    console.log(`   총 ${total}건`);

    const results = [];

    for (let i = 0; i < total; i += CONCURRENT_PAGES) {
        const batch = data.slice(i, i + CONCURRENT_PAGES);

        const batchResults = await Promise.all(
            batch.map(async (facility) => {
                const page = await browser.newPage();
                try {
                    await page.setRequestInterception(true);
                    page.on('request', (req) => {
                        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
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

        // 진행률
        const progress = results.length;
        const percent = ((progress / total) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const withSite = results.filter(r => r.website).length;
        const rate = (withSite / progress * 100).toFixed(1);
        process.stdout.write(`\r   ⏳ ${progress}/${total} (${percent}%) | 홈페이지: ${withSite}건 (${rate}%) | ${elapsed}분`);

        // 중간 저장
        if (progress % SAVE_INTERVAL === 0) {
            const tempData = [...results, ...data.slice(progress)];
            fs.writeFileSync(filePath, JSON.stringify(tempData, null, 2));
            console.log(` [저장됨]`);
        }
    }

    // 최종 저장
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));

    const withWebsite = results.filter(d => d.website).length;
    console.log(`\n   ✅ 완료! 홈페이지: ${withWebsite}건 (${(withWebsite / total * 100).toFixed(1)}%)`);
}

async function main() {
    console.log('🚀 전국 종교시설 전체 크롤링 시작...');
    console.log(`⚡ 동시 페이지: ${CONCURRENT_PAGES}개`);
    console.log(`💾 중간 저장: ${SAVE_INTERVAL}건마다\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const startTime = Date.now();
    const files = ['churches.json', 'catholics.json', 'temples.json', 'cults.json'];

    for (const fileName of files) {
        await processFile(browser, fileName, startTime);
    }

    await browser.close();

    // 통합 파일 갱신
    console.log('\n📂 전체 통합 파일 업데이트...');
    let allData = [];
    for (const f of files) {
        const fp = path.join(DATA_DIR, f);
        if (fs.existsSync(fp)) {
            allData.push(...JSON.parse(fs.readFileSync(fp, 'utf-8')));
        }
    }
    const uniqueAll = Array.from(new Map(allData.map(item => [item.id, item])).values());
    fs.writeFileSync(path.join(DATA_DIR, 'all-religious.json'), JSON.stringify(uniqueAll, null, 2));

    const totalTime = ((Date.now() - startTime) / 1000 / 60 / 60).toFixed(1);
    const totalSites = uniqueAll.filter(x => x.website).length;
    console.log(`\n🎉 전체 완료!`);
    console.log(`   총 소요시간: ${totalTime}시간`);
    console.log(`   총 홈페이지 수집: ${totalSites}건`);
}

main().catch(console.error);
