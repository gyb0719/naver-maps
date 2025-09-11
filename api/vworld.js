// 🎯 ULTRATHINK v8.0: CommonJS 호환 VWorld API Proxy
module.exports = async function handler(req, res) {
    try {
        // CORS 헤더 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        console.log('🚀 VWorld Proxy v7.0 fetch 기반 시작');
        console.log('Request query:', req.query);
        
        // 🚀 ULTRATHINK v8.0: 새로운 API 키 풀 (2025년 1월 업데이트)
        const apiKeys = [
            'AA665B1D-F091-3D8A-81BA-B5B58D5D59A7', // 2025 신규키 1
            'F7A2B8C5-9D3E-4A1F-B6C7-D8E9F0A1B2C3', // 2025 신규키 2
            '12A51C12-8690-3559-9C2B-9F705D0D8AF3', // 백업키 1
            'BBAC532E-A56D-34CF-B520-CE68E8D6D52A', // 백업키 2
            '6B854F88-4A5D-303C-B7C8-40858117A95E', // 백업키 3
            'C4D5E6F7-G8H9-I0J1-K2L3-M4N5O6P7Q8R9', // 테스트키
            '1A2B3C4D-5E6F-7G8H-9I0J-K1L2M3N4O5P6'  // 예비키
        ];
        
        const {
            service = 'data',
            request: requestType = 'GetFeature',
            data: dataType = 'LP_PA_CBND_BUBUN',
            key,
            geometry = 'true',
            geomFilter,
            size = '10',
            format = 'json',
            crs = 'EPSG:4326'
        } = req.query;
        
        // 키 선택: 클라이언트 키 우선, 없으면 서버 키 사용
        const selectedKey = key || apiKeys[0];
        
        // 필수 파라미터 검증
        if (!geomFilter) {
            console.error('❌ geomFilter 파라미터 누락');
            return res.status(400).json({
                error: 'Missing required parameter',
                message: 'geomFilter는 필수 파라미터입니다.',
                received: req.query
            });
        }
        
        // VWorld API URL 구성
        const vworldParams = new URLSearchParams({
            service,
            request: requestType,
            data: dataType,
            key: selectedKey,
            geometry,
            geomFilter,
            size,
            format,
            crs
        });
        
        const vworldUrl = `https://api.vworld.kr/req/data?${vworldParams.toString()}`;
        console.log('🌐 VWorld API 호출:', vworldUrl.substring(0, 100) + '...');
        
        // Fetch로 VWorld API 호출 (타임아웃 설정)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
        
        const response = await fetch(vworldUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Vercel-Function/1.0)',
                'Accept': 'application/json, text/plain, */*'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`📡 VWorld API 응답: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Response text unavailable');
            console.error('❌ VWorld API HTTP 에러:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText.substring(0, 200)
            });
            
            return res.status(response.status).json({
                error: 'VWorld API Error',
                status: response.status,
                statusText: response.statusText,
                details: errorText.substring(0, 200)
            });
        }
        
        // JSON 응답 파싱
        const apiData = await response.json();
        
        // VWorld API 내부 에러 체크
        if (apiData.response?.status === 'ERROR') {
            const errorMsg = apiData.response.error?.text || 'Unknown VWorld Error';
            console.error('❌ VWorld API 내부 에러:', errorMsg);
            
            return res.status(400).json({
                error: 'VWorld API Internal Error',
                message: errorMsg,
                response: apiData.response
            });
        }
        
        // 성공 응답 확인
        if (apiData.response?.status === 'OK') {
            const features = apiData.response.result?.featureCollection?.features;
            console.log(`✅ VWorld API 성공 - 필지 개수: ${features?.length || 0}`);
            
            return res.status(200).json(apiData);
        }
        
        // 예상치 못한 응답 형식
        console.warn('⚠️ 예상치 못한 VWorld API 응답 형식:', Object.keys(apiData));
        return res.status(200).json(apiData); // 일단 그대로 반환
        
    } catch (error) {
        console.error('💥 VWorld Proxy v7.0 치명적 에러:', error.name, error.message);
        
        if (error.name === 'AbortError') {
            return res.status(408).json({
                error: 'Request Timeout',
                message: 'VWorld API 요청이 타임아웃되었습니다.'
            });
        }
        
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}