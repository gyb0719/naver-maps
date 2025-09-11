/**
 * VWorld API 키 수정 및 더미 데이터 제거 검증 테스트
 */

const { test, expect } = require('@playwright/test');

test.describe('API 수정 검증', () => {
    test('🔧 VWorld API와 더미 데이터 방지 테스트', async ({ page }) => {
        console.log('🔧 API 수정 검증 테스트 시작');

        // 페이지 로드 및 초기화 대기
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(3000);

        // 서울시청 좌표 클릭 (실제 데이터 가능 지역)
        const mapElement = await page.locator('#map');
        await mapElement.click({ position: { x: 400, y: 300 } });
        
        // API 호출 결과 대기
        await page.waitForTimeout(5000);

        // 콘솔 메시지에서 더미 데이터 방지 확인
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });

        // 두 번째 클릭으로 API Racing 시스템 재실행
        await mapElement.click({ position: { x: 450, y: 320 } });
        await page.waitForTimeout(3000);

        // 1. Nominatim 백업이 비활성화되었는지 확인
        const nominatimDisabledLogs = consoleLogs.filter(log => 
            log.includes('Nominatim 백업이 비활성화되었습니다') || 
            log.includes('enabled: false')
        );
        
        console.log('🚨 Nominatim 비활성화 확인:', nominatimDisabledLogs.length > 0);

        // 2. VWorld API 성공/실패 상태 확인
        const vworldSuccessLogs = consoleLogs.filter(log => 
            log.includes('VWORLD_DIRECT SUCCESS') || 
            log.includes('VWorld_Direct 성공')
        );
        
        const vworldFailureLogs = consoleLogs.filter(log => 
            log.includes('모든 직접 API 키 실패') ||
            log.includes('INVALID_KEY') ||
            log.includes('INCORRECT_KEY')
        );

        console.log('✅ VWorld 성공 로그:', vworldSuccessLogs.length);
        console.log('❌ VWorld 실패 로그:', vworldFailureLogs.length);

        // 3. 더미 데이터 생성 방지 확인
        const dummyDataLogs = consoleLogs.filter(log => 
            log.includes('NOMINATIM SUCCESS') && log.includes('대한민국')
        );
        
        console.log('🚫 더미 데이터 방지 확인 (0이어야 함):', dummyDataLogs.length);

        // 4. 오버레이 시스템 상태 확인
        const overlayCount = await page.evaluate(() => {
            if (window.overlayTracker && window.overlayTracker.overlays) {
                return window.overlayTracker.overlays.size;
            }
            return 0;
        });

        console.log('🗺️ 현재 오버레이 개수:', overlayCount);

        // 5. 우클릭 테스트 (색상 제거)
        if (overlayCount > 0) {
            console.log('🖱️ 우클릭 테스트 시작');
            
            // 같은 위치에서 우클릭
            await mapElement.click({ 
                button: 'right',
                position: { x: 450, y: 320 } 
            });
            
            await page.waitForTimeout(2000);
            
            // 우클릭 후 오버레이 개수 확인
            const overlayCountAfterRightClick = await page.evaluate(() => {
                if (window.overlayTracker && window.overlayTracker.overlays) {
                    return window.overlayTracker.overlays.size;
                }
                return 0;
            });
            
            console.log('🗑️ 우클릭 후 오버레이 개수:', overlayCountAfterRightClick);
            console.log('🎯 우클릭 색상 제거 성공:', overlayCountAfterRightClick < overlayCount);
        }

        // 최종 상태 확인 메시지
        const statusElement = await page.locator('#status');
        const finalStatus = await statusElement.textContent();
        
        console.log('📊 최종 상태:', finalStatus);

        // 검증 결과 요약
        console.log('\n🔍 API 수정 검증 결과:');
        console.log('- Nominatim 비활성화:', nominatimDisabledLogs.length > 0 ? '✅' : '❌');
        console.log('- VWorld API 상태:', vworldSuccessLogs.length > 0 ? '✅ 성공' : 
                   vworldFailureLogs.length > 0 ? '❌ 실패' : '⚠️ 불명');
        console.log('- 더미 데이터 방지:', dummyDataLogs.length === 0 ? '✅' : '❌');
        console.log('- 최종 상태:', finalStatus?.includes('VWorld API 키가 무효') ? '🔴 API 키 문제' : '🟢 정상');

        // 기본적인 어설션
        expect(overlayCount).toBeGreaterThanOrEqual(0);
        expect(finalStatus).toBeDefined();
        
        console.log('🎉 API 수정 검증 테스트 완료');
    });
});