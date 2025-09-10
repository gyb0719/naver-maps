/**
 * 🎯 ULTRATHINK: 간단한 데이터 관리자 v2.0
 * Supabase 저장/로드만 처리 (복잡한 실시간 동기화 제거)
 */

class DataManager {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.initSupabase();
    }
    
    /**
     * 🎯 ULTRATHINK: 안전한 Supabase 초기화 (오류 방어)
     */
    async initSupabase() {
        try {
            // Supabase 라이브러리 로드 확인
            if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                throw new Error('Supabase 라이브러리가 로드되지 않았습니다');
            }

            // Supabase 설정 확인
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                throw new Error('Supabase 설정이 누락되었습니다');
            }

            // Supabase 클라이언트 생성
            this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            
            // 연결 테스트
            await this.testConnection();
            this.isConnected = true;
            
            console.log('[DATA] ✅ Supabase 연결 성공');
        } catch (error) {
            console.warn('[DATA] ⚠️ Supabase 초기화 실패:', error.message);
            console.warn('[DATA] 📝 로컬 저장소 모드로 동작합니다');
            
            this.supabase = null;
            this.isConnected = false;
            
            // 오류가 있어도 앱이 중단되지 않도록 처리
            // Utils.handleError 대신 경고만 표시
        }
    }
    
    /**
     * 연결 테스트
     */
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('parcels')
                .select('id')
                .limit(1);
            
            if (error) throw error;
            
            this.isConnected = true;
            Logger.info('DATA', '데이터베이스 연결 확인됨');
            
        } catch (error) {
            this.isConnected = false;
            Logger.warn('DATA', '데이터베이스 연결 실패 - 로컬 저장소만 사용', error);
        }
    }
    
    /**
     * 필지 데이터 저장 (Supabase + localStorage)
     */
    async saveParcel(parcelInfo) {
        if (!parcelInfo) return;
        
        const parcelData = {
            pnu: parcelInfo.pnu,
            parcel_number: Utils.formatJibun(parcelInfo.data.properties),
            address: parcelInfo.data.properties.address || '',
            color: parcelInfo.color,
            coordinates: JSON.stringify(parcelInfo.coordinates || []),
            area: parcelInfo.data.properties.area || null,
            land_type: parcelInfo.data.properties.landType || ''
        };
        
        // 로컬 저장소에 저장 (즉시)
        this.saveToLocalStorage(parcelData);
        
        // Supabase에 저장 (비동기)
        if (this.isConnected) {
            try {
                const { data, error } = await this.supabase
                    .from('parcels')
                    .upsert(parcelData, { onConflict: 'pnu' });
                
                if (error) throw error;
                
                Logger.info('DATA', '필지 데이터 Supabase 저장 완료', parcelInfo.pnu);
                
            } catch (error) {
                Logger.warn('DATA', 'Supabase 저장 실패 - 로컬만 저장됨', error);
            }
        }
    }
    
    /**
     * 메모 데이터 저장
     */
    async saveMemo(pnu, memoData) {
        if (!pnu) return;
        
        const memo = {
            pnu,
            title: memoData.title || '',
            content: memoData.content || '',
            price: parseFloat(memoData.price) || null,
            land_area: parseFloat(memoData.landArea) || null,
            building_area: parseFloat(memoData.buildingArea) || null,
            contact_person: memoData.contactPerson || '',
            contact_phone: memoData.contactPhone || '',
            notes: memoData.notes || ''
        };
        
        // 로컬 저장소에 저장
        this.saveMemoToLocalStorage(memo);
        
        // Supabase에 저장
        if (this.isConnected) {
            try {
                const { data, error } = await this.supabase
                    .from('memos')
                    .upsert(memo, { onConflict: 'pnu' });
                
                if (error) throw error;
                
                Logger.success('DATA', '메모 저장 완료', pnu);
                
            } catch (error) {
                Logger.warn('DATA', 'Supabase 메모 저장 실패', error);
            }
        }
    }
    
    /**
     * 저장된 필지 데이터 로드
     */
    async loadParcels() {
        Logger.timeStart('필지 데이터 로드');
        
        let parcels = [];
        
        // 먼저 Supabase에서 로드 시도
        if (this.isConnected) {
            try {
                const { data, error } = await this.supabase
                    .from('parcels')
                    .select('*')
                    .order('updated_at', { ascending: false });
                
                if (error) throw error;
                
                parcels = data || [];
                Logger.info('DATA', `Supabase에서 ${parcels.length}개 필지 로드됨`);
                
            } catch (error) {
                Logger.warn('DATA', 'Supabase 로드 실패 - 로컬 데이터 사용', error);
            }
        }
        
        // Supabase 실패 시 localStorage에서 로드
        if (parcels.length === 0) {
            parcels = this.loadFromLocalStorage();
            Logger.info('DATA', `로컬 저장소에서 ${parcels.length}개 필지 로드됨`);
        }
        
        Logger.timeEnd('필지 데이터 로드');
        return parcels;
    }
    
    /**
     * 특정 필지의 메모 조회
     */
    async getMemo(pnu) {
        if (!pnu) return null;
        
        // 먼저 Supabase에서 조회
        if (this.isConnected) {
            try {
                const { data, error } = await this.supabase
                    .from('memos')
                    .select('*')
                    .eq('pnu', pnu)
                    .single();
                
                if (error && error.code !== 'PGRST116') throw error; // 데이터 없음은 정상
                
                if (data) {
                    Logger.info('DATA', '메모 조회 성공', pnu);
                    return data;
                }
                
            } catch (error) {
                Logger.warn('DATA', 'Supabase 메모 조회 실패', error);
            }
        }
        
        // 로컬 저장소에서 조회
        return this.getMemoFromLocalStorage(pnu);
    }
    
    /**
     * 필지 데이터 삭제
     */
    async deleteParcel(pnu) {
        if (!pnu) return;
        
        // 로컬 저장소에서 삭제
        this.deleteFromLocalStorage(pnu);
        
        // Supabase에서 삭제
        if (this.isConnected) {
            try {
                const { error } = await this.supabase
                    .from('parcels')
                    .delete()
                    .eq('pnu', pnu);
                
                if (error) throw error;
                
                Logger.success('DATA', '필지 삭제 완료', pnu);
                
            } catch (error) {
                Logger.warn('DATA', 'Supabase 삭제 실패', error);
            }
        }
    }
    
    // === 로컬 저장소 관리 ===
    
    saveToLocalStorage(parcelData) {
        try {
            const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
            const index = stored.findIndex(item => item.pnu === parcelData.pnu);
            
            if (index >= 0) {
                stored[index] = parcelData;
            } else {
                stored.push(parcelData);
            }
            
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stored));
            Logger.info('DATA', '로컬 저장 완료', parcelData.pnu);
            
        } catch (error) {
            Logger.error('DATA', '로컬 저장 실패', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        } catch (error) {
            Logger.error('DATA', '로컬 로드 실패', error);
            return [];
        }
    }
    
    saveMemoToLocalStorage(memo) {
        try {
            const memoKey = CONFIG.STORAGE_KEY + '_memos';
            const stored = JSON.parse(localStorage.getItem(memoKey) || '[]');
            const index = stored.findIndex(item => item.pnu === memo.pnu);
            
            if (index >= 0) {
                stored[index] = memo;
            } else {
                stored.push(memo);
            }
            
            localStorage.setItem(memoKey, JSON.stringify(stored));
            
        } catch (error) {
            Logger.error('DATA', '로컬 메모 저장 실패', error);
        }
    }
    
    getMemoFromLocalStorage(pnu) {
        try {
            const memoKey = CONFIG.STORAGE_KEY + '_memos';
            const stored = JSON.parse(localStorage.getItem(memoKey) || '[]');
            return stored.find(item => item.pnu === pnu) || null;
        } catch (error) {
            Logger.error('DATA', '로컬 메모 조회 실패', error);
            return null;
        }
    }
    
    deleteFromLocalStorage(pnu) {
        try {
            // 필지 데이터 삭제
            const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
            const filtered = stored.filter(item => item.pnu !== pnu);
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(filtered));
            
            // 메모 데이터 삭제
            const memoKey = CONFIG.STORAGE_KEY + '_memos';
            const memoStored = JSON.parse(localStorage.getItem(memoKey) || '[]');
            const memoFiltered = memoStored.filter(item => item.pnu !== pnu);
            localStorage.setItem(memoKey, JSON.stringify(memoFiltered));
            
        } catch (error) {
            Logger.error('DATA', '로컬 삭제 실패', error);
        }
    }
}

// 전역 인스턴스 생성
window.DataManager = new DataManager();

Logger.info('DATA', 'DataManager 초기화 완료');