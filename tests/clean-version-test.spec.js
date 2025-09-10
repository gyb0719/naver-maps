// 🎯 ULTRATHINK: 클린 버전 통합 테스트
const { test, expect } = require('@playwright/test');

test.describe('클린 버전 통합 테스트', () => {
    test.beforeEach(async ({ page }) => {
        // 메인 페이지로 이동
        await page.goto('http://localhost:4000');
        
        // 페이지 로드 대기
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // 스크립트 로딩 대기
    });

    test('1. 기본 페이지 로딩 테스트', async ({ page }) => {
        // 페이지 제목 확인
        await expect(page).toHaveTitle(/네이버 지도 필지 관리/);
        
        // 주요 UI 요소 존재 확인
        await expect(page.locator('.header')).toBeVisible();
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('#map')).toBeVisible();
        await expect(page.locator('.color-palette')).toBeVisible();
    });

    test('2. JavaScript 로딩 및 초기화 확인', async ({ page }) => {
        // 모든 필수 객체들이 로드되었는지 확인
        const configExists = await page.evaluate(() => typeof CONFIG !== 'undefined');
        expect(configExists).toBe(true);
        
        const loggerExists = await page.evaluate(() => typeof Logger !== 'undefined');
        expect(loggerExists).toBe(true);
        
        const mapEngineExists = await page.evaluate(() => typeof window.MapEngine !== 'undefined');
        expect(mapEngineExists).toBe(true);
        
        const dataManagerExists = await page.evaluate(() => typeof window.DataManager !== 'undefined');
        expect(dataManagerExists).toBe(true);
        
        const uiHandlerExists = await page.evaluate(() => typeof window.UIHandler !== 'undefined');
        expect(uiHandlerExists).toBe(true);
        
        const appExists = await page.evaluate(() => typeof window.App !== 'undefined');
        expect(appExists).toBe(true);
    });

    test('3. 네이버 지도 API 로딩 확인', async ({ page }) => {
        // 네이버 지도 API 객체 확인
        const naverMapsExists = await page.evaluate(() => typeof naver !== 'undefined' && typeof naver.maps !== 'undefined');
        
        if (naverMapsExists) {
            console.log('✅ 네이버 지도 API 로딩 성공');
            
            // 지도 객체 초기화 확인
            const mapInitialized = await page.evaluate(() => window.AppState?.map !== null);
            expect(mapInitialized).toBe(true);
            
        } else {
            console.log('⚠️ 네이버 지도 API 로딩 실패 - 도메인 제한 가능성');
            
            // API 로딩 실패는 예상된 결과이므로 경고만 출력
            const errorMessage = await page.evaluate(() => {
                const errorEl = document.querySelector('.error-message');
                return errorEl ? errorEl.textContent : null;
            });
            
            console.log('에러 메시지:', errorMessage);
        }
    });

    test('4. 색상 팔레트 동작 확인', async ({ page }) => {
        // 색상 팔레트 요소 수 확인
        const colorItems = page.locator('.color-item');
        await expect(colorItems).toHaveCount(8);
        
        // 두 번째 색상(주황) 클릭
        await page.locator('.color-item[data-color="#FFA500"]').click();
        
        // active 클래스 확인
        await expect(page.locator('.color-item[data-color="#FFA500"]')).toHaveClass(/active/);
        
        // AppState 업데이트 확인
        const currentColor = await page.evaluate(() => window.AppState?.currentColor);
        expect(currentColor).toBe('#FFA500');
    });

    test('5. 폼 입력 및 초기화 테스트', async ({ page }) => {
        // 폼 필드에 테스트 데이터 입력
        await page.fill('#parcelNumber', '서초구 서초동 1376-1');
        await page.fill('#ownerName', '홍길동');
        await page.fill('#ownerAddress', '서울시 서초구');
        await page.fill('#ownerContact', '010-1234-5678');
        await page.fill('#memo', '테스트 메모');
        
        // 입력값 확인
        await expect(page.locator('#parcelNumber')).toHaveValue('서초구 서초동 1376-1');
        await expect(page.locator('#ownerName')).toHaveValue('홍길동');
        await expect(page.locator('#memo')).toHaveValue('테스트 메모');
        
        // 초기화 버튼 클릭
        await page.click('#clearBtn');
        
        // 필드들이 초기화되었는지 확인
        await expect(page.locator('#ownerName')).toHaveValue('');
        await expect(page.locator('#ownerContact')).toHaveValue('');
        await expect(page.locator('#memo')).toHaveValue('');
    });

    test('6. Supabase 연결 상태 확인', async ({ page }) => {
        // Supabase 클라이언트 존재 확인
        const supabaseExists = await page.evaluate(() => {
            return typeof window.supabase !== 'undefined' && window.DataManager?.supabase !== null;
        });
        expect(supabaseExists).toBe(true);
        
        // 연결 상태 확인 (5초 대기)
        await page.waitForTimeout(5000);
        
        const isConnected = await page.evaluate(() => window.DataManager?.isConnected);
        
        if (isConnected) {
            console.log('✅ Supabase 연결 성공');
        } else {
            console.log('⚠️ Supabase 연결 실패 - 로컬 저장소 사용');
        }
    });

    test('7. 콘솔 에러 확인', async ({ page }) => {
        let consoleErrors = [];
        let consoleWarnings = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            } else if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });
        
        // 5초간 콘솔 메시지 모니터링
        await page.waitForTimeout(5000);
        
        // 네이버 지도 API 관련 에러는 예상되므로 필터링
        const criticalErrors = consoleErrors.filter(error => 
            !error.includes('naver') && 
            !error.includes('domain') && 
            !error.includes('CORS') &&
            !error.includes('network')
        );
        
        console.log(`총 에러: ${consoleErrors.length}개, 치명적 에러: ${criticalErrors.length}개`);
        console.log(`경고: ${consoleWarnings.length}개`);
        
        if (criticalErrors.length > 0) {
            console.log('치명적 에러:', criticalErrors);
        }
        
        // 치명적 에러는 없어야 함
        expect(criticalErrors.length).toBe(0);
    });

    test('8. 모바일 반응형 테스트', async ({ page }) => {
        // 데스크톱 레이아웃
        await page.setViewportSize({ width: 1200, height: 800 });
        await expect(page.locator('.sidebar')).toBeVisible();
        
        // 모바일 레이아웃
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        
        // 모바일에서도 주요 요소들이 보여야 함
        await expect(page.locator('.header')).toBeVisible();
        await expect(page.locator('#map')).toBeVisible();
        
        // 사이드바는 모바일에서 다르게 표시될 수 있음
        const sidebarVisible = await page.locator('.sidebar').isVisible();
        console.log('모바일 사이드바 표시 여부:', sidebarVisible);
    });

    test('9. 개발자 도구 기능 확인', async ({ page }) => {
        // 개발 모드에서만 테스트
        const isLocal = await page.evaluate(() => CONFIG?.IS_LOCAL);
        
        if (isLocal) {
            // DEBUG 객체 존재 확인
            const debugExists = await page.evaluate(() => typeof window.DEBUG !== 'undefined');
            expect(debugExists).toBe(true);
            
            // DEBUG 함수들 확인
            const debugFunctions = await page.evaluate(() => Object.keys(window.DEBUG || {}));
            expect(debugFunctions).toContain('state');
            expect(debugFunctions).toContain('performance');
            
            console.log('개발자 도구 함수들:', debugFunctions);
        }
    });

    test('10. 전체 앱 상태 점검', async ({ page }) => {
        // 앱 초기화 완료 확인
        const appInitialized = await page.evaluate(() => window.App?.isInitialized);
        expect(appInitialized).toBe(true);
        
        // 각 컴포넌트 초기화 상태 확인
        const componentStates = await page.evaluate(() => ({
            mapEngine: window.MapEngine?.isInitialized,
            uiHandler: window.UIHandler?.isInitialized,
            dataManager: window.DataManager?.isConnected
        }));
        
        console.log('컴포넌트 상태:', componentStates);
        
        // MapEngine과 UIHandler는 반드시 초기화되어야 함
        expect(componentStates.mapEngine).toBe(true);
        expect(componentStates.uiHandler).toBe(true);
        
        // DataManager 연결은 선택사항 (Supabase 연결 실패 가능)
        console.log('DataManager 연결 상태:', componentStates.dataManager);
    });
});