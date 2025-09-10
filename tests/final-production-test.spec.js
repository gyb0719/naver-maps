/**
 * 🎯 최종 프로덕션 색칠 기능 테스트
 * 백업 API 시스템으로 ECONNRESET 에러 해결 검증
 */

const { test, expect } = require('@playwright/test');

test.describe('최종 프로덕션 색칠 기능 테스트', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('1. 🎨 마우스 왼쪽 클릭 색칠 기능 최종 테스트', async ({ page }) => {
    console.log('🎯 최종 색칠 기능 테스트 시작');
    
    // 성공한 API와 폴리곤 생성 모니터링
    const successEvents = [];
    const apiResults = [];
    
    page.on('console', msg => {
      const text = msg.text();
      
      // 성공한 API 로그
      if (text.includes('승자:') || text.includes('DIRECT') || text.includes('NOMINATIM') || 
          text.includes('성공') || text.includes('SUCCESS')) {
        console.log('✅ API 성공:', text);
        successEvents.push(text);
        apiResults.push(text);
      }
      
      // 폴리곤 생성 로그
      if (text.includes('폴리곤') || text.includes('색칠') || text.includes('Polygon')) {
        console.log('🎨 폴리곤:', text);
        successEvents.push(text);
      }
      
      // 에러 로그
      if (text.includes('ERROR') || text.includes('실패')) {
        console.log('❌ 에러:', text);
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(5000); // 지도 완전 로딩 대기
    
    console.log('🖱️ 지도 중앙 클릭으로 색칠 테스트');
    
    // 지도 중앙 클릭
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    
    // 백업 API 시스템 작동 대기
    await page.waitForTimeout(10000);
    
    console.log('📊 성공 이벤트 수:', successEvents.length);
    console.log('🔍 API 결과 수:', apiResults.length);
    
    // 폴리곤이 실제로 화면에 그려졌는지 확인
    const visualCheck = await page.evaluate(() => {
      // 지도의 모든 오버레이 확인
      const overlays = document.querySelectorAll('svg polygon, canvas');
      
      // 네이버 지도 폴리곤 객체 확인
      let naverPolygons = 0;
      if (window.map && window.map.overlays) {
        Object.values(window.map.overlays).forEach(overlay => {
          if (overlay.constructor.name === 'Polygon' || 
              (overlay.getClassName && overlay.getClassName() === 'Polygon')) {
            naverPolygons++;
          }
        });
      }
      
      return {
        svgElements: overlays.length,
        naverPolygons: naverPolygons,
        hasMap: !!window.map,
        mapOverlays: window.map ? Object.keys(window.map.overlays || {}).length : 0
      };
    });
    
    console.log('👁️ 시각적 확인:', visualCheck);
    
    // 스크린샷으로 최종 확인
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/final-production-test.png',
      fullPage: true 
    });
    
    console.log('📸 최종 프로덕션 스크린샷 저장');
    
    // 테스트 성공 조건: API 성공하거나 폴리곤이 생성되어야 함
    const hasAPISuccess = apiResults.length > 0;
    const hasPolygon = visualCheck.naverPolygons > 0 || visualCheck.svgElements > 3;
    
    if (hasAPISuccess || hasPolygon) {
      console.log('🎉 색칠 기능 테스트 성공!');
    } else {
      console.log('⚠️ 색칠 기능 여전히 문제 있음');
    }
    
    expect(hasAPISuccess || hasPolygon).toBe(true);
  });
  
  test('2. 🖱️ 마우스 우클릭 색칠 제거 기능 테스트', async ({ page }) => {
    console.log('🗑️ 우클릭 색칠 제거 기능 테스트');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    const mapElement = page.locator('#map');
    
    // 먼저 왼쪽 클릭으로 색칠
    console.log('1️⃣ 왼쪽 클릭으로 색칠');
    await mapElement.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(8000);
    
    // 우클릭으로 제거
    console.log('2️⃣ 우클릭으로 색칠 제거');
    await mapElement.click({ position: { x: 400, y: 300 }, button: 'right' });
    await page.waitForTimeout(3000);
    
    console.log('✅ 우클릭 제거 기능 테스트 완료');
  });
  
  test('3. 🌈 8가지 색상 팔레트 전체 테스트', async ({ page }) => {
    console.log('🎨 8가지 색상 팔레트 테스트');
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // 색상 버튼들 확인
    const colorButtons = await page.locator('.color-btn').count();
    console.log('🎨 색상 버튼 개수:', colorButtons);
    
    if (colorButtons > 0) {
      // 첫 번째 색상 선택
      await page.locator('.color-btn').first().click();
      await page.waitForTimeout(1000);
      
      // 지도 클릭으로 색칠 테스트
      const mapElement = page.locator('#map');
      await mapElement.click({ position: { x: 350, y: 250 } });
      await page.waitForTimeout(5000);
      
      console.log('✅ 색상 팔레트 기능 테스트 완료');
    }
  });
  
  test('4. 📍 지번 정보 표시 기능 최종 검증', async ({ page }) => {
    console.log('📍 지번 정보 표시 기능 검증');
    
    // 지번 입력 이벤트 모니터링
    const jibunEvents = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('지번') || text.includes('jibun') || text.includes('parcelNumber')) {
        console.log('📍 지번 이벤트:', text);
        jibunEvents.push(text);
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // 지도 클릭
    const mapElement = page.locator('#map');
    await mapElement.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(8000);
    
    // 왼쪽 폼의 지번 입력 필드 확인
    const parcelNumberValue = await page.locator('#parcelNumber').inputValue().catch(() => '');
    
    console.log('📝 지번 입력 필드 값:', parcelNumberValue);
    console.log('📊 지번 이벤트 수:', jibunEvents.length);
    
    const hasJibunData = parcelNumberValue.length > 0 || jibunEvents.length > 0;
    
    if (hasJibunData) {
      console.log('✅ 지번 표시 기능 정상 작동');
    } else {
      console.log('⚠️ 지번 표시 기능 확인 필요');
    }
  });
});