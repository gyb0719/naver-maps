// 🎯 ULTRATHINK: Phase 1 테스트 - 기반 구조 검증
const { test, expect } = require('@playwright/test');

test.describe('Phase 1: 기반 구조 테스트', () => {
    test.beforeEach(async ({ page }) => {
        // 테스트용 클린 페이지로 이동
        await page.goto('http://localhost:4000/index-clean.html');
        
        // 페이지 로드 대기
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    test('1. HTML 구조 검증', async ({ page }) => {
        // 필수 DOM 요소 확인
        await expect(page.locator('.left-panel')).toBeVisible();
        await expect(page.locator('#map')).toBeVisible();
        await expect(page.locator('.color-palette')).toBeVisible();
        await expect(page.locator('.memo-form')).toBeVisible();
        
        // 색상 팔레트 항목 수 확인
        const colorItems = page.locator('.color-item');
        await expect(colorItems).toHaveCount(8);
        
        // 기본 선택 색상 확인
        await expect(page.locator('.color-item.active')).toHaveAttribute('data-color', '#FF0000');
    });

    test('2. JavaScript 로딩 검증', async ({ page }) => {
        // CONFIG 객체 존재 확인
        const configExists = await page.evaluate(() => typeof CONFIG !== 'undefined');
        expect(configExists).toBe(true);
        
        // Logger 객체 존재 확인
        const loggerExists = await page.evaluate(() => typeof Logger !== 'undefined');
        expect(loggerExists).toBe(true);
        
        // AppState 존재 확인
        const appStateExists = await page.evaluate(() => typeof window.AppState !== 'undefined');
        expect(appStateExists).toBe(true);
        
        // 기본 색상 확인
        const currentColor = await page.evaluate(() => window.AppState.currentColor);
        expect(currentColor).toBe('#FF0000');
    });

    test('3. API 키 설정 검증', async ({ page }) => {
        // Naver Client ID 확인
        const naverClientId = await page.evaluate(() => CONFIG.NAVER_CLIENT_ID);
        expect(naverClientId).toBe('x21kpuf1v4');
        
        // VWorld API 키 존재 확인
        const vworldKeys = await page.evaluate(() => CONFIG.VWORLD_API_KEYS.length);
        expect(vworldKeys).toBeGreaterThan(0);
        
        // Supabase URL 확인
        const supabaseUrl = await page.evaluate(() => CONFIG.SUPABASE_URL);
        expect(supabaseUrl).toContain('supabase.co');
    });

    test('4. Supabase 연결 테스트', async ({ page }) => {
        // Supabase 클라이언트 존재 확인
        const supabaseExists = await page.evaluate(() => typeof supabase !== 'undefined');
        expect(supabaseExists).toBe(true);
        
        // SupabaseManager 존재 확인
        const managerExists = await page.evaluate(() => typeof window.supabaseManager !== 'undefined');
        expect(managerExists).toBe(true);
        
        // 연결 테스트 (5초 대기)
        await page.waitForTimeout(5000);
        
        const isConnected = await page.evaluate(() => window.supabaseManager?.isConnected);
        expect(isConnected).toBe(true);
    });

    test('5. 색상 선택 기능 테스트', async ({ page }) => {
        // 두 번째 색상(주황색) 클릭
        await page.locator('.color-item[data-color="#FFA500"]').click();
        
        // active 클래스 변경 확인
        await expect(page.locator('.color-item[data-color="#FFA500"]')).toHaveClass(/active/);
        
        // 현재 색상 표시 변경 확인
        const currentColorBg = await page.locator('#currentColor').evaluate(el => 
            getComputedStyle(el).backgroundColor
        );
        
        // RGB(255, 165, 0) = #FFA500
        expect(currentColorBg).toBe('rgb(255, 165, 0)');
        
        // AppState 업데이트 확인
        const appStateColor = await page.evaluate(() => window.AppState.currentColor);
        expect(appStateColor).toBe('#FFA500');
    });

    test('6. 폼 요소 기능 테스트', async ({ page }) => {
        // 입력 필드에 데이터 입력
        await page.fill('#title', '테스트 제목');
        await page.fill('#price', '5000');
        await page.fill('#landArea', '100');
        await page.fill('#notes', '테스트 메모');
        
        // 입력값 확인
        await expect(page.locator('#title')).toHaveValue('테스트 제목');
        await expect(page.locator('#price')).toHaveValue('5000');
        await expect(page.locator('#landArea')).toHaveValue('100');
        await expect(page.locator('#notes')).toHaveValue('테스트 메모');
        
        // 초기화 버튼 테스트
        await page.click('#clearBtn');
        
        await expect(page.locator('#title')).toHaveValue('');
        await expect(page.locator('#price')).toHaveValue('');
        await expect(page.locator('#notes')).toHaveValue('');
    });

    test('7. 반응형 레이아웃 테스트', async ({ page }) => {
        // 데스크톱 레이아웃 확인
        await page.setViewportSize({ width: 1024, height: 768 });
        
        const leftPanelWidth = await page.locator('.left-panel').evaluate(el => 
            getComputedStyle(el).width
        );
        expect(leftPanelWidth).toBe('350px');
        
        // 모바일 레이아웃 확인
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        
        const leftPanelWidthMobile = await page.locator('.left-panel').evaluate(el => 
            getComputedStyle(el).width
        );
        expect(leftPanelWidthMobile).toBe('375px'); // 100% width
    });

    test('8. 에러 처리 테스트', async ({ page }) => {
        let consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // 5초 동안 JavaScript 에러 모니터링
        await page.waitForTimeout(5000);
        
        // 콘솔 에러가 없어야 함
        expect(consoleErrors.length).toBe(0);
        
        // 상태 표시 확인
        const statusText = await page.locator('#statusText').textContent();
        expect(statusText).not.toContain('오류');
    });
});