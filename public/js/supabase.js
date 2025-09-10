/**
 * 🎯 ULTRATHINK: Supabase 연동 모듈 v2.0
 * 필지 데이터와 메모를 Supabase에 저장/로드
 */

// Supabase 클라이언트 초기화
let supabase = null;

try {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    Logger.info('SUPABASE', 'Supabase 클라이언트 초기화 성공');
} catch (error) {
    Logger.error('SUPABASE', 'Supabase 클라이언트 초기화 실패', error);
}

// Supabase 데이터 관리 클래스
class SupabaseManager {
    constructor() {
        this.isConnected = false;
        this.testConnection();
    }
    
    /**
     * 연결 테스트
     */
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from('parcels')
                .select('id')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            this.isConnected = true;
            Logger.info('SUPABASE', '데이터베이스 연결 성공');
            Utils.updateStatus('데이터베이스 연결됨', 'success');
        } catch (error) {
            this.isConnected = false;
            Logger.error('SUPABASE', '데이터베이스 연결 실패', error);
            Utils.updateStatus('데이터베이스 연결 실패', 'error');
        }
    }
    
    /**
     * 필지 데이터 저장
     */
    async saveParcel(parcelData) {
        if (!this.isConnected) {
            throw new Error('데이터베이스 연결되지 않음');
        }
        
        try {
            const { data, error } = await supabase
                .from('parcels')
                .upsert({
                    pnu: parcelData.pnu,
                    parcel_number: parcelData.parcelNumber,
                    address: parcelData.address || '',
                    color: parcelData.color,
                    coordinates: parcelData.coordinates,
                    area: parcelData.area || null,
                    land_type: parcelData.landType || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'pnu'
                });
            
            if (error) {
                throw error;
            }
            
            Logger.info('SUPABASE', '필지 저장 성공', parcelData.pnu);
            return data;
        } catch (error) {
            Logger.error('SUPABASE', '필지 저장 실패', error);
            throw error;
        }
    }
    
    /**
     * 메모 데이터 저장
     */
    async saveMemo(memoData) {
        if (!this.isConnected) {
            throw new Error('데이터베이스 연결되지 않음');
        }
        
        try {
            const { data, error } = await supabase
                .from('memos')
                .upsert({
                    pnu: memoData.pnu,
                    title: memoData.title || '',
                    content: memoData.content || '',
                    price: memoData.price || null,
                    land_area: memoData.landArea || null,
                    building_area: memoData.buildingArea || null,
                    floor_area: memoData.floorArea || null,
                    building_coverage: memoData.buildingCoverage || null,
                    floor_area_ratio: memoData.floorAreaRatio || null,
                    land_use: memoData.landUse || '',
                    contact_person: memoData.contactPerson || '',
                    contact_phone: memoData.contactPhone || '',
                    notes: memoData.notes || '',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'pnu'
                });
            
            if (error) {
                throw error;
            }
            
            Logger.info('SUPABASE', '메모 저장 성공', memoData.pnu);
            return data;
        } catch (error) {
            Logger.error('SUPABASE', '메모 저장 실패', error);
            throw error;
        }
    }
    
    /**
     * 필지 데이터 로드
     */
    async loadParcels() {
        if (!this.isConnected) {
            Logger.warn('SUPABASE', '데이터베이스 연결되지 않음 - 로컬 데이터 사용');
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('parcels')
                .select('*');
            
            if (error) {
                throw error;
            }
            
            Logger.info('SUPABASE', `필지 데이터 ${data.length}개 로드 성공`);
            return data;
        } catch (error) {
            Logger.error('SUPABASE', '필지 데이터 로드 실패', error);
            return [];
        }
    }
    
    /**
     * 메모 데이터 로드
     */
    async loadMemos() {
        if (!this.isConnected) {
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('memos')
                .select('*');
            
            if (error) {
                throw error;
            }
            
            Logger.info('SUPABASE', `메모 데이터 ${data.length}개 로드 성공`);
            return data;
        } catch (error) {
            Logger.error('SUPABASE', '메모 데이터 로드 실패', error);
            return [];
        }
    }
    
    /**
     * 필지 데이터 삭제
     */
    async deleteParcel(pnu) {
        if (!this.isConnected) {
            throw new Error('데이터베이스 연결되지 않음');
        }
        
        try {
            // 관련 메모도 함께 삭제 (CASCADE)
            const { error } = await supabase
                .from('parcels')
                .delete()
                .eq('pnu', pnu);
            
            if (error) {
                throw error;
            }
            
            Logger.info('SUPABASE', '필지 삭제 성공', pnu);
        } catch (error) {
            Logger.error('SUPABASE', '필지 삭제 실패', error);
            throw error;
        }
    }
    
    /**
     * 특정 필지의 메모 조회
     */
    async getMemoByPNU(pnu) {
        if (!this.isConnected) {
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('memos')
                .select('*')
                .eq('pnu', pnu)
                .single();
            
            if (error && error.code !== 'PGRST116') {  // 데이터 없음은 정상
                throw error;
            }
            
            return data;
        } catch (error) {
            Logger.error('SUPABASE', '메모 조회 실패', error);
            return null;
        }
    }
}

// 전역 인스턴스 생성
window.supabaseManager = new SupabaseManager();

Logger.info('SUPABASE', 'Supabase 관리자 초기화 완료');