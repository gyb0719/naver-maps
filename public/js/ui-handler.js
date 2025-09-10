/**
 * 🎯 ULTRATHINK: UI 이벤트 핸들러 v2.0  
 * 색상 팔레트, 메모 폼, 검색, 버튼 등 모든 UI 이벤트 통합 관리
 */

class UIHandler {
    constructor() {
        this.isInitialized = false;
        this.searchMode = false;
    }
    
    /**
     * UI 이벤트 초기화
     */
    init() {
        Logger.info('UI', 'UI 이벤트 초기화 시작');
        
        try {
            this.setupColorPalette();
            this.setupMemoForm();
            this.setupSearchEvents();
            this.setupOtherButtons();
            this.setupMobileHandler();
            
            this.isInitialized = true;
            Logger.success('UI', 'UI 이벤트 초기화 완료');
            
        } catch (error) {
            Utils.handleError('UI', 'UI 초기화 실패', error);
        }
    }
    
    /**
     * 색상 팔레트 이벤트 설정
     */
    setupColorPalette() {
        document.querySelectorAll('.color-item').forEach(item => {
            item.addEventListener('click', () => {
                // 기존 active 클래스 제거
                document.querySelectorAll('.color-item').forEach(i => i.classList.remove('active'));
                
                // 새로 선택된 항목에 active 추가
                item.classList.add('active');
                
                // 현재 색상 업데이트
                const color = item.dataset.color;
                window.AppState.currentColor = color;
                
                // 현재 색상 표시 업데이트
                const currentColorEl = document.getElementById('currentColor');
                if (currentColorEl) {
                    currentColorEl.style.background = color;
                }
                
                Logger.action('UI', '색상 선택됨', color);
                Utils.updateStatus(`색상 선택: ${color}`);
            });
        });
        
        Logger.info('UI', '색상 팔레트 이벤트 등록 완료');
    }
    
    /**
     * 메모 폼 이벤트 설정
     */
    setupMemoForm() {
        // 저장 버튼
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave());
        }
        
        // 초기화 버튼  
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClear());
        }
        
        // 삭제 버튼 (기존에는 없었지만 추가)
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDelete());
        }
        
        // 구글 시트 전송 버튼
        const exportBtn = document.getElementById('exportCurrentBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }
        
        // 엑셀 복사 버튼
        const copyBtn = document.getElementById('copyDataBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.handleCopy());
        }
        
        Logger.info('UI', '메모 폼 이벤트 등록 완료');
    }
    
    /**
     * 검색 이벤트 설정
     */
    setupSearchEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const searchToggleBtn = document.getElementById('searchToggleBtn');
        
        // 검색 버튼
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        
        // 검색 입력 필드 (엔터키)
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }
        
        // 검색 토글 버튼
        if (searchToggleBtn) {
            searchToggleBtn.addEventListener('click', () => this.toggleSearchMode());
        }
        
        Logger.info('UI', '검색 이벤트 등록 완료');
    }
    
    /**
     * 기타 버튼 이벤트 설정
     */
    setupOtherButtons() {
        // 선택 초기화 버튼
        const clearSelectedBtn = document.getElementById('clearSelectedBtn');
        if (clearSelectedBtn) {
            clearSelectedBtn.addEventListener('click', () => this.clearSelectedParcels());
        }
        
        // 검색 초기화 버튼
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearchResults());
        }
        
        // 색칠 모드 토글 버튼
        const paintModeToggle = document.getElementById('paintModeToggle');
        if (paintModeToggle) {
            paintModeToggle.addEventListener('click', () => this.togglePaintMode());
        }
        
        Logger.info('UI', '기타 버튼 이벤트 등록 완료');
    }
    
    /**
     * 모바일 관련 이벤트
     */
    setupMobileHandler() {
        // 모바일 메뉴 관련 이벤트들은 기존 코드 활용
        // 여기서는 간단히 처리
        
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                Logger.action('UI', '모바일 네비게이션 클릭', e.target.textContent);
            });
        });
    }
    
    // === 이벤트 핸들러 함수들 ===
    
    /**
     * 저장 버튼 처리
     */
    async handleSave() {
        Logger.action('UI', '저장 버튼 클릭됨');
        
        const selectedParcel = window.AppState.selectedParcel;
        if (!selectedParcel) {
            Utils.updateStatus('저장할 필지를 선택해주세요', 'error');
            return;
        }
        
        try {
            // 폼에서 메모 데이터 수집
            const memoData = this.collectMemoData();
            
            // 데이터 저장
            await window.DataManager.saveMemo(selectedParcel.pnu, memoData);
            
            Utils.updateStatus('메모가 저장되었습니다', 'success');
            Logger.success('UI', '메모 저장 완료', selectedParcel.pnu);
            
        } catch (error) {
            Utils.handleError('UI', '메모 저장 실패', error);
        }
    }
    
    /**
     * 초기화 버튼 처리
     */
    handleClear() {
        Logger.action('UI', '초기화 버튼 클릭됨');
        
        // 모든 입력 필드 초기화
        document.getElementById('parcelNumber').value = '';
        document.getElementById('ownerName').value = '';
        document.getElementById('ownerAddress').value = '';
        document.getElementById('ownerContact').value = '';
        document.getElementById('memo').value = '';
        
        // 선택된 필지 초기화
        window.AppState.selectedParcel = null;
        
        Utils.updateStatus('폼이 초기화되었습니다');
        Logger.info('UI', '폼 초기화 완료');
    }
    
    /**
     * 삭제 버튼 처리
     */
    async handleDelete() {
        const selectedParcel = window.AppState.selectedParcel;
        if (!selectedParcel) {
            Utils.updateStatus('삭제할 필지를 선택해주세요', 'error');
            return;
        }
        
        if (!confirm('정말 삭제하시겠습니까?')) return;
        
        try {
            await window.DataManager.deleteParcel(selectedParcel.pnu);
            
            // 지도에서도 제거
            if (window.MapEngine) {
                const parcelInfo = window.MapEngine.parcels.get(selectedParcel.pnu);
                if (parcelInfo && parcelInfo.polygon) {
                    parcelInfo.polygon.setMap(null);
                    window.MapEngine.parcels.delete(selectedParcel.pnu);
                }
            }
            
            this.handleClear(); // 폼도 초기화
            Utils.updateStatus('필지가 삭제되었습니다', 'success');
            
        } catch (error) {
            Utils.handleError('UI', '필지 삭제 실패', error);
        }
    }
    
    /**
     * 검색 처리
     */
    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.trim() : '';
        
        if (!query) {
            Utils.updateStatus('검색어를 입력해주세요', 'error');
            return;
        }
        
        Logger.action('UI', '검색 실행', query);
        Utils.updateStatus('검색 기능은 곧 제공될 예정입니다');
        
        // TODO: 검색 기능 구현 (Geocoding API 활용)
    }
    
    /**
     * 검색 모드 토글
     */
    toggleSearchMode() {
        this.searchMode = !this.searchMode;
        const toggleBtn = document.getElementById('searchToggleBtn');
        
        if (toggleBtn) {
            toggleBtn.textContent = this.searchMode ? '검색 ON' : '검색 OFF';
            toggleBtn.style.backgroundColor = this.searchMode ? '#28a745' : '#6c757d';
        }
        
        window.AppState.searchMode = this.searchMode;
        Logger.action('UI', '검색 모드 토글', this.searchMode);
        Utils.updateStatus(`검색 모드 ${this.searchMode ? '활성화' : '비활성화'}`);
    }
    
    /**
     * 선택된 필지들 색칠 초기화
     */
    clearSelectedParcels() {
        Logger.action('UI', '선택 초기화 버튼 클릭됨');
        
        let clearedCount = 0;
        
        // 모든 필지의 색상을 투명으로 변경
        window.MapEngine.parcels.forEach((parcelInfo) => {
            if (parcelInfo.color !== 'transparent') {
                window.MapEngine.clearParcelColor(parcelInfo);
                clearedCount++;
            }
        });
        
        Utils.updateStatus(`${clearedCount}개 필지 색칠이 초기화되었습니다`);
        Logger.success('UI', '선택 초기화 완료', clearedCount);
    }
    
    /**
     * 검색 결과 초기화
     */
    clearSearchResults() {
        Logger.action('UI', '검색 초기화 버튼 클릭됨');
        
        // 검색 입력 필드 초기화
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        Utils.updateStatus('검색 결과가 초기화되었습니다');
        Logger.info('UI', '검색 초기화 완료');
    }
    
    /**
     * 색칠 모드 토글 (기존 기능 유지)
     */
    togglePaintMode() {
        // 기존에는 색칠 모드가 있었지만, v2.0에서는 항상 색칠 가능하도록 단순화
        Utils.updateStatus('색칠 모드는 항상 활성화되어 있습니다');
        Logger.action('UI', '색칠 모드 토글 (항상 활성화)');
    }
    
    /**
     * 구글 시트 전송
     */
    handleExport() {
        Logger.action('UI', '구글 시트 전송 버튼 클릭됨');
        Utils.updateStatus('구글 시트 연동 기능은 곧 제공될 예정입니다');
    }
    
    /**
     * 엑셀 복사
     */
    handleCopy() {
        Logger.action('UI', '엑셀 복사 버튼 클릭됨');
        
        const selectedParcel = window.AppState.selectedParcel;
        if (!selectedParcel) {
            Utils.updateStatus('복사할 데이터가 없습니다', 'error');
            return;
        }
        
        // 간단한 텍스트 형태로 클립보드에 복사
        const copyText = this.generateCopyText(selectedParcel);
        
        navigator.clipboard.writeText(copyText).then(() => {
            Utils.updateStatus('클립보드에 복사되었습니다', 'success');
        }).catch(() => {
            Utils.updateStatus('복사 실패', 'error');
        });
    }
    
    // === 유틸리티 함수들 ===
    
    /**
     * 메모 폼에서 데이터 수집
     */
    collectMemoData() {
        return {
            title: document.getElementById('ownerName')?.value || '',
            content: document.getElementById('memo')?.value || '',
            price: document.getElementById('price')?.value || '',
            landArea: document.getElementById('landArea')?.value || '',
            buildingArea: document.getElementById('buildingArea')?.value || '',
            contactPerson: document.getElementById('ownerName')?.value || '',
            contactPhone: document.getElementById('ownerContact')?.value || '',
            notes: document.getElementById('memo')?.value || ''
        };
    }
    
    /**
     * 복사용 텍스트 생성
     */
    generateCopyText(parcelInfo) {
        const memoData = this.collectMemoData();
        return `지번: ${parcelInfo.jibun}
소유자: ${memoData.title}
연락처: ${memoData.contactPhone}
메모: ${memoData.content}`;
    }
    
    /**
     * 메모 데이터를 폼에 로드
     */
    async loadMemoToForm(pnu) {
        try {
            const memo = await window.DataManager.getMemo(pnu);
            
            if (memo) {
                document.getElementById('ownerName').value = memo.title || '';
                document.getElementById('ownerAddress').value = memo.content || '';
                document.getElementById('ownerContact').value = memo.contact_phone || '';
                document.getElementById('memo').value = memo.notes || '';
                
                Logger.info('UI', '메모 데이터 로드 완료', pnu);
            }
            
        } catch (error) {
            Logger.warn('UI', '메모 데이터 로드 실패', error);
        }
    }
}

// 전역 인스턴스 생성
window.UIHandler = new UIHandler();

Logger.info('UI', 'UIHandler 초기화 완료');