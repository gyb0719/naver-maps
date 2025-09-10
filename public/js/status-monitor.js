/**
 * 🎯 ULTRATHINK v3.0: Real-time API Status Monitor
 * 사용자가 시스템 상태를 실시간으로 볼 수 있는 모니터링 시스템
 */

class StatusMonitor {
    constructor() {
        this.isCollapsed = false;
        this.lastClickTime = null;
        this.cacheHits = 0;
        this.totalRequests = 0;
        this.apiStatuses = new Map();
        
        this.initializeUI();
        this.startPeriodicUpdates();
    }
    
    initializeUI() {
        // 토글 버튼 이벤트
        const toggleBtn = document.getElementById('statusToggle');
        const content = document.querySelector('.status-content');
        const header = document.querySelector('.status-header');
        
        if (toggleBtn && content) {
            // 헤더 클릭으로 토글
            header.addEventListener('click', (e) => {
                if (e.target === toggleBtn) return; // 버튼 클릭 시 중복 방지
                this.togglePanel();
            });
            
            // 버튼 클릭으로 토글
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }
        
        // 초기 상태 설정
        this.updateAPIStatus('Cache', 'idle');
        this.updateAPIStatus('VWorld_Serverless', 'idle');
        this.updateAPIStatus('VWorld_Direct', 'idle');
        this.updateAPIStatus('Backup_OSM', 'idle');
        
        Logger.info('STATUS', 'Status Monitor UI 초기화 완료');
    }
    
    togglePanel() {
        const content = document.querySelector('.status-content');
        const toggleBtn = document.getElementById('statusToggle');
        
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            content.classList.add('collapsed');
            toggleBtn.textContent = '+';
        } else {
            content.classList.remove('collapsed');
            toggleBtn.textContent = '−';
        }
        
        Logger.action('STATUS', `패널 ${this.isCollapsed ? '접기' : '펼치기'}`);
    }
    
    /**
     * 지도 클릭 기록
     */
    recordMapClick(lat, lng) {
        this.lastClickTime = new Date();
        this.totalRequests++;
        
        const timeString = this.lastClickTime.toLocaleTimeString('ko-KR', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        this.updateElement('lastClickTime', timeString);
        this.updateElement('responseTime', '측정 중...');
        this.updateElement('winnerAPI', '경쟁 중...');
        
        // 모든 API를 로딩 상태로 설정
        this.updateAPIStatus('Cache', 'loading');
        this.updateAPIStatus('VWorld_Serverless', 'loading');
        this.updateAPIStatus('VWorld_Direct', 'loading');
        this.updateAPIStatus('Backup_OSM', 'loading');
        
        Logger.action('STATUS', '지도 클릭 기록', { lat, lng, time: timeString });
    }
    
    /**
     * API 경주 결과 기록
     */
    recordRaceResult(winner, responseTime, stats) {
        const timeClass = this.getResponseTimeClass(responseTime);
        const responseElement = document.getElementById('responseTime');
        
        if (responseElement) {
            responseElement.textContent = `${responseTime}ms`;
            responseElement.className = timeClass;
        }
        
        this.updateElement('winnerAPI', winner);
        
        // 승자 API 성공 표시
        this.updateAPIStatus(winner, 'success');
        
        // 나머지 API들을 idle로 변경
        ['Cache', 'VWorld_Serverless', 'VWorld_Direct', 'Backup_OSM'].forEach(api => {
            if (api !== winner) {
                this.updateAPIStatus(api, 'idle');
            }
        });
        
        // 캐시 히트율 업데이트
        if (winner === 'Cache') {
            this.cacheHits++;
        }
        this.updateCacheHitRate();
        
        Logger.success('STATUS', '경주 결과 기록', { 
            winner, 
            responseTime, 
            cacheHitRate: `${(this.cacheHits/this.totalRequests*100).toFixed(1)}%`
        });
    }
    
    /**
     * API 실패 기록
     */
    recordAPIFailure(apiName, error) {
        this.updateAPIStatus(apiName, 'error');
        
        Logger.warn('STATUS', `API 실패 기록: ${apiName}`, error);
    }
    
    /**
     * 캐시 히트율 업데이트
     */
    updateCacheHitRate() {
        if (this.totalRequests === 0) return;
        
        const hitRate = ((this.cacheHits / this.totalRequests) * 100).toFixed(1);
        this.updateElement('cacheHitRate', `${hitRate}%`);
    }
    
    /**
     * API 상태 업데이트
     */
    updateAPIStatus(apiName, status) {
        const indicator = document.querySelector(`[data-api="${apiName}"]`);
        if (indicator) {
            indicator.setAttribute('data-status', status);
        }
        
        this.apiStatuses.set(apiName, {
            status,
            timestamp: Date.now()
        });
    }
    
    /**
     * 응답 시간 클래스 결정
     */
    getResponseTimeClass(responseTime) {
        if (responseTime < 1000) return 'response-time-fast';
        if (responseTime < 3000) return 'response-time-medium';
        return 'response-time-slow';
    }
    
    /**
     * DOM 요소 업데이트 헬퍼
     */
    updateElement(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    /**
     * 주기적 상태 업데이트
     */
    startPeriodicUpdates() {
        setInterval(() => {
            this.checkStaleStatuses();
            this.updateSystemHealth();
        }, 5000); // 5초마다 업데이트
    }
    
    /**
     * 오래된 상태 체크 (30초 이상 된 loading 상태 등)
     */
    checkStaleStatuses() {
        const now = Date.now();
        
        this.apiStatuses.forEach((statusData, apiName) => {
            if (statusData.status === 'loading' && now - statusData.timestamp > 30000) {
                // 30초 이상 로딩 중인 경우 에러로 변경
                this.updateAPIStatus(apiName, 'error');
                Logger.warn('STATUS', `${apiName} 타임아웃으로 에러 상태 변경`);
            }
        });
    }
    
    /**
     * 시스템 전체 상태 체크
     */
    updateSystemHealth() {
        const activeAPIs = Array.from(this.apiStatuses.values())
            .filter(status => status.status === 'success').length;
            
        const errorAPIs = Array.from(this.apiStatuses.values())
            .filter(status => status.status === 'error').length;
            
        // 상태 아이콘 업데이트
        const statusIcon = document.querySelector('.status-icon');
        if (statusIcon) {
            if (errorAPIs === this.apiStatuses.size) {
                statusIcon.textContent = '🔴'; // 모든 API 실패
            } else if (activeAPIs > 0) {
                statusIcon.textContent = '🟢'; // 일부 API 정상
            } else {
                statusIcon.textContent = '📡'; // 기본 상태
            }
        }
    }
    
    /**
     * 통계 리셋 (개발자 도구용)
     */
    resetStats() {
        this.cacheHits = 0;
        this.totalRequests = 0;
        this.lastClickTime = null;
        
        this.updateElement('lastClickTime', '-');
        this.updateElement('responseTime', '-');
        this.updateElement('winnerAPI', '-');
        this.updateElement('cacheHitRate', '0%');
        
        // 모든 API를 idle 상태로 리셋
        ['Cache', 'VWorld_Serverless', 'VWorld_Direct', 'Backup_OSM'].forEach(api => {
            this.updateAPIStatus(api, 'idle');
        });
        
        Logger.info('STATUS', '통계 리셋 완료');
    }
    
    /**
     * 현재 통계 조회 (개발자 도구용)
     */
    getStats() {
        return {
            totalRequests: this.totalRequests,
            cacheHits: this.cacheHits,
            cacheHitRate: `${(this.cacheHits / (this.totalRequests || 1) * 100).toFixed(1)}%`,
            lastClickTime: this.lastClickTime,
            apiStatuses: Object.fromEntries(this.apiStatuses)
        };
    }
}

// 전역 인스턴스 생성
window.StatusMonitor = new StatusMonitor();

// MapEngine과 APIRacingSystem과 연동
document.addEventListener('DOMContentLoaded', () => {
    // MapEngine 클릭 이벤트 후킹
    if (window.MapEngine) {
        const originalHandleMapClick = window.MapEngine.handleMapClick;
        window.MapEngine.handleMapClick = function(lat, lng) {
            window.StatusMonitor.recordMapClick(lat, lng);
            return originalHandleMapClick.call(this, lat, lng);
        };
    }
    
    // APIRacingSystem 결과 후킹 (다음 커밋에서 구현)
    
    Logger.info('STATUS', 'Status Monitor 연동 완료');
});

Logger.info('STATUS', 'Real-time API Status Monitor 초기화 완료');