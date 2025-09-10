/**
 * 🎯 ULTRATHINK v3.0: Smart Caching System
 * 지능형 캐싱으로 오프라인에서도 작동하는 Never Fail 시스템
 */

class SmartCache {
    constructor() {
        this.CACHE_VERSION = 'v3.0';
        this.MAX_CACHE_SIZE = 1000;
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간
        this.NEARBY_RADIUS = 0.001; // 약 100미터
        
        this.memoryCache = new Map();
        this.initializeStorage();
        
        this.stats = {
            hits: 0,
            misses: 0,
            saves: 0,
            nearbyHits: 0
        };
    }
    
    async initializeStorage() {
        try {
            // IndexedDB 지원 확인
            if ('indexedDB' in window) {
                await this.initIndexedDB();
            } else {
                Logger.warn('CACHE', 'IndexedDB 미지원 - localStorage 사용');
            }
        } catch (error) {
            Logger.warn('CACHE', 'IndexedDB 초기화 실패 - localStorage 폴백', error);
        }
        
        Logger.info('CACHE', 'Smart Cache 초기화 완료');
    }
    
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ParcelCache', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Parcels 테이블
                if (!db.objectStoreNames.contains('parcels')) {
                    const store = db.createObjectStore('parcels', { keyPath: 'key' });
                    store.createIndex('location', ['lat', 'lng'], { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    /**
     * 🔍 캐시에서 필지 데이터 조회
     */
    async get(lat, lng) {
        const key = this.generateKey(lat, lng);
        
        // 1. 메모리 캐시 먼저 확인
        const memoryData = this.memoryCache.get(key);
        if (memoryData && this.isValidCache(memoryData)) {
            this.stats.hits++;
            Logger.success('CACHE', '💨 메모리 캐시 히트', key);
            return memoryData.data;
        }
        
        // 2. IndexedDB/localStorage 확인
        const storedData = await this.getFromStorage(key);
        if (storedData && this.isValidCache(storedData)) {
            // 메모리 캐시에도 저장
            this.memoryCache.set(key, storedData);
            this.stats.hits++;
            Logger.success('CACHE', '📁 영구 캐시 히트', key);
            return storedData.data;
        }
        
        // 3. 주변 지역 데이터 검색
        const nearbyData = await this.findNearbyData(lat, lng);
        if (nearbyData) {
            this.stats.nearbyHits++;
            Logger.success('CACHE', '🌍 주변 캐시 히트', { key, distance: nearbyData.distance });
            return nearbyData.data;
        }
        
        this.stats.misses++;
        Logger.info('CACHE', '❌ 캐시 미스', key);
        return null;
    }
    
    /**
     * 💾 캐시에 필지 데이터 저장
     */
    async set(lat, lng, data, source = 'unknown') {
        const key = this.generateKey(lat, lng);
        const cacheData = {
            key,
            data,
            lat,
            lng,
            source,
            timestamp: Date.now(),
            version: this.CACHE_VERSION
        };
        
        // 메모리 캐시 저장
        this.memoryCache.set(key, cacheData);
        
        // 영구 저장소 저장
        await this.saveToStorage(cacheData);
        
        this.stats.saves++;
        Logger.success('CACHE', '💾 캐시 저장 완료', { key, source });
        
        // 캐시 크기 관리
        this.cleanupCache();
    }
    
    /**
     * 🌍 주변 지역 데이터 검색
     */
    async findNearbyData(lat, lng) {
        const candidates = [];
        
        // 메모리 캐시에서 주변 검색
        for (const [key, data] of this.memoryCache.entries()) {
            if (this.isValidCache(data)) {
                const distance = this.calculateDistance(lat, lng, data.lat, data.lng);
                if (distance <= this.NEARBY_RADIUS) {
                    candidates.push({ data: data.data, distance });
                }
            }
        }
        
        // IndexedDB에서도 검색 (시간이 오래 걸리므로 제한적으로)
        if (this.db && candidates.length === 0) {
            const nearbyFromDB = await this.findNearbyFromDB(lat, lng);
            candidates.push(...nearbyFromDB);
        }
        
        // 가장 가까운 데이터 반환
        if (candidates.length > 0) {
            return candidates.sort((a, b) => a.distance - b.distance)[0];
        }
        
        return null;
    }
    
    /**
     * 📍 두 좌표 간 거리 계산 (단순화)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const dLat = lat1 - lat2;
        const dLng = lng1 - lng2;
        return Math.sqrt(dLat * dLat + dLng * dLng);
    }
    
    /**
     * 🔑 캐시 키 생성
     */
    generateKey(lat, lng) {
        // 정밀도를 제한하여 유사한 위치를 같은 키로 매핑
        const precision = 100000; // 약 10미터 정밀도
        const roundedLat = Math.round(lat * precision) / precision;
        const roundedLng = Math.round(lng * precision) / precision;
        return `${roundedLat}_${roundedLng}`;
    }
    
    /**
     * ✅ 캐시 유효성 검사
     */
    isValidCache(cacheData) {
        if (!cacheData) return false;
        if (cacheData.version !== this.CACHE_VERSION) return false;
        if (Date.now() - cacheData.timestamp > this.CACHE_DURATION) return false;
        return true;
    }
    
    /**
     * 💽 저장소에서 데이터 조회
     */
    async getFromStorage(key) {
        try {
            if (this.db) {
                return await this.getFromIndexedDB(key);
            } else {
                return this.getFromLocalStorage(key);
            }
        } catch (error) {
            Logger.warn('CACHE', '저장소 조회 실패', error);
            return null;
        }
    }
    
    /**
     * 💽 저장소에 데이터 저장
     */
    async saveToStorage(data) {
        try {
            if (this.db) {
                await this.saveToIndexedDB(data);
            } else {
                this.saveToLocalStorage(data);
            }
        } catch (error) {
            Logger.warn('CACHE', '저장소 저장 실패', error);
        }
    }
    
    /**
     * IndexedDB 조회
     */
    async getFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['parcels'], 'readonly');
            const store = transaction.objectStore('parcels');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * IndexedDB 저장
     */
    async saveToIndexedDB(data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['parcels'], 'readwrite');
            const store = transaction.objectStore('parcels');
            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * IndexedDB에서 주변 데이터 검색
     */
    async findNearbyFromDB(lat, lng) {
        return new Promise((resolve) => {
            const candidates = [];
            const transaction = this.db.transaction(['parcels'], 'readonly');
            const store = transaction.objectStore('parcels');
            const cursor = store.openCursor();
            
            cursor.onsuccess = (event) => {
                const result = event.target.result;
                if (result) {
                    const data = result.value;
                    if (this.isValidCache(data)) {
                        const distance = this.calculateDistance(lat, lng, data.lat, data.lng);
                        if (distance <= this.NEARBY_RADIUS) {
                            candidates.push({ data: data.data, distance });
                        }
                    }
                    result.continue();
                } else {
                    resolve(candidates);
                }
            };
            
            cursor.onerror = () => resolve([]);
        });
    }
    
    /**
     * localStorage 조회
     */
    getFromLocalStorage(key) {
        try {
            const stored = localStorage.getItem(`parcel_cache_${key}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * localStorage 저장
     */
    saveToLocalStorage(data) {
        try {
            localStorage.setItem(`parcel_cache_${data.key}`, JSON.stringify(data));
        } catch (error) {
            // 저장소 가득 참 - 오래된 데이터 정리
            this.cleanupLocalStorage();
            try {
                localStorage.setItem(`parcel_cache_${data.key}`, JSON.stringify(data));
            } catch (retryError) {
                Logger.warn('CACHE', 'localStorage 저장 최종 실패', retryError);
            }
        }
    }
    
    /**
     * 🧹 캐시 정리
     */
    cleanupCache() {
        // 메모리 캐시 크기 제한
        if (this.memoryCache.size > this.MAX_CACHE_SIZE) {
            const entries = Array.from(this.memoryCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // 가장 오래된 항목들 삭제
            const toDelete = entries.slice(0, this.MAX_CACHE_SIZE * 0.2);
            toDelete.forEach(([key]) => this.memoryCache.delete(key));
            
            Logger.info('CACHE', `메모리 캐시 정리: ${toDelete.length}개 항목 삭제`);
        }
    }
    
    /**
     * localStorage 정리
     */
    cleanupLocalStorage() {
        try {
            const keysToCheck = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('parcel_cache_')) {
                    keysToCheck.push(key);
                }
            }
            
            // 오래된 캐시부터 삭제
            keysToCheck.forEach(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (!this.isValidCache(data)) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            Logger.warn('CACHE', 'localStorage 정리 실패', error);
        }
    }
    
    /**
     * 📊 캐시 통계 조회
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) : '0';
        
        return {
            hitRate: `${hitRate}%`,
            hits: this.stats.hits,
            misses: this.stats.misses,
            nearbyHits: this.stats.nearbyHits,
            saves: this.stats.saves,
            memoryCacheSize: this.memoryCache.size,
            totalRequests: total
        };
    }
    
    /**
     * 🗑️ 캐시 완전 초기화 (개발자 도구용)
     */
    async clear() {
        this.memoryCache.clear();
        
        // IndexedDB 정리
        if (this.db) {
            const transaction = this.db.transaction(['parcels'], 'readwrite');
            const store = transaction.objectStore('parcels');
            store.clear();
        }
        
        // localStorage 정리
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('parcel_cache_')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
        
        // 통계 리셋
        this.stats = { hits: 0, misses: 0, saves: 0, nearbyHits: 0 };
        
        Logger.info('CACHE', '캐시 완전 초기화 완료');
    }
}

// 전역 인스턴스 생성
window.SmartCache = new SmartCache();

Logger.info('CACHE', 'Smart Caching System 초기화 완료');