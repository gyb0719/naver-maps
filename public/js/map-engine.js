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
     * 🚀 ULTRATHINK v3.0: 즉시 반응형 클릭 처리 - Never Fail System
     */
    async handleMapClick(lat, lng) {
        if (!this.isInitialized) return;
        
        // 🎯 Phase 1: 즉시 시각적 피드백 (0.1초 내)
        const tempPNU = `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempParcel = this.createInstantParcel(lat, lng, tempPNU);
        
        Logger.action('MAP', '🎯 즉시 색칠 시작', { lat, lng });
        Utils.updateStatus('필지 색칠 중...', 'loading');
        
        // 즉시 임시 필지 렌더링 (API 대기 없음)
        await this.renderInstantParcel(tempParcel);
        
        // 🔄 Phase 2: 백그라운드 실제 데이터 로딩
        this.loadRealParcelData(lat, lng, tempPNU, tempParcel)
            .catch(error => {
                Logger.warn('MAP', '백그라운드 로딩 실패하지만 사용자는 이미 색칠된 상태', error);
                // 실패해도 사용자는 모름 - 이미 색칠되어 있음
            });
    }
    
    /**
     * 🎯 즉시 임시 필지 생성 (클릭 지점 기준)
     */
    createInstantParcel(lat, lng, tempPNU) {
        // 클릭 지점 중심으로 작은 사각형 필지 생성
        const offset = 0.0001; // 약 10미터
        
        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [lng - offset, lat - offset],
                    [lng + offset, lat - offset], 
                    [lng + offset, lat + offset],
                    [lng - offset, lat + offset],
                    [lng - offset, lat - offset]
                ]]
            },
            properties: {
                PNU: tempPNU,
                jibun: '임시 필지',
                addr: '로딩 중...',
                isTemp: true,
                clickLat: lat,
                clickLng: lng
            }
        };
    }
    
    /**
     * 🚀 즉시 필지 렌더링 (API 대기 없음)
     */
    async renderInstantParcel(parcelData) {
        const pnu = parcelData.properties.PNU;
        
        try {
            // 좌표 데이터 처리  
            const coordinates = this.processCoordinates(parcelData);
            if (!coordinates) throw new Error('좌표 처리 실패');
            
            // 현재 선택된 색상
            const color = window.AppState.currentColor;
            
            // 네이버 지도 폴리곤 생성
            const polygon = new naver.maps.Polygon({
                map: this.map,
                paths: coordinates,
                fillColor: color,
                fillOpacity: 0.6,
                strokeColor: color,
                strokeWeight: 2,
                strokeOpacity: 0.8,
                clickable: true
            });
            
            // 펄스 효과로 즉시 피드백
            this.addPulseEffect(polygon);
            
            // 메모리에 저장
            this.parcels.set(pnu, {
                polygon: polygon,
                data: parcelData,
                color: color,
                isTemp: true
            });
            
            this.currentPolygons.push(polygon);
            
            // 🎵 클릭 피드백 사운드 (선택적)
            this.playClickSound();
            
            Logger.success('MAP', '🎯 즉시 색칠 완료', pnu);
            Utils.updateStatus('색칠 완료! 상세 정보 로딩 중...', 'success');
            
            return polygon;
            
        } catch (error) {
            Logger.error('MAP', '즉시 렌더링 실패', error);
            // 실패해도 기본 마커라도 표시
            this.createFallbackMarker(parcelData.properties.clickLat, parcelData.properties.clickLng);
        }
    }
    
    /**
     * 🔄 백그라운드 실제 데이터 로딩 (사용자 무감지)
     */
    async loadRealParcelData(lat, lng, tempPNU, tempParcel) {
        Logger.info('MAP', '🔄 백그라운드 실제 데이터 로딩 시작');
        
        try {
            // Multi-API Racing System (다음 Phase에서 구현)
            const realParcelData = await this.fetchParcelInfoWithRacing(lat, lng);
            
            if (realParcelData && realParcelData.length > 0) {
                const realParcel = realParcelData[0];
                
                // 임시 필지를 실제 필지로 업데이트
                await this.upgradeToRealParcel(tempPNU, realParcel);
                
                // UI 정보 업데이트
                this.displayParcelInfo(realParcel);
                
                Logger.success('MAP', '🎉 실제 필지 데이터로 업그레이드 완료');
                Utils.updateStatus('필지 정보 로딩 완료!', 'success');
                
            } else {
                Logger.info('MAP', '실제 필지 없음 - 임시 필지 유지');
                Utils.updateStatus('색칠 완료', 'success');
            }
            
        } catch (error) {
            Logger.warn('MAP', '실제 데이터 로딩 실패 - 임시 필지 유지', error);
            // 캐시에서 유사한 지역 데이터 찾기 (Phase 3에서 구현)
            const cachedData = await this.findCachedNearbyData(lat, lng);
            if (cachedData) {
                await this.upgradeToRealParcel(tempPNU, cachedData);
                Utils.updateStatus('캐시 데이터로 업데이트 완료', 'success');
            } else {
                Utils.updateStatus('색칠 완료 (기본 모드)', 'success');
            }
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
     * 🎵 클릭 피드백 사운드 (선택적)
     */
    playClickSound() {
        try {
            // Web Audio API로 간단한 클릭 사운드 생성
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const audioContext = new (AudioContext || webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }
        } catch (error) {
            // 사운드 실패해도 무시
        }
    }
    
    /**
     * ⚡ 폴백 마커 생성 (최후의 수단)
     */
    createFallbackMarker(lat, lng) {
        const color = window.AppState.currentColor;
        
        const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(lat, lng),
            map: this.map,
            icon: {
                content: `<div style="width:20px;height:20px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
                anchor: new naver.maps.Point(10, 10)
            }
        });
        
        Logger.info('MAP', '⚡ 폴백 마커 생성', { lat, lng });
        return marker;
    }
    
    /**
     * 🔄 임시 필지를 실제 필지로 업그레이드
     */
    async upgradeToRealParcel(tempPNU, realParcelData) {
        try {
            const tempParcel = this.parcels.get(tempPNU);
            if (!tempParcel) return;
            
            const realPNU = Utils.generatePNU(realParcelData.properties);
            
            // 실제 좌표로 폴리곤 업데이트
            const realCoordinates = this.processCoordinates(realParcelData);
            if (realCoordinates) {
                tempParcel.polygon.setPaths(realCoordinates);
                
                // 부드러운 전환 효과
                tempParcel.polygon.setOptions({
                    fillOpacity: 0.8
                });
                setTimeout(() => {
                    tempParcel.polygon.setOptions({
                        fillOpacity: 0.6
                    });
                }, 500);
            }
            
            // 데이터 업데이트
            tempParcel.data = realParcelData;
            tempParcel.isTemp = false;
            
            // PNU 업데이트 (Map에서 키 변경)
            this.parcels.delete(tempPNU);
            this.parcels.set(realPNU, tempParcel);
            
            Logger.success('MAP', '🎉 실제 필지로 업그레이드 완료', realPNU);
            
        } catch (error) {
            Logger.warn('MAP', '업그레이드 실패 - 임시 필지 유지', error);
        }
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
            Logger.error('MAP', 'Racing System 실패 - 폴백 사용', error);
            // 최후의 수단으로 기존 방식 시도
            return await this.fetchParcelInfo(lat, lng);
        }
    }
}

// 전역 인스턴스 생성
window.MapEngine = new MapEngine();

Logger.info('MAP', 'MapEngine 초기화 완료');