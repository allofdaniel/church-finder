const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. RELIGION_CONFIG 수정 (아이콘 URL 제거, 성당/사찰 아이콘 변경)
content = content.replace(
  /const RELIGION_CONFIG = \{[\s\S]*?cult:[\s\S]*?\}/,
  `const RELIGION_CONFIG = {
  church: { icon: '⛪', label: '교회', color: '#6366F1' },
  catholic: { icon: '✝️', label: '성당', color: '#EC4899' },
  temple: { icon: '☸️', label: '사찰', color: '#10B981' },
  cult: { icon: '⚠️', label: '이단의심', color: '#F59E0B' }
}`
);

// 2. ICON_IDS 삭제하고 MAP_STYLES 추가
content = content.replace(
  /\/\/ 지도 아이콘 ID[\s\S]*?const ICON_IDS = \{[\s\S]*?\}/,
  `// 지도 스타일 (일반/위성)
const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: {
    version: 8 as const,
    sources: {
      'satellite': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri'
      }
    },
    layers: [{ id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 19 }]
  }
}`
);

// 3. iconsLoaded state를 satelliteMode로 변경
content = content.replace(
  /const \[iconsLoaded, setIconsLoaded\] = useState\(false\)/,
  'const [satelliteMode, setSatelliteMode] = useState(false)'
);

// 4. handleMapLoad 함수 단순화 (아이콘 로딩 제거)
content = content.replace(
  /\/\/ 맵 로드 후 아이콘 이미지 추가[\s\S]*?const handleMapLoad = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\)/,
  `// 맵 로드 핸들러
  const handleMapLoad = useCallback(() => {
    // 맵 로드 완료
  }, [])`
);

// 5. mapStyle 변수 수정
content = content.replace(
  /const mapStyle = darkMode \? 'https:\/\/basemaps\.cartocdn\.com\/gl\/dark-matter-gl-style\/style\.json' : 'https:\/\/basemaps\.cartocdn\.com\/gl\/positron-gl-style\/style\.json'/,
  `const mapStyle = satelliteMode
    ? MAP_STYLES.satellite
    : (darkMode ? MAP_STYLES.dark : MAP_STYLES.light)`
);

// 6. unclusteredPointLayer를 3D 스타일로 변경
content = content.replace(
  /\/\/ 개별 포인트 레이어 - PNG 아이콘 마커[\s\S]*?const unclusteredPointLayer: any = iconsLoaded \? \{[\s\S]*?'circle-opacity': 0\.9\s*\}\s*\}/,
  `// 3D 마커 그림자 레이어
  const markerShadowLayer: any = {
    id: 'marker-shadow',
    type: 'circle',
    source: 'facilities',
    minzoom: 10,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 10, 18, 16],
      'circle-color': 'rgba(0, 0, 0, 0.3)',
      'circle-blur': 0.5,
      'circle-translate': [2, 2]
    }
  }

  // 3D 마커 외곽 레이어
  const markerOuterLayer: any = {
    id: 'marker-outer',
    type: 'circle',
    source: 'facilities',
    minzoom: 10,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 12, 18, 18],
      'circle-color': ['match', ['get', 'type'],
        'church', '#4F46E5',
        'catholic', '#DB2777',
        'temple', '#059669',
        'cult', '#D97706',
        '#4F46E5'
      ],
      'circle-opacity': 0.9
    }
  }

  // 3D 마커 내부 레이어 (하이라이트)
  const unclusteredPointLayer: any = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'facilities',
    minzoom: 10,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 8, 18, 13],
      'circle-color': ['match', ['get', 'type'],
        'church', '#818CF8',
        'catholic', '#F472B6',
        'temple', '#34D399',
        'cult', '#FBBF24',
        '#818CF8'
      ],
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 2, 18, 3],
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 1
    }
  }`
);

// 7. 개별 시설 포인트 Source 내부에 3개 레이어 추가
content = content.replace(
  /<Source id="facilities" type="geojson" data=\{geojsonData\} cluster=\{false\}>\s*<Layer \{\.\.\.unclusteredPointLayer\} \/>/,
  `<Source id="facilities" type="geojson" data={geojsonData} cluster={false}>
                  <Layer {...markerShadowLayer} />
                  <Layer {...markerOuterLayer} />
                  <Layer {...unclusteredPointLayer} />`
);

// 8. 위성 토글 버튼 추가 (NavigationControl 다음에)
content = content.replace(
  /<NavigationControl position="top-right" \/>/,
  `<NavigationControl position="top-right" />

                {/* 위성 모드 토글 버튼 */}
                <div className="satellite-toggle-container">
                  <button
                    className={\`satellite-toggle \${satelliteMode ? 'active' : ''}\`}
                    onClick={() => setSatelliteMode(!satelliteMode)}
                    title={satelliteMode ? '일반 지도' : '위성 사진'}
                  >
                    {satelliteMode ? '🗺️' : '🛰️'}
                  </button>
                </div>`
);

// 9. interactiveLayerIds 업데이트
content = content.replace(
  /interactiveLayerIds=\{\['sigungu-fill', 'unclustered-point'\]\}/,
  "interactiveLayerIds={['sigungu-fill', 'marker-outer', 'unclustered-point']}"
);

fs.writeFileSync(appTsxPath, content, 'utf8');
console.log('App.tsx updated successfully!');
