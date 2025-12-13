import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// 설정
// =============================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

const CONCURRENT_LIMIT = 20;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// 카카오 플레이스 상세 API (내부 API)
// =============================================================================
async function fetchKakaoPlaceDetail(facility) {
    try {
        const placeId = facility.id;
        if (!placeId) return facility;

        // 카카오 플레이스 상세 API
        const url = `https://place.map.kakao.com/main/v/${placeId}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://map.kakao.com/'
            }
        });

        if (!response.ok) return facility;

        const data = await response.json();

        // 홈페이지 URL
        if (data.basicInfo?.homepage) {
            facility.website = data.basicInfo.homepage;
        }

        // 영업시간/예배시간
        if (data.basicInfo?.openHour?.periodList) {
            const hours = data.basicInfo.openHour.periodList
                .map(p => `${p.periodName}: ${p.timeList?.map(t => t.timeSE).join(', ')}`)
                .join(' | ');
            facility.serviceTime = hours;
        } else if (data.basicInfo?.openHour?.realtime?.open) {
            facility.serviceTime = data.basicInfo.openHour.realtime.open;
        }

        // 상세 설명
        if (data.basicInfo?.introduction) {
            facility.description = data.basicInfo.introduction;

            // 담임목사 추출
            const pastorMatch = data.basicInfo.introduction.match(/담임[목사신부]*\s*[:：]?\s*([가-힣]{2,4})/);
            if (pastorMatch) {
                facility.pastor = pastorMatch[1];
            }
        }

        // 태그/키워드
        if (data.basicInfo?.tags) {
            facility.tags = data.basicInfo.tags;
        }

        return facility;

    } catch (error) {
        return facility;
    }
}

// =============================================================================
// 병렬 처리
// =============================================================================
async function processInBatches(items, batchSize, processor, label) {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);

        const progress = Math.min(i + batchSize, items.length);
        const percent = ((progress / items.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        process.stdout.write(`\r⏳ [${label}] ${progress}/${items.length} (${percent}%) - ${elapsed}분 경과`);

        await sleep(50);
    }

    console.log();
    return results;
}

// =============================================================================
// 메인
// =============================================================================
async function main() {
    console.log('🔍 카카오 플레이스 상세 API로 정보 수집 시작...\n');

    const files = ['churches.json', 'catholics.json', 'temples.json', 'cults.json'];

    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);

        if (!fs.existsSync(filePath)) continue;

        console.log(`📂 처리 중: ${fileName}`);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`   총 ${data.length}건`);

        const enrichedData = await processInBatches(
            data,
            CONCURRENT_LIMIT,
            fetchKakaoPlaceDetail,
            fileName
        );

        // 통계
        const withWebsite = enrichedData.filter(d => d.website).length;
        const withTime = enrichedData.filter(d => d.serviceTime).length;
        const withPastor = enrichedData.filter(d => d.pastor).length;

        console.log(`   ✅ 홈페이지: ${withWebsite}건, 예배시간: ${withTime}건, 담임목사: ${withPastor}건`);

        fs.writeFileSync(filePath, JSON.stringify(enrichedData, null, 2));
        console.log(`   💾 저장 완료\n`);
    }

    // 통합 파일 갱신
    console.log('📂 전체 통합 파일 업데이트...');
    let allData = [];
    for (const fileName of files) {
        const filePath = path.join(DATA_DIR, fileName);
        if (fs.existsSync(filePath)) {
            allData.push(...JSON.parse(fs.readFileSync(filePath, 'utf-8')));
        }
    }
    const uniqueAll = Array.from(new Map(allData.map(item => [item.id, item])).values());
    fs.writeFileSync(path.join(DATA_DIR, 'all-religious.json'), JSON.stringify(uniqueAll, null, 2));

    console.log('🎉 완료!');
}

main();
