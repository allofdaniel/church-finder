import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 네이버 API 키
const NAVER_CLIENT_ID = 'e4wKB9ovFGdrLIzh_0fE';
const NAVER_CLIENT_SECRET = 'dETqu3Fh4w';

// 전국 주요 도시 리스트 (네이버는 '쿼리' 기반 검색이라 좌표 대신 지명+교회로 검색하는 게 유리합니다)
const SEARCH_QUERIES = [
    '서울 종로구 교회', '서울 강남구 교회', '서울 영등포구 교회', '서울 서초구 교회', '서울 송파구 교회',
    '성남 분당구 교회', '수원 팔달구 교회', '고양 일산동구 교회',
    '인천 남동구 교회', '인천 부평구 교회',
    '부산 해운대구 교회', '부산 부산진구 교회',
    '대구 중구 교회', '대전 서구 교회', '광주 서구 교회', '울산 남구 교회'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchChurchesNaver(query) {
    const churches = [];
    try {
        // 한 번에 5개씩만 가져옵니다 (네이버 정책상 display 기본값 1, 최대 5로 되어있는 경우가 있음. 로컬 API 문서 확인 필요)
        // 실제로는 display=5가 최대인 경우가 많으므로 5개씩 가져옵니다.
        const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`;

        const response = await fetch(url, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
        });

        if (!response.ok) {
            throw new Error(`Naver API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.items) {
            const items = data.items.map((item) => {
                // 네이버 좌표는 KATECH 좌표계일 수 있음. mapx, mapy가 나오는데, 
                // 다행히 최근엔 일반 위경도 변환이 필요하거나 그대로 쓸 수 있음.
                // 하지만 여기서는 간단히 이름/주소 수집을 목적으로 함.
                return {
                    name: item.title.replace(/<[^>]*>?/gm, ''), // HTML 태그 제거 (<b> 등)
                    address: item.address,
                    roadAddress: item.roadAddress,
                    phone: item.telephone,
                    url: item.link,
                    category: item.category,
                    source: 'naver'
                };
            });
            churches.push(...items);
        }

        console.log(`✅ [${query}] ${churches.length}개 발견`);

    } catch (error) {
        console.error(`❌ [${query}] Error:`, error.message);
    }

    await sleep(100); // API Rate Limit 고려
    return churches;
}

async function main() {
    console.log('🚀 네이버 API로 전국 교회 데이터 수집 시작...');

    let allChurches = [];

    for (const query of SEARCH_QUERIES) {
        const churches = await fetchChurchesNaver(query);
        allChurches = [...allChurches, ...churches];
    }

    console.log('-----------------------------------');
    console.log(`📊 총 수집된 교회: ${allChurches.length}개`);

    // 결과 저장
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outputPath = path.join(__dirname, '../src/data/churches-naver.json');

    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(allChurches, null, 2));
    console.log(`💾 데이터 저장 완료: ${outputPath}`);
}

main();
