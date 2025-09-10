/**
 * 🏁 ULTRATHINK v3.0: Multi-API Racing System
 * 여러 API를 동시에 호출하여 가장 빠른 응답 사용
 */

class APIRacingSystem {
    constructor() {
        this.apiEndpoints = [
            {
                name: 'Cache',
                priority: 0, // 최고 우선순위
                enabled: true,
                call: this.callCache.bind(this)
            },
            {
                name: 'VWorld_Serverless',
                priority: 1,
                enabled: true,
                call: this.callVWorldServerless.bind(this)
            },
            {
                name: 'VWorld_Edge',
                priority: 3,
                enabled: false, // 추후 구현 예정
                call: this.callVWorldEdge.bind(this)
            },
            {
                name: 'Backup_OSM',
                priority: 2, // 우선순위 상승
                enabled: true,
                call: this.callBackupOSM.bind(this)
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
        
        Logger.info('RACE', `🔥 ${enabledAPIs.length}개 API 동시 Racing`, 
            { apis: enabledAPIs.map(api => api.name) });
        
        // 모든 API를 동시에 호출 (실패해도 reject하지 않음)
        const racingPromises = enabledAPIs.map(api => 
            this.wrapAPICallSafe(api, geomFilter, cacheKey)
        );
        
        // 타임아웃과 함께 모든 결과 기다리기  
        const timeoutPromise = new Promise(resolve => 
            setTimeout(() => resolve({ timeout: true }), maxWaitTime)
        );
        
        try {
            const raceResult = await Promise.race([
                Promise.allSettled(racingPromises),
                timeoutPromise
            ]);
            
            if (raceResult.timeout) {
                Logger.warn('RACE', '⏰ 전체 타임아웃');
                throw new Error('모든 API가 타임아웃되었습니다');
            }
            
            // 성공한 결과들만 필터링
            const successfulResults = raceResult
                .filter(result => result.status === 'fulfilled' && result.value.success)
                .map(result => result.value)
                .sort((a, b) => {
                    // 우선순위가 낮을수록(숫자가 작을수록), 응답시간이 빠를수록 우선
                    const priorityDiff = (this.apiEndpoints.find(api => api.name === a.apiName)?.priority || 99) - 
                                        (this.apiEndpoints.find(api => api.name === b.apiName)?.priority || 99);
                    return priorityDiff !== 0 ? priorityDiff : a.responseTime - b.responseTime;
                });
            
            if (successfulResults.length === 0) {
                const failedResults = raceResult
                    .map((result, index) => ({
                        api: enabledAPIs[index]?.name || 'Unknown',
                        error: result.status === 'fulfilled' ? result.value.error : result.reason?.message || 'Unknown error'
                    }));
                
                Logger.error('RACE', '🚫 모든 API 실패', { failures: failedResults });
                throw new Error(`모든 API 실패 (${failedResults.length}개 시도)`);
            }
            
            const winner = successfulResults[0];
            Logger.success('RACE', `🏆 승자: ${winner.apiName}`, {
                time: winner.responseTime,
                features: winner.data?.features?.length || 0,
                totalAPIs: enabledAPIs.length,
                successfulAPIs: successfulResults.length
            });
            
            // Smart Cache에 저장
            await this.saveToSmartCache(geomFilter, winner.data, winner.apiName);
            
            // 🎯 Status Monitor에 결과 전달
            if (window.StatusMonitor) {
                window.StatusMonitor.recordRaceResult(winner.apiName, winner.responseTime, this.getStats());
            }
            
            return winner.data;
            
        } catch (error) {
            Logger.error('RACE', '🚫 Racing System 완전 실패', error);
            throw new Error(`API Racing 실패: ${error.message}`);
        }
    }
    
    /**
     * 🎯 API 호출 래퍼 (에러 처리 + 타이밍) - Safe 버전 (에러 throw 안함)
     */
    async wrapAPICallSafe(api, geomFilter, cacheKey) {
        const startTime = Date.now();
        
        try {
            Logger.info('RACE', `🚀 ${api.name} 호출 시작`);
            
            const data = await api.call(geomFilter, cacheKey);
            const responseTime = Date.now() - startTime;
            
            if (data && (data.features || data.response?.result)) {
                this.updateStats(api.name, responseTime, true);
                return {
                    apiName: api.name,
                    data: data,
                    responseTime: responseTime,
                    success: true
                };
            } else {
                this.updateStats(api.name, responseTime, false);
                return {
                    apiName: api.name,
                    error: '유효하지 않은 데이터 형식',
                    responseTime: responseTime,
                    success: false
                };
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
            
            return {
                apiName: api.name,
                error: error.message,
                responseTime: responseTime,
                success: false
            };
        }
    }
    
    /**
     * 🎯 기존 API 호출 래퍼 (호환성 유지)
     */
    async wrapAPICall(api, geomFilter, cacheKey) {
        const result = await this.wrapAPICallSafe(api, geomFilter, cacheKey);
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error);
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
     * 🔧 VWorld Edge Functions (Phase 2 후반에 구현)
     */
    async callVWorldEdge(geomFilter) {
        throw new Error('Edge Functions 아직 구현되지 않음');
    }
    
    /**
     * 🔄 Backup OpenStreetMap 호출 (안정화)
     */
    async callBackupOSM(geomFilter) {
        try {
            // 좌표 추출 및 숫자 변환
            const match = geomFilter.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
            if (!match) throw new Error('좌표 파싱 실패');
            
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            
            if (isNaN(lng) || isNaN(lat)) throw new Error('유효하지 않은 좌표');
            
            Logger.info('OSM', 'OSM API 호출', { lat, lng });
            
            // 간단한 OSM 쿼리 (타임아웃 단축)
            const overpassQuery = `
                [out:json][timeout:3];
                (
                    way["landuse"](around:30,${lat},${lng});
                    way["building"](around:30,${lat},${lng});
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
            
        } catch (error) {
            Logger.warn('OSM', 'OSM API 실패', error.message);
            // 더미 데이터 생성 금지 - 에러 발생
            throw error;
        }
    }
    
    /**
     * 🔄 OSM → VWorld 형식 변환
     */
    convertOSMToVWorldFormat(osmData, lat, lng) {
        // 좌표를 숫자로 안전하게 변환
        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        
        if (isNaN(numLat) || isNaN(numLng)) {
            throw new Error('유효하지 않은 좌표값');
        }
        
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
                            addr: `위도: ${numLat.toFixed(6)}, 경도: ${numLng.toFixed(6)}`,
                            backup: true,
                            source: 'OpenStreetMap'
                        }
                    });
                }
            });
        }
        
        // OSM 데이터가 없으면 에러 발생 (더미 데이터 생성 안함)
        if (features.length === 0) {
            throw new Error('OSM에서 데이터를 찾을 수 없음');
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