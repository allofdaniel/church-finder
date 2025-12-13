import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// =============================================================================
// 설정
// =============================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const CONCURRENT_PAGES = 10; // 안정적인 동시 페이지 수
const TOP_N = 1000; // 상위 N개만 크롤링
const TIMEOUT = 10000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// 카카오맵 상세 페이지 크롤링
// =============================================================================
async function scrapeKakaoDetail(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await sleep(1500); // 페이지 렌더링 대기

        const data = await page.evaluate(() => {
            const result = { website: null, serviceTime: null, description: null };

            // 홈페이지
            const homepageLink = document.querySelector('a.link_homepage');
            if (homepageLink) result.website = homepageLink.href;

            // 영업시간
            const timeEl = document.querySelector('.txt_operation') ||
                document.querySelector('.list_operation') ||
                document.querySelector('.time_operation');
            if (timeEl) result.serviceTime = timeEl.innerText.trim().substring(0, 200);

            // 설명
            const descEl = document.querySelector('.txt_intro');
            if (descEl) result.description = descEl.innerText.trim().substring(0, 300);

            return result;
        });

        return data;
    } catch {
        return null;
    }
}

// =============================================================================
// 배치 처리
// =============================================================================
async function processBatch(browser, facilities) {
    const results = await Promise.all(
        facilities.map(async (facility) => {
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

                const detail = await scrapeKakaoDetail(page, facility.kakaoUrl);

                if (detail) {
                    if (detail.website) facility.website = detail.website;
                    if (detail.serviceTime) facility.serviceTime = detail.serviceTime;
                    if (detail.description) {
                        facility.description = detail.description;
                        const pastorMatch = detail.description.match(/담임[목사신부]*\s*[:：]?\s*([가-힣]{2,4})/);
                        if (pastorMatch) facility.pastor = pastorMatch[1];
                    }
                }
            } catch { }
            await page.close();
            return facility;
        })
    );
    return results;
}

// =============================================================================
// 메인
// =============================================================================
async function main() {
    console.log(`🚀 TOP ${TOP_N} 교회 상세 크롤링 시작...`);
    console.log(`⚡ 동시 페이지: ${CONCURRENT_PAGES}개\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const filePath = path.join(DATA_DIR, 'churches.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // TOP N개만 선택 (이름 길이로 대형 교회 추정 - 간단한 휴리스틱)
    const topChurches = data.slice(0, TOP_N);
    console.log(`📂 대상: ${topChurches.length}건\n`);

    const startTime = Date.now();
    const results = [];

    for (let i = 0; i < topChurches.length; i += CONCURRENT_PAGES) {
        const batch = topChurches.slice(i, i + CONCURRENT_PAGES);
        const batchResults = await processBatch(browser, batch);
        results.push(...batchResults);

        const progress = Math.min(i + CONCURRENT_PAGES, topChurches.length);
        const percent = ((progress / topChurches.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        process.stdout.write(`\r⏳ ${progress}/${topChurches.length} (${percent}%) - ${elapsed}분`);
    }

    await browser.close();

    // 결과 병합: TOP N은 업데이트, 나머지는 그대로
    const updatedData = [...results, ...data.slice(TOP_N)];

    // 통계
    const withWebsite = results.filter(d => d.website).length;
    const withTime = results.filter(d => d.serviceTime).length;

    console.log(`\n\n✅ 홈페이지: ${withWebsite}건, 예배시간: ${withTime}건`);

    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    console.log(`💾 저장 완료: churches.json`);

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n🎉 완료! 총 소요시간: ${totalTime}분`);
}

main().catch(console.error);
