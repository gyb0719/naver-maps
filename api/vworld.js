// 🎯 ULTRATHINK v5.0: 극도로 단순한 VWorld API Proxy
export default async function handler(req, res) {
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
    
    // 쿼리 파라미터를 그대로 VWorld API에 전달
    const queryString = Object.entries(req.query)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    
    const vworldUrl = `https://api.vworld.kr/req/data?${queryString}`;
    
    try {
        console.log('🔧 VWorld Proxy v5.0:', vworldUrl);
        
        // VWorld API 직접 호출 (최소한의 헤더)
        const response = await fetch(vworldUrl);
        
        if (!response.ok) {
            console.error('❌ VWorld API 에러:', response.status);
            return res.status(response.status).json({ 
                error: 'VWorld API Error', 
                status: response.status 
            });
        }
        
        // 응답을 그대로 전달
        const data = await response.json();
        console.log('✅ VWorld API 성공');
        
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('💥 Proxy 에러:', error.message);
        return res.status(500).json({ 
            error: 'Proxy Error', 
            message: error.message 
        });
    }
}