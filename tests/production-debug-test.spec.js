/**
 * 🔍 프로덕션 환경 직접 오버레이 디버깅 테스트
 * 오버레이 저장 시스템 문제 진단
 */

const { test, expect } = require('@playwright/test');

test.describe('프로덕션 오버레이 디버깅', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('🔍 오버레이 저장 시스템 디버깅', async ({ page }) => {
    console.log('🔍 프로덕션 오버레이 시스템 디버깅 시작');
    
    // 모든 콘솔 로그 캐치
    page.on('console', msg => {
      const text = msg.text();
      console.log('📱', text);
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🖱️ 지도 클릭으로 오버레이 시스템 테스트');
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // 충분한 대기시간
    await page.waitForTimeout(10000);
    
    // 오버레이 시스템 상태 확인
    const overlaySystemStatus = await page.evaluate(() => {
      return {
        hasWindowMap: !!window.map,
        hasOverlays: !!window.map?.overlays,
        overlaysType: typeof window.map?.overlays,
        overlaysCount: window.map?.overlays ? Object.keys(window.map.overlays).length : 0,
        overlaysKeys: window.map?.overlays ? Object.keys(window.map.overlays) : [],
        hasMapEngine: !!window.MapEngine
      };
    });
    
    console.log('🔍 오버레이 시스템 상태:', JSON.stringify(overlaySystemStatus, null, 2));
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/production-overlay-debug.png',
      fullPage: true 
    });
  });
});