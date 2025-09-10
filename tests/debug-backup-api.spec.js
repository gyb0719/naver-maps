/**
 * 🔍 백업 API 시스템 상세 디버깅
 * 왜 VWorld_Direct와 Nominatim이 실행되지 않는지 확인
 */

const { test, expect } = require('@playwright/test');

test.describe('백업 API 디버깅', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('백업 API 시스템 상세 분석', async ({ page }) => {
    console.log('🔍 백업 API 시스템 디버깅 시작');
    
    // 모든 API 관련 로그 수집
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      
      // API Racing 관련 로그만 출력
      if (text.includes('RACE') || text.includes('DIRECT') || text.includes('NOMINATIM') || 
          text.includes('API') || text.includes('enabled') || text.includes('priority')) {
        console.log('📊', text);
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 브라우저에서 API 엔드포인트 구성 확인
    const apiConfig = await page.evaluate(() => {
      if (window.APIRacingSystem) {
        return {
          hasRacingSystem: true,
          endpoints: window.APIRacingSystem.apiEndpoints.map(api => ({
            name: api.name,
            priority: api.priority,
            enabled: api.enabled
          }))
        };
      }
      return { hasRacingSystem: false };
    });
    
    console.log('⚙️ API 설정:', JSON.stringify(apiConfig, null, 2));
    
    // 지도 클릭
    console.log('🖱️ 지도 클릭으로 API Racing 트리거');
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // 충분한 대기시간
    await page.waitForTimeout(15000);
    
    // API Racing 결과 분석
    const racingResults = allLogs.filter(log => 
      log.includes('Racing') || log.includes('API') || log.includes('실패') || log.includes('성공')
    );
    
    console.log('🏁 Racing 관련 로그 수:', racingResults.length);
    racingResults.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });
    
    // 백업 API 직접 테스트
    console.log('🧪 백업 API 직접 테스트');
    
    const directAPITest = await page.evaluate(async () => {
      const results = [];
      
      // VWorld Direct API 직접 호출 테스트
      try {
        const workingKeys = [
          'BBAC532E-A56D-34CF-B520-CE68E8D6D52A',
          '6B854F88-4A5D-303C-B7C8-40858117A95E',
          '12A51C12-8690-3559-9C2B-9F705D0D8AF3'
        ];
        
        for (const key of workingKeys) {
          try {
            const params = new URLSearchParams({
              service: 'data',
              request: 'GetFeature',
              data: 'LP_PA_CBND_BUBUN',
              key: key,
              geometry: 'true',
              geomFilter: 'POINT(126.9780 37.5665)',
              size: '1',
              format: 'json',
              crs: 'EPSG:4326',
              domain: window.location.origin
            });
            
            const vworldUrl = `https://api.vworld.kr/req/data?${params.toString()}`;
            const response = await fetch(vworldUrl);
            
            results.push({
              api: 'VWorld_Direct',
              key: key.substring(0, 8),
              status: response.status,
              success: response.ok
            });
            
            if (response.ok) break; // 성공하면 중단
            
          } catch (error) {
            results.push({
              api: 'VWorld_Direct',
              key: key.substring(0, 8),
              error: error.message
            });
          }
        }
        
        // Nominatim API 직접 호출 테스트
        try {
          const nominatimUrl = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=37.5665&lon=126.9780&zoom=18&addressdetails=1';
          const response = await fetch(nominatimUrl, {
            headers: { 'User-Agent': 'NAVER Maps Field Management Program' }
          });
          
          results.push({
            api: 'Nominatim',
            status: response.status,
            success: response.ok
          });
          
        } catch (error) {
          results.push({
            api: 'Nominatim',
            error: error.message
          });
        }
        
      } catch (error) {
        results.push({
          error: 'Direct API test failed: ' + error.message
        });
      }
      
      return results;
    });
    
    console.log('🧪 직접 API 테스트 결과:');
    directAPITest.forEach(result => {
      console.log('  ', JSON.stringify(result));
    });
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/debug-backup-api.png',
      fullPage: true 
    });
  });
});