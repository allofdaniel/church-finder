"""
KakaoMap에서 웹사이트 URL을 병렬로 크롤링하는 스크립트
Playwright를 사용하여 SPA 페이지를 렌더링하고 웹사이트 정보를 추출
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# 설정
MAX_CONCURRENT = 3  # 동시 처리 개수 (안정성을 위해 줄임)
TIMEOUT = 30000  # 30초 타임아웃
RETRY_COUNT = 2  # 재시도 횟수

async def extract_website(browser, kakao_id: str, name: str, semaphore: asyncio.Semaphore) -> tuple[str, str | None]:
    """단일 시설의 웹사이트 URL 추출"""
    async with semaphore:
        url = f"https://place.map.kakao.com/{kakao_id}"
        website = None

        for attempt in range(RETRY_COUNT):
            context = None
            page = None
            try:
                # 새 컨텍스트 생성 (격리)
                context = await browser.new_context(
                    viewport={'width': 1280, 'height': 720},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                page = await context.new_page()

                await page.goto(url, wait_until='networkidle', timeout=TIMEOUT)
                await asyncio.sleep(2)  # SPA 렌더링 대기

                # JavaScript로 URL 추출
                website = await page.evaluate('''() => {
                    const headings = document.querySelectorAll('h5');
                    for (const h of headings) {
                        if (h.textContent && h.textContent.includes('URL')) {
                            const parent = h.closest('div');
                            if (parent) {
                                const link = parent.querySelector('a[href^="http"]');
                                if (link && !link.href.includes('kakao')) {
                                    return link.href;
                                }
                            }
                        }
                    }
                    return null;
                }''')

                await page.close()
                await context.close()

                if website:
                    print(f"✓ {name}: {website}")
                    return kakao_id, website
                else:
                    if attempt == RETRY_COUNT - 1:
                        print(f"✗ {name}: 웹사이트 없음")
                    return kakao_id, None

            except PlaywrightTimeout:
                print(f"⏱ {name}: 타임아웃 (시도 {attempt + 1}/{RETRY_COUNT})")
                if page:
                    try: await page.close()
                    except: pass
                if context:
                    try: await context.close()
                    except: pass
                if attempt == RETRY_COUNT - 1:
                    return kakao_id, None
            except Exception as e:
                print(f"✗ {name}: 오류 - {str(e)[:50]}")
                if page:
                    try: await page.close()
                    except: pass
                if context:
                    try: await context.close()
                    except: pass
                if attempt == RETRY_COUNT - 1:
                    return kakao_id, None

        return kakao_id, None


async def main():
    """메인 크롤링 함수"""
    script_dir = Path(__file__).parent

    # missing-websites.json 로드
    missing_file = script_dir / 'missing-websites.json'
    if not missing_file.exists():
        print("missing-websites.json 파일이 없습니다.")
        return

    with open(missing_file, 'r', encoding='utf-8') as f:
        facilities = json.load(f)

    print(f"총 {len(facilities)}개 시설 크롤링 시작...")

    # 기존 결과 로드
    collected_file = script_dir / 'collected-websites.json'
    if collected_file.exists():
        with open(collected_file, 'r', encoding='utf-8') as f:
            collected = json.load(f)
    else:
        collected = {}

    # 이미 수집된 것 제외
    already_done = set(k for k, v in collected.items() if v is not None)
    remaining = [f for f in facilities if f['id'] not in already_done]
    print(f"이미 수집됨: {len(already_done)}개, 남은 시설: {len(remaining)}개")

    if not remaining:
        print("모든 시설이 이미 수집되었습니다.")
        return

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async with async_playwright() as p:
        # headless=False로 실행 (카카오맵이 headless 차단)
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )

        try:
            # 배치 처리
            batch_size = 10
            total_batches = (len(remaining) + batch_size - 1) // batch_size

            for i in range(0, len(remaining), batch_size):
                batch = remaining[i:i + batch_size]
                batch_num = i // batch_size + 1
                print(f"\n=== 배치 {batch_num}/{total_batches} ({len(batch)}개) ===")

                # 배치 내 병렬 처리
                tasks = [extract_website(browser, f['id'], f['name'], semaphore) for f in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                for result in results:
                    if isinstance(result, tuple):
                        kakao_id, website = result
                        if website:
                            collected[kakao_id] = website

                # 중간 저장
                with open(collected_file, 'w', encoding='utf-8') as f:
                    json.dump(collected, f, ensure_ascii=False, indent=2)

                websites_found = len([v for v in collected.values() if v])
                print(f"현재까지 수집된 웹사이트: {websites_found}개")

                # 서버 부하 방지
                await asyncio.sleep(1)

        finally:
            await browser.close()

    # 최종 저장
    with open(collected_file, 'w', encoding='utf-8') as f:
        json.dump(collected, f, ensure_ascii=False, indent=2)

    success_count = len([v for v in collected.values() if v])
    print(f"\n=== 크롤링 완료 ===")
    print(f"총 시설: {len(facilities)}개")
    print(f"웹사이트 발견: {success_count}개")


if __name__ == '__main__':
    asyncio.run(main())
