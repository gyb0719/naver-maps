/**
 * 🔍 완전한 초기화 순서 디버깅 테스트
 * MapEngine 초기화부터 오버레이 시스템까지 전체 추적
 */

const { test, expect } = require('@playwright/test');

test.describe('초기화 순서 디버깅', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('🔍 전체 초기화 순서 추적', async ({ page }) => {
    console.log('🔍 초기화 순서 전체 추적 시작');
    
    // 모든 콘솔 로그 캐치 (필터 없이 전부)
    page.on('console', msg => {
      const text = msg.text();
      console.log('📱', text);
    });
    
    // 에러도 캐치
    page.on('pageerror', error => {
      console.log('❌ Page error:', error.message);
    });
    
    await page.goto(PRODUCTION_URL);
    
    // 초기화 완료 대기
    console.log('⏳ 초기화 완료 대기 중...');
    await page.waitForTimeout(5000);
    
    // MapEngine 상태 확인
    const mapEngineStatus = await page.evaluate(() => {
      return {
        hasMapEngine: !!window.MapEngine,
        hasAppState: !!window.AppState,
        hasWindowMap: !!window.map,
        hasAppStateMap: !!window.AppState?.map,
        hasOverlays: !!window.map?.overlays,
        overlaysKeys: window.map?.overlays ? Object.keys(window.map.overlays) : null,
        mapInitialized: window.MapEngine ? window.MapEngine.isInitialized : null
      };
    });
    
    console.log('🔍 MapEngine 초기화 상태:', JSON.stringify(mapEngineStatus, null, 2));
    
    // 지도 맵 요소 확인
    const mapElementReady = await page.waitForSelector('#map', { timeout: 10000 });
    console.log('🗺️ Map element ready:', !!mapElementReady);
    
    // 지도 클릭 테스트
    console.log('🖱️ 지도 클릭 테스트 시작');
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // 클릭 후 충분한 대기
    await page.waitForTimeout(10000);
    
    // 최종 상태 확인
    const finalStatus = await page.evaluate(() => {
      return {
        hasWindowMap: !!window.map,
        hasOverlays: !!window.map?.overlays,
        overlaysType: typeof window.map?.overlays,
        overlaysCount: window.map?.overlays ? Object.keys(window.map.overlays).length : 0,
        overlaysKeys: window.map?.overlays ? Object.keys(window.map.overlays) : [],
        totalPolygonsInMemory: window.MapEngine ? window.MapEngine.currentPolygons?.length : null
      };
    });
    
    console.log('🔍 최종 오버레이 시스템 상태:', JSON.stringify(finalStatus, null, 2));
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/initialization-debug.png',
      fullPage: true 
    });
  });
});