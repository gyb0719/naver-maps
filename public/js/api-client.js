/**
 * 🎯 ULTRATHINK: API 클라이언트 v2.0
 * 환경별 API 호출 라우팅 (로컬 = 모킹, 프로덕션 = 실제 API)
 */

const APIClient = {
    /**
     * VWorld API 호출 - 환경별 분기
     */
    async getParcelInfo(geomFilter, size = '10') {
        try {
            // 🚀 ULTRATHINK: 항상 실제 API 호출 (더미 데이터 제거)
            Utils.updateStatus('필지 정보 조회 중...');
            console.log('[API] 실제 VWorld API 호출 - 더미 데이터 사용 안함');
            
            const baseUrl = window.location.origin;
            const params = new URLSearchParams({
                service: 'data',
                request: 'GetFeature',
                data: 'LP_PA_CBND_BUBUN',
                key: CONFIG.VWORLD_API_KEYS[0],
                geometry: 'true',
                geomFilter: geomFilter,
                size: size,
                format: 'json',
                crs: 'EPSG:4326'
            });
            
            const response = await fetch(`${baseUrl}/api/vworld?${params.toString()}`);
            const data = await response.json();
            
            if (response.ok && (data.response?.status === 'OK' || data.features)) {
                console.log('[API] 필지 정보 조회 성공:', data.features?.length || 0);
                return data;
            } else {
                throw new Error(data.error || '필지 정보 조회 실패');
            }
        } catch (error) {
            Utils.handleError('VWORLD', '필지 정보 조회 오류', error);
            throw error;
        }
    },

    /**
     * Naver Geocoding API 호출 - 환경별 분기  
     */
    async geocodeAddress(query) {
        try {
            // 🚀 ULTRATHINK: 항상 실제 API 호출 (더미 데이터 제거)
            Utils.updateStatus('주소 검색 중...');
            console.log('[API] 실제 Naver Geocoding API 호출 - 더미 데이터 사용 안함');
            
            const baseUrl = window.location.origin;
            const response = await fetch(`${baseUrl}/api/naver/geocode?query=${encodeURIComponent(query)}`);
            const data = await response.json();
                
                if (response.ok) {
                    console.log('[API] 주소 검색 성공:', data.addresses?.length || 0);
                    return data;
                } else {
                    throw new Error(data.error || '주소 검색 실패');
                }
            }
        } catch (error) {
            Utils.handleError('GEOCODE', '주소 검색 오류', error);
            throw error;
        }
    },

    /**
     * 🎯 개발자 테스트용 콘솔 명령어들
     */
    async testParcelAPI(address = '서초구 서초동') {
        console.log(`[TEST] 필지 API 테스트 시작: ${address}`);
        
        try {
            // 1. 주소 검색
            const geocodeResult = await this.geocodeAddress(address);
            console.log('[TEST] 지오코딩 결과:', geocodeResult);
            
            if (geocodeResult.addresses && geocodeResult.addresses.length > 0) {
                const firstAddress = geocodeResult.addresses[0];
                const x = parseFloat(firstAddress.x);
                const y = parseFloat(firstAddress.y);
                
                // 2. 해당 좌표 주변 필지 검색
                const geomFilter = `POINT(${x} ${y})`;
                const parcelResult = await this.getParcelInfo(geomFilter);
                console.log('[TEST] 필지 조회 결과:', parcelResult);
                
                return {
                    geocode: geocodeResult,
                    parcels: parcelResult
                };
            }
        } catch (error) {
            console.error('[TEST] API 테스트 실패:', error);
        }
    },

    /**
     * 환경 정보 확인용
     */
    getEnvironmentInfo() {
        return {
            hostname: window.location.hostname,
            isLocal: CONFIG.IS_LOCAL,
            isDevelopment: CONFIG.IS_DEVELOPMENT,
            apiMode: CONFIG.IS_LOCAL ? 'MOCKING' : 'REAL_API',
            naverClientId: CONFIG.NAVER_CLIENT_ID,
            vworldKeys: CONFIG.VWORLD_API_KEYS.length
        };
    }
};

// 전역에 등록해서 콘솔에서 바로 사용 가능
window.APIClient = APIClient;

// 🎯 개발자 편의 기능: 콘솔에서 바로 테스트 가능
if (CONFIG.DEBUG) {
    console.log('[API-CLIENT] 개발자 콘솔 명령어:');
    console.log('- APIClient.testParcelAPI("서초구") // API 테스트');
    console.log('- APIClient.getEnvironmentInfo()   // 환경 정보');
    console.log('- window.AppState                  // 앱 상태 확인');
}