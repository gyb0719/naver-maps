// 🎯 ULTRATHINK v4.0: 초간단 안정형 VWorld API Serverless Function
export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        console.log('🔧 VWorld API v4.0 - 초간단 버전 시작');
        console.log('Query params:', req.query);
        
        // 기본 파라미터
        const {
            service = 'data',
            request: requestType = 'GetFeature',
            data: dataType = 'LP_PA_CBND_BUBUN', 
            key = 'E5B1657B-9B6F-3A4B-91EF-98512BE931A1', // 검증된 키 고정
            geometry = 'true',
            geomFilter = '',
            size = '10',
            format = 'json',
            crs = 'EPSG:4326'
        } = req.query;
        
        // 입력 검증
        if (!geomFilter) {
            return res.status(400).json({
                error: 'Missing geomFilter parameter',
                message: 'geomFilter는 필수 파라미터입니다.'
            });
        }
        
        console.log('✅ 파라미터 검증 완료');
        
        // VWorld API URL 구성 (가장 단순한 방법)
        const apiUrl = new URL('https://api.vworld.kr/req/data');
        apiUrl.searchParams.set('service', service);
        apiUrl.searchParams.set('request', requestType);
        apiUrl.searchParams.set('data', dataType);
        apiUrl.searchParams.set('key', key);
        apiUrl.searchParams.set('geometry', geometry);
        apiUrl.searchParams.set('geomFilter', geomFilter);
        apiUrl.searchParams.set('size', size);
        apiUrl.searchParams.set('format', format);
        apiUrl.searchParams.set('crs', crs);
        
        console.log('🌐 API 호출 URL:', apiUrl.toString());
        
        // VWorld API 호출 (기본 설정)
        const response = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'Vercel-Function',
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 VWorld API 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ VWorld API HTTP 에러:', response.status, errorText);
            
            return res.status(502).json({
                error: 'VWorld API Error',
                status: response.status,
                message: response.statusText,
                details: errorText
            });
        }
        
        // 응답 파싱
        const responseText = await response.text();
        console.log('📄 응답 길이:', responseText.length);
        
        let apiData;
        try {
            apiData = JSON.parse(responseText);
            console.log('✅ JSON 파싱 성공');
        } catch (parseError) {
            console.error('❌ JSON 파싱 실패:', parseError.message);
            console.error('응답 내용:', responseText.substring(0, 500));
            
            return res.status(502).json({
                error: 'Invalid JSON Response',
                message: 'VWorld API 응답을 파싱할 수 없습니다.',
                rawResponse: responseText.substring(0, 200)
            });
        }
        
        // VWorld API 에러 체크
        if (apiData.response?.status === 'ERROR') {
            const errorMsg = apiData.response.error?.text || 'Unknown VWorld Error';
            console.error('❌ VWorld API 내부 에러:', errorMsg);
            
            return res.status(400).json({
                error: 'VWorld API Error',
                message: errorMsg,
                response: apiData.response
            });
        }
        
        // 성공 체크
        if (apiData.response?.status === 'OK') {
            const features = apiData.response.result?.featureCollection?.features;
            console.log('🎉 성공! 필지 개수:', features?.length || 0);
            
            return res.status(200).json(apiData);
        }
        
        // 예상치 못한 응답 형식
        console.warn('⚠️ 예상치 못한 응답:', apiData);
        return res.status(200).json(apiData); // 일단 반환
        
    } catch (error) {
        console.error('💥 서버리스 함수 치명적 에러:', error);
        console.error('에러 스택:', error.stack);
        
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}