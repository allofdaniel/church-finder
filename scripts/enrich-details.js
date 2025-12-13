import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// 설정
// =============================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

// 병렬 처리 설정
const CONCURRENT_LIMIT = 30; // 동시 요청 수

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// 카카오맵 상세 페이지 크롤링
// =============================================================================
async function fetchDetailFromKakao(facility) {
    try {
        // 카카오맵 상세 페이지 URL
        const url = facility.kakaoUrl;
        if (!url) return facility;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) return facility;

        const html = await response.text();

        // 홈페이지 URL 추출
        const websiteMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>홈페이지/i) ||
            html.match(/"homepage"\s*:\s*"([^"]+)"/) ||
            html.match(/class="link_homepage"[^>]*href="([^"]+)"/);
        if (websiteMatch) {
            facility.website = websiteMatch[1];
        }

        // 영업시간/예배시간 추출 (카카오맵에서 "영업시간" 또는 상세정보에 있음)
        const timeMatch = html.match(/영업시간[^<]*<[^>]*>([^<]+)/) ||
            html.match(/"openHour"\s*:\s*"([^"]+)"/) ||
            html.match(/class="txt_operation"[^>]*>([^<]+)/);
        if (timeMatch) {
            facility.serviceTime = timeMatch[1].trim();
        }

        // 상세 설명에서 추가 정보 추출
        const descMatch = html.match(/"description"\s*:\s*"([^"]+)"/);
        if (descMatch) {
            const desc = descMatch[1];
            // 담임목사 정보 찾기
            const pastorMatch = desc.match(/담임[목사신부]*\s*[:：]?\s*([가-힣]+)/);
            if (pastorMatch) {
                facility.pastor = pastorMatch[1];
            }
        }

        return facility;

    } catch (error) {
        // 에러 시 원본 반환
        return facility;
    }
}

// =============================================================================
// 병렬 처리 유틸리티
// =============================================================================
async function processInBatches(items, batchSize, processor, label) {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);

        // 진행률 표시
        const progress = Math.min(i + batchSize, items.length);
        const percent = ((progress / items.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        process.stdout.write(`\r⏳ [${label}] ${progress}/${items.length} (${percent}%) - ${elapsed}분 경과`);

        // Rate limit 방지
        await sleep(100);
    }

    console.log();
    return results;
}

// =============================================================================
// 메인 실행
// =============================================================================
async function main() {
    console.log('🔍 2차 상세 크롤링 시작 (병렬 처리)...');
    console.log(`⚡ 동시 처리 수: ${CONCURRENT_LIMIT}개\n`);

    // 파일 목록
    const files = ['churches.json', 'catholics.json', 'temples.json', 'cults.json'];

    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ ${fileName} 파일 없음, 스킵`);
            continue;
        }

        console.log(`\n📂 처리 중: ${fileName}`);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`   총 ${data.length}건`);

        // 상세 정보 크롤링
        const enrichedData = await processInBatches(
            data,
            CONCURRENT_LIMIT,
            fetchDetailFromKakao,
            fileName
        );

        // 통계
        const withWebsite = enrichedData.filter(d => d.website).length;
        const withTime = enrichedData.filter(d => d.serviceTime).length;
        const withPastor = enrichedData.filter(d => d.pastor).length;

        console.log(`   ✅ 홈페이지: ${withWebsite}건, 예배시간: ${withTime}건, 담임목사: ${withPastor}건`);

        // 저장
        fs.writeFileSync(filePath, JSON.stringify(enrichedData, null, 2));
        console.log(`   💾 저장 완료: ${fileName}`);
    }

    // all-religious.json도 업데이트
    console.log('\n📂 전체 통합 파일 업데이트 중...');
    const allPath = path.join(DATA_DIR, 'all-religious.json');

    // 개별 파일들 다시 로드해서 통합
    let allData = [];
    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            allData.push(...data);
        }
    }

    // 중복 제거
    const uniqueAll = Array.from(
        new Map(allData.map(item => [item.id, item])).values()
    );

    fs.writeFileSync(allPath, JSON.stringify(uniqueAll, null, 2));
    console.log(`💾 저장 완료: all-religious.json (${uniqueAll.length}건)`);

    console.log('\n🎉 2차 상세 크롤링 완료!');
}

main();
