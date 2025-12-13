const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf-8');

// 1. isValidWebsite 함수 추가 (REGIONS 다음에)
const regionsLine = "const REGIONS = ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']";
const isValidWebsiteFunc = `${regionsLine}

// 유효한 웹사이트 URL인지 확인 (policy.daum.net 등 잘못된 URL 필터링)
const isValidWebsite = (url: string | null): boolean => {
  if (!url) return false
  const invalidPatterns = [
    'policy.daum.net',
    'policy.kakao.com',
    'cs.kakao.com',
    'cs.daum.net'
  ]
  return !invalidPatterns.some(pattern => url.includes(pattern))
}`;

content = content.replace(regionsLine, isValidWebsiteFunc);

// 2. 목록 카드의 웹사이트 표시를 isValidWebsite로 변경
content = content.replace(
  '{facility.website && <span className="facility-website">🌐 웹사이트</span>}',
  '{isValidWebsite(facility.website) && <span className="facility-website">🌐 웹사이트</span>}'
);

// 3. 모달의 웹사이트 버튼을 isValidWebsite로 변경
const oldWebsiteButton = `{selectedFacility.website && (
                <a
                  href={selectedFacility.website.startsWith('http') ? selectedFacility.website : \`https://\${selectedFacility.website}\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn website"
                >
                  🌐 웹사이트
                </a>
              )}`;

const newWebsiteButton = `{isValidWebsite(selectedFacility.website) && (
                <a
                  href={selectedFacility.website!.startsWith('http') ? selectedFacility.website : \`https://\${selectedFacility.website}\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn website"
                >
                  🌐 웹사이트
                </a>
              )}`;

content = content.replace(oldWebsiteButton, newWebsiteButton);

// 4. 네이버맵 링크를 이름+주소 대신 주소만으로 검색하도록 변경
content = content.replace(
  "href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedFacility.name + ' ' + selectedFacility.address)}`}",
  "href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedFacility.roadAddress || selectedFacility.address)}`}"
);

fs.writeFileSync(appPath, content, 'utf-8');
console.log('App.tsx 수정 완료!');
console.log('- isValidWebsite 함수 추가');
console.log('- 목록 웹사이트 표시 수정');
console.log('- 모달 웹사이트 버튼 수정');
console.log('- 네이버맵 검색을 주소로 변경');
