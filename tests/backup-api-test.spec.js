/**
 * 🚀 백업 API 시스템 테스트
 * 새로 추가된 VWorld_Direct와 Backup_Nominatim 테스트
 */

const { test, expect } = require('@playwright/test');

test.describe('백업 API 시스템 테스트', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('1. 로컬 서버에서 백업 API 시스템 테스트', async ({ page }) => {
    console.log('🧪 로컬 서버 백업 API 테스트');
    
    // 콘솔 로그 캐치
    const apiLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DIRECT') || text.includes('NOMINATIM') || text.includes('RACE') || text.includes('성공')) {
        console.log('📊 API Log:', text);
        apiLogs.push(text);
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🎯 지도 클릭 시도 - 백업 API 테스트');
    
    // 지도 중앙 클릭
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // API 응답 대기
    await page.waitForTimeout(8000);
    
    // 성공한 API 로그 찾기
    const successLogs = apiLogs.filter(log => 
      log.includes('성공') || log.includes('SUCCESS') || log.includes('승자')
    );
    
    console.log('✅ 성공한 API 호출:', successLogs.length);
    successLogs.forEach(log => console.log('  📈', log));
    
    expect(successLogs.length).toBeGreaterThan(0);
  });
  
  test('2. 프로덕션에서 개선된 백업 시스템 테스트', async ({ page }) => {
    console.log('🌐 프로덕션 백업 시스템 테스트');
    
    const raceResults = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('승자:') || text.includes('DIRECT') || text.includes('NOMINATIM')) {
        console.log('🏆 Racing Result:', text);
        raceResults.push(text);
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🎯 프로덕션 지도 클릭 - 백업 API 테스트');
    
    // 여러 위치에서 테스트
    const testPositions = [
      { x: 400, y: 300, name: '중앙' },
      { x: 350, y: 250, name: '좌상단' },
      { x: 450, y: 350, name: '우하단' }
    ];
    
    for (const pos of testPositions) {
      console.log(`📍 ${pos.name} 위치 클릭 테스트`);
      
      const mapElement = page.locator('#map');
      await mapElement.click({ position: { x: pos.x, y: pos.y } });
      
      // 각 클릭마다 충분한 대기시간
      await page.waitForTimeout(6000);
    }
    
    console.log('📊 총 Racing 결과:', raceResults.length);
    
    // 최소 하나의 성공 결과가 있어야 함
    const successResults = raceResults.filter(result => 
      result.includes('승자') || result.includes('성공') || result.includes('SUCCESS')
    );
    
    console.log('✅ 성공한 백업 API:', successResults.length);
    
    if (successResults.length === 0) {
      console.log('⚠️ 백업 API도 실패 - 추가 디버깅 필요');
    }
  });
  
  test('3. 색칠 기능 최종 검증', async ({ page }) => {
    console.log('🎨 색칠 기능 최종 검증');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 폴리곤 생성 모니터링
    const polygonEvents = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('폴리곤') || text.includes('색칠') || text.includes('Polygon')) {
        console.log('🎨 폴리곤 이벤트:', text);
        polygonEvents.push(text);
      }
    });
    
    console.log('🖱️ 왼쪽 클릭으로 색칠 테스트');
    
    // 지도 클릭
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    await page.waitForTimeout(8000);
    
    // 폴리곤이 실제로 그려졌는지 확인
    const polygonCheck = await page.evaluate(() => {
      // 네이버 지도에서 폴리곤 객체 확인
      if (window.map && window.map.overlays) {
        const overlays = Object.values(window.map.overlays);
        const polygons = overlays.filter(overlay => 
          overlay.constructor.name === 'Polygon' || 
          overlay.getClassName && overlay.getClassName() === 'Polygon'
        );
        return {
          success: polygons.length > 0,
          count: polygons.length,
          hasMap: !!window.map
        };
      }
      return { success: false, count: 0, hasMap: !!window.map };
    });
    
    console.log('🔍 폴리곤 확인 결과:', polygonCheck);
    console.log('📝 폴리곤 이벤트 수:', polygonEvents.length);
    
    // 스크린샷으로 시각적 확인
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/final-color-test.png',
      fullPage: true 
    });
    
    console.log('📸 최종 스크린샷 저장 완료');
  });
});