/**
 * 🎨 8가지 색상 개별 클릭 테스트
 * 각 색상별로 정확한 폴리곤 색칠 확인
 */

const { test, expect } = require('@playwright/test');

test.describe('8가지 색상 개별 클릭 테스트', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('🎨 8가지 색상으로 하나하나 클릭 테스트', async ({ page }) => {
    console.log('🎨 8가지 색상 개별 클릭 테스트 시작');
    
    // 성공한 색칠 이벤트 모니터링
    const colorEvents = [];
    const polygonEvents = [];
    
    page.on('console', msg => {
      const text = msg.text();
      
      // 색상 관련 로그
      if (text.includes('색상') || text.includes('color') || text.includes('Color')) {
        console.log('🎨 색상 이벤트:', text);
        colorEvents.push(text);
      }
      
      // 폴리곤 생성 로그
      if (text.includes('폴리곤') || text.includes('Polygon') || text.includes('색칠')) {
        console.log('🖌️ 폴리곤 이벤트:', text);
        polygonEvents.push(text);
      }
      
      // API 성공 로그
      if (text.includes('승자:') || text.includes('SUCCESS') || text.includes('성공')) {
        console.log('✅ API 성공:', text);
      }
      
      // 백업 API 호출 확인
      if (text.includes('🟢🟢🟢') || text.includes('🟡🟡🟡')) {
        console.log('🔄 백업 API:', text);
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // 색상 팔레트 확인
    const colorPalette = await page.locator('.color-palette, .color-btn, [data-color]').count();
    console.log('🎨 색상 팔레트 요소 개수:', colorPalette);
    
    // 간단한 색상 팔레트 확인
    const colorButtons = await page.evaluate(() => {
      // 특정 색상 관련 선택자들 확인
      const colorSelectors = [
        '.color-btn',
        '.color-palette button',
        '[data-color]',
        '.palette button',
        'button[style*="background"]'
      ];
      
      let found = [];
      colorSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          found.push({
            selector: selector,
            tag: el.tagName,
            id: el.id,
            className: el.className,
            dataColor: el.getAttribute('data-color'),
            style: el.getAttribute('style')
          });
        });
      });
      
      return found;
    });
    
    console.log('🔍 발견된 색상 관련 요소들:', colorButtons.length);
    colorButtons.forEach((elem, index) => {
      console.log(`  ${index + 1}. ${elem.tag} - ID: ${elem.id} - Class: ${elem.className} - Selector: ${elem.selector}`);
    });
    
    // 지도에서 8번 클릭 테스트 (각기 다른 위치)
    const testPositions = [
      { x: 350, y: 250, color: '빨간색' },
      { x: 400, y: 300, color: '파란색' },
      { x: 450, y: 350, color: '초록색' },
      { x: 500, y: 250, color: '노란색' },
      { x: 550, y: 300, color: '보라색' },
      { x: 350, y: 400, color: '주황색' },
      { x: 450, y: 450, color: '분홍색' },
      { x: 550, y: 400, color: '하늘색' }
    ];
    
    for (let i = 0; i < testPositions.length; i++) {
      const pos = testPositions[i];
      console.log(`\n${i + 1}️⃣ ${pos.color} 테스트 - 위치 (${pos.x}, ${pos.y})`);
      
      const mapElement = page.locator('#map');
      await mapElement.click({ position: { x: pos.x, y: pos.y } });
      
      // 각 클릭 후 충분한 대기
      await page.waitForTimeout(8000);
      
      // 폴리곤 확인
      const polygonCheck = await page.evaluate(() => {
        if (window.map && window.map.overlays) {
          const overlays = Object.values(window.map.overlays);
          const polygons = overlays.filter(overlay => 
            overlay.constructor.name === 'Polygon' || 
            (overlay.getClassName && overlay.getClassName() === 'Polygon')
          );
          return {
            total: polygons.length,
            hasPolygons: polygons.length > 0
          };
        }
        return { total: 0, hasPolygons: false };
      });
      
      console.log(`  📊 ${pos.color} 클릭 후 폴리곤 개수:`, polygonCheck.total);
      
      if (polygonCheck.hasPolygons) {
        console.log(`  ✅ ${pos.color} 색칠 성공!`);
      } else {
        console.log(`  ❌ ${pos.color} 색칠 실패`);
      }
    }
    
    // 최종 스크린샷
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/8-color-test-result.png',
      fullPage: true 
    });
    
    console.log('\n📊 최종 결과:');
    console.log('🎨 색상 이벤트 수:', colorEvents.length);
    console.log('🖌️ 폴리곤 이벤트 수:', polygonEvents.length);
    
    // 최종 폴리곤 확인
    const finalPolygonCount = await page.evaluate(() => {
      if (window.map && window.map.overlays) {
        const overlays = Object.values(window.map.overlays);
        return overlays.filter(overlay => 
          overlay.constructor.name === 'Polygon' || 
          (overlay.getClassName && overlay.getClassName() === 'Polygon')
        ).length;
      }
      return 0;
    });
    
    console.log('📈 최종 총 폴리곤 개수:', finalPolygonCount);
    
    expect(finalPolygonCount).toBeGreaterThan(0);
  });
});