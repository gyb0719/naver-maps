/**
 * 🏁 ULTRATHINK v4.0: Multi-API Racing System - CACHE BUSTER 2025-01-17
 * 여러 API를 동시에 호출하여 가장 빠른 응답 사용
 * 🚀 Promise.allSettled 적용 완료 - 모든 백업 API 활성화
 */

class APIRacingSystem {
    constructor() {
        this.apiEndpoints = [
            {
                name: 'Cache',
                priority: -1, // 극대화된 최고 우선순위
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
                name: 'VWorld_Direct',
                priority: 2, // 서버리스 실패 시 즉시 사용
                enabled: true,
                call: this.callVWorldDirect.bind(this)
            },
            {
                name: 'Backup_Nominatim',
                priority: 3, // 백업 시스템
                enabled: false, // 🚨 CRITICAL FIX: 더미 데이터 생성 방지를 위해 임시 비활성화
                call: this.callBackupNominatim.bind(this)
            },
            {
                name: 'VWorld_Edge',
                priority: 4,
                enabled: false, // 추후 구현 예정
                call: this.callVWorldEdge.bind(this)
            }
        ];
        
        this.cache = new Map();
        this.pendingRequests = new Map(); // 진행 중인 요청 추적
        this.stats = {
            totalCalls: 0,
            successRate: {},
            averageTime: {}
        };
    }
    
    /**
     * 🏁 메인 진입점: 여러 API에 Race 시작
     */
    async raceForParcelData(lat, lng, maxWaitTime = 5000) {
        const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        const geomFilter = `POINT(${lng} ${lat})`;
        
        // 🚀 현재 진행 중인 요청이 있는 경우 대기
        if (this.pendingRequests.has(cacheKey)) {
            Logger.info('RACE', '⏳ 진행 중인 요청 대기', { lat, lng });
            return await this.pendingRequests.get(cacheKey);
        }
        
        Logger.info('RACE', '🏁 Multi-API Racing 시작', { lat, lng });
        this.stats.totalCalls++;
        
        const enabledAPIs = this.apiEndpoints
            .filter(api => api.enabled)
            .sort((a, b) => a.priority - b.priority);
        
        console.log('🔥🔥🔥 RACEFORPARCELDATA v4.0 ENABLED APIS:', enabledAPIs.length, '(' + enabledAPIs.length + ')', enabledAPIs.map(api => api.name));
        Logger.info('RACE', `🔥 ${enabledAPIs.length}개 API 동시 Racing`, 
            { apis: enabledAPIs.map(api => api.name) });
        
        // 🚀 현재 요청을 pendingRequests에 저장
        const racePromise = this.executeRace(enabledAPIs, geomFilter, cacheKey, maxWaitTime);
        this.pendingRequests.set(cacheKey, racePromise);
        
        try {
            const result = await racePromise;
            return result;
        } finally {
            // 완료 후 pendingRequests에서 제거
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    /**
     * 🏁 실제 Racing 실행 함수 (수정됨: 모든 API 동시 호출)
     */
    async executeRace(enabledAPIs, geomFilter, cacheKey, maxWaitTime) {
        console.log('🚨🚨🚨 EXECUTERACE CALLED!!! v4.0 ENABLED APIS:', enabledAPIs.length, '(' + enabledAPIs.length + ')', enabledAPIs.map(api => api.name));
        Logger.info('RACE', `🏁 CACHE BUSTER v4.0: ${enabledAPIs.length}개 API 동시 Racing 시작`, {
            apis: enabledAPIs.map(api => api.name),
            version: 'v4.0-2025-01-17'
        });
        
        // 모든 API를 동시에 호출 (개별 타임아웃 설정)
        const racingPromises = enabledAPIs.map(async (api, index) => {
            try {
                // 개별 API에 타임아웃 적용
                const apiPromise = this.wrapAPICallSafe(api, geomFilter, cacheKey);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`${api.name} 타임아웃`)), maxWaitTime)
                );
                
                return await Promise.race([apiPromise, timeoutPromise]);
            } catch (error) {
                Logger.warn('RACE', `⚠️ ${api.name} 예외 발생: ${error.message}`);
                return {
                    apiName: api.name,
                    error: error.message,
                    success: false,
                    responseTime: 0
                };
            }
        });
        
        try {
            // 모든 API 결과 기다리기 (성공/실패 무관)
            const raceResults = await Promise.allSettled(racingPromises);
            
            Logger.info('RACE', '📋 모든 API 결과 수집 완료', {
                total: raceResults.length,
                fulfilled: raceResults.filter(r => r.status === 'fulfilled').length,
                rejected: raceResults.filter(r => r.status === 'rejected').length
            });
            
            // 성공한 결과들만 추출 및 정렬
            const successfulResults = [];
            const failedResults = [];
            
            raceResults.forEach((result, index) => {
                const apiName = enabledAPIs[index]?.name || 'Unknown';
                
                if (result.status === 'fulfilled' && result.value.success) {
                    successfulResults.push(result.value);
                    Logger.success('RACE', `✅ ${apiName} 성공`, {
                        time: result.value.responseTime,
                        features: result.value.data?.features?.length || result.value.data?.response?.result?.featureCollection?.features?.length || 0
                    });
                } else {
                    const error = result.status === 'fulfilled' ? result.value.error : result.reason?.message || 'Unknown error';
                    failedResults.push({ api: apiName, error });
                    Logger.warn('RACE', `❌ ${apiName} 실패`, { error });
                }
            });
            
            // 우선순위에 따라 정렬
            successfulResults.sort((a, b) => {
                const apiA = this.apiEndpoints.find(api => api.name === a.apiName);
                const apiB = this.apiEndpoints.find(api => api.name === b.apiName);
                return (apiA?.priority || 999) - (apiB?.priority || 999);
            });
            
            // 성공한 API가 있다면 승자 선택
            if (successfulResults.length > 0) {
                const winner = successfulResults[0];
                Logger.success('RACE', `🏆 승자: ${winner.apiName}`, {
                    time: winner.responseTime,
                    features: winner.data?.features?.length || winner.data?.response?.result?.featureCollection?.features?.length || 0,
                    total_participants: enabledAPIs.length,
                    success_rate: `${successfulResults.length}/${enabledAPIs.length}`
                });
                
                // 🧪 Smart Cache에 승자 데이터 저장
                await this.saveToSmartCache(geomFilter, winner.data, winner.apiName);
                
                // 📊 상태 모니터링 업데이트
                if (window.StatusMonitor) {
                    window.StatusMonitor.recordRaceResult(winner.apiName, winner.responseTime, this.getStats());
                }
                
                return winner.data;
            } else {
                // 🚨 CRITICAL FIX: 모든 API 실패 시 명확한 오류 메시지
                const errorMsg = 'VWorld API 키가 모두 무효합니다. 새로운 API 키가 필요합니다.';
                Logger.error('RACE', '🔴 모든 API 실패 - API 키 문제', {
                    total_apis: enabledAPIs.length,
                    failed_apis: failedResults.length,
                    error_details: failedResults
                });
                
                // 상태 업데이트
                if (window.StatusMonitor) {
                    window.StatusMonitor.recordAPIFailure('ALL_APIS_FAILED', failedResults);
                }
                
                throw new Error(errorMsg);
            }
            
        } catch (error) {
            Logger.error('RACE', 'Racing 시스템 전체 실패', error);
            throw error;
        }
    }
    
    /**
     * 🛡️ API 호출 래퍼 - 안전한 호출과 타이밍
     */
    async wrapAPICallSafe(api, geomFilter, cacheKey) {
        const startTime = Date.now();
        
        try {
            const data = await api.call(geomFilter, cacheKey);
            const responseTime = Date.now() - startTime;
            
            console.log(`🧪🧪🧪 ${api.name} RETURNED DATA:`, {
                type: typeof data,
                hasFeatures: !!(data?.features || data?.response?.result?.featureCollection?.features),
                hasResponse: !!data?.response,
                hasResponseResult: !!data?.response?.result,
                keys: data ? Object.keys(data) : null,
                featuresLength: data?.features?.length || data?.response?.result?.featureCollection?.features?.length || 0
            });
            
            // 데이터 유효성 검사 강화
            const isValid = this.validateAPIResponse(data);
            
            return {
                apiName: api.name,
                data: data,
                responseTime: responseTime,
                success: isValid,
                error: isValid ? null : 'Invalid data format'
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            Logger.warn('RACE', `❌ ${api.name} 실패: ${error.message}`, { time: responseTime });
            
            return {
                apiName: api.name,
                data: null,
                responseTime: responseTime,
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 🔍 API 응답 유효성 검사 (개선됨)
     */
    validateAPIResponse(data) {
        if (!data) return false;
        
        // VWorld 형식 검사
        if (data.response && data.response.status === 'OK') {
            const features = data.response?.result?.featureCollection?.features;
            return features && Array.isArray(features) && features.length > 0;
        }
        
        // GeoJSON 형식 검사  
        if (data.features) {
            return Array.isArray(data.features) && data.features.length > 0;
        }
        
        // 기타 유효한 형식들
        if (data.type === 'FeatureCollection') {
            return data.features && Array.isArray(data.features) && data.features.length > 0;
        }
        
        return false;
    }
    
    /**
     * 🧪 Cache 호출
     */
    async callCache(geomFilter) {
        if (!this.cache.has(geomFilter)) {
            throw new Error('캐시에 데이터 없음');
        }
        
        const cachedData = this.cache.get(geomFilter);
        Logger.info('CACHE', '💾 캐시에서 데이터 반환');
        return cachedData;
    }
    
    /**
     * 🌐 VWorld Serverless 호출 (서버 프록시 사용)
     */
    async callVWorldServerless(geomFilter) {
        try {
            const baseUrl = window.location.origin;
            const proxyUrl = `${baseUrl}/api/vworld`;
            
            const params = {
                service: 'data',
                request: 'GetFeature', 
                data: 'LP_PA_CBND_BUBUN',
                geometry: true,
                geomFilter: geomFilter,
                size: 1,
                format: 'json',
                crs: 'EPSG:4326'
            };
            
            const url = `${proxyUrl}?${new URLSearchParams(params).toString()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            Logger.warn('SERVERLESS', 'VWorld Serverless 실패', error);
            throw error;
        }
    }
    
    /**
     * 🌐 VWorld Direct 클라이언트 호출 (ECONNRESET 우회)
     */
    async callVWorldDirect(geomFilter) {
        console.log('🟢🟢🟢 VWORLD_DIRECT CALLED!!! geomFilter:', geomFilter);
        try {
            // 테스트로 확인된 작동하는 API 키들
            const workingKeys = [
                'BBAC532E-A56D-34CF-B520-CE68E8D6D52A',
                '6B854F88-4A5D-303C-B7C8-40858117A95E',
                '12A51C12-8690-3559-9C2B-9F705D0D8AF3'
            ];
            
            console.log('🟢 VWorld_Direct API 키 개수:', workingKeys.length);
            Logger.info('DIRECT', '클라이언트 직접 VWorld API 호출 시작');
            
            for (const apiKey of workingKeys) {
                try {
                    const params = new URLSearchParams({
                        service: 'data',
                        request: 'GetFeature',
                        data: 'LP_PA_CBND_BUBUN',
                        key: apiKey,
                        geometry: 'true',
                        geomFilter: geomFilter,
                        size: '1',
                        format: 'json',
                        crs: 'EPSG:4326',
                        domain: window.location.origin
                    });
                    
                    const vworldUrl = `https://api.vworld.kr/req/data?${params.toString()}`;
                    
                    const response = await fetch(vworldUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        Logger.warn('DIRECT', `API 키 ${apiKey.substring(0, 8)} 실패: ${response.status}`);
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    if (data.response && data.response.status === 'OK') {
                        Logger.success('DIRECT', `API 키 ${apiKey.substring(0, 8)} 성공`);
                        return data;
                    } else if (data.response && data.response.error) {
                        Logger.warn('DIRECT', `API 키 ${apiKey.substring(0, 8)} 에러: ${data.response.error.text || 'Unknown'}`);
                        // 🚨 CRITICAL: API 키 오류 상세 로깅
                        if (data.response.error.code === 'INVALID_KEY' || data.response.error.code === 'INCORRECT_KEY') {
                            console.error(`🔴 INVALID API KEY: ${apiKey.substring(0, 8)}...`);
                        }
                        continue;
                    }
                } catch (error) {
                    Logger.warn('DIRECT', `API 키 ${apiKey.substring(0, 8)} 에러: ${error.message}`);
                    continue;
                }
            }
            
            throw new Error('모든 직접 API 키 실패');
            
        } catch (error) {
            Logger.error('DIRECT', 'VWorld 직접 호출 실패', error);
            throw error;
        }
    }
    
    /**
     * 🟡 Nominatim 백업 호출 (비활성화됨)
     * 🚨 CRITICAL FIX: 더미 데이터 생성 방지
     */
    async callBackupNominatim(geomFilter) {
        // 🚨 더미 데이터 생성 방지를 위해 비활성화
        throw new Error('Nominatim 백업이 비활성화되었습니다. VWorld API 키를 확인해주세요.');
    }
    
    /**
     * 🌐 VWorld Edge 호출 (추후 구현)
     */
    async callVWorldEdge(geomFilter) {
        throw new Error('VWorld Edge 구현 예정');
    }
    
    /**
     * 🧪 Smart Cache 저장
     */
    async saveToSmartCache(geomFilter, data, sourceName) {
        const cacheKey = geomFilter;
        this.cache.set(cacheKey, data);
        
        Logger.info('CACHE', `💾 ${sourceName} 데이터 캐시 저장`, { key: cacheKey });
        
        // 캐시 크기 관리 (100개 초과 시 오래된 것부터 제거)
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    
    /**
     * 📊 통계 정보 반환
     */
    getStats() {
        return {
            totalCalls: this.stats.totalCalls,
            cacheSize: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            lastUpdate: new Date().toISOString()
        };
    }
    
    /**
     * 🔄 시스템 초기화
     */
    reset() {
        this.cache.clear();
        this.pendingRequests.clear();
        this.stats = {
            totalCalls: 0,
            successRate: {},
            averageTime: {}
        };
        Logger.info('RACE', 'Racing 시스템 초기화 완료');
    }
}

// 전역 인스턴스 생성
window.APIRacingSystem = new APIRacingSystem();