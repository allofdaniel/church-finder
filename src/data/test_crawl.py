"""테스트 크롤링 - 단일 페이지 디버깅"""
import asyncio
from playwright.async_api import async_playwright

async def test_single():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 브라우저 표시
        page = await browser.new_page()

        # 금란교회 테스트
        url = "https://place.map.kakao.com/8238992"
        print(f"접속: {url}")

        await page.goto(url, wait_until='networkidle')
        await asyncio.sleep(3)

        # 페이지 내용 확인
        content = await page.content()
        print(f"페이지 길이: {len(content)}")

        # URL 헤딩 찾기
        try:
            result = await page.evaluate('''() => {
                const headings = document.querySelectorAll('h5');
                const found = [];
                for (const h of headings) {
                    found.push(h.textContent);
                    if (h.textContent.includes('URL')) {
                        const parent = h.closest('div');
                        if (parent) {
                            const link = parent.querySelector('a[href^="http"]');
                            if (link) {
                                return {
                                    headings: found,
                                    url: link.href,
                                    text: link.textContent
                                };
                            }
                        }
                    }
                }
                return { headings: found, url: null };
            }''')
            print(f"결과: {result}")
        except Exception as e:
            print(f"오류: {e}")

        await asyncio.sleep(5)
        await browser.close()

asyncio.run(test_single())
