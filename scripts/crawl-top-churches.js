import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// =============================================================================
// 설정
// =============================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const CONCURRENT_PAGES = 10;
const TOP_N = 1000;
const TIMEOUT = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// 카카오맵 상세 페이지 크롤링 (수정된 선택자)
// =============================================================================
async function scrapeKakaoDetail(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
        await sleep(2000);

        const data = await page.evaluate(() => {
            const result = { website: null, serviceTime: null, description: null };

            // 홈페이지 - link_detail 클래스 사용
            const homepageLinks = document.querySelectorAll('a.link_detail');
            for (const link of homepageLinks) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('http') && !href.includes('kakao.com')) {
                    result.website = href;
                    break;
                }
            }

            // 영업시간 - 다양한 선택자 시도
            const timeSelectors = [
                '.txt_operation',
                '.list_operation li',
                '.cont_info .txt_detail',
                '.info_fold .info_tit:contains("영업")'
            ];

            for (const sel of timeSelectors) {
                try {
                    const el = document.querySelector(sel);
                    if (el && el.innerText) {
                        result.serviceTime = el.innerText.trim().substring(0, 300);
                        break;
                    }
                } catch { }
            }

            // 상세 설명
            const descEl = document.querySelector('.txt_intro') ||
                document.querySelector('.cont_essential .txt_address');
            if (descEl) {
                result.description = descEl.innerText.trim().substring(0, 300);
            }

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
                    const type = req.resourceType();
                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
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
    console.log(`🚀 TOP ${TOP_N} 상세 크롤링 시작 (수정된 버전)...`);
    console.log(`⚡ 동시 페이지: ${CONCURRENT_PAGES}개\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    // 모든 종교시설 파일 처리
    const files = ['churches.json', 'catholics.json', 'temples.json'];

    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);
        if (!fs.existsSync(filePath)) continue;

        console.log(`\n📂 ${fileName} 처리 중...`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const topItems = data.slice(0, TOP_N);
        console.log(`   대상: ${topItems.length}건`);

        const startTime = Date.now();
        const results = [];

        for (let i = 0; i < topItems.length; i += CONCURRENT_PAGES) {
            const batch = topItems.slice(i, i + CONCURRENT_PAGES);
            const batchResults = await processBatch(browser, batch);
            results.push(...batchResults);

            const progress = Math.min(i + CONCURRENT_PAGES, topItems.length);
            const percent = ((progress / topItems.length) * 100).toFixed(1);
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            process.stdout.write(`\r   ⏳ ${progress}/${topItems.length} (${percent}%) - ${elapsed}분`);
        }

        // 결과 병합
        const updatedData = [...results, ...data.slice(TOP_N)];

        const withWebsite = results.filter(d => d.website).length;
        const withTime = results.filter(d => d.serviceTime).length;

        console.log(`\n   ✅ 홈페이지: ${withWebsite}건, 예배시간: ${withTime}건`);

        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        console.log(`   💾 저장 완료`);
    }

    await browser.close();

    // 통합 파일 갱신
    console.log('\n📂 전체 통합 파일 업데이트...');
    let allData = [];
    for (const f of [...files, 'cults.json']) {
        const fp = path.join(DATA_DIR, f);
        if (fs.existsSync(fp)) {
            allData.push(...JSON.parse(fs.readFileSync(fp, 'utf-8')));
        }
    }
    const uniqueAll = Array.from(new Map(allData.map(item => [item.id, item])).values());
    fs.writeFileSync(path.join(DATA_DIR, 'all-religious.json'), JSON.stringify(uniqueAll, null, 2));

    console.log('🎉 완료!');
}

main().catch(console.error);
