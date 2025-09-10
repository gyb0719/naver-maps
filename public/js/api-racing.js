/**
 * 🏁 ULTRATHINK v3.0: Multi-API Racing System
 * 여러 API를 동시에 호출하여 가장 빠른 응답 사용
 */

class APIRacingSystem {
    constructor() {
        this.apiEndpoints = [
            {
                name: 'VWorld_Serverless',
                priority: 1,
                enabled: true,
                call: this.callVWorldServerless.bind(this)
            },
            {
                name: 'VWorld_Direct',
                priority: 2, 
                enabled: true,
                call: this.callVWorldDirect.bind(this)
            },
            {
                name: 'VWorld_Edge',
                priority: 3,
                enabled: false, // Phase 2에서 활성화 예정
                call: this.callVWorldEdge.bind(this)
            },
            {
                name: 'Backup_OSM',
                priority: 4,
                enabled: true,
                call: this.callBackupOSM.bind(this)
            },
            {
                name: 'Cache',
                priority: 0, // 최고 우선순위
                enabled: true,
                call: this.callCache.bind(this)
            }
        ];
        
        this.cache = new Map();
        this.stats = {
            totalCalls: 0,
            successRate: {},
            averageTime: {}
        };
    }
    
    /**
     * 🏁 메인 Racing 함수
     */
    async raceForParcelData(lat, lng, maxWaitTime = 10000) {
        const geomFilter = `POINT(${lng} ${lat})`;
        const cacheKey = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
        
        Logger.info('RACE', '🏁 Multi-API Racing 시작', { lat, lng });
        this.stats.totalCalls++;
        
        const enabledAPIs = this.apiEndpoints
            .filter(api => api.enabled)
            .sort((a, b) => a.priority - b.priority);
        
        // Promise.race로 동시 호출, 첫 번째 성공 응답 사용
        const racingPromises = enabledAPIs.map(api => 
            this.wrapAPICall(api, geomFilter, cacheKey)
        );
        
        try {
            const winner = await Promise.race([
                ...racingPromises,
                this.createTimeoutPromise(maxWaitTime)
            ]);
            
            if (winner.timeout) {
                Logger.warn('RACE', '⏰ 모든 API 타임아웃');
                return this.getFallbackData(lat, lng);
            }
            
            Logger.success('RACE', `🏆 승자: ${winner.apiName}`, {
                time: winner.responseTime,
                features: winner.data?.features?.length || 0
            });
            
            // 성공한 API 통계 업데이트
            this.updateStats(winner.apiName, winner.responseTime, true);
            
            // Smart Cache에 저장
            await this.saveToSmartCache(geomFilter, winner.data, winner.apiName);
            
            // 🎯 Status Monitor에 결과 전달
            if (window.StatusMonitor) {
                window.StatusMonitor.recordRaceResult(winner.apiName, winner.responseTime, this.getStats());
            }
            
            return winner.data;
            
        } catch (error) {
            Logger.error('RACE', '🚫 모든 API 실패', error);
            
            // 최후의 수단: 폴백 데이터 
            return this.getFallbackData(lat, lng);
        }
    }
    
    /**
     * 🎯 API 호출 래퍼 (에러 처리 + 타이밍)
     */
    async wrapAPICall(api, geomFilter, cacheKey) {
        const startTime = Date.now();
        
        try {
            Logger.info('RACE', `🚀 ${api.name} 호출 시작`);
            
            const data = await api.call(geomFilter, cacheKey);
            const responseTime = Date.now() - startTime;
            
            if (data && (data.features || data.response?.result)) {
                return {
                    apiName: api.name,
                    data: data,
                    responseTime: responseTime,
                    success: true
                };
            } else {
                throw new Error('유효하지 않은 데이터 형식');
            }
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            Logger.warn('RACE', `❌ ${api.name} 실패`, {
                error: error.message,
                time: responseTime
            });
            
            this.updateStats(api.name, responseTime, false);
            
            // 🎯 Status Monitor에 실패 전달
            if (window.StatusMonitor) {
                window.StatusMonitor.recordAPIFailure(api.name, error);
            }
            
            throw error;
        }
    }
    
    /**
     * 🗄️ Smart Cache 호출
     */
    async callCache(geomFilter, cacheKey) {
        // 좌표 추출
        const match = geomFilter.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
        if (!match) throw new Error('좌표 파싱 실패');
        
        const [lng, lat] = match.slice(1).map(Number);
        
        // SmartCache에서 조회
        const cached = await window.SmartCache.get(lat, lng);
        if (cached) {
            Logger.success('RACE', '💨 Smart Cache 히트', { lat, lng });
            return cached;
        }
        
        throw new Error('Smart Cache 미스');
    }
    
    /**
     * 🌐 VWorld Serverless 호출 (기존 방식)
     */
    async callVWorldServerless(geomFilter) {
        const params = new URLSearchParams({
            service: 'data',
            request: 'GetFeature', 
            data: 'LP_PA_CBND_BUBUN',
            key: CONFIG.VWORLD_API_KEYS[0],
            geometry: 'true',
            geomFilter: geomFilter,
            size: '10',
            format: 'json',
            crs: 'EPSG:4326'
        });
        
        const response = await fetch(`${CONFIG.VWORLD_PROXY_URL}?${params}`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * ⚡ VWorld Direct 호출 (클라이언트 직접)
     */
    async callVWorldDirect(geomFilter) {
        const params = new URLSearchParams({
            service: 'data',
            request: 'GetFeature',
            data: 'LP_PA_CBND_BUBUN', 
            key: CONFIG.VWORLD_API_KEYS[0],
            geometry: 'true',
            geomFilter: geomFilter,
            size: '10',
            format: 'json',
            crs: 'EPSG:4326'
        });
        
        // CORS 우회 시도
        const response = await fetch(`https://api.vworld.kr/req/data?${params}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`직접 호출 실패: HTTP ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * 🔧 VWorld Edge Functions (Phase 2 후반에 구현)
     */
    async callVWorldEdge(geomFilter) {
        throw new Error('Edge Functions 아직 구현되지 않음');
    }
    
    /**
     * 🔄 Backup OpenStreetMap 호출
     */
    async callBackupOSM(geomFilter) {
        // OpenStreetMap Overpass API로 기본적인 위치 정보 제공
        const [lng, lat] = geomFilter.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/)?.[1,2] || [];
        if (!lng || !lat) throw new Error('좌표 파싱 실패');
        
        const overpassQuery = `
            [out:json][timeout:5];
            (
                way["landuse"](around:50,${lat},${lng});
                way["building"](around:50,${lat},${lng});
                relation["type"="multipolygon"](around:50,${lat},${lng});
            );
            out geom;
        `;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: overpassQuery
        });
        
        if (!response.ok) throw new Error(`OSM API 실패: ${response.status}`);
        
        const osmData = await response.json();
        
        // OSM 데이터를 VWorld 형식으로 변환
        return this.convertOSMToVWorldFormat(osmData, lat, lng);
    }
    
    /**
     * 🔄 OSM → VWorld 형식 변환
     */
    convertOSMToVWorldFormat(osmData, lat, lng) {
        const features = [];
        
        if (osmData.elements && osmData.elements.length > 0) {
            osmData.elements.forEach((element, index) => {
                if (element.geometry && element.geometry.length > 3) {
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [element.geometry.map(coord => [coord.lon, coord.lat])]
                        },
                        properties: {
                            PNU: `OSM_${Date.now()}_${index}`,
                            jibun: `OSM 백업 필지 ${index + 1}`,
                            addr: `위도: ${lat.toFixed(6)}, 경도: ${lng.toFixed(6)}`,
                            backup: true,
                            source: 'OpenStreetMap'
                        }
                    });
                }
            });
        }
        
        // 데이터가 없으면 기본 사각형 생성
        if (features.length === 0) {
            const offset = 0.0001;
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Polygon', 
                    coordinates: [[
                        [parseFloat(lng) - offset, parseFloat(lat) - offset],
                        [parseFloat(lng) + offset, parseFloat(lat) - offset],
                        [parseFloat(lng) + offset, parseFloat(lat) + offset], 
                        [parseFloat(lng) - offset, parseFloat(lat) + offset],
                        [parseFloat(lng) - offset, parseFloat(lat) - offset]
                    ]]
                },
                properties: {
                    PNU: `FALLBACK_${Date.now()}`,
                    jibun: '백업 필지',
                    addr: `위도: ${lat.toFixed(6)}, 경도: ${lng.toFixed(6)}`,
                    backup: true,
                    source: 'Fallback'
                }
            });
        }
        
        return { features };
    }
    
    /**
     * ⏰ 타임아웃 Promise
     */
    createTimeoutPromise(ms) {
        return new Promise(resolve => {
            setTimeout(() => resolve({ timeout: true }), ms);
        });
    }
    
    /**
     * 📊 통계 업데이트
     */
    updateStats(apiName, responseTime, success) {
        if (!this.stats.successRate[apiName]) {
            this.stats.successRate[apiName] = { success: 0, total: 0 };
            this.stats.averageTime[apiName] = [];
        }
        
        this.stats.successRate[apiName].total++;
        if (success) {
            this.stats.successRate[apiName].success++;
            this.stats.averageTime[apiName].push(responseTime);
            
            // 최근 10회만 유지
            if (this.stats.averageTime[apiName].length > 10) {
                this.stats.averageTime[apiName].shift();
            }
        }
    }
    
    /**
     * 🗄️ Smart Cache 저장
     */
    async saveToSmartCache(geomFilter, data, source) {
        try {
            // 좌표 추출
            const match = geomFilter.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
            if (!match) return;
            
            const [lng, lat] = match.slice(1).map(Number);
            
            // SmartCache에 저장
            await window.SmartCache.set(lat, lng, data, source);
            
            Logger.success('RACE', '💾 Smart Cache 저장 완료', { lat, lng, source });
            
        } catch (error) {
            Logger.warn('RACE', 'Smart Cache 저장 실패', error);
        }
    }
    
    /**
     * 🆘 폴백 데이터 생성 (최후의 수단)
     */
    getFallbackData(lat, lng) {
        Logger.info('RACE', '🆘 폴백 데이터 생성', { lat, lng });
        
        const offset = 0.0001;
        return {
            features: [{
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
                    PNU: `FALLBACK_${Date.now()}`,
                    jibun: '기본 필지',
                    addr: `클릭 위치: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    fallback: true
                }
            }]
        };
    }
    
    /**
     * 📈 통계 정보 조회
     */
    getStats() {
        const stats = {};
        
        Object.keys(this.stats.successRate).forEach(api => {
            const success = this.stats.successRate[api].success;
            const total = this.stats.successRate[api].total;
            const avgTime = this.stats.averageTime[api].length > 0
                ? this.stats.averageTime[api].reduce((a, b) => a + b) / this.stats.averageTime[api].length
                : 0;
                
            stats[api] = {
                successRate: `${(success/total*100).toFixed(1)}%`,
                averageTime: `${avgTime.toFixed(0)}ms`,
                calls: total
            };
        });
        
        return stats;
    }
}

// 전역 인스턴스 생성
window.APIRacingSystem = new APIRacingSystem();

Logger.info('RACE', 'Multi-API Racing System 초기화 완료');