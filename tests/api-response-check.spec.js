/**
 * 🔍 API 응답 상세 확인 테스트
 * VWorld_Direct와 Backup_Nominatim의 실제 응답 확인
 */

const { test, expect } = require('@playwright/test');

test.describe('API 응답 상세 확인', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('🔍 백업 API들의 실제 응답 데이터 확인', async ({ page }) => {
    console.log('🔍 API 응답 상세 확인 시작');
    
    // 성공한 API 응답들 수집
    const apiResponses = [];
    const raceResults = [];
    
    page.on('console', msg => {
      const text = msg.text();
      
      // 승자 발표 로그
      if (text.includes('승자:') || text.includes('winner')) {
        console.log('🏆 API 승자:', text);
        raceResults.push(text);
      }
      
      // VWorld_Direct 성공 로그
      if (text.includes('🟢') && text.includes('성공')) {
        console.log('✅ VWorld_Direct 성공:', text);
        apiResponses.push({ api: 'VWorld_Direct', status: 'success', log: text });
      }
      
      // Nominatim 성공 로그
      if (text.includes('🟡') && text.includes('성공')) {
        console.log('✅ Nominatim 성공:', text);
        apiResponses.push({ api: 'Nominatim', status: 'success', log: text });
      }
      
      // 폴리곤 생성 로그
      if (text.includes('폴리곤') || text.includes('Polygon')) {
        console.log('🎨 폴리곤 로그:', text);
      }
      
      // Racing 결과 로그
      if (text.includes('RACE') && text.includes('📋')) {
        console.log('📋 Racing 결과:', text);
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🖱️ 한 번의 클릭으로 정확한 응답 확인');
    
    // 지도 클릭
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // API 응답 대기
    await page.waitForTimeout(5000);
    
    // 브라우저에서 실제 API Racing 결과 확인
    const racingResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        // APIRacingSystem의 마지막 결과 확인
        if (window.APIRacingSystem && window.APIRacingSystem.stats) {
          resolve({
            hasRacingSystem: true,
            stats: window.APIRacingSystem.stats,
            lastWinner: window.lastRaceWinner || 'Unknown'
          });
        } else {
          resolve({ hasRacingSystem: false });
        }
      });
    });
    
    console.log('📊 Racing 시스템 상태:', racingResult);
    console.log('✅ 성공한 API 응답 수:', apiResponses.length);
    console.log('🏁 Race 결과 수:', raceResults.length);
    
    // 실제 지번 입력 확인
    const parcelNumber = await page.locator('#parcelNumber').inputValue().catch(() => '');
    console.log('📝 지번 입력 필드:', parcelNumber);
    
    // 폴리곤 존재 여부 확인
    const polygonExists = await page.evaluate(() => {
      if (window.map && window.map.overlays) {
        const overlays = Object.values(window.map.overlays);
        const polygons = overlays.filter(overlay => 
          overlay.constructor.name === 'Polygon'
        );
        return {
          totalOverlays: overlays.length,
          polygonCount: polygons.length,
          overlayTypes: overlays.map(o => o.constructor.name)
        };
      }
      return { totalOverlays: 0, polygonCount: 0, overlayTypes: [] };
    });
    
    console.log('🗺️ 지도 오버레이 상태:', polygonExists);
    
    // 스크린샷
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/api-response-check.png',
      fullPage: true 
    });
    
    // 결과 요약
    console.log('\n📋 최종 결과 요약:');
    console.log(`  - API 성공 응답: ${apiResponses.length}개`);
    console.log(`  - 지번 입력: ${parcelNumber}`);
    console.log(`  - 폴리곤 개수: ${polygonExists.polygonCount}개`);
    console.log(`  - 총 오버레이: ${polygonExists.totalOverlays}개`);
    
    if (polygonExists.polygonCount === 0 && apiResponses.length > 0) {
      console.log('⚠️ API는 성공했지만 폴리곤이 생성되지 않음 - 렌더링 문제 추정');
    }
  });
});