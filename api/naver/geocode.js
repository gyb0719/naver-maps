// 🎯 ULTRATHINK: Naver Geocoding API Proxy for Vercel
export default async function handler(req, res) {
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
        
        console.log('🗺️ Naver Geocoding Proxy 시작');
        
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                error: 'Missing query parameter',
                message: '검색어가 필요합니다.' 
            });
        }
        
        // Naver API 설정 (환경변수 또는 기본값)
        const naverClientId = process.env.NAVER_CLIENT_ID || 'x21kpuf1v4';
        const naverClientSecret = process.env.NAVER_CLIENT_SECRET;
        
        if (!naverClientSecret) {
            console.error('❌ Naver Client Secret 없음');
            return res.status(500).json({ 
                error: 'Configuration Error',
                message: 'Naver API 설정이 완료되지 않았습니다.' 
            });
        }
        
        const naverUrl = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`;
        
        console.log('🌐 Naver API 호출 중...');
        
        const response = await fetch(naverUrl, {
            method: 'GET',
            headers: {
                'X-NCP-APIGW-API-KEY-ID': naverClientId,
                'X-NCP-APIGW-API-KEY': naverClientSecret,
                'User-Agent': 'Mozilla/5.0 (compatible; Vercel-Function/1.0)'
            }
        });
        
        console.log(`📡 Naver API 응답: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Response unavailable');
            console.error('❌ Naver API 에러:', errorText.substring(0, 200));
            
            return res.status(response.status).json({
                error: 'Naver API Error',
                status: response.status,
                statusText: response.statusText,
                details: errorText.substring(0, 200)
            });
        }
        
        const data = await response.json();
        
        console.log(`✅ Naver Geocoding 성공 - 결과 개수: ${data.addresses?.length || 0}`);
        
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('💥 Naver Geocoding Proxy 에러:', error.message);
        
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}