const fs = require('fs');
const path = require('path');

// 주요 교회들의 웹사이트 정보 (수동으로 수집)
const websiteData = {
  "22377855": "http://www.sarang.org", // 사랑의교회
  "17010406": "http://www.oryun.org", // 오륜교회
  "9717455": "http://www.onnuri.org", // 온누리교회
  "8011787": "http://www.fgtv.com", // 여의도순복음교회
  "7937569": "http://www.youngnak.net", // 영락교회
  "8490868": "http://www.choonghyun.org", // 충현교회
  "8096086": "http://www.yonsei.or.kr", // 연세중앙교회
  "11286881": "http://www.somang.net", // 소망교회
  "8077073": "http://www.saeil.or.kr", // 삼일교회
  "12766954": "http://www.kwangrim.com", // 광림교회
  "7931461": "http://www.chungpa.org", // 정동제일교회
  "8114054": "http://www.namseoul.org", // 남서울교회
  "8039877": "http://www.kumnan.org", // 금란교회
  "7962668": "http://www.smch.or.kr", // 새문안교회
  "15491870": "http://www.sarangfirst.or.kr", // 사랑제일교회
  "8075419": "http://www.dorim.or.kr", // 도림교회
  "8486396": "http://www.myungdong.org", // 명동성당 (성당)
  "8091547": "http://www.jogyesa.kr", // 조계사 (사찰)
};

// JSON 파일 읽기
const dataPath = path.join(__dirname, 'src', 'data', 'all-religious.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log(`총 ${data.length}개 시설 데이터 로드됨`);

let updated = 0;

// 웹사이트 정보 업데이트
data.forEach(facility => {
  if (websiteData[facility.id]) {
    facility.website = websiteData[facility.id];
    updated++;
    console.log(`✓ ${facility.name}: ${facility.website}`);
  }
});

console.log(`\n${updated}개 시설 웹사이트 정보 업데이트됨`);

// 파일 저장
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('데이터 파일 저장 완료!');
