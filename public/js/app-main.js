/**
 * 🎯 ULTRATHINK: 메인 애플리케이션 v2.0
 * 모든 컴포넌트 초기화 및 통합 관리
 */

class App {
    constructor() {
        this.isInitialized = false;
        this.startTime = Date.now();
    }
    
    /**
     * 앱 초기화 (DOM 로드 완료 후 호출)
     */
    async init() {
        Logger.timeStart('앱 전체 초기화');
        Logger.info('APP', '앱 초기화 시작');
        
        try {
            Utils.updateStatus('앱 초기화 중...', 'loading');
            
            // 1단계: UI 이벤트 초기화
            await this.initUIEvents();
            
            // 2단계: 지도 초기화  
            await this.initMap();
            
            // 3단계: 데이터 로드 및 렌더링
            await this.loadSavedData();
            
            // 4단계: 전역 함수 등록
            this.registerGlobalFunctions();
            
            // 5단계: 개발자 도구 설정
            this.setupDevTools();
            
            this.isInitialized = true;
            const loadTime = Date.now() - this.startTime;
            
            Logger.success('APP', `앱 초기화 완료 (${loadTime}ms)`);
            Utils.updateStatus('앱 준비 완료', 'success');
            
        } catch (error) {
            Utils.handleError('APP', '앱 초기화 실패', error);
            this.showErrorFallback(error);
        }
        
        Logger.timeEnd('앱 전체 초기화');
    }
    
    /**
     * UI 이벤트 초기화
     */
    async initUIEvents() {
        Logger.info('APP', 'UI 이벤트 초기화');
        
        if (window.UIHandler) {
            window.UIHandler.init();
        } else {
            throw new Error('UIHandler가 로드되지 않았습니다');
        }
    }
    
    /**
     * 지도 초기화
     */
    async initMap() {
        Logger.info('APP', '지도 초기화');
        
        if (window.MapEngine) {
            await window.MapEngine.initMap();
        } else {
            throw new Error('MapEngine이 로드되지 않았습니다');
        }
    }
    
    /**
     * 저장된 데이터 로드
     */
    async loadSavedData() {
        Logger.info('APP', '저장된 데이터 로드');
        
        if (!window.DataManager) {
            Logger.warn('APP', 'DataManager가 없어 데이터 로드 스킵');
            return;
        }
        
        try {
            const parcels = await window.DataManager.loadParcels();
            
            if (parcels && parcels.length > 0) {
                Logger.info('APP', `${parcels.length}개 필지 데이터 로드됨`);
                
                // 필지들을 지도에 렌더링 (비동기로 처리)
                this.renderSavedParcels(parcels);
                
            } else {
                Logger.info('APP', '저장된 필지 데이터가 없습니다');
            }
            
        } catch (error) {
            Logger.warn('APP', '저장된 데이터 로드 실패', error);
        }
    }
    
    /**
     * 저장된 필지들을 지도에 렌더링
     */
    async renderSavedParcels(parcels) {
        Logger.timeStart('저장된 필지 렌더링');
        
        let rendered = 0;
        
        for (const parcel of parcels) {
            try {
                // 필지 데이터를 지도 엔진 형식으로 변환
                const parcelData = this.convertStoredParcelToMapData(parcel);
                
                // 지도에 렌더링
                const parcelInfo = await window.MapEngine.renderParcel(parcelData);
                
                if (parcelInfo && parcel.color !== 'transparent') {
                    // 색상 적용
                    window.MapEngine.paintParcel(parcelInfo, parcel.color);
                }
                
                rendered++;
                
            } catch (error) {
                Logger.warn('APP', '필지 렌더링 실패', error);
            }
        }
        
        Logger.success('APP', `${rendered}개 필지 렌더링 완료`);
        Logger.timeEnd('저장된 필지 렌더링');
    }
    
    /**
     * 저장된 필지 데이터를 지도 엔진 형식으로 변환
     */
    convertStoredParcelToMapData(stored) {
        return {
            properties: {
                PNU: stored.pnu,
                jibun: stored.parcel_number,
                address: stored.address || '',
                area: stored.area || null,
                landType: stored.land_type || ''
            },
            geometry: {
                coordinates: stored.coordinates ? JSON.parse(stored.coordinates) : []
            }
        };
    }
    
    /**
     * 전역 함수 등록 (기존 HTML에서 호출하는 함수들)
     */
    registerGlobalFunctions() {
        // 검색 모드 토글 (HTML onclick에서 호출)
        window.toggleSearchMode = () => {
            if (window.UIHandler) {
                window.UIHandler.toggleSearchMode();
            }
        };
        
        // 캘린더 모달 열기
        window.openCalendarModal = () => {
            Logger.action('APP', '캘린더 모달 열기');
            const modal = document.getElementById('calendarModal');
            if (modal) {
                modal.style.display = 'block';
            }
        };
        
        // 캘린더 모달 닫기
        window.closeCalendarModal = () => {
            const modal = document.getElementById('calendarModal');
            if (modal) {
                modal.style.display = 'none';
            }
        };
        
        // 캘린더 업데이트
        window.updateCalendar = () => {
            Logger.action('APP', '캘린더 업데이트');
            Utils.updateStatus('캘린더 기능은 곧 제공될 예정입니다');
        };
        
        // 구글 시트 전송 (HTML에서 호출)
        window.exportCurrentParcelToGoogleSheets = () => {
            if (window.UIHandler) {
                window.UIHandler.handleExport();
            }
        };
        
        // 엑셀 복사 (HTML에서 호출)
        window.copyDataToClipboard = () => {
            if (window.UIHandler) {
                window.UIHandler.handleCopy();
            }
        };
        
        Logger.info('APP', '전역 함수 등록 완료');
    }
    
    /**
     * 개발자 도구 설정
     */
    setupDevTools() {
        if (!CONFIG.DEBUG) return;
        
        // 개발자 콘솔에 디버깅 도구 등록
        window.DEBUG = {
            // 현재 상태 출력
            state: () => {
                console.log('=== APP STATE ===');
                console.log('AppState:', window.AppState);
                console.log('Parcels:', window.MapEngine.parcels);
                console.log('UI Initialized:', window.UIHandler.isInitialized);
                console.log('Map Initialized:', window.MapEngine.isInitialized);
                console.log('================');
            },
            
            // 테스트용 샘플 필지 추가
            addSampleParcel: () => {
                const sample = Utils.getSampleParcel();
                window.MapEngine.renderParcel(sample);
                console.log('샘플 필지 추가됨:', sample);
            },
            
            // 모든 필지 색칠 제거
            clearAllParcels: () => {
                window.MapEngine.parcels.forEach(parcel => {
                    window.MapEngine.clearParcelColor(parcel);
                });
                console.log('모든 필지 색칠 제거됨');
            },
            
            // 성능 정보
            performance: () => {
                console.log('=== PERFORMANCE ===');
                console.log('Load Time:', Date.now() - this.startTime, 'ms');
                console.log('Parcels Count:', window.MapEngine.parcels.size);
                console.log('Memory Usage:', performance.memory || 'N/A');
                console.log('==================');
            }
        };
        
        console.log('%c🎯 ULTRATHINK v2.0 개발자 도구 활성화', 'color: #00ff00; font-size: 16px; font-weight: bold');
        console.log('사용 가능한 명령어:', Object.keys(window.DEBUG));
        console.log('예시: DEBUG.state() - 현재 상태 확인');
        
        Logger.info('APP', '개발자 도구 설정 완료');
    }
    
    /**
     * 오류 발생 시 대체 UI 표시
     */
    showErrorFallback(error) {
        const app = document.getElementById('app');
        if (!app) return;
        
        app.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; background: #f8f9fa;">
                <div style="text-align: center; max-width: 500px; padding: 20px;">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">⚠️ 앱 초기화 실패</h1>
                    <p style="color: #6c757d; margin-bottom: 30px;">앱을 시작하는 중에 문제가 발생했습니다.</p>
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; margin-bottom: 20px;">
                        <strong>오류 내용:</strong><br>
                        <code style="color: #dc3545;">${error.message}</code>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                            🔄 새로고침
                        </button>
                        <button onclick="console.error(${JSON.stringify(error.stack)})" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                            🐛 콘솔 확인
                        </button>
                    </div>
                    ${CONFIG.IS_DEVELOPMENT ? `
                        <div style="margin-top: 20px; font-size: 12px; color: #6c757d;">
                            개발 모드 - 개발자 도구(F12)를 열어 자세한 오류를 확인하세요
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

// 전역 앱 인스턴스 생성
const app = new App();

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    Logger.info('APP', 'DOM 로드 완료 - 앱 초기화 시작');
    app.init();
});

// 전역 등록
window.App = app;

Logger.info('APP', 'App 클래스 로드 완료');