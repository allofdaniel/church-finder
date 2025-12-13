import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 카카오 API 키
const KAKAO_API_KEY = '6685f9ce078c1032be62e728092b05ca';

// 전국 주요 거점 좌표 (시/군/구 단위 Sample)
// 실제로는 더 촘촘한 격자(Grid) 좌표가 필요하지만, 테스트를 위해 주요 도시 중심으로 구성합니다.
const REGIONS = [
    // 서울
    { name: '서울 종로구', lat: 37.5729, lng: 126.9793 },
    { name: '서울 강남구', lat: 37.5172, lng: 127.0473 },
    { name: '서울 영등포구', lat: 37.5255, lng: 126.8972 },
    { name: '서울 노원구', lat: 37.6542, lng: 127.0568 },
    // 경기
    { name: '성남 분당구', lat: 37.3827, lng: 127.1189 },
    { name: '수원 팔달구', lat: 37.2820, lng: 127.0197 },
    { name: '고양 일산동구', lat: 37.6584, lng: 126.7940 },
    // 인천
    { name: '인천 남동구', lat: 37.4473, lng: 126.7314 },
    // 부산
    { name: '부산 해운대구', lat: 35.1631, lng: 129.1636 },
    { name: '부산 부산진구', lat: 35.1633, lng: 129.0528 },
    // 대구
    { name: '대구 중구', lat: 35.8693, lng: 128.6010 },
    // 광주
    { name: '광주 서구', lat: 35.1521, lng: 126.8900 },
    // 대전
    { name: '대전 서구', lat: 36.3551, lng: 127.3812 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchChurches(region) {
    const churches = [];
    let page = 1;
    let isEnd = false;

    console.log(`📡 [${region.name}] 검색 시작...`);

    while (!isEnd && page <= 3) { // 카카오 API는 최대 3페이지(45개)까지만 제공
        try {
            const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=교회&x=${region.lng}&y=${region.lat}&radius=5000&page=${page}`;
            const response = await fetch(url, {
                headers: {
                    Authorization: `KakaoAK ${KAKAO_API_KEY}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();

            // 디버깅용: 첫 번째 응답만 출력
            if (page === 1 && region.name === '서울 종로구') {
                console.log('🔍 첫 번째 API 응답 확인:', JSON.stringify(data).substring(0, 200) + '...');
            }

            if (!data.documents) {
                console.error(`⚠️ [${region.name}] 'documents' 필드가 없습니다. 응답:`, data);
                break;
            }


            const items = data.documents.map((doc) => ({
                id: doc.id,
                name: doc.place_name,
                address: doc.address_name,
                roadAddress: doc.road_address_name,
                phone: doc.phone,
                lat: parseFloat(doc.y),
                lng: parseFloat(doc.x),
                url: doc.place_url,
                region: region.name,
                category: doc.category_name,
            }));

            churches.push(...items);
            isEnd = data.meta.is_end;
            page++;

            // API Rate Limit 방지
            await sleep(200);

        } catch (error) {
            console.error(`❌ [${region.name}] Error:`, error.message);
            break;
        }
    }

    console.log(`✅ [${region.name}] ${churches.length}개 발견`);
    return churches;
}

async function main() {
    console.log('🚀 전국 교회 데이터 수집 시작...');

    let allChurches = [];

    for (const region of REGIONS) {
        const churches = await fetchChurches(region);
        allChurches = [...allChurches, ...churches];
    }

    // 중복 제거 (ID 기준)
    const uniqueChurches = Array.from(
        new Map(allChurches.map((item) => [item.id, item])).values()
    );

    console.log('-----------------------------------');
    console.log(`📊 총 수집된 교회: ${uniqueChurches.length}개`);

    // 결과 저장
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outputPath = path.join(__dirname, '../src/data/churches.json');

    // src/data 폴더 생성
    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(uniqueChurches, null, 2));
    console.log(`💾 데이터 저장 완료: ${outputPath}`);
}

main();
