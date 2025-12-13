import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Cluster } from 'puppeteer-cluster';

// =============================================================================
// 설정
// =============================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const CONCURRENT_BROWSERS = 50; // 동시 브라우저 수
const TIMEOUT = 15000; // 페이지 로딩 타임아웃 (15초)

// =============================================================================
// 카카오맵 상세 페이지 크롤링 함수
// =============================================================================
async function scrapeKakaoDetail(page, url) {
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: TIMEOUT
        });

        // 페이지 로드 대기
        await page.waitForSelector('.cont_essential', { timeout: 5000 }).catch(() => { });

        const data = await page.evaluate(() => {
            const result = {
                website: null,
                serviceTime: null,
                description: null,
                tags: []
            };

            // 홈페이지 URL
            const homepageLink = document.querySelector('a.link_homepage');
            if (homepageLink) {
                result.website = homepageLink.href;
            }

            // 영업시간/예배시간
            const timeEl = document.querySelector('.txt_operation') ||
                document.querySelector('.list_operation');
            if (timeEl) {
                result.serviceTime = timeEl.innerText.trim();
            }

            // 상세 설명
            const descEl = document.querySelector('.txt_intro') ||
                document.querySelector('.cont_desc');
            if (descEl) {
                result.description = descEl.innerText.trim();
            }

            // 태그
            const tagEls = document.querySelectorAll('.tag_g a');
            tagEls.forEach(el => {
                result.tags.push(el.innerText.trim());
            });

            return result;
        });

        return data;

    } catch (error) {
        return null;
    }
}

// =============================================================================
// 메인 실행
// =============================================================================
async function main() {
    console.log('🚀 Puppeteer 병렬 크롤링 시작...');
    console.log(`⚡ 동시 브라우저: ${CONCURRENT_BROWSERS}개\n`);

    // 클러스터 초기화
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: CONCURRENT_BROWSERS,
        puppeteerOptions: {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1280,720'
            ]
        },
        timeout: TIMEOUT + 5000
    });

    // 에러 핸들링
    cluster.on('taskerror', (err, data) => {
        // 조용히 넘어감
    });

    // 작업 정의
    cluster.task(async ({ page, data: facility }) => {
        const url = facility.kakaoUrl;
        if (!url) return { ...facility };

        const detail = await scrapeKakaoDetail(page, url);

        if (detail) {
            if (detail.website) facility.website = detail.website;
            if (detail.serviceTime) facility.serviceTime = detail.serviceTime;
            if (detail.description) {
                facility.description = detail.description;
                // 담임목사 추출
                const pastorMatch = detail.description.match(/담임[목사신부]*\s*[:：]?\s*([가-힣]{2,4})/);
                if (pastorMatch) facility.pastor = pastorMatch[1];
            }
            if (detail.tags && detail.tags.length > 0) facility.tags = detail.tags;
        }

        return facility;
    });

    const files = ['churches.json', 'catholics.json', 'temples.json', 'cults.json'];
    const startTime = Date.now();

    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);
        if (!fs.existsSync(filePath)) continue;

        console.log(`\n📂 처리 중: ${fileName}`);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`   총 ${data.length}건`);

        const results = [];
        let processed = 0;

        // 진행률 표시
        const progressInterval = setInterval(() => {
            const percent = ((processed / data.length) * 100).toFixed(1);
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            process.stdout.write(`\r   ⏳ ${processed}/${data.length} (${percent}%) - ${elapsed}분 경과`);
        }, 1000);

        // 모든 작업 큐에 추가
        const promises = data.map(facility =>
            cluster.execute(facility).then(result => {
                processed++;
                results.push(result || facility);
            })
        );

        await Promise.all(promises);
        clearInterval(progressInterval);

        // 통계
        const withWebsite = results.filter(d => d.website).length;
        const withTime = results.filter(d => d.serviceTime).length;
        const withPastor = results.filter(d => d.pastor).length;

        console.log(`\n   ✅ 홈페이지: ${withWebsite}건, 예배시간: ${withTime}건, 담임목사: ${withPastor}건`);

        // 저장
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
        console.log(`   💾 저장 완료`);
    }

    await cluster.close();

    // 통합 파일 갱신
    console.log('\n📂 전체 통합 파일 업데이트...');
    let allData = [];
    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);
        if (fs.existsSync(filePath)) {
            allData.push(...JSON.parse(fs.readFileSync(filePath, 'utf-8')));
        }
    }
    const uniqueAll = Array.from(new Map(allData.map(item => [item.id, item])).values());
    fs.writeFileSync(path.join(DATA_DIR, 'all-religious.json'), JSON.stringify(uniqueAll, null, 2));

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n🎉 완료! 총 소요시간: ${totalTime}분`);
}

main().catch(console.error);
