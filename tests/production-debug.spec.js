/**
 * 🎯 ULTRATHINK: 프로덕션 환경 직접 디버깅 테스트
 * 색칠 기능과 API 호출 문제를 실시간으로 진단
 */

const { test, expect } = require('@playwright/test');

test.describe('프로덕션 사이트 직접 디버깅', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('1. 프로덕션 사이트 접속 및 기본 로딩 확인', async ({ page }) => {
    console.log('🚀 프로덕션 사이트 접속 시작:', PRODUCTION_URL);
    
    // 콘솔 로그 캐치
    const logs = [];
    page.on('console', msg => {
      const logEntry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      logs.push(logEntry);
      console.log('📄 Console:', logEntry);
    });
    
    // 네트워크 요청 모니터링
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('vworld')) {
        console.log('📡 API Request:', request.method(), request.url());
        apiCalls.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('vworld')) {
        console.log('📨 API Response:', response.status(), response.url());
      }
    });
    
    // 페이지 접속
    await page.goto(PRODUCTION_URL);
    
    // 페이지 로딩 대기
    await page.waitForSelector('.header h1', { timeout: 10000 });
    
    // 기본 요소들 확인
    const title = await page.textContent('.header h1');
    console.log('📖 페이지 제목:', title);
    
    // 지도 로딩 확인
    await page.waitForSelector('#map', { timeout: 15000 });
    console.log('🗺️ 지도 요소 로딩 완료');
    
    // 잠시 대기하여 지도 초기화 완료
    await page.waitForTimeout(3000);
    
    console.log('✅ 기본 로딩 완료, API 호출 내역:', apiCalls.length, '건');
    
    expect(title).toContain('네이버 지도');
  });
  
  test('2. 지도 클릭 테스트 - API 호출 상세 분석', async ({ page }) => {
    console.log('🎯 지도 클릭 테스트 시작');
    
    // 에러 로그 특별 모니터링
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorMsg = msg.text();
        errors.push(errorMsg);
        console.log('❌ ERROR:', errorMsg);
      } else if (msg.text().includes('RACE') || msg.text().includes('MAP') || msg.text().includes('API')) {
        console.log('🔍 RACE/API Log:', msg.text());
      }
    });
    
    // API 요청/응답 상세 모니터링
    const apiDetails = [];
    page.on('request', request => {
      if (request.url().includes('vworld')) {
        console.log('🔵 VWorld Request:', request.url());
        apiDetails.push({
          type: 'request',
          url: request.url(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('vworld')) {
        const status = response.status();
        console.log('🔴 VWorld Response:', status, response.url());
        
        // 500 에러인 경우 응답 본문 확인
        if (status === 500) {
          try {
            const responseText = await response.text();
            console.log('💥 500 Error Response Body:', responseText);
          } catch (e) {
            console.log('💥 500 Error - 응답 본문 읽기 실패');
          }
        }
        
        apiDetails.push({
          type: 'response',
          status: status,
          url: response.url(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('📍 서울시청 좌표로 지도 클릭 시도');
    
    // 지도 중앙 클릭 (서울시청 근처)
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // API 응답 대기
    await page.waitForTimeout(5000);
    
    console.log('📊 API 호출 상세 내역:', apiDetails);
    console.log('⚠️ 에러 발생 건수:', errors.length);
    
    if (errors.length > 0) {
      console.log('❌ 발생한 에러들:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  });
  
  test('3. API 엔드포인트 직접 테스트', async ({ page }) => {
    console.log('🔬 API 엔드포인트 직접 테스트');
    
    // 실제 좌표로 VWorld API 직접 호출
    const testCoordinates = [
      { lat: 37.5665, lng: 126.9780, name: '서울시청' },
      { lat: 37.5668, lng: 126.9783, name: '서울시청 근처' }
    ];
    
    for (const coord of testCoordinates) {
      console.log(`📍 ${coord.name} 좌표 테스트: ${coord.lat}, ${coord.lng}`);
      
      const apiUrl = `${PRODUCTION_URL}/api/vworld?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=12A51C12-8690-3559-9C2B-9F705D0D8AF3&geometry=true&geomFilter=POINT(${coord.lng} ${coord.lat})&size=1&format=json&crs=EPSG:4326`;
      
      try {
        const response = await page.request.get(apiUrl);
        const status = response.status();
        console.log(`📡 ${coord.name} API 응답 상태:`, status);
        
        if (status === 200) {
          const data = await response.json();
          console.log(`✅ ${coord.name} API 성공:`, data.response?.status, '필지 수:', data.response?.result?.featureCollection?.features?.length || 0);
        } else {
          const errorText = await response.text();
          console.log(`❌ ${coord.name} API 실패 (${status}):`, errorText.substring(0, 200));
        }
      } catch (error) {
        console.log(`💥 ${coord.name} API 호출 에러:`, error.message);
      }
      
      await page.waitForTimeout(1000);
    }
  });
  
  test('4. 대안 API 및 백업 시스템 테스트', async ({ page }) => {
    console.log('🔄 대안 API 시스템 테스트');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 브라우저에서 직접 백업 API 호출 테스트
    const testResult = await page.evaluate(async () => {
      const results = [];
      
      // 1. OpenStreetMap Nominatim API 테스트
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=37.5665&lon=126.9780&zoom=18&addressdetails=1`;
        const response = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'NAVER Maps Field Management Program' }
        });
        
        if (response.ok) {
          const data = await response.json();
          results.push({ api: 'Nominatim', status: 'success', data: data });
        } else {
          results.push({ api: 'Nominatim', status: 'failed', error: response.status });
        }
      } catch (error) {
        results.push({ api: 'Nominatim', status: 'error', error: error.message });
      }
      
      // 2. 다른 VWorld API 키로 직접 테스트
      const alternativeKeys = [
        'BBAC532E-A56D-34CF-B520-CE68E8D6D52A',
        '6B854F88-4A5D-303C-B7C8-40858117A95E'
      ];
      
      for (const key of alternativeKeys) {
        try {
          const vworldUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${key}&geometry=true&geomFilter=POINT(126.9780 37.5665)&size=1&format=json&crs=EPSG:4326&domain=https://parcel-management-system-pink.vercel.app`;
          
          const response = await fetch(vworldUrl);
          if (response.ok) {
            const data = await response.json();
            results.push({ api: `VWorld_${key.substring(0, 8)}`, status: 'success', features: data.response?.result?.featureCollection?.features?.length || 0 });
          } else {
            results.push({ api: `VWorld_${key.substring(0, 8)}`, status: 'failed', error: response.status });
          }
        } catch (error) {
          results.push({ api: `VWorld_${key.substring(0, 8)}`, status: 'error', error: error.message });
        }
      }
      
      return results;
    });
    
    console.log('🔍 대안 API 테스트 결과:');
    testResult.forEach(result => {
      console.log(`  ${result.api}: ${result.status}`, result.data ? '✅' : result.error ? `❌ ${result.error}` : '');
    });
  });
  
  test('5. 임시 목업 데이터로 색칠 기능 테스트', async ({ page }) => {
    console.log('🎨 임시 목업 데이터로 색칠 기능 테스트');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 목업 폴리곤 데이터로 강제 색칠 테스트
    const colorTestResult = await page.evaluate(() => {
      // 목업 필지 데이터
      const mockParcelData = {
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [126.9760, 37.5655],
            [126.9780, 37.5655], 
            [126.9780, 37.5675],
            [126.9760, 37.5675],
            [126.9760, 37.5655]
          ]]
        },
        properties: {
          PNU: 'TEST_001',
          jibun: '테스트 필지',
          addr: '서울특별시 중구 테스트동 1번지'
        }
      };
      
      try {
        // 네이버 지도에 직접 폴리곤 그리기 시도
        if (window.naver && window.map) {
          const coords = mockParcelData.geometry.coordinates[0];
          const paths = coords.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
          
          const polygon = new naver.maps.Polygon({
            paths: paths,
            fillColor: '#FF0000',
            fillOpacity: 0.7,
            strokeColor: '#FF0000',
            strokeWeight: 3,
            strokeOpacity: 1.0,
            map: window.map
          });
          
          return { success: true, message: '목업 폴리곤 그리기 성공' };
        } else {
          return { success: false, message: '네이버 지도 객체 없음' };
        }
      } catch (error) {
        return { success: false, message: error.message };
      }
    });
    
    console.log('🎯 색칠 기능 테스트 결과:', colorTestResult);
    
    // 잠시 대기하여 시각적 확인
    await page.waitForTimeout(3000);
    
    // 스크린샷 촬영
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/debug-color-test.png',
      fullPage: true 
    });
    
    console.log('📸 디버그 스크린샷 저장 완료');
  });
});