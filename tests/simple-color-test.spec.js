/**
 * 🎨 간단한 8색 클릭 테스트
 * 사용자 요청: 8가지 색상으로 하나하나 클릭 테스트
 */

const { test, expect } = require('@playwright/test');

test.describe('간단한 8색 클릭 테스트', () => {
  const PRODUCTION_URL = 'https://parcel-management-system-pink.vercel.app';
  
  test('🎨 8가지 색상으로 하나하나 클릭하여 색칠 확인', async ({ page }) => {
    console.log('🎨 8가지 색상 개별 클릭 테스트 시작');
    
    // 모든 콘솔 로그 캐치
    page.on('console', msg => {
      const text = msg.text();
      console.log('📱 브라우저:', text);
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForSelector('#map', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🎨 색상 팔레트 확인');
    
    // 색상 팔레트 존재 확인
    const colorPalette = await page.locator('.color-item').count();
    console.log('🎨 발견된 color-item 개수:', colorPalette);
    
    if (colorPalette > 0) {
      console.log('✅ 8가지 색상 팔레트 존재함');
      
      // 8번 클릭 테스트 (각기 다른 위치에서)
      for (let i = 0; i < 8; i++) {
        console.log(`\n${i + 1}️⃣ ${i + 1}번째 색상으로 클릭 테스트`);
        
        // 색상 버튼 클릭 (만약 있다면)
        if (i < colorPalette) {
          try {
            await page.locator('.color-item').nth(i).click();
            console.log(`  🎨 ${i + 1}번째 색상 선택됨`);
            await page.waitForTimeout(500);
          } catch (error) {
            console.log(`  ⚠️ ${i + 1}번째 색상 선택 실패`);
          }
        }
        
        // 지도의 다른 위치 클릭
        const positions = [
          { x: 300, y: 200 }, { x: 400, y: 250 }, { x: 500, y: 300 }, { x: 350, y: 350 },
          { x: 450, y: 200 }, { x: 550, y: 250 }, { x: 300, y: 400 }, { x: 500, y: 450 }
        ];
        
        const pos = positions[i] || { x: 400, y: 300 };
        
        console.log(`  🖱️ 지도 위치 (${pos.x}, ${pos.y}) 클릭`);
        const mapElement = page.locator('#map');
        await mapElement.click({ position: pos });
        
        // 각 클릭 후 대기
        await page.waitForTimeout(3000);
        
        // 폴리곤 확인
        const polygonCount = await page.evaluate(() => {
          if (window.map && window.map.overlays) {
            const overlays = Object.values(window.map.overlays);
            return overlays.filter(overlay => 
              overlay.constructor.name === 'Polygon'
            ).length;
          }
          return 0;
        });
        
        console.log(`  📊 현재 폴리곤 개수: ${polygonCount}개`);
        
        if (polygonCount > 0) {
          console.log(`  ✅ ${i + 1}번째 색상 클릭 - 폴리곤 생성 성공!`);
        } else {
          console.log(`  ❌ ${i + 1}번째 색상 클릭 - 폴리곤 생성 실패`);
        }
      }
      
    } else {
      console.log('❌ 색상 팔레트가 발견되지 않음');
      
      // 색상 팔레트 없이도 기본 클릭 테스트
      console.log('🖱️ 기본 클릭 테스트 진행');
      const mapElement = page.locator('#map');
      await mapElement.click({ position: { x: 400, y: 300 } });
      await page.waitForTimeout(5000);
    }
    
    // 최종 폴리곤 개수 확인
    const finalPolygonCount = await page.evaluate(() => {
      if (window.map && window.map.overlays) {
        const overlays = Object.values(window.map.overlays);
        const polygons = overlays.filter(overlay => 
          overlay.constructor.name === 'Polygon'
        );
        return {
          total: polygons.length,
          overlayTypes: overlays.map(o => o.constructor.name)
        };
      }
      return { total: 0, overlayTypes: [] };
    });
    
    console.log('\n📊 최종 결과:');
    console.log(`  - 총 폴리곤 개수: ${finalPolygonCount.total}개`);
    console.log(`  - 오버레이 타입들: ${finalPolygonCount.overlayTypes.join(', ')}`);
    
    // 스크린샷
    await page.screenshot({ 
      path: '/Users/ai-code-lab/projects/naver-maps/simple-8-color-test.png',
      fullPage: true 
    });
    
    console.log('📸 8색 클릭 테스트 스크린샷 저장 완료');
    
    // 적어도 하나의 폴리곤이 생성되어야 함
    expect(finalPolygonCount.total).toBeGreaterThan(0);
  });
});