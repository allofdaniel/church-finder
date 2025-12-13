import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// =============================================================================
// 설정
// =============================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const START_URLS = [
    'https://namu.wiki/w/장로회/대한민국/교단 목록',
    'https://namu.wiki/w/기독교대한감리회',
    'https://namu.wiki/w/기독교대한성결교회',
    'https://namu.wiki/w/한국 천주교/교구',
    'https://namu.wiki/w/대한불교조계종',
    'https://namu.wiki/w/분류:대한민국의 개신교 교회',
    'https://namu.wiki/w/분류:대한민국의 성당',
    'https://namu.wiki/w/분류:대한민국의 사찰'
];

const TIMEOUT = 15000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// 나무위키 크롤러
// =============================================================================
async function scrapeNamuWiki(page, url, depth = 0) {
    if (depth > 2) return []; // 너무 깊게 들어가지 않음

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await sleep(2000); // 렌더링 대기

        // 1. 페이지 내의 표(Table) 데이터 추출
        const tableData = await page.evaluate(() => {
            const items = [];
            const tables = document.querySelectorAll('table');

            tables.forEach(table => {
                // 표에서 교회/성당/사찰 정보로 추정되는 행 추출
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const text = row.innerText;
                        // 교회/성당/사찰/선원/암 등의 키워드가 있는지 확인
                        if (text.match(/(교회|성당|사찰|선원|암|정사)/)) {
                            // 이름, 주소, 담임자 추출 시도
                            const name = cells[0]?.innerText.trim();
                            const extra = Array.from(cells).slice(1).map(c => c.innerText.trim()).join(' ');

                            if (name && name.length > 1 && name.length < 30) {
                                items.push({ name, extra, source: document.title });
                            }
                        }
                    }
                });
            });

            // 리스트 아이템 추출 (ul/li)
            const listItems = document.querySelectorAll('ul li, ol li');
            listItems.forEach(li => {
                const text = li.innerText;
                if (text.match(/(교회|성당|사찰)[\s:]/)) {
                    items.push({ name: text.split(/[\s:]/)[0], extra: text, source: document.title });
                }
            });

            return items;
        });

        // 2. 하위 문서 링크 추출 (depth가 낮을 때만)
        let childLinks = [];
        if (depth < 1) {
            childLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('a.wiki-link-internal').forEach(a => {
                    const href = a.getAttribute('href');
                    const text = a.innerText;
                    if (href && (text.includes('교회') || text.includes('성당') || text.includes('사찰') || text.includes('교구') || text.includes('노회'))) {
                        links.push('https://namu.wiki' + href);
                    }
                });
                return links;
            });
        }

        return { data: tableData, links: childLinks };

    } catch (e) {
        console.error(`❌ Error crawling ${url}: ${e.message}`);
        return { data: [], links: [] };
    }
}

// =============================================================================
// 메인 루프
// =============================================================================
async function main() {
    console.log('🌳 나무위키 상세 정보 크롤링 시작...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // 이미지 차단
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    const visited = new Set();
    const queue = [...START_URLS];
    const collectedData = [];

    while (queue.length > 0 && visited.size < 100) { // 안전을 위해 최대 100페이지
        const url = queue.shift();
        if (visited.has(url)) continue;
        visited.add(url);

        console.log(`🔍 방문: ${decodeURIComponent(url).replace('https://namu.wiki/w/', '')}`);

        const { data, links } = await scrapeNamuWiki(page, url);

        if (data.length > 0) {
            console.log(`   ✅ ${data.length}건 정보 발견`);
            collectedData.push(...data);
        }

        // 새로운 링크 추가 (중복 제외)
        links.forEach(link => {
            if (!visited.has(link) && !queue.includes(link)) {
                queue.push(link);
            }
        });

        await sleep(1000); // 1초 대기
    }

    await browser.close();

    // 데이터 저장
    fs.writeFileSync(
        path.join(DATA_DIR, 'namu-wiki-raw.json'),
        JSON.stringify(collectedData, null, 2)
    );
    console.log(`\n💾 총 ${collectedData.length}건의 나무위키 데이터 저장 완료!`);

    // 매칭 로직은 별도 처리 (일단 수집부터)
}

main().catch(console.error);
