const fs = require('fs');
const path = require('path');

// 수집된 웹사이트 데이터 로드
const collectedWebsites = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'collected-websites.json'), 'utf-8')
);

console.log(`수집된 웹사이트: ${Object.keys(collectedWebsites).length}개`);

// 데이터 파일 업데이트
function updateDataFile(filename) {
  const filepath = path.join(__dirname, filename);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

  let updated = 0;
  for (const item of data) {
    // kakaoUrl에서 ID 추출
    let kakaoId = item.id;
    if (item.kakaoUrl) {
      const match = item.kakaoUrl.match(/\/(\d+)$/);
      if (match) {
        kakaoId = match[1];
      }
    }

    if (collectedWebsites[kakaoId] && !item.website) {
      item.website = collectedWebsites[kakaoId];
      updated++;
      console.log(`Updated ${item.name}: ${item.website}`);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`${filename}: ${updated}개 업데이트됨`);
  }

  return updated;
}

// 모든 데이터 파일 업데이트
let total = 0;
total += updateDataFile('churches.json');
total += updateDataFile('catholics.json');
total += updateDataFile('temples.json');

console.log(`\n총 ${total}개 시설 웹사이트 업데이트 완료`);
