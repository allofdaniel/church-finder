package com.allofdaniel.churchfinder;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int safeAreaTop = 0;
    private int safeAreaBottom = 0;
    private int safeAreaLeft = 0;
    private int safeAreaRight = 0;
    private Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge 모드 활성화
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // WindowInsets를 감지
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            safeAreaTop = insets.top;
            safeAreaBottom = insets.bottom;
            safeAreaLeft = insets.left;
            safeAreaRight = insets.right;

            // 지연 후 주입 (WebView 로드 대기)
            scheduleInjectSafeArea();

            return windowInsets;
        });
    }

    private void scheduleInjectSafeArea() {
        // 여러 번 시도해서 확실히 적용
        handler.postDelayed(this::injectSafeAreaCSS, 500);
        handler.postDelayed(this::injectSafeAreaCSS, 1500);
        handler.postDelayed(this::injectSafeAreaCSS, 3000);
    }

    private void injectSafeAreaCSS() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                String js = String.format(
                    "if(document.documentElement) {" +
                    // CSS 변수 설정
                    "document.documentElement.style.setProperty('--safe-area-top', '%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-bottom', '%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-left', '%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-right', '%dpx');" +
                    // 상단 search-header에 패딩 적용
                    "var searchHeader = document.querySelector('.search-header');" +
                    "if(searchHeader) searchHeader.style.paddingTop = 'calc(0.5rem + %dpx)';" +
                    // 하단 bottom-sheet에 bottom 적용
                    "var bottomSheet = document.querySelector('.bottom-sheet');" +
                    "if(bottomSheet) bottomSheet.style.bottom = '%dpx';" +
                    // 즐겨찾기 버튼에 bottom 적용
                    "var favBtn = document.querySelector('.favorites-floating-btn');" +
                    "if(favBtn) favBtn.style.bottom = 'calc(60px + %dpx)';" +
                    "console.log('Safe area applied: top=%dpx, bottom=%dpx');" +
                    "}",
                    safeAreaTop, safeAreaBottom, safeAreaLeft, safeAreaRight,
                    safeAreaTop, safeAreaBottom, safeAreaBottom,
                    safeAreaTop, safeAreaBottom
                );
                webView.post(() -> webView.evaluateJavascript(js, null));
            }
        } catch (Exception e) {
            // Bridge not ready yet
        }
    }
}
