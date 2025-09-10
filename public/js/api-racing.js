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
                enabled: true, // 🚀 테스트 확인된 백업 활성화
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
     * 🏁 메인 Racing 함수
     */
    async raceForParcelData(lat, lng, maxWaitTime = 5000) {
        const geomFilter = `POINT(${lng} ${lat})`;
        const cacheKey = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
        
        // 🚀 중복 요청 방지 - 이미 진행 중인 요청이 있으면 기다리기
        if (this.pendingRequests.has(cacheKey)) {
            Logger.info('RACE', '⏳ 진행 중인 요청 대기', { lat, lng });
            return await this.pendingRequests.get(cacheKey);
        }
        
        Logger.info('RACE', '🏁 Multi-API Racing 시작', { lat, lng });
        this.stats.totalCalls++;
        
        const enabledAPIs = this.apiEndpoints
            .filter(api => api.enabled)
            .sort((a, b) => a.priority - b.priority);
        
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
                    Logger.warn('RACE', `❌ ${apiName} 실패: ${error}`);
                }
            });
            
            // 우선순위에 따라 정렬
            successfulResults.sort((a, b) => {
                const priorityA = this.apiEndpoints.find(api => api.name === a.apiName)?.priority || 99;
                const priorityB = this.apiEndpoints.find(api => api.name === b.apiName)?.priority || 99;
                return priorityA !== priorityB ? priorityA - priorityB : a.responseTime - b.responseTime;
            });
            
            if (successfulResults.length === 0) {
                Logger.error('RACE', '🚫 모든 API 실패', { 
                    failures: failedResults,
                    totalAttempted: enabledAPIs.length 
                });
                throw new Error(`모든 API 실패 (${failedResults.length}개 시도)`);
            }
            
            const winner = successfulResults[0];
            Logger.success('RACE', `🏆 승자: ${winner.apiName}`, {
                time: winner.responseTime,
                features: winner.data?.features?.length || winner.data?.response?.result?.featureCollection?.features?.length || 0,
                totalAPIs: enabledAPIs.length,
                successfulAPIs: successfulResults.length,
                failedAPIs: failedResults.length
            });
            
            // Smart Cache에 저장
            await this.saveToSmartCache(geomFilter, winner.data, winner.apiName);
            
            // 🎯 Status Monitor에 결과 전달
            if (window.StatusMonitor) {
                window.StatusMonitor.recordRaceResult(winner.apiName, winner.responseTime, this.getStats());
            }
            
            return winner.data;
            
        } catch (error) {
            Logger.error('RACE', '🚫 Racing System 완전 실패', {
                error: error.message,
                enabledAPIs: enabledAPIs.map(api => api.name)
            });
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
            size: '1',
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
     * 🌐 VWorld Direct 클라이언트 호출 (ECONNRESET 우회)
     */
    async callVWorldDirect(geomFilter) {
        try {
            // 테스트로 확인된 작동하는 API 키들
            const workingKeys = [
                'BBAC532E-A56D-34CF-B520-CE68E8D6D52A',
                '6B854F88-4A5D-303C-B7C8-40858117A95E',
                '12A51C12-8690-3559-9C2B-9F705D0D8AF3'
            ];
            
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
                        Logger.success('DIRECT', `직접 호출 성공: ${apiKey.substring(0, 8)}`);
                        return data;
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
     * 🗺️ Backup Nominatim 호출 (테스트 확인됨)
     */
    async callBackupNominatim(geomFilter) {
        try {
            // 좌표 추출
            const match = geomFilter.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
            if (!match) throw new Error('좌표 파싱 실패');
            
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            
            if (isNaN(lng) || isNaN(lat)) throw new Error('유효하지 않은 좌표');
            
            Logger.info('NOMINATIM', 'Nominatim API 호출 시작', { lat, lng });
            
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': 'NAVER Maps Field Management Program'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Nominatim API 실패: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.address) {
                Logger.success('NOMINATIM', 'Nominatim 백업 성공');
                return this.convertNominatimToVWorldFormat(data, lat, lng);
            } else {
                throw new Error('Nominatim 데이터 없음');
            }
            
        } catch (error) {
            Logger.error('NOMINATIM', 'Nominatim 백업 실패', error);
            throw error;
        }
    }
    
    /**
     * 🗺️ Nominatim → VWorld 형식 변환 (테스트 확인됨)
     */
    convertNominatimToVWorldFormat(nominatimData, lat, lng) {
        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        
        if (isNaN(numLat) || isNaN(numLng)) {
            throw new Error('유효하지 않은 좌표값');
        }
        
        Logger.info('NOMINATIM', '🏠 Nominatim → VWorld 변환 시작', {
            clickedPoint: { lat: numLat, lng: numLng },
            address: nominatimData.display_name
        });
        
        const address = nominatimData.address || {};
        const displayName = nominatimData.display_name || '';
        
        // 한국 주소 체계에 맞는 지번 생성
        const dong = address.quarter || address.suburb || address.neighbourhood || '';
        const roadName = address.road || '';
        const houseNumber = address.house_number || '';
        
        // 지번 형식으로 변환
        let jibun = '';
        if (dong && houseNumber) {
            jibun = `${dong} ${houseNumber}`;
        } else if (roadName && houseNumber) {
            jibun = `${roadName} ${houseNumber}`;
        } else if (displayName) {
            const parts = displayName.split(',');
            jibun = parts[0].trim();
        } else {
            jibun = `${numLat.toFixed(6)}, ${numLng.toFixed(6)}`;
        }
        
        // 실제 필지 크기 추정 (약 30m x 30m)
        const size = 0.0003;
        const coordinates = [[
            [numLng - size, numLat - size],
            [numLng + size, numLat - size], 
            [numLng + size, numLat + size],
            [numLng - size, numLat + size],
            [numLng - size, numLat - size]
        ]];
        
        const feature = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: coordinates
            },
            properties: {
                PNU: `NOMINATIM_${nominatimData.place_id || Date.now()}`,
                jibun: jibun,
                addr: displayName,
                backup: true,
                source: 'Nominatim',
                // VWorld 호환 속성
                sggnm: address.borough || address.county || '',
                ldong: dong,
                lnbrMnnm: houseNumber
            }
        };
        
        Logger.success('NOMINATIM', '✅ Nominatim → VWorld 변환 완료', {
            jibun: jibun,
            clickPoint: { lat: numLat, lng: numLng }
        });
        
        return { 
            response: { status: 'OK' },
            features: [feature] 
        };
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