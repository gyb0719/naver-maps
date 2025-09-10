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
     * 🚀 ULTRATHINK v8.0: API 우선 호출 방식 - 정확한 필지 즉시 렌더링
     */
    async handleMapClick(lat, lng) {
        if (!this.isInitialized) return;
        
        Logger.action('MAP', '🎯 API 우선 필지 로딩 시작', { lat, lng });
        Utils.updateStatus('필지 데이터 로딩 중...', 'loading');
        
        try {
            // 🎯 API 우선 호출 - 실제 필지 데이터 먼저 가져오기
            const realParcelData = await this.fetchParcelInfoWithRacing(lat, lng);
            
            // 강화된 데이터 검증
            if (!realParcelData || realParcelData.length === 0) {
                Logger.error('MAP', '해당 위치에 필지 데이터가 없음', { 
                    lat, lng, 
                    dataType: typeof realParcelData,
                    dataLength: realParcelData?.length || 0
                });
                Utils.updateStatus('⚠️ 필지 데이터 없음. 권장 지역: 서울시청, 강남역, 건대입구, 홍대입구 클릭', 'error');
                
                // 사용자에게 권장 좌표 제시
                Logger.info('MAP', '🎯 권장 테스트 좌표', {
                    '서울시청': { lat: 37.5663, lng: 126.9779 },
                    '강남역': { lat: 37.4981, lng: 127.0276 },  
                    '건대입구': { lat: 37.5404, lng: 127.0695 },
                    '홍대입구': { lat: 37.5563, lng: 126.9234 }
                });
                
                return;
            }
            
            const realParcel = realParcelData[0];
            
            // 실제 VWorld 필지 데이터 검증 (geometry 필수)
            if (!realParcel.geometry || !realParcel.geometry.coordinates || 
                !realParcel.properties || !realParcel.properties.PNU) {
                Logger.warn('MAP', '불완전한 필지 데이터 - VWorld 원본 데이터 아님', {
                    hasGeometry: !!realParcel.geometry,
                    hasCoordinates: !!realParcel.geometry?.coordinates,
                    hasProperties: !!realParcel.properties,
                    hasPNU: !!realParcel.properties?.PNU,
                    properties: Object.keys(realParcel.properties || {})
                });
                
                Utils.updateStatus('실제 필지 데이터가 아닙니다. 서울/경기 지역을 클릭해보세요.', 'warn');
                // 경고는 하지만 렌더링은 계속 진행
            }
            
            // 🎨 실제 필지 데이터로 즉시 정확한 렌더링
            const polygon = await this.renderRealParcel(realParcel);
            
            if (polygon) {
                // 🎯 필지 지번을 왼쪽 메모장에 자동 입력
                this.fillParcelAddressToMemo(realParcel);
                
                // UI 정보 업데이트
                this.displayParcelInfo(realParcel);
                
                Logger.success('MAP', '🎉 정확한 필지 렌더링 완료', {
                    pnu: Utils.generatePNU(realParcel.properties),
                    jibun: Utils.formatJibun(realParcel.properties)
                });
                Utils.updateStatus('필지 색칠 완료!', 'success');
            }
            
        } catch (error) {
            Logger.error('MAP', 'API 우선 호출 완전 실패', error);
            Utils.updateStatus(`필지 로딩 실패: ${error.message}`, 'error');
        }
    }
    
    /**
     * 🎯 ULTRATHINK v8.0: 실제 필지 데이터로 정확한 렌더링 (클릭 사운드 제거)
     */
    async renderRealParcel(parcelData) {
        const pnu = Utils.generatePNU(parcelData.properties);
        
        // 이미 렌더링된 필지인지 확인
        if (this.parcels.has(pnu)) {
            Logger.info('MAP', '이미 렌더링된 필지', pnu);
            return this.parcels.get(pnu).polygon;
        }
        
        try {
            // 좌표 데이터 처리  
            const coordinates = this.processCoordinates(parcelData);
            if (!coordinates) throw new Error('좌표 처리 실패');
            
            // 현재 선택된 색상 (기본값 보장)
            const color = window.AppState?.currentColor || CONFIG.COLORS.red || '#FF0000';
            
            Logger.info('MAP', '🎨 폴리곤 생성 색상', { 
                color, 
                appStateColor: window.AppState?.currentColor,
                configColor: CONFIG.COLORS?.red 
            });
            
            // 네이버 지도 폴리곤 생성 (정확한 실제 좌표로) - 강화된 가시성
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
            
            // 부드러운 등장 효과 (펄스는 유지하되 사운드 제거)
            this.addPulseEffect(polygon);
            
            // 필지 정보 객체 생성 (기존 renderParcel과 동일한 구조)
            const parcelInfo = {
                pnu: pnu,
                data: parcelData,
                polygon: polygon,
                color: color,
                coordinates: coordinates,
                isTemp: false  // 실제 데이터
            };
            
            // 메모리에 저장
            this.parcels.set(pnu, parcelInfo);
            this.currentPolygons.push(polygon);
            
            // 🎯 핵심: 폴리곤 이벤트 리스너 등록 (색칠/삭제 기능)
            this.setupPolygonEvents(polygon, parcelInfo);
            
            // 전역 상태에도 저장
            if (window.AppState && window.AppState.parcels) {
                window.AppState.parcels.set(pnu, parcelInfo);
            }
            
            // 🎵 클릭 사운드 완전 제거 (사용자 요청)
            // this.playClickSound(); - 제거됨
            
            Logger.success('MAP', '🎯 실제 필지 렌더링 완료', pnu);
            
            return polygon;
            
        } catch (error) {
            Logger.error('MAP', '실제 필지 렌더링 실패', error);
            Utils.updateStatus('필지 렌더링 실패', 'error');
            throw error;
        }
    }
    
    /**
     * 🎯 필지 지번을 왼쪽 메모장에 자동 입력
     */
    fillParcelAddressToMemo(parcelData) {
        try {
            const jibun = Utils.formatJibun(parcelData.properties);
            const addr = parcelData.properties.addr || parcelData.properties.juso || '';
            
            // 왼쪽 메모장 지번 입력 필드 찾기
            const memoJibunField = document.getElementById('parcelNumber') || 
                                  document.querySelector('.memo-jibun') ||
                                  document.querySelector('#memo-jibun') ||
                                  document.querySelector('input[placeholder*="지번"]');
            
            if (memoJibunField) {
                memoJibunField.value = jibun;
                Logger.success('UI', '왼쪽 메모장에 지번 자동 입력 완료', jibun);
            } else {
                Logger.warn('UI', '왼쪽 메모장 지번 필드를 찾을 수 없음');
            }
            
            // 주소 필드도 있다면 추가로 입력
            const memoAddrField = document.querySelector('#memo-address') ||
                                 document.querySelector('.memo-address') ||
                                 document.querySelector('input[placeholder*="주소"]');
            
            if (memoAddrField && addr) {
                memoAddrField.value = addr;
                Logger.success('UI', '왼쪽 메모장에 주소 자동 입력 완료', addr);
            }
            
        } catch (error) {
            Logger.warn('UI', '메모장 자동 입력 실패', error);
        }
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
        Logger.info('MAP', '🎯 폴리곤 이벤트 리스너 등록', { pnu: parcelInfo.pnu });
        
        // 왼쪽 클릭 = 색칠 (8가지 색상 팔레트 활용)
        naver.maps.Event.addListener(polygon, 'click', (e) => {
            e.domEvent.stopPropagation(); // 지도 클릭 이벤트 방지
            
            const currentColor = window.AppState?.currentColor || CONFIG.COLORS.red || '#FF0000';
            
            Logger.action('PARCEL', '🎨 필지 왼쪽 클릭 - 색칠 시작', { 
                pnu: parcelInfo.pnu,
                color: currentColor,
                availableColors: Object.keys(CONFIG.COLORS || {})
            });
            
            this.paintParcel(parcelInfo, currentColor);
        });
        
        // 오른쪽 클릭 = 색칠 제거
        naver.maps.Event.addListener(polygon, 'rightclick', (e) => {
            e.domEvent.preventDefault(); // 컨텍스트 메뉴 방지
            e.domEvent.stopPropagation();
            
            Logger.action('PARCEL', '🗑️ 필지 오른쪽 클릭 - 색칠 제거', parcelInfo.pnu);
            this.clearParcelColor(parcelInfo);
        });
        
        Logger.success('MAP', '✅ 폴리곤 이벤트 리스너 등록 완료', parcelInfo.pnu);
    }
    
    /**
     * 필지 색칠 (8가지 색상 팔레트 지원 강화)
     */
    paintParcel(parcelInfo, color) {
        if (!parcelInfo || !parcelInfo.polygon) {
            Logger.error('PARCEL', '색칠 실패 - parcelInfo 또는 polygon 없음', parcelInfo);
            return;
        }
        
        Logger.info('PARCEL', '🎨 색칠 시작', { 
            pnu: parcelInfo.pnu,
            color,
            beforeColor: parcelInfo.color
        });
        
        // 폴리곤 색상 변경 (더 진하고 확실하게)
        parcelInfo.polygon.setOptions({
            fillColor: color,
            fillOpacity: 0.8,   // 불투명도 증가 (더 진하게)
            strokeColor: color,
            strokeOpacity: 1.0,
            strokeWeight: 4,    // 선 두께 증가
            zIndex: 200        // 색칠된 필지가 더 위에 보이도록
        });
        
        // 색상 정보 저장
        parcelInfo.color = color;
        this.parcels.set(parcelInfo.pnu, parcelInfo);
        
        // 전역 상태에도 저장
        if (window.AppState && window.AppState.parcels) {
            window.AppState.parcels.set(parcelInfo.pnu, parcelInfo);
        }
        
        // 색칠 효과 애니메이션 (펄스 효과)
        this.addColoringEffect(parcelInfo.polygon, color);
        
        Logger.success('PARCEL', '✅ 필지 색칠 완료', { 
            pnu: parcelInfo.pnu, 
            color,
            fillOpacity: 0.8,
            strokeWeight: 4
        });
        
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
     * 색칠 효과 애니메이션 (시각적 피드백 강화)
     */
    addColoringEffect(polygon, color) {
        let flashCount = 0;
        const maxFlashes = 2;
        
        const flash = () => {
            if (flashCount >= maxFlashes) return;
            
            // 밝게 깜빡임
            polygon.setOptions({
                fillOpacity: 0.9,
                strokeWeight: 5
            });
            
            // 0.2초 후 원래대로
            setTimeout(() => {
                polygon.setOptions({
                    fillOpacity: 0.8,
                    strokeWeight: 4
                });
                
                flashCount++;
                if (flashCount < maxFlashes) {
                    setTimeout(flash, 200);
                }
            }, 200);
        };
        
        flash();
    }
    
    /**
     * 필지 색칠 제거 (강화)
     */
    clearParcelColor(parcelInfo) {
        if (!parcelInfo || !parcelInfo.polygon) {
            Logger.error('PARCEL', '색칠 제거 실패 - parcelInfo 또는 polygon 없음', parcelInfo);
            return;
        }
        
        Logger.info('PARCEL', '🗑️ 색칠 제거 시작', { 
            pnu: parcelInfo.pnu,
            beforeColor: parcelInfo.color 
        });
        
        // 폴리곤을 투명하게 변경
        parcelInfo.polygon.setOptions({
            fillColor: 'transparent',
            fillOpacity: 0,
            strokeColor: '#999999',  // 회색 테두리
            strokeOpacity: 0.5,
            strokeWeight: 2,
            zIndex: 50              // 낮은 z-index
        });
        
        // 색상 정보 업데이트
        parcelInfo.color = 'transparent';
        this.parcels.set(parcelInfo.pnu, parcelInfo);
        
        // 전역 상태에도 업데이트
        if (window.AppState && window.AppState.parcels) {
            window.AppState.parcels.set(parcelInfo.pnu, parcelInfo);
        }
        
        Logger.success('PARCEL', '✅ 필지 색칠 제거 완료', parcelInfo.pnu);
        
        // 데이터 저장
        if (window.DataManager) {
            window.DataManager.saveParcel(parcelInfo).catch(error => {
                Logger.warn('PARCEL', '데이터 저장 실패', error);
            });
        }
    }
    
    /**
     * 🔍 ULTRATHINK v8.3: 좌표 데이터 처리 (완전 디버깅)
     */
    processCoordinates(parcelData) {
        try {
            Logger.info('MAP', '🗺️ 좌표 처리 시작', {
                hasGeometry: !!parcelData.geometry,
                hasCoordinates: !!parcelData.coordinates,
                dataSource: parcelData.properties?.source || 'unknown'
            });
            
            let coords = null;
            let coordinateSource = null;
            
            // VWorld 표준 형식 (MultiPolygon 구조 처리)
            if (parcelData.geometry && parcelData.geometry.coordinates) {
                if (parcelData.geometry.type === 'MultiPolygon') {
                    // MultiPolygon: coordinates[0][0]이 실제 좌표 배열
                    coords = parcelData.geometry.coordinates[0][0];
                    coordinateSource = 'VWorld MultiPolygon';
                } else if (parcelData.geometry.type === 'Polygon') {
                    // Polygon: coordinates[0]이 실제 좌표 배열
                    coords = parcelData.geometry.coordinates[0];
                    coordinateSource = 'VWorld Polygon';
                } else {
                    // 기존 방식 (호환성)
                    coords = parcelData.geometry.coordinates[0];
                    coordinateSource = 'VWorld Standard';
                }
                Logger.info('MAP', '📍 VWorld 좌표 사용', { 
                    type: parcelData.geometry.type,
                    source: coordinateSource,
                    count: coords?.length 
                });
            }
            // 샘플 데이터 형식
            else if (parcelData.coordinates) {
                coords = parcelData.coordinates;
                coordinateSource = 'Sample Data';
                Logger.info('MAP', '📍 샘플 데이터 좌표 사용', { count: coords?.length });
            }
            
            if (!coords || coords.length < 3) {
                throw new Error('유효하지 않은 좌표 배열');
            }
            
            // 좌표 변환 및 검증
            const naverCoords = coords.map((coord, index) => {
                const lng = parseFloat(coord[0]);
                const lat = parseFloat(coord[1]); 
                
                // 한국 좌표계 범위 검증 (대략적)
                if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
                    Logger.warn('MAP', '🚨 의심스러운 좌표', { index, lat, lng });
                }
                
                return new naver.maps.LatLng(lat, lng);
            });
            
            // 폴리곤 중심점 계산
            const centerLat = naverCoords.reduce((sum, coord) => sum + coord.lat(), 0) / naverCoords.length;
            const centerLng = naverCoords.reduce((sum, coord) => sum + coord.lng(), 0) / naverCoords.length;
            
            // 현재 지도 중심과 비교
            const mapCenter = this.map.getCenter();
            const distance = Math.sqrt(
                Math.pow(centerLat - mapCenter.lat(), 2) + 
                Math.pow(centerLng - mapCenter.lng(), 2)
            );
            
            Logger.success('MAP', '✅ 좌표 처리 완료', {
                source: coordinateSource,
                count: naverCoords.length,
                polygonCenter: { lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) },
                mapCenter: { lat: mapCenter.lat().toFixed(6), lng: mapCenter.lng().toFixed(6) },
                distance: distance.toFixed(6),
                isVisible: distance < 0.1 ? '✅ 보임' : '⚠️ 멀어서 안보일 수 있음'
            });
            
            return naverCoords;
            
        } catch (error) {
            Logger.error('MAP', '🚨 좌표 처리 완전 실패', {
                error: error.message,
                hasGeometry: !!parcelData.geometry,
                hasCoordinates: !!parcelData.coordinates,
                properties: Object.keys(parcelData.properties || {})
            });
            
            // 현재 지도 중심 기준 작은 사각형 생성
            const center = this.map.getCenter();
            const offset = 0.001; // 약 100m
            
            const fallbackCoords = [
                new naver.maps.LatLng(center.lat() - offset, center.lng() - offset),
                new naver.maps.LatLng(center.lat() - offset, center.lng() + offset),
                new naver.maps.LatLng(center.lat() + offset, center.lng() + offset),
                new naver.maps.LatLng(center.lat() + offset, center.lng() - offset)
            ];
            
            Logger.warn('MAP', '🔄 fallback 좌표 생성', {
                center: { lat: center.lat(), lng: center.lng() },
                offset: offset
            });
            
            return fallbackCoords;
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
    
    /**
     * 🎨 펄스 효과 애니메이션 (즉시 피드백)
     */
    addPulseEffect(polygon) {
        let pulseCount = 0;
        const maxPulses = 2;
        
        const pulse = () => {
            if (pulseCount >= maxPulses) return;
            
            // 크기 확대
            polygon.setOptions({
                strokeWeight: 4,
                fillOpacity: 0.8
            });
            
            // 0.3초 후 원래 크기로
            setTimeout(() => {
                polygon.setOptions({
                    strokeWeight: 2,
                    fillOpacity: 0.6
                });
                
                pulseCount++;
                if (pulseCount < maxPulses) {
                    setTimeout(pulse, 200);
                }
            }, 300);
        };
        
        pulse();
    }
    
    /**
     * 🎵 클릭 피드백 사운드 (사용자 요청으로 완전 비활성화)
     */
    playClickSound() {
        // 사용자 요청: "클릭 했을 때 소리도 안났으면 좋겠어"
        // 완전히 비활성화됨
        return;
    }
    
    
    
    /**
     * 🗄️ Smart Cache에서 근처 데이터 찾기
     */
    async findCachedNearbyData(lat, lng) {
        try {
            const cached = await window.SmartCache.get(lat, lng);
            if (cached) {
                Logger.success('MAP', '🌍 캐시에서 근처 데이터 발견', { lat, lng });
                
                // 캐시된 데이터를 VWorld 형식으로 변환
                if (cached.features) {
                    return cached.features[0]; // 첫 번째 피처 반환
                } else if (cached.response?.result?.featureCollection?.features) {
                    return cached.response.result.featureCollection.features[0];
                }
            }
            return null;
            
        } catch (error) {
            Logger.warn('MAP', '캐시 조회 실패', error);
            return null;
        }
    }
    
    /**
     * 🏁 Multi-API Racing System - 여러 API 동시 호출
     */
    async fetchParcelInfoWithRacing(lat, lng) {
        try {
            const result = await window.APIRacingSystem.raceForParcelData(lat, lng, 8000);
            
            // VWorld 표준 형식으로 변환
            if (result.features) {
                return result.features;
            } else if (result.response?.result?.featureCollection?.features) {
                return result.response.result.featureCollection.features;
            } else {
                Logger.warn('MAP', '예상치 못한 API 응답 형식', result);
                return [];
            }
            
        } catch (error) {
            Logger.error('MAP', 'Racing System 완전 실패', error);
            // 더미 데이터 생성 금지 - 실제 에러 발생
            throw new Error(`API Racing System 실패: ${error.message}`);
        }
    }
}

// 전역 인스턴스 생성
window.MapEngine = new MapEngine();

Logger.info('MAP', 'MapEngine 초기화 완료');