const KAKAO_API_KEY = '70e76f9e3d17b1ca1a0d971658645fe8';

async function test() {
    console.log('Testing API Key:', KAKAO_API_KEY);
    try {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=카카오프렌즈&x=127.06283102249932&y=37.514322572335935&radius=20000`;
        const response = await fetch(url, {
            headers: {
                Authorization: `KakaoAK ${KAKAO_API_KEY}`,
            },
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
