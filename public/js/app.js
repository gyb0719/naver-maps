/**
 * 🎯 ULTRATHINK: 메인 앱 초기화 v2.0
 * 색상 선택, 폼 이벤트 등 기본 UI 동작
 */

// 색상 선택 이벤트 처리
function initColorPalette() {
    document.querySelectorAll('.color-item').forEach(item => {
        item.addEventListener('click', function() {
            // 기존 active 제거
            document.querySelectorAll('.color-item').forEach(i => i.classList.remove('active'));
            
            // 새로 선택된 항목에 active 추가
            this.classList.add('active');
            
            // 현재 색상 업데이트
            const color = this.dataset.color;
            window.AppState.currentColor = color;
            
            // 현재 색상 표시 업데이트
            const currentColorEl = document.getElementById('currentColor');
            if (currentColorEl) {
                currentColorEl.style.background = color;
            }
            
            Logger.info('APP', '색상 선택됨', color);
        });
    });
}

// 폼 이벤트 처리
function initFormEvents() {
    // 저장 버튼
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            Logger.info('APP', '저장 버튼 클릭됨');
            // TODO: Phase 3에서 구현
        });
    }
    
    // 초기화 버튼
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            Logger.info('APP', '초기화 버튼 클릭됨');
            
            // 폼 필드 초기화
            document.getElementById('parcelNumber').value = '';
            document.getElementById('title').value = '';
            document.getElementById('price').value = '';
            document.getElementById('landArea').value = '';
            document.getElementById('buildingArea').value = '';
            document.getElementById('contact').value = '';
            document.getElementById('notes').value = '';
            
            // 선택된 필지 초기화
            window.AppState.selectedParcel = null;
            
            Utils.updateStatus('폼 초기화됨');
        });
    }
    
    // 삭제 버튼
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            Logger.info('APP', '삭제 버튼 클릭됨');
            // TODO: Phase 4에서 구현
        });
    }
}

// 상태 표시 업데이트
function updateLoadingState(isLoading, message = '') {
    window.AppState.isLoading = isLoading;
    
    if (isLoading) {
        Utils.updateStatus(message || '로딩중...', 'loading');
    } else {
        Utils.updateStatus(message || '준비됨', 'success');
    }
}

// 앱 초기화
function initApp() {
    Logger.info('APP', '앱 초기화 시작');
    
    try {
        // 색상 팔레트 초기화
        initColorPalette();
        
        // 폼 이벤트 초기화  
        initFormEvents();
        
        // 초기 상태 설정
        updateLoadingState(false, '앱 초기화 완료');
        
        Logger.info('APP', '앱 초기화 완료');
        
    } catch (error) {
        Utils.handleError('APP', '앱 초기화 실패', error);
    }
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    Logger.info('APP', 'DOM 로드 완료');
    initApp();
});

// 전역 함수 등록 (디버깅용)
window.AppAPI = {
    initColorPalette,
    initFormEvents,
    updateLoadingState
};