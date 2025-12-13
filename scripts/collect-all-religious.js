import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// 설정
// =============================================================================
const KAKAO_API_KEY = '6685f9ce078c1032be62e728092b05ca';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../../../../../.private/regions_utf8.csv');
const OUTPUT_DIR = path.join(__dirname, '../src/data');

// 병렬 처리 설정
const CONCURRENT_LIMIT = 20; // 동시 실행 수 (너무 높으면 API 제한에 걸릴 수 있음)

// 검색 대상 종교시설 유형
const FACILITY_TYPES = [
    { keyword: '교회', type: 'church' },
    { keyword: '성당', type: 'catholic' },
    { keyword: '사찰', type: 'temple' },
    { keyword: '절', type: 'temple' }
];

// 사이비/이단 판별 키워드
const CULT_KEYWORDS = [
    '신천지', '여호와의 증인', '왕국회관', '하나님의 교회', '안상홍',
    '통일교', '세계평화통일가정연합', 'JMS', '기독교복음선교회',
    '만민중앙교회', '만민중앙성결교회', '세계복음화전도협회',
    '대순진리회', '증산도'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// CSV 로드
// =============================================================================
function loadRegionsFromCSV() {
    console.log(`📂 법정동 데이터 로드 중...`);

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ 파일을 찾을 수 없습니다: ${CSV_PATH}`);
        return [];
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n');
    const regions = new Set();

    lines.forEach((line, index) => {
        if (index === 0) return;
        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 4) return;
        const [code, sido, sigungu, eupmyeondong] = cols;
        if (!sido) return;
        const regionName = [sido, sigungu, eupmyeondong].filter(Boolean).join(' ').trim();
        if (regionName) regions.add(regionName);
    });

    console.log(`✅ ${regions.size}개 지역 추출 완료`);
    return Array.from(regions);
}

// =============================================================================
// 사이비/이단 & 교단 체크
// =============================================================================
function checkCult(name, category) {
    const combined = `${name} ${category}`.toLowerCase();
    for (const keyword of CULT_KEYWORDS) {
        if (combined.includes(keyword.toLowerCase())) {
            return { isCult: true, cultType: keyword };
        }
    }
    return { isCult: false, cultType: null };
}

function extractDenomination(category) {
    if (!category) return null;
    const denominations = ['장로교', '감리교', '침례교', '순복음', '성결교',
        '루터교', '성공회', '구세군', '안식교', '천주교', '조계종', '태고종', '천태종'];
    for (const denom of denominations) {
        if (category.includes(denom)) return denom;
    }
    return null;
}

// =============================================================================
// 카카오 API 검색 (단일 지역 + 시설 유형)
// =============================================================================
async function fetchFacilities(region, facilityType) {
    const results = [];
    let page = 1;
    let isEnd = false;

    while (!isEnd && page <= 3) {
        try {
            const query = `${region} ${facilityType.keyword}`;
            const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&page=${page}`;

            const response = await fetch(url, {
                headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
            });

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`⚠️ Rate limit hit, waiting...`);
                    await sleep(1000);
                    continue;
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.documents) break;

            const items = data.documents.map(doc => {
                const cultCheck = checkCult(doc.place_name, doc.category_name);
                return {
                    id: doc.id,
                    name: doc.place_name,
                    type: facilityType.type,
                    address: doc.address_name,
                    roadAddress: doc.road_address_name,
                    phone: doc.phone || null,
                    lat: parseFloat(doc.y),
                    lng: parseFloat(doc.x),
                    kakaoUrl: doc.place_url,
                    category: doc.category_name,
                    denomination: extractDenomination(doc.category_name),
                    isCult: cultCheck.isCult,
                    cultType: cultCheck.cultType,
                    region: region,
                    website: null,
                    serviceTime: null,
                    pastor: null
                };
            });

            results.push(...items);
            isEnd = data.meta.is_end;
            page++;
            await sleep(50);

        } catch (error) {
            // 에러 시 조용히 넘어감
            break;
        }
    }

    return results;
}

// =============================================================================
// 단일 지역의 모든 시설 유형 검색
// =============================================================================
async function fetchAllTypesForRegion(region) {
    const results = [];
    for (const facilityType of FACILITY_TYPES) {
        const items = await fetchFacilities(region, facilityType);
        results.push(...items);
    }
    return results;
}

// =============================================================================
// 병렬 처리 유틸리티
// =============================================================================
async function processInBatches(items, batchSize, processor) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults.flat());

        // 진행률 표시
        const progress = Math.min(i + batchSize, items.length);
        const percent = ((progress / items.length) * 100).toFixed(1);
        process.stdout.write(`\r⏳ 진행률: ${progress}/${items.length} (${percent}%)`);
    }
    console.log(); // 줄바꿈
    return results;
}

// =============================================================================
// 메인 실행
// =============================================================================
async function main() {
    const startTime = Date.now();

    console.log('🚀 전국 종교시설 종합 수집 시작 (병렬 처리)...');
    console.log(`⚡ 동시 처리 수: ${CONCURRENT_LIMIT}개`);
    console.log('📋 수집 대상: 교회, 성당, 사찰/절');
    console.log('⚠️ 사이비/이단 자동 분류 활성화\n');

    const regions = loadRegionsFromCSV();
    console.log(`🎯 검색 대상: ${regions.length}개 지역 (전국)\n`);

    // 병렬 처리로 수집
    const allFacilities = await processInBatches(
        regions,
        CONCURRENT_LIMIT,
        fetchAllTypesForRegion
    );

    // 중복 제거
    const uniqueFacilities = Array.from(
        new Map(allFacilities.map(item => [item.id, item])).values()
    );

    // 분류별 분리
    const churches = uniqueFacilities.filter(f => f.type === 'church' && !f.isCult);
    const catholics = uniqueFacilities.filter(f => f.type === 'catholic');
    const temples = uniqueFacilities.filter(f => f.type === 'temple');
    const cults = uniqueFacilities.filter(f => f.isCult);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n===================================');
    console.log(`📊 수집 결과 요약 (소요시간: ${elapsed}분)`);
    console.log(`   총 수집: ${allFacilities.length}건`);
    console.log(`   중복제거: ${uniqueFacilities.length}건`);
    console.log(`   ├─ 교회: ${churches.length}건`);
    console.log(`   ├─ 성당: ${catholics.length}건`);
    console.log(`   ├─ 사찰/절: ${temples.length}건`);
    console.log(`   └─ ⚠️ 사이비/이단: ${cults.length}건`);
    console.log('===================================\n');

    // 저장
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'churches.json'), JSON.stringify(churches, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'catholics.json'), JSON.stringify(catholics, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'temples.json'), JSON.stringify(temples, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'cults.json'), JSON.stringify(cults, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'all-religious.json'), JSON.stringify(uniqueFacilities, null, 2));

    console.log('💾 저장 완료!');
}

main();
