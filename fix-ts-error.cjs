const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf-8');

// TypeScript 에러 수정 - website!. 부분 수정
content = content.replace(
  'selectedFacility.website!.startsWith',
  'selectedFacility.website?.startsWith'
);

// 또는 조건을 추가
content = content.replace(
  '{isValidWebsite(selectedFacility.website) && (',
  '{isValidWebsite(selectedFacility.website) && selectedFacility.website && ('
);

fs.writeFileSync(appPath, content, 'utf-8');
console.log('TypeScript 에러 수정 완료!');
