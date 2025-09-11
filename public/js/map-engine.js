class MapEngine {
    constructor() {
        this.map = null;
        this.searchMarkers = [];
        this.parcels = new Map(); // PNU -> {parcelData, polygon} 매핑
        this.isInitialized = false;
    }

    /**
     * 🎯 지도 초기화
     */
    init() {
        if (window.naver && window.naver.maps) {
            const mapOptions = {
                center: new naver.maps.LatLng(37.5665, 126.9780), // 서울시청
                zoom: 18,
                mapTypeId: naver.maps.MapTypeId.SATELLITE,
                scaleControl: true,
                logoControl: false,
                mapDataControl: false,
                zoomControl: true
            };
            
            this.map = new naver.maps.Map('map', mapOptions);
            this.isInitialized = true;
            
            // 지도 클릭 이벤트 리스너
            naver.maps.Event.addListener(this.map, 'click', (e) => {
                const latlng = e.coord;
                this.handleMapClick(latlng.lat(), latlng.lng());
            });
            
            // 지도 우클릭 이벤트 리스너 - 모든 색상 제거
            naver.maps.Event.addListener(this.map, 'rightclick', (e) => {
                e.domEvent.preventDefault(); // 기본 컨텍스트 메뉴 방지
                this.clearAllParcelColors();
            });
            
            Logger.info('MAP', '✅ Naver Maps 초기화 완료');
            
            // 지도 초기화 완료 이벤트 발생
            window.dispatchEvent(new CustomEvent('mapInitialized', {
                detail: { map: this.map }
            }));
            
            return true;
        } else {
            Logger.error('MAP', 'Naver Maps API 로드되지 않음');
            return false;
        }
    }

    /**
     * 🎯 지도 클릭 핸들러 - 실제 필지 조회 및 렌더링
     */
    async handleMapClick(lat, lng) {
        if (!this.isInitialized) return;
        
        Logger.action('MAP', '🎯 실제 필지 데이터 조회 시작', { lat, lng });
        Utils.updateStatus('실제 필지 데이터 로딩 중...', 'loading');
        
        try {
            // 🎯 실제 VWorld API 호출 - 더미 데이터 사용 금지
            const realParcelData = await this.fetchParcelInfoWithRacing(lat, lng);
            
            console.log('🔍🔍🔍 MAP-ENGINE RECEIVED REAL DATA:', {
                type: typeof realParcelData,
                isArray: Array.isArray(realParcelData),
                length: realParcelData?.length,
                firstItem: realParcelData?.[0]
            });
            
            if (!realParcelData || realParcelData.length === 0) {
                Logger.error('MAP', '해당 위치에 실제 필지 데이터가 없음', { lat, lng });
                Utils.updateStatus('❌ 해당 위치에는 필지가 없거나 API 오류가 발생했습니다.', 'error');
                return;
            }
            
            // 🎯 실제 필지 데이터로 렌더링 처리
            let rendered = 0;
            for (let i = 0; i < realParcelData.length; i++) {
                const parcelData = realParcelData[i];
                
                try {
                    const polygon = await this.renderRealParcel(parcelData);
                    if (polygon) {
                        rendered++;
                        Logger.success('MAP', `✅ 실제 필지 렌더링 성공 (${i + 1}/${realParcelData.length})`);
                        
                        // 첫 번째 필지 정보를 패널에 표시
                        if (i === 0) {
                            this.showRealParcelInfo(parcelData);
                        }
                    }
                } catch (renderError) {
                    Logger.error('MAP', `❌ 실제 필지 렌더링 중 오류 (${i + 1}/${realParcelData.length})`, renderError);
                }
            }
            
            if (rendered > 0) {
                Utils.updateStatus(`✅ ${rendered}개 실제 필지에 색칠 완료`, 'success');
            } else {
                Utils.updateStatus('⚠️ 렌더링 가능한 필지가 없습니다.', 'warning');
            }
            
        } catch (error) {
            Logger.error('MAP', '❌ 실제 필지 데이터 조회 실패', error);
            Utils.updateStatus('🔴 VWorld API 연결 실패 - 서버리스 함수 오류', 'error');
        }
    }
    
    /**
     * 📋 실제 필지 정보 패널에 표시
     */
    showRealParcelInfo(parcelData) {
        if (!parcelData || !parcelData.properties) return;
        
        const props = parcelData.properties;
        
        // 필지 정보 패널 업데이트
        const jibunInput = document.querySelector('input[placeholder*="123-4"]');
        const ownerInput = document.querySelector('input[placeholder*="홍길동"]');
        const addressInput = document.querySelector('input[placeholder*="서울시"]');
        const phoneInput = document.querySelector('input[placeholder*="010"]');
        
        if (jibunInput) jibunInput.value = props.jibun || props.JIBUN || '';
        if (ownerInput) ownerInput.value = '실제 필지 소유자';
        if (addressInput) addressInput.value = props.address || props.ADDRESS || `PNU: ${props.PNU || ''}`;
        if (phoneInput) phoneInput.value = '';
        
        Logger.info('UI', '실제 필지 정보 패널 업데이트 완료', props);
    }

    /**
     * 🌐 API Racing으로 필지 정보 가져오기
     */
    async fetchParcelInfoWithRacing(lat, lng) {
        try {
            if (!window.APIRacingSystem) {
                throw new Error('API Racing System이 초기화되지 않음');
            }
            
            const data = await window.APIRacingSystem.raceForParcelData(lat, lng);
            return this.processAPIData(data);
            
        } catch (error) {
            Logger.error('RACING', 'API Racing 실패', error);
            throw error;
        }
    }

    /**
     * 📊 API 데이터 처리 및 표준화
     */
    processAPIData(data) {
        if (!data) return [];
        
        // VWorld API 응답 형식
        if (data.response && data.response.result && data.response.result.featureCollection) {
            return data.response.result.featureCollection.features;
        }
        
        // GeoJSON FeatureCollection 형식
        if (data.features && Array.isArray(data.features)) {
            return data.features;
        }
        
        // 단일 Feature 형식
        if (data.type === 'Feature') {
            return [data];
        }
        
        Logger.warn('PROCESSING', '알 수 없는 데이터 형식', data);
        return [];
    }

    /**
     * 🎨 실제 필지 렌더링 (VWorld/Backup API 데이터)
     */
    async renderRealParcel(parcelData) {
        console.log('🎨🎨🎨 RENDERREALPARCEL CALLED!!!', {
            type: typeof parcelData,
            hasGeometry: !!parcelData.geometry,
            hasProperties: !!parcelData.properties,
            geometryType: parcelData.geometry?.type,
            propertiesKeys: Object.keys(parcelData.properties || {})
        });
        
        const pnu = Utils.generatePNU(parcelData.properties);
        console.log('🏷️ Generated PNU:', pnu);
        
        // 이미 렌더링된 필지인지 확인
        if (this.parcels.has(pnu)) {
            console.log('⚠️ Already rendered parcel:', pnu);
            Logger.info('MAP', '이미 렌더링된 필지', pnu);
            return this.parcels.get(pnu).polygon;
        }
        
        try {
            // 좌표 데이터 처리  
            console.log('📍 Processing coordinates...');
            const coordinates = this.processCoordinates(parcelData);
            console.log('📍 Processed coordinates:', {
                type: typeof coordinates,
                isArray: Array.isArray(coordinates),
                length: coordinates?.length,
                firstCoord: coordinates?.[0]
            });
            if (!coordinates) throw new Error('좌표 처리 실패');
            
            // 현재 선택된 색상 (기본값 보장)
            const color = window.AppState?.currentColor || CONFIG.COLORS.red || '#FF0000';
            
            Logger.info('MAP', '🎨 폴리곤 생성 색상', { 
                color, 
                appStateColor: window.AppState?.currentColor,
                configColor: CONFIG.COLORS?.red 
            });
            
            // 네이버 지도 폴리곤 생성 (정확한 실제 좌표로) - 강화된 가시성
            console.log('🎨 Creating Naver Maps Polygon with:', {
                color: color,
                coordinatesLength: coordinates.length,
                hasMap: !!this.map
            });
            
            const polygon = new naver.maps.Polygon({
                map: this.map,
                paths: coordinates,
                fillColor: color,
                fillOpacity: 0.7,  // 불투명도 증가
                strokeColor: color,
                strokeWeight: 3,   // 선 두께 증가
                strokeOpacity: 1.0, // 완전 불투명
                clickable: true,
                zIndex: 100       // z-index 설정으로 다른 요소 위에 표시
            });
            
            console.log('✅ Polygon created successfully:', !!polygon);
            
            // 🗺️ 오버레이 추적 시스템에 폴리곤 저장
            console.log('🔍 Overlay system check:', {
                overlaySystemExists: !!window.overlayTracker,
                overlayMapExists: !!window.overlayTracker?.overlays
            });
            
            if (window.overlayTracker && window.overlayTracker.overlays) {
                try {
                    window.overlayTracker.overlays.set(pnu, {
                        type: 'polygon',
                        overlay: polygon,
                        data: parcelData,
                        timestamp: Date.now()
                    });
                    console.log('✅ 오버레이 추적 시스템에 저장 완료:', pnu);
                } catch (overlayError) {
                    console.warn('⚠️ 오버레이 저장 실패:', overlayError);
                }
            }
            
            // 필지 데이터 저장
            this.parcels.set(pnu, {
                parcelData: parcelData,
                polygon: polygon,
                coordinates: coordinates,
                color: color
            });
            
            // 이벤트 리스너 추가
            naver.maps.Event.addListener(polygon, 'click', (e) => {
                e.domEvent.preventDefault();
                e.domEvent.stopPropagation();
                this.selectParcelFromPolygon(pnu, parcelData);
            });
            
            naver.maps.Event.addListener(polygon, 'rightclick', (e) => {
                e.domEvent.preventDefault();
                e.domEvent.stopPropagation();
                this.clearParcelColor(parcelData);
            });
            
            Logger.success('MAP', '✅ 필지 렌더링 완료', { pnu, color });
            return polygon;
            
        } catch (error) {
            Logger.error('MAP', '❌ 필지 렌더링 실패', error);
            throw error;
        }
    }

    /**
     * 🎨 필지 색칠 (8가지 색상 팔레트 지원 강화)
     */
    paintParcelColor(pnu, color) {
        if (!this.parcels.has(pnu)) {
            Logger.warn('MAP', `필지를 찾을 수 없음: ${pnu}`);
            return false;
        }
        
        const parcelInfo = this.parcels.get(pnu);
        const polygon = parcelInfo.polygon;
        
        polygon.setOptions({
            fillColor: color,
            fillOpacity: 0.7,
            strokeColor: color,
            strokeWeight: 3,
            strokeOpacity: 1.0
        });
        
        // 필지 정보 업데이트
        parcelInfo.color = color;
        this.parcels.set(pnu, parcelInfo);
        
        Logger.success('MAP', `🎨 필지 색상 변경: ${color}`, { pnu });
        return true;
    }

    /**
     * 📍 필지 좌표 처리
     */
    processCoordinates(parcelData) {
        const geometry = parcelData.geometry;
        if (!geometry || !geometry.coordinates) {
            throw new Error('지오메트리 데이터 없음');
        }
        
        let coords;
        if (geometry.type === 'Polygon') {
            coords = geometry.coordinates[0]; // 외부 링만 사용
        } else if (geometry.type === 'MultiPolygon') {
            coords = geometry.coordinates[0][0]; // 첫 번째 폴리곤의 외부 링
        } else {
            throw new Error(`지원하지 않는 지오메트리 타입: ${geometry.type}`);
        }
        
        // [lng, lat] → LatLng 객체로 변환
        return coords.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
    }

    /**
     * 🎯 폴리곤에서 필지 선택
     */
    selectParcelFromPolygon(pnu, parcelData) {
        Logger.action('MAP', '필지 선택됨', { pnu });
        
        // 폼에 필지 정보 표시
        if (parcelData.properties) {
            const jibun = Utils.formatJibun(parcelData.properties);
            document.getElementById('parcelNumber').value = jibun || '';
            
            // 기존 저장된 정보가 있다면 로드
            const savedData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
            const existing = savedData.find(item => item.pnu === pnu);
            
            if (existing) {
                document.getElementById('ownerName').value = existing.ownerName || '';
                document.getElementById('ownerAddress').value = existing.ownerAddress || '';
                document.getElementById('ownerContact').value = existing.ownerContact || '';
                document.getElementById('memo').value = existing.memo || '';
            }
        }
        
        // 전역 상태 업데이트
        window.currentSelectedPNU = pnu;
    }

    /**
     * 🗑️ 필지 색상 제거
     */
    clearParcelColor(parcelInfo) {
        const pnu = Utils.generatePNU(parcelInfo.properties);
        
        if (!this.parcels.has(pnu)) {
            Logger.warn('MAP', `제거할 필지를 찾을 수 없음: ${pnu}`);
            return;
        }
        
        const parcelData = this.parcels.get(pnu);
        const polygon = parcelData.polygon;
        
        // 폴리곤을 투명하게 설정
        polygon.setOptions({
            fillColor: 'transparent',
            fillOpacity: 0,
            strokeColor: '#0000FF',
            strokeWeight: 0.5,
            strokeOpacity: 0.6
        });
        
        // 로컬 스토리지에서 제거
        let savedData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        savedData = savedData.filter(item => item.pnu !== pnu);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(savedData));
        
        // 필지 정보 업데이트
        parcelData.color = 'transparent';
        this.parcels.set(pnu, parcelData);
        
        Logger.success('MAP', '🗑️ 필지 색상 제거됨', { pnu });
    }

    /**
     * 🗑️ 모든 필지 색상 제거 (우클릭 전체 삭제)
     */
    clearAllParcelColors() {
        Logger.info('MAP', '🗑️ 모든 필지 색상 제거 시작');
        
        let removedCount = 0;
        
        // 모든 폴리곤 제거
        for (const [pnu, parcelData] of this.parcels.entries()) {
            const polygon = parcelData.polygon;
            if (polygon) {
                polygon.setMap(null); // 지도에서 제거
                removedCount++;
            }
        }
        
        // 현재 폴리곤 배열 초기화
        this.currentPolygons = [];
        
        // parcels Map 초기화
        this.parcels.clear();
        
        // 오버레이 추적 시스템 초기화
        if (window.map && window.map.overlays) {
            window.map.overlays = {};
            console.log('🗺️ Overlay tracking system cleared');
        }
        
        // 로컬 저장소에서 모든 필지 데이터 제거
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            Logger.info('DATA', '로컬 저장소 초기화 완료');
        } catch (error) {
            Logger.warn('DATA', '로컬 저장소 초기화 실패', error);
        }
        
        // DataManager가 있다면 추가 정리
        if (window.DataManager && typeof window.DataManager.clearAllParcels === 'function') {
            try {
                window.DataManager.clearAllParcels();
                Logger.info('DATA', '모든 필지 데이터 초기화 완료');
            } catch (error) {
                Logger.warn('DATA', '데이터 초기화 중 오류', error);
            }
        }
        
        // 필지 정보 패널 초기화
        this.clearParcelInfoPanel();
        
        Logger.success('MAP', '🎉 모든 필지 색상 제거 완료', { 
            removedCount, 
            remainingParcels: this.parcels.size,
            remainingPolygons: this.currentPolygons.length
        });
        
        Utils.updateStatus(`✅ ${removedCount}개 필지 색상이 모두 제거되었습니다.`, 'success');
        
        return removedCount;
    }
    
    /**
     * 📋 필지 정보 패널 초기화
     */
    clearParcelInfoPanel() {
        try {
            const jibunInput = document.querySelector('input[placeholder*="123-4"]');
            const ownerInput = document.querySelector('input[placeholder*="홍길동"]');
            const addressInput = document.querySelector('input[placeholder*="서울시"]');
            const phoneInput = document.querySelector('input[placeholder*="010"]');
            const memoTextarea = document.querySelector('textarea[placeholder*="추가 메모"]');
            
            if (jibunInput) jibunInput.value = '';
            if (ownerInput) ownerInput.value = '홍길동';
            if (addressInput) addressInput.value = '서울시 강남구...';
            if (phoneInput) phoneInput.value = '010-1234-5678';
            if (memoTextarea) memoTextarea.value = '';
            
            Logger.info('UI', '필지 정보 패널 초기화 완료');
        } catch (error) {
            Logger.warn('UI', '필지 정보 패널 초기화 실패', error);
        }
    }

    /**
     * 🔍 검색 마커 추가
     */
    addSearchMarker(lat, lng, title) {
        // 기존 검색 마커 제거
        this.clearSearchMarkers();
        
        const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(lat, lng),
            map: this.map,
            title: title,
            icon: {
                content: '<div style="background:#FF4444;color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);">📍</div>',
                anchor: new naver.maps.Point(15, 15)
            }
        });
        
        this.searchMarkers.push(marker);
        
        // 지도 중심을 마커로 이동
        this.map.setCenter(new naver.maps.LatLng(lat, lng));
        
        Logger.info('MAP', '🔍 검색 마커 추가됨', { lat, lng, title });
    }

    /**
     * 🧹 검색 마커 제거
     */
    clearSearchMarkers() {
        this.searchMarkers.forEach(marker => marker.setMap(null));
        this.searchMarkers = [];
        Logger.info('MAP', '🧹 검색 마커 제거됨');
    }

    /**
     * 📊 지도 통계 정보
     */
    getStats() {
        return {
            totalParcels: this.parcels.size,
            searchMarkers: this.searchMarkers.length,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * 🎯 특정 좌표로 지도 중심 이동
     */
    moveToLocation(lat, lng, zoom = 18) {
        if (!this.isInitialized) return;
        
        this.map.setCenter(new naver.maps.LatLng(lat, lng));
        this.map.setZoom(zoom);
        
        Logger.info('MAP', '🎯 지도 중심 이동', { lat, lng, zoom });
    }
    
    /**
     * 🔄 지도 초기화
     */
    reset() {
        this.clearSearchMarkers();
        
        // 모든 필지 폴리곤 제거
        this.parcels.forEach((parcelInfo, pnu) => {
            if (parcelInfo.polygon) {
                parcelInfo.polygon.setMap(null);
            }
        });
        this.parcels.clear();
        
        Logger.info('MAP', '🔄 지도 초기화 완료');
    }

    /**
     * 🗺️ 지도 타입 변경
     */
    changeMapType(type) {
        if (!this.map) return;
        
        const mapTypes = {
            'normal': naver.maps.MapTypeId.NORMAL,
            'satellite': naver.maps.MapTypeId.SATELLITE,  // 순수 위성지도
            'hybrid': naver.maps.MapTypeId.HYBRID,        // 위성+도로
            'terrain': naver.maps.MapTypeId.TERRAIN,      // 지형도
            'cadastral': naver.maps.MapTypeId.NORMAL      // 지적편집도 (일반지도+오버레이)
        };
        
        if (mapTypes[type]) {
            this.map.setMapTypeId(mapTypes[type]);
            Logger.info('MAP', `🗺️ 지도 타입 변경: ${type}`);
            
            // 지적편집도는 별도 구현 필요 (향후)
            if (type === 'cadastral') {
                Logger.info('MAP', '📋 지적편집도 오버레이 (미구현)');
            }
        }
    }
}

// 전역 인스턴스 생성 및 자동 초기화
window.MapEngine = new MapEngine();