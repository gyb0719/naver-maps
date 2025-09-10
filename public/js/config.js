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

// 메인 설정 객체
const CONFIG = {
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