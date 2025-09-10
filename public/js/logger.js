/**
 * 🎯 ULTRATHINK: 간단한 로깅 시스템
 * 개발/디버깅용 로그 관리
 */

const Logger = {
    /**
     * 일반 정보 로그
     */
    info(module, message, data) {
        if (CONFIG.DEBUG) {
            console.log(`%c[${module}] ${message}`, 'color: #2196F3', data || '');
        }
    },
    
    /**
     * 경고 로그  
     */
    warn(module, message, data) {
        console.warn(`[${module}] WARNING: ${message}`, data || '');
    },
    
    /**
     * 에러 로그
     */
    error(module, message, error) {
        console.error(`[${module}] ERROR: ${message}`, error || '');
        
        // 에러 발생 시 상태 업데이트
        if (typeof Utils !== 'undefined') {
            Utils.updateStatus(`오류: ${message}`, 'error');
        }
    },
    
    /**
     * 성공 로그 (중요한 작업 완료 시)
     */
    success(module, message, data) {
        if (CONFIG.DEBUG) {
            console.log(`%c[${module}] ✅ ${message}`, 'color: #4CAF50; font-weight: bold', data || '');
        }
        
        // 성공 시 상태 업데이트  
        if (typeof Utils !== 'undefined') {
            Utils.updateStatus(message, 'success');
        }
    },
    
    /**
     * 사용자 행동 로그 (클릭, 입력 등)
     */
    action(module, action, data) {
        if (CONFIG.DEBUG) {
            console.log(`%c[${module}] 🎯 ${action}`, 'color: #FF9800', data || '');
        }
    },
    
    /**
     * API 호출 로그
     */
    api(module, method, url, data) {
        if (CONFIG.DEBUG) {
            console.log(`%c[${module}] 🌐 ${method} ${url}`, 'color: #9C27B0', data || '');
        }
    },
    
    /**
     * 성능 측정 시작
     */
    timeStart(label) {
        if (CONFIG.DEBUG) {
            console.time(`⏱️ ${label}`);
        }
    },
    
    /**
     * 성능 측정 종료
     */
    timeEnd(label) {
        if (CONFIG.DEBUG) {
            console.timeEnd(`⏱️ ${label}`);
        }
    }
};

// 전역 등록
window.Logger = Logger;

Logger.info('LOGGER', '로깅 시스템 초기화 완료');