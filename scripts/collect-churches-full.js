import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 카카오 API 키 (기존 키 사용)
const KAKAO_API_KEY = '6685f9ce078c1032be62e728092b05ca';

// CSV 파일 경로 (상대 경로로 접근)
// 프로젝트 루트: .../apps/church-finder
// .private 위치: .../code/.private
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../../../../../.private/regions_utf8.csv');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// CSV 파일 읽기 및 행정구역 리스트 추출
function loadRegionsFromCSV() {
    console.log(`📂 법정동 데이터 로드 중... (${CSV_PATH})`);

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ 파일을 찾을 수 없습니다: ${CSV_PATH}`);
        return [];
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8'); // 인코딩 주의
    const lines = content.split('\n');

    // 법정동코드,시도명,시군구명,읍면동명,리명,순위,생성일자,삭제일자,과거법정동코드
    // 유효한(삭제되지 않은) 데이터만 필터링 필요하지만, 간단히 읍면동 단위로 고유화

    const regions = new Set();

    lines.forEach((line, index) => {
        if (index === 0) return; // 헤더 스킵

        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 4) return;

        const [code, sido, sigungu, eupmyeondong, ri, ...rest] = cols;

        // 폐지된 법정동 필터링 (삭제일자가 있으면 제외하는 식이지만, CSV 구조상 확인 필요.
        // 여기서는 데이터가 존재하면 유효한 것으로 간주하되, 빈 값 체크)

        if (!sido) return;

        // 시도 + 시군구 + 읍면동 조합 (값이 있는 것만)
        const regionName = [sido, sigungu, eupmyeondong].filter(Boolean).join(' ').trim();
        if (regionName) regions.add(regionName);
    });

    console.log(`✅ CSV 파싱 완료: ${lines.length}줄 읽음 -> ${regions.size}개 고유 지역 추출`);
    console.log(`(샘플): ${Array.from(regions).slice(0, 5).join(', ')}`);

    return Array.from(regions);
}

async function fetchChurchesByKeyword(keyword) {
    const churches = [];
    let page = 1;
    let isEnd = false;

    // console.log(`🔎 검색: [${keyword} 교회]`);

    while (!isEnd && page <= 3) {
        try {
            const query = `${keyword} 교회`;
            const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&page=${page}`;

            const response = await fetch(url, {
                headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();

            if (!data.documents) break;

            const items = data.documents.map(doc => ({
                id: doc.id,
                name: doc.place_name,
                address: doc.address_name,
                roadAddress: doc.road_address_name,
                phone: doc.phone,
                lat: parseFloat(doc.y),
                lng: parseFloat(doc.x),
                url: doc.place_url,
                category: doc.category_name,
                region_keyword: keyword
            }));

            churches.push(...items);
            isEnd = data.meta.is_end;
            page++;

            // 너무 빠른 요청 방지
            await sleep(100);

        } catch (error) {
            console.error(`❌ [${keyword}] Error:`, error.message);
            break;
        }
    }

    return churches;
}

async function main() {
    console.log('🚀 전국 교회 데이터 대규모 수집 시작 (Combined)...');

    const regions = loadRegionsFromCSV();
    console.log(`📍 총 ${regions.length}개의 행정구역(읍/면/동)을 검색 대상으로 추출했습니다.`);

    // 테스트로 앞부분 20개만 먼저 실행해봅니다. (전체 실행 시 시간이 매우 오래 걸림)
    // 실제 전체 수집을 원하면 slice 제거
    const targetRegions = regions.slice(0, 20);
    console.log(`⚠️ 테스트 모드: 첫 20개 지역만 검색합니다.`);

    let allChurches = [];

    for (const [index, region] of targetRegions.entries()) {
        process.stdout.write(`[${index + 1}/${targetRegions.length}] ${region}... `);
        const results = await fetchChurchesByKeyword(region);
        process.stdout.write(`${results.length}건\n`);

        allChurches.push(...results);

        // Rate Limit 조절
        await sleep(200);
    }

    // 중복 제거
    const uniqueChurches = Array.from(
        new Map(allChurches.map((item) => [item.id, item])).values()
    );

    console.log('-----------------------------------');
    console.log(`📊 실행 결과: ${allChurches.length}건 수집 -> 중복 제거 후 ${uniqueChurches.length}건 유효`);

    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const outputPath = path.join(dataDir, 'churches-full.json');
    fs.writeFileSync(outputPath, JSON.stringify(uniqueChurches, null, 2));
    console.log(`💾 저장 완료: ${outputPath}`);
}

main();
