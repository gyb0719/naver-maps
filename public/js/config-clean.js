/**
 * 🎯 ULTRATHINK: 클린 설정 파일 v2.0
 * 환경 감지, API 키 관리, 기본 유틸리티
 */

// 환경 감지
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const IS_DEVELOPMENT = IS_LOCAL || window.location.hostname.includes('ngrok') || window.location.hostname.includes('preview');

// 메인 설정 객체
const CONFIG = {
    // 환경 정보
    IS_LOCAL,
    IS_DEVELOPMENT,
    
    // 네이버 지도 API - 기존 키로 시도 (도메인 제한 확인용)
    NAVER_CLIENT_ID: 'x21kpuf1v4',
    
    // VWorld API 키 (서버 프록시 사용)
    VWORLD_API_KEYS: [
        '12A51C12-8690-3559-9C2B-9F705D0D8AF3'
    ],
    
    // Supabase 설정  
    SUPABASE_URL: 'https://cqfszcbifonxpfasodto.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZnN6Y2JpZm9ueHBmYXNvZHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTM2NzUsImV4cCI6MjA3Mjk4OTY3NX0.gaEIzHhU8d7e1T8WDzxK-YDW7DPU2aLkD3XBU7TtncI',
    
    // 지도 기본 설정
    MAP_CENTER: { lat: 37.5665, lng: 126.9780 },  // 서울시청
    MAP_ZOOM: 15,
    
    // 색상 팔레트 (기존 UI와 매칭)
    COLORS: {
        red: '#FF0000',      // 빨강
        orange: '#FFA500',   // 주황  
        yellow: '#FFFF00',   // 노랑
        green: '#90EE90',    // 연두
        blue: '#0000FF',     // 파랑
        purple: '#9370DB',   // 보라 (검색용)
        black: '#000000',    // 검정
        white: '#FFFFFF',    // 하양
        skyblue: '#87CEEB'   // 하늘색
    },
    
    // API 엔드포인트
    VWORLD_PROXY_URL: '/api/vworld',
    
    // 저장소 설정
    STORAGE_KEY: 'naverMapsParcels_v2_clean',
    
    // 디버그 모드
    DEBUG: IS_DEVELOPMENT
};

// 전역 상태 (단순화)
window.AppState = {
    // 현재 선택 색상
    currentColor: CONFIG.COLORS.red,
    
    // 선택된 필지
    selectedParcel: null,
    
    // 지도 객체
    map: null,
    
    // 필지 데이터 맵 (PNU -> 데이터)
    parcels: new Map(),
    
    // 로딩 상태
    isLoading: false,
    
    // 검색 모드
    searchMode: false
};

// 유틸리티 함수들
const Utils = {
    /**
     * 지번 포맷팅
     */
    formatJibun(properties) {
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
            console.error('[CONFIG] 지번 포맷팅 실패:', error);
            return '포맷 오류';
        }
    },
    
    /**
     * PNU 생성/추출
     */
    generatePNU(properties) {
        return properties.PNU || properties.pnu || properties.id || 
               `GENERATED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * 상태 메시지 업데이트
     */
    updateStatus(message, type = 'info') {
        const statusEl = document.querySelector('.header h1');
        if (statusEl) {
            // 원래 제목 뒤에 상태 표시
            const originalText = '네이버 지도 필지 관리 프로그램';
            statusEl.textContent = `${originalText} - ${message}`;
            
            // 3초 후 원래 제목으로 복원
            setTimeout(() => {
                statusEl.textContent = originalText;
            }, 3000);
        }
        
        if (CONFIG.DEBUG) {
            console.log(`[STATUS] ${message}`);
        }
    },
    
    /**
     * 에러 처리
     */
    handleError(module, message, error) {
        console.error(`[${module}] ERROR: ${message}`, error);
        this.updateStatus(`오류: ${message}`, 'error');
        
        // 개발 모드에서는 alert도 표시
        if (CONFIG.DEBUG && IS_LOCAL) {
            alert(`[${module}] ${message}\n\n자세한 내용은 개발자 도구를 확인하세요.`);
        }
    },
    
    /**
     * 개발용 샘플 데이터
     */
    getSampleParcel() {
        return {
            pnu: 'SAMPLE_001',
            parcelNumber: '서초구 서초동 1376-1',
            address: '서울특별시 서초구 서초동 1376-1',
            coordinates: [
                [127.026, 37.495],
                [127.027, 37.495], 
                [127.027, 37.496],
                [127.026, 37.496],
                [127.026, 37.495]
            ],
            properties: {
                PNU: 'SAMPLE_001',
                jibun: '서초구 서초동 1376-1',
                bon: '1376',
                bu: '1',
                gu: '서초구',
                dong: '서초동'
            }
        };
    }
};

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    Utils.handleError('GLOBAL', '예상치 못한 오류', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    Utils.handleError('GLOBAL', 'Promise 오류', event.reason);
});

// 초기화 로그
if (CONFIG.DEBUG) {
    console.log('[CONFIG] 설정 로드 완료:', {
        environment: IS_LOCAL ? 'local' : 'production',
        naverClientId: CONFIG.NAVER_CLIENT_ID,
        vworldKeys: CONFIG.VWORLD_API_KEYS.length,
        supabaseConfigured: !!CONFIG.SUPABASE_URL,
        defaultColor: window.AppState.currentColor
    });
}