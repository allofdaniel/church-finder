import type { Language } from '../types/facility'

export interface TranslationStrings {
  appTitle: string
  appSubtitle: string
  search: string
  searchPlaceholder: string
  allTypes: string
  nationwide: string
  reset: string
  church: string
  catholic: string
  temple: string
  cult: string
  favorite: string
  share: string
  roadview: string
  streetview: string
  call: string
  website: string
  address: string
  phone: string
  favorites: string
  recentViewed: string
  darkMode: string
  satelliteView: string
  filterByType: string
  filterByRegion: string
  linkCopied: string
  shareFacility: string
  noResults: string
  loading: string
  regionShortcut: string
  prev: string
  next: string
  dataSource: string
  pageOf: string
  noneSelected: string
  selected: string
  selectAll: string
  normalMap: string
  satelliteMap: string
  noFavorites: string
  noFavoritesHint: string
  menu: string
  searchResults: string
  count: string
  kakao: string
  naver: string
  kakaoRoadview: string
  naverStreetview: string
  streetviewChoice: string
  addressResults?: string
  facilityResults?: string
}

export const TRANSLATIONS: Record<Language, TranslationStrings> = {
  ko: {
    appTitle: '종교시설 찾기',
    appSubtitle: '개 시설',
    search: '검색',
    searchPlaceholder: '시설명, 주소 검색',
    allTypes: '전체유형',
    nationwide: '전국',
    reset: '초기화',
    church: '교회',
    catholic: '성당',
    temple: '사찰',
    cult: '이단의심',
    favorite: '즐겨찾기',
    share: '공유',
    roadview: '로드뷰',
    streetview: '거리뷰',
    call: '전화',
    website: '웹사이트',
    address: '주소',
    phone: '전화번호',
    favorites: '즐겨찾기',
    recentViewed: '최근 본 시설',
    darkMode: '다크 모드',
    satelliteView: '위성 보기',
    filterByType: '유형 필터',
    filterByRegion: '지역 필터',
    linkCopied: '링크가 복사되었습니다!',
    shareFacility: '시설 정보 공유',
    noResults: '검색 결과가 없습니다',
    loading: '로딩 중...',
    regionShortcut: '지역 바로가기',
    prev: '이전',
    next: '다음',
    dataSource: '데이터: 카카오맵 · 업데이트:',
    pageOf: '/',
    noneSelected: '선택 없음',
    selected: '개 선택',
    selectAll: '전체 선택',
    normalMap: '일반 지도',
    satelliteMap: '위성 사진',
    noFavorites: '즐겨찾기한 시설이 없습니다',
    noFavoritesHint: '시설을 선택하고 ☆ 버튼을 눌러 추가하세요',
    menu: '메뉴',
    searchResults: '검색 결과',
    count: '개',
    kakao: '카카오',
    naver: '네이버',
    kakaoRoadview: '카카오 로드뷰',
    naverStreetview: '네이버 거리뷰',
    streetviewChoice: '어떤 스트리트뷰를 사용하시겠습니까?',
    addressResults: '주소 검색 결과',
    facilityResults: '시설 검색 결과'
  },
  en: {
    appTitle: 'Religious Places',
    appSubtitle: ' facilities',
    search: 'Search',
    searchPlaceholder: 'Search by name, address',
    allTypes: 'All Types',
    nationwide: 'Nationwide',
    reset: 'Reset',
    church: 'Church',
    catholic: 'Catholic',
    temple: 'Temple',
    cult: 'Suspicious',
    favorite: 'Favorite',
    share: 'Share',
    roadview: 'Roadview',
    streetview: 'Streetview',
    call: 'Call',
    website: 'Website',
    address: 'Address',
    phone: 'Phone',
    favorites: 'Favorites',
    recentViewed: 'Recent',
    darkMode: 'Dark Mode',
    satelliteView: 'Satellite',
    filterByType: 'Type Filter',
    filterByRegion: 'Region Filter',
    linkCopied: 'Link copied!',
    shareFacility: 'Share Facility',
    noResults: 'No results found',
    loading: 'Loading...',
    regionShortcut: 'Quick Region',
    prev: 'Prev',
    next: 'Next',
    dataSource: 'Data: KakaoMap · Updated:',
    pageOf: ' of ',
    noneSelected: 'None',
    selected: ' selected',
    selectAll: 'Select All',
    normalMap: 'Normal Map',
    satelliteMap: 'Satellite',
    noFavorites: 'No favorites yet',
    noFavoritesHint: 'Select a place and tap ☆ to add',
    menu: 'Menu',
    searchResults: 'results for',
    count: '',
    kakao: 'Kakao',
    naver: 'Naver',
    kakaoRoadview: 'Kakao Roadview',
    naverStreetview: 'Naver Streetview',
    streetviewChoice: 'Which streetview would you like?',
    addressResults: 'Address Results',
    facilityResults: 'Facility Results'
  },
  zh: {
    appTitle: '宗教设施搜索',
    appSubtitle: '个设施',
    search: '搜索',
    searchPlaceholder: '搜索名称、地址',
    allTypes: '全部类型',
    nationwide: '全国',
    reset: '重置',
    church: '教会',
    catholic: '天主教堂',
    temple: '寺庙',
    cult: '可疑',
    favorite: '收藏',
    share: '分享',
    roadview: '街景',
    streetview: '街景',
    call: '电话',
    website: '网站',
    address: '地址',
    phone: '电话',
    favorites: '收藏夹',
    recentViewed: '最近查看',
    darkMode: '深色模式',
    satelliteView: '卫星视图',
    filterByType: '类型筛选',
    filterByRegion: '地区筛选',
    linkCopied: '链接已复制！',
    shareFacility: '分享设施信息',
    noResults: '没有找到结果',
    loading: '加载中...',
    regionShortcut: '地区快捷',
    prev: '上一页',
    next: '下一页',
    dataSource: '数据: KakaoMap · 更新:',
    pageOf: ' / ',
    noneSelected: '未选择',
    selected: '个已选',
    selectAll: '全选',
    normalMap: '普通地图',
    satelliteMap: '卫星图',
    noFavorites: '暂无收藏',
    noFavoritesHint: '选择设施并点击☆添加',
    menu: '菜单',
    searchResults: '搜索结果',
    count: '个',
    kakao: 'Kakao',
    naver: 'Naver',
    kakaoRoadview: 'Kakao街景',
    naverStreetview: 'Naver街景',
    streetviewChoice: '请选择街景服务',
    addressResults: '地址搜索结果',
    facilityResults: '设施搜索结果'
  },
  ja: {
    appTitle: '宗教施設検索',
    appSubtitle: '施設',
    search: '検索',
    searchPlaceholder: '名前、住所で検索',
    allTypes: '全種類',
    nationwide: '全国',
    reset: 'リセット',
    church: '教会',
    catholic: '聖堂',
    temple: '寺院',
    cult: '疑わしい',
    favorite: 'お気に入り',
    share: '共有',
    roadview: 'ストリートビュー',
    streetview: 'ストリートビュー',
    call: '電話',
    website: 'ウェブサイト',
    address: '住所',
    phone: '電話番号',
    favorites: 'お気に入り',
    recentViewed: '最近見た施設',
    darkMode: 'ダークモード',
    satelliteView: '衛星写真',
    filterByType: '種類フィルター',
    filterByRegion: '地域フィルター',
    linkCopied: 'リンクがコピーされました！',
    shareFacility: '施設情報を共有',
    noResults: '結果が見つかりません',
    loading: '読み込み中...',
    regionShortcut: '地域ショートカット',
    prev: '前へ',
    next: '次へ',
    dataSource: 'データ: カカオマップ · 更新:',
    pageOf: ' / ',
    noneSelected: '選択なし',
    selected: '件選択',
    selectAll: '全て選択',
    normalMap: '通常地図',
    satelliteMap: '衛星写真',
    noFavorites: 'お気に入りがありません',
    noFavoritesHint: '施設を選択して☆を押してください',
    menu: 'メニュー',
    searchResults: '検索結果',
    count: '件',
    kakao: 'Kakao',
    naver: 'Naver',
    kakaoRoadview: 'Kakaoストリートビュー',
    naverStreetview: 'Naverストリートビュー',
    streetviewChoice: 'どのストリートビューを使用しますか？',
    addressResults: '住所検索結果',
    facilityResults: '施設検索結果'
  }
}

// Address translation mappings
export const ADDRESS_TRANSLATIONS: Record<Language, Record<string, string>> = {
  ko: {}, // 한국어는 그대로
  en: {
    '특별시': '', '광역시': '', '특별자치시': '', '특별자치도': '',
    '도': ' Province', '시': ' City', '군': ' County', '구': ' District',
    '읍': ' Town', '면': ' Township', '동': '-dong', '리': '-ri',
    '로': '-ro', '길': '-gil', '번길': ' Beon-gil', '대로': '-daero',
    '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon',
    '광주': 'Gwangju', '대전': 'Daejeon', '울산': 'Ulsan', '세종': 'Sejong',
    '경기': 'Gyeonggi', '강원': 'Gangwon', '충북': 'Chungbuk', '충남': 'Chungnam',
    '전북': 'Jeonbuk', '전남': 'Jeonnam', '경북': 'Gyeongbuk', '경남': 'Gyeongnam',
    '제주': 'Jeju',
    '수원': 'Suwon', '성남': 'Seongnam', '고양': 'Goyang', '용인': 'Yongin',
    '안양': 'Anyang', '안산': 'Ansan', '청주': 'Cheongju', '천안': 'Cheonan',
    '전주': 'Jeonju', '포항': 'Pohang', '창원': 'Changwon', '김해': 'Gimhae',
    '진주': 'Jinju', '춘천': 'Chuncheon', '원주': 'Wonju', '강릉': 'Gangneung',
    '여수': 'Yeosu', '순천': 'Suncheon', '목포': 'Mokpo', '군산': 'Gunsan',
    '익산': 'Iksan', '경주': 'Gyeongju', '구미': 'Gumi', '안동': 'Andong',
    '강남': 'Gangnam', '서초': 'Seocho', '송파': 'Songpa', '강동': 'Gangdong',
    '마포': 'Mapo', '용산': 'Yongsan', '성동': 'Seongdong', '광진': 'Gwangjin',
    '동대문': 'Dongdaemun', '중랑': 'Jungnang', '성북': 'Seongbuk', '강북': 'Gangbuk',
    '도봉': 'Dobong', '노원': 'Nowon', '종로': 'Jongno', '중구': 'Jung-gu',
    '영등포': 'Yeongdeungpo', '구로': 'Guro', '금천': 'Geumcheon', '관악': 'Gwanak',
    '동작': 'Dongjak', '양천': 'Yangcheon', '강서': 'Gangseo', '은평': 'Eunpyeong'
  },
  zh: {
    '특별시': '特别市', '광역시': '广域市', '특별자치시': '特别自治市', '특별자치도': '特别自治道',
    '도': '道', '시': '市', '군': '郡', '구': '区',
    '읍': '邑', '면': '面', '동': '洞', '리': '里',
    '로': '路', '길': '街', '번길': '番街', '대로': '大路',
    '서울': '首尔', '부산': '釜山', '대구': '大邱', '인천': '仁川',
    '광주': '光州', '대전': '大田', '울산': '蔚山', '세종': '世宗',
    '경기': '京畿', '강원': '江原', '충북': '忠北', '충남': '忠南',
    '전북': '全北', '전남': '全南', '경북': '庆北', '경남': '庆南',
    '제주': '济州',
    '수원': '水原', '성남': '城南', '고양': '高阳', '용인': '龙仁',
    '청주': '清州', '천안': '天安', '전주': '全州', '포항': '浦项',
    '창원': '昌原', '춘천': '春川'
  },
  ja: {
    '특별시': '特別市', '광역시': '広域市', '특별자치시': '特別自治市', '특별자치도': '特別自治道',
    '도': '道', '시': '市', '군': '郡', '구': '区',
    '읍': '邑', '면': '面', '동': '洞', '리': '里',
    '로': '路', '길': '通り', '번길': '番通り', '대로': '大路',
    '서울': 'ソウル', '부산': '釜山', '대구': '大邱', '인천': '仁川',
    '광주': '光州', '대전': '大田', '울산': '蔚山', '세종': '世宗',
    '경기': '京畿', '강원': '江原', '충북': '忠北', '충남': '忠南',
    '전북': '全北', '전남': '全南', '경북': '慶北', '경남': '慶南',
    '제주': '済州',
    '수원': '水原', '성남': '城南', '고양': '高陽', '용인': '龍仁',
    '청주': '清州', '천안': '天安', '전주': '全州', '포항': '浦項',
    '창원': '昌原', '春川': '春川'
  }
}

// Name translation mappings
export const NAME_TRANSLATIONS: Record<Language, Record<string, string>> = {
  ko: {},
  en: {
    '교회': 'Church', '성당': 'Cathedral', '사찰': 'Temple', '절': 'Temple',
    '암자': 'Hermitage', '선원': 'Zen Center', '포교당': 'Mission',
    '수도원': 'Monastery', '수녀원': 'Convent', '기도원': 'Prayer House',
    '선교원': 'Mission Center', '신학교': 'Seminary', '수양관': 'Retreat Center',
    '성공회': 'Anglican', '침례': 'Baptist', '감리': 'Methodist', '장로': 'Presbyterian',
    '순복음': 'Full Gospel', '오순절': 'Pentecostal', '루터': 'Lutheran',
    '정교회': 'Orthodox', '개혁': 'Reformed', '복음': 'Gospel', '성결': 'Holiness',
    '제일': 'First', '중앙': 'Central', '새': 'New', '큰': 'Great', '작은': 'Little',
    '동': 'East', '서': 'West', '남': 'South', '북': 'North',
    '사랑': 'Love', '은혜': 'Grace', '소망': 'Hope', '믿음': 'Faith',
    '평화': 'Peace', '기쁨': 'Joy', '영광': 'Glory', '축복': 'Blessing',
    '부활': 'Resurrection', '생명': 'Life', '빛': 'Light',
    '진리': 'Truth', '자유': 'Freedom', '구원': 'Salvation', '찬양': 'Praise',
    '보문': 'Bomun', '관음': 'Guanyin', '미륵': 'Maitreya', '석가': 'Sakyamuni',
    '대웅전': 'Main Hall', '법당': 'Dharma Hall'
  },
  zh: {
    '교회': '教会', '성당': '天主教堂', '사찰': '寺庙', '절': '寺',
    '암자': '庵', '선원': '禅院', '포교당': '布教堂',
    '수도원': '修道院', '수녀원': '修女院', '기도원': '祈祷院',
    '의': '的', '과': '与', '와': '与',
    '성공회': '圣公会', '침례': '浸礼', '감리': '卫理', '장로': '长老',
    '순복음': '纯福音', '오순절': '五旬节', '루터': '路德',
    '예수': '耶稣', '그리스도': '基督', '천주': '天主', '하나님': '上帝',
    '제일': '第一', '중앙': '中央', '새': '新', '큰': '大', '작은': '小',
    '동': '东', '서': '西', '남': '南', '북': '北',
    '사랑': '爱', '은혜': '恩典', '소망': '希望', '믿음': '信仰',
    '평화': '和平', '기쁨': '喜乐', '영광': '荣耀', '축복': '祝福',
    '보문': '普门', '관음': '观音', '미륵': '弥勒', '석가': '释迦',
    '대웅전': '大雄殿', '법당': '法堂'
  },
  ja: {
    '교회': '教会', '성당': '聖堂', '사찰': '寺院', '절': '寺',
    '암자': '庵', '선원': '禅院', '포교당': '布教堂',
    '수도원': '修道院', '수녀원': '修道女院', '기도원': '祈祷院',
    '의': 'の', '과': 'と', '와': 'と',
    '성공회': '聖公会', '침례': 'バプテスト', '감리': 'メソジスト', '장로': '長老',
    '순복음': '純福音', '오순절': 'ペンテコステ', '루터': 'ルター',
    '예수': 'イエス', '그리스도': 'キリスト', '천주': '天主', '하나님': '神',
    '제일': '第一', '중앙': '中央', '새': '新', '큰': '大', '작은': '小',
    '동': '東', '서': '西', '남': '南', '북': '北',
    '사랑': '愛', '은혜': '恵み', '소망': '希望', '믿음': '信仰',
    '平和': '平和', '기쁨': '喜び', '영광': '栄光', '축복': '祝福',
    '보문': '普門', '관음': '観音', '미륵': '弥勒', '석가': '釈迦',
    '대웅전': '大雄殿', '법당': '法堂'
  }
}
