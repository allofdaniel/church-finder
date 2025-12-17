const fs = require('fs');
const path = require('path');

// 웹사이트가 없는 시설 목록 추출
function getMissingWebsites() {
  const files = ['churches.json', 'catholics.json', 'temples.json'];
  const missing = [];

  for (const file of files) {
    const filepath = path.join(__dirname, file);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    for (const item of data) {
      // 웹사이트가 없고 kakaoUrl이 있는 시설
      if (!item.website && item.kakaoUrl) {
        const match = item.kakaoUrl.match(/\/(\d+)$/);
        if (match) {
          missing.push({
            id: match[1],
            name: item.name,
            type: item.type,
            kakaoUrl: item.kakaoUrl
          });
        }
      }
    }
  }

  console.log(`웹사이트 없는 시설: ${missing.length}개`);

  // 결과 저장
  fs.writeFileSync(
    path.join(__dirname, 'missing-websites.json'),
    JSON.stringify(missing, null, 2)
  );

  // 처음 100개 ID만 출력
  console.log('\n처음 100개 시설:');
  missing.slice(0, 100).forEach((item, i) => {
    console.log(`${i+1}. ${item.id} - ${item.name}`);
  });

  return missing;
}

getMissingWebsites();
