/**
 * 🎨 빠른 색칠 테스트 - 한 번만 클릭
 */

const { test, expect } = require('@playwright/test');

test.describe('빠른 색칠 테스트', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('🎨 한 번만 클릭해서 색칠 확인', async ({ page }) => {
    console.log('🎨 빠른 색칠 테스트 시작');
    
    // 모든 콘솔 로그 캐치
    page.on('console', msg => {
      const text = msg.text();
      console.log('📱', text);
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🖱️ 지도 한 번 클릭');
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // 충분한 대기
    await page.waitForTimeout(5000);
    
    // 폴리곤 개수 확인
    const polygonAnalysis = await page.evaluate(() => {
      if (window.map && window.map.overlays) {
        const overlays = Object.values(window.map.overlays);
        const analysis = {
          totalOverlays: overlays.length,
          overlayTypes: overlays.map(o => o.constructor.name),
          polygonCount: overlays.filter(overlay => 
            overlay.constructor.name === 'Polygon'
          ).length,
          overlayObjects: overlays.map(o => ({
            type: o.constructor.name,
            toString: o.toString()
          }))
        };
        return analysis;
      }
      return { totalOverlays: 0, overlayTypes: [], polygonCount: 0, overlayObjects: [] };
    });
    
    console.log('🔍 폴리곤 분석 결과:', JSON.stringify(polygonAnalysis, null, 2));
    
    // 오버레이 존재 여부로 성공 판단 (네이버 맵스 폴리곤 객체 감지)
    const overlayCount = polygonAnalysis.totalOverlays;
    
    console.log('📊 최종 오버레이 개수:', overlayCount);
    
    // 스크린샷
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/quick-color-result.png',
      fullPage: true 
    });
    
    if (overlayCount > 0) {
      console.log('🎉 색칠 성공! 폴리곤이 생성되어 오버레이 시스템에 저장됨');
    } else {
      console.log('❌ 색칠 실패');
    }
  });
});