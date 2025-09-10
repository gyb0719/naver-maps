/**
 * 🎯 ULTRATHINK: 검색 엔진 v2.0
 * APIClient 기반 환경별 자동 분기 검색 시스템
 */

class SearchEngine {
    constructor() {
        this.searchResults = new Map(); // PNU -> 검색 결과
        this.searchMode = false;
        this.isInitialized = false;
    }

    /**
     * 검색 엔진 초기화
     */
    init() {
        this.setupEventListeners();
        this.setupSearchToggle();
        this.isInitialized = true;
        console.log('[SEARCH] 검색 엔진 초기화 완료');
    }

    /**
     * 검색 이벤트 리스너 설정
     */
    setupEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');

        if (!searchBtn || !searchInput) {
            console.error('[SEARCH] 검색 UI 요소를 찾을 수 없습니다');
            return;
        }

        // 검색 버튼 클릭
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            } else {
                Utils.updateStatus('검색어를 입력하세요', 'warning');
            }
        });

        // 엔터키로 검색
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                } else {
                    Utils.updateStatus('검색어를 입력하세요', 'warning');
                }
            }
        });

        console.log('[SEARCH] 이벤트 리스너 설정 완료');
    }

    /**
     * 검색 토글 설정
     */
    setupSearchToggle() {
        const toggleBtn = document.getElementById('searchToggleBtn');
        if (!toggleBtn) {
            console.warn('[SEARCH] 검색 토글 버튼을 찾을 수 없습니다');
            return;
        }

        // 전역 토글 함수와 연동 (기존 HTML onclick 유지)
        window.toggleSearchMode = () => {
            this.toggleSearchMode();
        };

        // 초기 상태 설정
        this.updateToggleButton();
    }

    /**
     * 🎯 ULTRATHINK: 통합 검색 시스템 (APIClient 활용)
     */
    async performSearch(query) {
        console.log(`[SEARCH] 검색 시작: "${query}"`);
        
        // 검색 모드로 자동 전환
        if (!this.searchMode) {
            this.enableSearchMode();
        }

        try {
            Utils.updateStatus('검색 중...', 'loading');

            // 1단계: 주소 검색 (Naver Geocoding)
            const geocodeResult = await APIClient.geocodeAddress(query);
            
            if (geocodeResult.addresses && geocodeResult.addresses.length > 0) {
                const address = geocodeResult.addresses[0];
                const lat = parseFloat(address.y);
                const lng = parseFloat(address.x);

                console.log(`[SEARCH] 주소 검색 성공: ${lat}, ${lng}`);

                // 지도 이동
                this.moveMapToLocation(lat, lng);

                // 2단계: 해당 위치 필지 검색
                await this.searchParcelAtLocation(lat, lng);

                Utils.updateStatus('검색 완료', 'success');
            } else {
                console.log('[SEARCH] 주소 검색 실패, 직접 필지 검색 시도');
                // 직접 필지명으로 검색 시도
                await this.searchByParcelName(query);
            }

        } catch (error) {
            Utils.handleError('SEARCH', '검색 중 오류 발생', error);
        }
    }

    /**
     * 특정 위치의 필지 검색
     */
    async searchParcelAtLocation(lat, lng) {
        try {
            const geomFilter = `POINT(${lng} ${lat})`;
            const result = await APIClient.getParcelInfo(geomFilter, '5');

            if (result.features && result.features.length > 0) {
                console.log(`[SEARCH] 필지 검색 성공: ${result.features.length}개`);
                
                result.features.forEach(feature => {
                    this.highlightParcel(feature);
                });
            } else {
                console.log('[SEARCH] 해당 위치에 필지 정보 없음');
                Utils.updateStatus('해당 위치에 필지가 없습니다', 'warning');
            }
        } catch (error) {
            console.error('[SEARCH] 필지 검색 실패:', error);
            // 개발 모드에서는 샘플 데이터 표시
            if (CONFIG.IS_LOCAL) {
                const sampleParcel = Utils.getSampleParcel();
                this.highlightParcel({
                    ...sampleParcel,
                    geometry: {
                        type: 'Polygon',
                        coordinates: [sampleParcel.coordinates]
                    }
                });
            }
        }
    }

    /**
     * 필지명으로 직접 검색 (개발용)
     */
    async searchByParcelName(query) {
        console.log(`[SEARCH] 필지명 검색: "${query}"`);
        
        if (CONFIG.IS_LOCAL) {
            // 로컬에서는 샘플 데이터 표시
            const sampleParcel = Utils.getSampleParcel();
            this.highlightParcel({
                ...sampleParcel,
                properties: {
                    ...sampleParcel.properties,
                    jibun: query, // 검색어를 지번으로 사용
                    searchQuery: query
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [sampleParcel.coordinates]
                }
            });
            
            // 지도를 샘플 위치로 이동
            const center = sampleParcel.coordinates[0];
            this.moveMapToLocation(center[1], center[0]);
            
            Utils.updateStatus(`로컬 모드: "${query}" 샘플 검색 완료`, 'success');
        } else {
            Utils.updateStatus('해당 필지를 찾을 수 없습니다', 'warning');
        }
    }

    /**
     * 필지 하이라이트 표시
     */
    highlightParcel(parcelData) {
        try {
            const pnu = Utils.generatePNU(parcelData.properties);
            const jibun = Utils.formatJibun(parcelData.properties);

            // 이미 표시된 필지인지 확인
            if (this.searchResults.has(pnu)) {
                console.log(`[SEARCH] 이미 표시된 필지: ${pnu}`);
                return;
            }

            // 좌표 처리
            const coordinates = this.processSearchCoordinates(parcelData);
            
            // 검색 필지용 폴리곤 생성 (보라색)
            const polygon = new naver.maps.Polygon({
                map: window.AppState.map,
                paths: coordinates,
                fillColor: CONFIG.COLORS.purple,
                fillOpacity: 0.7,
                strokeColor: '#4B0082', // 인디고
                strokeWeight: 3,
                strokeOpacity: 1.0,
                clickable: true
            });

            // 중심점에 라벨 표시
            const center = this.calculatePolygonCenter(coordinates);
            const label = new naver.maps.Marker({
                position: center,
                map: window.AppState.map,
                icon: {
                    content: `<div style="
                        padding: 6px 10px; 
                        background: rgba(255,255,255,0.95); 
                        border: 2px solid ${CONFIG.COLORS.purple}; 
                        border-radius: 4px; 
                        font-weight: bold; 
                        font-size: 12px; 
                        color: #4B0082;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    ">${jibun}</div>`,
                    anchor: new naver.maps.Point(0, 0)
                }
            });

            // 검색 결과 저장
            const searchResult = {
                pnu,
                data: parcelData,
                polygon,
                label,
                jibun
            };

            this.searchResults.set(pnu, searchResult);

            // 폴리곤 클릭 이벤트 - 정보 입력
            naver.maps.Event.addListener(polygon, 'click', () => {
                this.selectParcel(searchResult);
            });

            console.log(`[SEARCH] 필지 하이라이트 완료: ${jibun}`);

        } catch (error) {
            Utils.handleError('SEARCH', '필지 하이라이트 실패', error);
        }
    }

    /**
     * 검색 좌표 처리
     */
    processSearchCoordinates(parcelData) {
        try {
            if (parcelData.geometry && parcelData.geometry.coordinates) {
                const coords = parcelData.geometry.type === 'Polygon' 
                    ? parcelData.geometry.coordinates[0]
                    : parcelData.geometry.coordinates[0][0];
                return coords.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
            }

            // 샘플 데이터 처리
            if (parcelData.coordinates) {
                return parcelData.coordinates.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
            }

            throw new Error('좌표 데이터 없음');

        } catch (error) {
            console.warn('[SEARCH] 좌표 처리 실패, 기본 사각형 사용');
            
            // 기본 위치 (지도 중심)
            const center = window.AppState.map.getCenter();
            const offset = 0.001;
            
            return [
                new naver.maps.LatLng(center.lat() - offset, center.lng() - offset),
                new naver.maps.LatLng(center.lat() - offset, center.lng() + offset),
                new naver.maps.LatLng(center.lat() + offset, center.lng() + offset),
                new naver.maps.LatLng(center.lat() + offset, center.lng() - offset)
            ];
        }
    }

    /**
     * 폴리곤 중심점 계산
     */
    calculatePolygonCenter(coordinates) {
        let totalLat = 0, totalLng = 0, count = 0;

        coordinates.forEach(coord => {
            totalLat += coord.lat();
            totalLng += coord.lng();
            count++;
        });

        return new naver.maps.LatLng(totalLat / count, totalLng / count);
    }

    /**
     * 지도 이동
     */
    moveMapToLocation(lat, lng) {
        if (window.AppState.map) {
            const position = new naver.maps.LatLng(lat, lng);
            window.AppState.map.setCenter(position);
            window.AppState.map.setZoom(17);
            console.log(`[SEARCH] 지도 이동: ${lat}, ${lng}`);
        }
    }

    /**
     * 검색 필지 선택 (폼에 정보 입력)
     */
    selectParcel(searchResult) {
        const parcelNumberInput = document.getElementById('parcelNumber');
        if (parcelNumberInput) {
            parcelNumberInput.value = searchResult.jibun;
            parcelNumberInput.focus();
            
            // 전역 상태 업데이트
            window.AppState.selectedParcel = {
                pnu: searchResult.pnu,
                data: searchResult.data,
                jibun: searchResult.jibun
            };

            console.log(`[SEARCH] 필지 선택: ${searchResult.jibun}`);
            Utils.updateStatus('필지 선택됨', 'success');
        }
    }

    /**
     * 검색 모드 토글
     */
    toggleSearchMode() {
        this.searchMode = !this.searchMode;
        
        if (this.searchMode) {
            this.enableSearchMode();
        } else {
            this.disableSearchMode();
        }

        this.updateToggleButton();
        console.log(`[SEARCH] 모드 전환: ${this.searchMode ? 'ON' : 'OFF'}`);
    }

    /**
     * 검색 모드 활성화
     */
    enableSearchMode() {
        this.searchMode = true;
        this.showSearchResults();
        this.hideRegularParcels();
    }

    /**
     * 검색 모드 비활성화
     */
    disableSearchMode() {
        this.searchMode = false;
        this.hideSearchResults();
        this.showRegularParcels();
    }

    /**
     * 검색 결과 표시
     */
    showSearchResults() {
        this.searchResults.forEach(result => {
            if (result.polygon) result.polygon.setMap(window.AppState.map);
            if (result.label) result.label.setMap(window.AppState.map);
        });
        console.log(`[SEARCH] ${this.searchResults.size}개 검색 결과 표시`);
    }

    /**
     * 검색 결과 숨기기
     */
    hideSearchResults() {
        this.searchResults.forEach(result => {
            if (result.polygon) result.polygon.setMap(null);
            if (result.label) result.label.setMap(null);
        });
        console.log(`[SEARCH] ${this.searchResults.size}개 검색 결과 숨김`);
    }

    /**
     * 일반 필지 숨기기 (MapEngine과 연동)
     */
    hideRegularParcels() {
        if (window.MapEngine && window.MapEngine.parcels) {
            window.MapEngine.parcels.forEach(parcel => {
                if (parcel.polygon) {
                    parcel.polygon.setMap(null);
                }
            });
        }
    }

    /**
     * 일반 필지 표시 (MapEngine과 연동)
     */
    showRegularParcels() {
        if (window.MapEngine && window.MapEngine.parcels) {
            window.MapEngine.parcels.forEach(parcel => {
                if (parcel.polygon) {
                    parcel.polygon.setMap(window.AppState.map);
                }
            });
        }
    }

    /**
     * 토글 버튼 UI 업데이트
     */
    updateToggleButton() {
        const toggleBtn = document.getElementById('searchToggleBtn');
        if (toggleBtn) {
            if (this.searchMode) {
                toggleBtn.textContent = '검색 ON';
                toggleBtn.classList.add('active');
            } else {
                toggleBtn.textContent = '검색 OFF';
                toggleBtn.classList.remove('active');
            }
        }
    }

    /**
     * 검색 결과 초기화
     */
    clearResults() {
        this.hideSearchResults();
        
        // 메모리에서 제거
        this.searchResults.forEach(result => {
            if (result.polygon) result.polygon.setMap(null);
            if (result.label) result.label.setMap(null);
        });
        
        this.searchResults.clear();
        console.log('[SEARCH] 모든 검색 결과 제거');
        Utils.updateStatus('검색 결과 초기화됨');
        
        // 검색 입력 필드 초기화
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }
}

// 전역 인스턴스 생성
window.SearchEngine = new SearchEngine();

// 초기화 버튼 연결
document.addEventListener('DOMContentLoaded', () => {
    // 검색 초기화 버튼
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            window.SearchEngine.clearResults();
        });
    }
});

console.log('[SEARCH] SearchEngine 클래스 로드 완료');