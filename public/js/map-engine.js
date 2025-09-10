/**
 * 🎯 ULTRATHINK: 지도 엔진 v2.0
 * 네이버 지도, VWorld API, 필지 렌더링, 클릭 이벤트 통합 관리
 */

class MapEngine {
    constructor() {
        this.map = null;
        this.parcels = new Map(); // PNU -> { polygon, data, color }
        this.currentPolygons = []; // 현재 화면의 폴리곤들
        this.isInitialized = false;
    }
    
    /**
     * 지도 초기화
     */
    async initMap() {
        Logger.timeStart('지도 초기화');
        
        try {
            // 네이버 지도 생성
            this.map = new naver.maps.Map('map', {
                center: new naver.maps.LatLng(CONFIG.MAP_CENTER.lat, CONFIG.MAP_CENTER.lng),
                zoom: CONFIG.MAP_ZOOM,
                mapTypeId: naver.maps.MapTypeId.NORMAL
            });
            
            // 전역 상태에 저장
            window.AppState.map = this.map;
            
            // 지도 클릭 이벤트 등록
            this.setupMapEvents();
            
            // 지도 타입 버튼 이벤트 등록  
            this.setupMapTypeButtons();
            
            this.isInitialized = true;
            Logger.success('MAP', '지도 초기화 완료');
            
        } catch (error) {
            Utils.handleError('MAP', '지도 초기화 실패', error);
            
            // API 도메인 제한 오류일 경우 안내
            if (error.message && error.message.includes('domain')) {
                Utils.updateStatus('API 도메인 제한 - 네이버 개발자 콘솔에서 localhost 추가 필요', 'error');
            }
        }
        
        Logger.timeEnd('지도 초기화');
    }
    
    /**
     * 지도 이벤트 설정
     */
    setupMapEvents() {
        // 지도 클릭 시 필지 정보 조회
        naver.maps.Event.addListener(this.map, 'click', (e) => {
            const coord = e.coord;
            Logger.action('MAP', '지도 클릭', { lat: coord.lat(), lng: coord.lng() });
            
            this.handleMapClick(coord.lat(), coord.lng());
        });
        
        Logger.info('MAP', '지도 이벤트 등록 완료');
    }
    
    /**
     * 지도 타입 버튼 이벤트
     */
    setupMapTypeButtons() {
        document.querySelectorAll('.map-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                
                // 버튼 활성화 상태 변경
                document.querySelectorAll('.map-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 지도 타입 변경
                switch(type) {
                    case 'normal':
                        this.map.setMapTypeId(naver.maps.MapTypeId.NORMAL);
                        break;
                    case 'satellite':
                        this.map.setMapTypeId(naver.maps.MapTypeId.SATELLITE);
                        break;
                    case 'cadastral':
                        this.map.setMapTypeId(naver.maps.MapTypeId.TERRAIN);
                        break;
                    case 'street':
                        // TODO: 거리뷰 기능은 나중에 구현
                        Utils.updateStatus('거리뷰 기능은 곧 제공될 예정입니다');
                        break;
                }
                
                Logger.action('MAP', '지도 타입 변경', type);
            });
        });
    }
    
    /**
     * 지도 클릭 처리 - 필지 정보 조회
     */
    async handleMapClick(lat, lng) {
        if (!this.isInitialized) return;
        
        Logger.timeStart('필지 정보 조회');
        Utils.updateStatus('필지 정보 조회 중...', 'loading');
        
        try {
            // VWorld API로 필지 정보 조회
            const parcelData = await this.fetchParcelInfo(lat, lng);
            
            if (parcelData && parcelData.length > 0) {
                // 첫 번째 필지 정보 사용
                const parcel = parcelData[0];
                Logger.success('MAP', '필지 정보 조회 성공', parcel);
                
                // 필지 렌더링
                await this.renderParcel(parcel);
                
                // UI에 정보 표시
                this.displayParcelInfo(parcel);
                
            } else {
                Logger.warn('MAP', '해당 위치에 필지 정보가 없습니다');
                Utils.updateStatus('필지 정보를 찾을 수 없습니다');
            }
            
        } catch (error) {
            Utils.handleError('MAP', '필지 정보 조회 실패', error);
            
            // 개발 환경에서는 샘플 데이터 사용
            if (CONFIG.IS_DEVELOPMENT) {
                Logger.info('MAP', '개발 환경 - 샘플 데이터 사용');
                const sampleParcel = Utils.getSampleParcel();
                await this.renderParcel(sampleParcel);
                this.displayParcelInfo(sampleParcel);
            }
        }
        
        Logger.timeEnd('필지 정보 조회');
    }
    
    /**
     * 🎯 ULTRATHINK: APIClient를 통한 필지 정보 조회 (환경별 자동 분기)
     */
    async fetchParcelInfo(lat, lng) {
        const geomFilter = `POINT(${lng} ${lat})`;
        
        try {
            const result = await APIClient.getParcelInfo(geomFilter);
            
            if (result.features && result.features.length > 0) {
                return result.features;
            } else {
                return [];
            }
        } catch (error) {
            console.error('[MAP-ENGINE] 필지 정보 조회 실패:', error);
            throw error;
        }
    }
    
    /**
     * 필지 폴리곤 렌더링
     */
    async renderParcel(parcelData) {
        const pnu = Utils.generatePNU(parcelData.properties);
        
        // 이미 렌더링된 필지인지 확인
        if (this.parcels.has(pnu)) {
            Logger.info('MAP', '이미 렌더링된 필지', pnu);
            return this.parcels.get(pnu);
        }
        
        try {
            // 좌표 데이터 처리
            const coordinates = this.processCoordinates(parcelData);
            
            // 폴리곤 생성
            const polygon = new naver.maps.Polygon({
                map: this.map,
                paths: coordinates,
                fillColor: 'transparent',
                fillOpacity: 0,
                strokeColor: '#FF0000',
                strokeWeight: 2,
                strokeOpacity: 0.8,
                clickable: true
            });
            
            // 필지 데이터 저장
            const parcelInfo = {
                pnu,
                data: parcelData,
                polygon,
                color: 'transparent',
                coordinates
            };
            
            this.parcels.set(pnu, parcelInfo);
            this.currentPolygons.push(polygon);
            
            // 폴리곤 클릭 이벤트 등록
            this.setupPolygonEvents(polygon, parcelInfo);
            
            Logger.success('MAP', '필지 렌더링 완료', pnu);
            return parcelInfo;
            
        } catch (error) {
            Utils.handleError('MAP', '필지 렌더링 실패', error);
            return null;
        }
    }
    
    /**
     * 폴리곤 이벤트 설정 (색칠/색칠제거)
     */
    setupPolygonEvents(polygon, parcelInfo) {
        // 왼쪽 클릭 = 색칠
        naver.maps.Event.addListener(polygon, 'click', (e) => {
            e.domEvent.stopPropagation(); // 지도 클릭 이벤트 방지
            
            Logger.action('PARCEL', '필지 왼쪽 클릭 - 색칠', parcelInfo.pnu);
            this.paintParcel(parcelInfo, window.AppState.currentColor);
        });
        
        // 오른쪽 클릭 = 색칠 제거
        naver.maps.Event.addListener(polygon, 'rightclick', (e) => {
            e.domEvent.preventDefault(); // 컨텍스트 메뉴 방지
            e.domEvent.stopPropagation();
            
            Logger.action('PARCEL', '필지 오른쪽 클릭 - 색칠 제거', parcelInfo.pnu);
            this.clearParcelColor(parcelInfo);
        });
    }
    
    /**
     * 필지 색칠
     */
    paintParcel(parcelInfo, color) {
        if (!parcelInfo || !parcelInfo.polygon) return;
        
        // 폴리곤 색상 변경
        parcelInfo.polygon.setOptions({
            fillColor: color,
            fillOpacity: 0.6,
            strokeColor: color,
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        
        // 색상 정보 저장
        parcelInfo.color = color;
        window.AppState.parcels.set(parcelInfo.pnu, parcelInfo);
        
        Logger.success('PARCEL', '필지 색칠 완료', { pnu: parcelInfo.pnu, color });
        
        // UI에 반영
        this.displayParcelInfo(parcelInfo.data);
        
        // 데이터 저장 (async로 백그라운드에서)
        if (window.DataManager) {
            window.DataManager.saveParcel(parcelInfo).catch(error => {
                Logger.warn('PARCEL', '데이터 저장 실패', error);
            });
        }
    }
    
    /**
     * 필지 색칠 제거
     */
    clearParcelColor(parcelInfo) {
        if (!parcelInfo || !parcelInfo.polygon) return;
        
        // 폴리곤을 투명하게 변경
        parcelInfo.polygon.setOptions({
            fillColor: 'transparent',
            fillOpacity: 0,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2
        });
        
        // 색상 정보 업데이트
        parcelInfo.color = 'transparent';
        window.AppState.parcels.set(parcelInfo.pnu, parcelInfo);
        
        Logger.success('PARCEL', '필지 색칠 제거 완료', parcelInfo.pnu);
        
        // 데이터 저장
        if (window.DataManager) {
            window.DataManager.saveParcel(parcelInfo).catch(error => {
                Logger.warn('PARCEL', '데이터 저장 실패', error);
            });
        }
    }
    
    /**
     * 좌표 데이터 처리
     */
    processCoordinates(parcelData) {
        try {
            if (parcelData.geometry && parcelData.geometry.coordinates) {
                const coords = parcelData.geometry.coordinates[0];
                return coords.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
            }
            
            // 샘플 데이터인 경우
            if (parcelData.coordinates) {
                return parcelData.coordinates.map(coord => new naver.maps.LatLng(coord[1], coord[0]));
            }
            
            throw new Error('좌표 데이터가 없습니다');
            
        } catch (error) {
            Logger.error('MAP', '좌표 처리 실패', error);
            
            // 기본 사각형 좌표 반환 (현재 지도 중심 기준)
            const center = this.map.getCenter();
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
     * 필지 정보를 UI에 표시
     */
    displayParcelInfo(parcelData) {
        try {
            const jibun = Utils.formatJibun(parcelData.properties);
            const pnu = Utils.generatePNU(parcelData.properties);
            
            // 지번 입력 필드에 표시
            const parcelNumberInput = document.getElementById('parcelNumber');
            if (parcelNumberInput) {
                parcelNumberInput.value = jibun;
            }
            
            // 선택된 필지 상태 업데이트
            window.AppState.selectedParcel = {
                pnu,
                data: parcelData,
                jibun
            };
            
            Logger.info('UI', '필지 정보 표시 완료', jibun);
            
        } catch (error) {
            Utils.handleError('UI', '필지 정보 표시 실패', error);
        }
    }
}

// 전역 인스턴스 생성
window.MapEngine = new MapEngine();

Logger.info('MAP', 'MapEngine 초기화 완료');