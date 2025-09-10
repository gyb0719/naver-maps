/**
 * 🎯 ULTRATHINK: 네이버 지도 필지 관리 v2.0 - 통합 설정
 * 모든 API 키와 설정을 중앙 집중식으로 관리
 */

// 로깅 시스템
const Logger = {
    info: (module, message, data) => console.log(`[${module}] ${message}`, data || ''),
    error: (module, message, error) => console.error(`[${module}] ERROR: ${message}`, error || ''),
    warn: (module, message, data) => console.warn(`[${module}] WARNING: ${message}`, data || '')
};

// 환경 감지 로직
const Environment = {
    isDevelopment: () => {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    },
    isProduction: () => {
        const hostname = window.location.hostname;
        return hostname.includes('vercel.app') || hostname.includes('parcel-management-system');
    },
    getBaseUrl: () => {
        return Environment.isDevelopment() ? 
            `${window.location.protocol}//${window.location.host}` : 
            window.location.origin;
    }
};

// 메인 설정 객체
const CONFIG = {
    // 환경 정보
    ENVIRONMENT: Environment,
    
    // API 키 정보
    NAVER_CLIENT_ID: 'x21kpuf1v4',
    
    // VWorld API 키 (5개 키 로테이션)
    VWORLD_API_KEYS: [
        '12A51C12-8690-3559-9C2B-9F705D0D8AF3'  // 새 인증키
    ],
    
    // Google 설정 (나중에 구현)
    GOOGLE_CLIENT_ID: '506368463001-um0b25os2vlep7mumonf63pcm9c9a0n3.apps.googleusercontent.com',
    // TODO: Google OAuth 기능 - 나중에 구현 예정
    
    // Supabase 설정
    SUPABASE_URL: 'https://cqfszcbifonxpfasodto.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZnN6Y2JpZm9ueHBmYXNvZHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTM2NzUsImV4cCI6MjA3Mjk4OTY3NX0.gaEIzHhU8d7e1T8WDzxK-YDW7DPU2aLkD3XBU7TtncI',
    
    // 지도 초기 설정
    MAP_DEFAULT_CENTER: {
        lat: 37.5665,  // 서울시청
        lng: 126.9780
    },
    MAP_DEFAULT_ZOOM: 15,
    
    // 색상 팔레트 
    COLORS: {
        red: '#FF0000',      // 빨강
        orange: '#FFA500',   // 주황
        yellow: '#FFFF00',   // 노랑
        green: '#90EE90',    // 연두
        blue: '#0000FF',     // 파랑
        purple: '#9370DB',   // 보라 (검색용)
        black: '#000000',    // 검정
        skyblue: '#87CEEB'   // 하늘
    },
    
    // VWorld API 엔드포인트
    VWORLD_API_URL: 'http://api.vworld.kr/req/data',
    
    // 서버 프록시 엔드포인트 
    VWORLD_PROXY_URL: '/api/vworld',
    
    // 저장소 키
    STORAGE_KEY: 'naverMapsParcels_v2',
    
    // 디버그 모드
    DEBUG: true
};

// 전역 상태 관리
window.AppState = {
    currentColor: CONFIG.COLORS.red,
    selectedParcel: null,
    isLoading: false,
    map: null,
    parcelsData: new Map(),  // PNU를 키로 하는 필지 데이터
    user: null
};

// API 호출 래퍼 클라이언트
const APIClient = {
    /**
     * Naver Maps Geocoding API 호출
     */
    async geocodeAddress(query) {
        try {
            const baseUrl = CONFIG.ENVIRONMENT.getBaseUrl();
            
            if (CONFIG.ENVIRONMENT.isDevelopment()) {
                // 로컬 개발환경: 서버 프록시 사용
                Logger.info('GEOCODE', '로컬 프록시를 통한 주소 검색', { query });
                const response = await fetch(`${baseUrl}/api/naver/geocode?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (response.ok) {
                    Logger.info('GEOCODE', '주소 검색 성공', { count: data.addresses?.length || 0 });
                    return data;
                } else {
                    throw new Error(data.error || '주소 검색 실패');
                }
            } else {
                // 프로덕션 환경: 직접 API 호출 (클라이언트에서 직접 호출은 CORS 문제로 불가능)
                // 프로덕션에서도 프록시를 사용해야 함
                Logger.info('GEOCODE', '프로덕션 프록시를 통한 주소 검색', { query });
                const response = await fetch(`${baseUrl}/api/naver/geocode?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (response.ok) {
                    Logger.info('GEOCODE', '주소 검색 성공', { count: data.addresses?.length || 0 });
                    return data;
                } else {
                    throw new Error(data.error || '주소 검색 실패');
                }
            }
        } catch (error) {
            Logger.error('GEOCODE', '주소 검색 오류', error);
            Utils.handleError('GEOCODE', '주소 검색에 실패했습니다', error);
            throw error;
        }
    },

    /**
     * VWorld API 호출 (필지 정보)
     */
    async getParcelInfo(geomFilter, size = '10') {
        try {
            const baseUrl = CONFIG.ENVIRONMENT.getBaseUrl();
            
            // VWorld API는 항상 프록시를 사용 (CORS 문제 및 API 키 보호)
            Logger.info('VWORLD', '필지 정보 요청', { geomFilter, size });
            
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
                Logger.info('VWORLD', '필지 정보 조회 성공', { count: data.features?.length || 0 });
                return data;
            } else {
                throw new Error(data.error || '필지 정보 조회 실패');
            }
        } catch (error) {
            Logger.error('VWORLD', '필지 정보 조회 오류', error);
            Utils.handleError('VWORLD', '필지 정보 조회에 실패했습니다', error);
            throw error;
        }
    },

    /**
     * 서버 설정 정보 가져오기
     */
    async getServerConfig() {
        try {
            const baseUrl = CONFIG.ENVIRONMENT.getBaseUrl();
            const response = await fetch(`${baseUrl}/api/config`);
            const data = await response.json();
            
            if (response.ok) {
                Logger.info('CONFIG', '서버 설정 로드 성공');
                return data;
            } else {
                throw new Error('서버 설정 로드 실패');
            }
        } catch (error) {
            Logger.error('CONFIG', '서버 설정 로드 오류', error);
            throw error;
        }
    }
};

// 유틸리티 함수들
const Utils = {
    /**
     * 지번 포맷팅 (표준화)
     */
    formatJibun: (properties) => {
        try {
            if (properties.jibun) return properties.jibun;
            if (properties.JIBUN) return properties.JIBUN;
            
            const bon = properties.bon || properties.BON || '';
            const bu = properties.bu || properties.BU || '';
            const dong = properties.dong || properties.DONG || '';
            const gu = properties.gu || properties.GU || '';
            
            if (bon && bu && bu !== '0') {
                return `${gu} ${dong} ${bon}-${bu}`;
            } else if (bon) {
                return `${gu} ${dong} ${bon}`;
            }
            
            return '지번 정보 없음';
        } catch (error) {
            Logger.error('CONFIG', '지번 포맷팅 실패', error);
            return '포맷 오류';
        }
    },
    
    /**
     * PNU 생성/추출
     */
    generatePNU: (properties) => {
        return properties.PNU || properties.pnu || properties.id || 
               `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * 상태 업데이트
     */
    updateStatus: (message, type = 'info') => {
        const statusEl = document.getElementById('statusText');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = type;
        }
        Logger.info('STATUS', message);
    },
    
    /**
     * 에러 처리
     */
    handleError: (module, message, error) => {
        Logger.error(module, message, error);
        Utils.updateStatus(`오류: ${message}`, 'error');
    }
};

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    Utils.handleError('GLOBAL', '예상치 못한 오류', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    Utils.handleError('GLOBAL', '처리되지 않은 Promise 오류', event.reason);
});

Logger.info('CONFIG', '설정 파일 로드 완료', {
    naverClientId: CONFIG.NAVER_CLIENT_ID,
    vworldKeys: CONFIG.VWORLD_API_KEYS.length,
    supabaseUrl: CONFIG.SUPABASE_URL ? '설정됨' : '미설정',
    defaultColor: window.AppState.currentColor
});