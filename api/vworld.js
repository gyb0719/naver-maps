// 🎯 ULTRATHINK v6.0: Vercel 호환 VWorld API Proxy (Node.js HTTPS)
const https = require('https');

module.exports = async (req, res) => {
    try {
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
        
        console.log('🔧 VWorld Proxy v6.0 시작');
        console.log('쿼리 파라미터:', req.query);
        
        // 쿼리 스트링 구성
        const queryString = Object.entries(req.query)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        const url = `https://api.vworld.kr/req/data?${queryString}`;
        console.log('VWorld URL:', url);
        
        // Node.js HTTPS 모듈로 직접 호출
        const apiResponse = await new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            statusCode: response.statusCode,
                            data: jsonData
                        });
                    } catch (parseError) {
                        reject(new Error(`JSON 파싱 실패: ${parseError.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
        
        if (apiResponse.statusCode !== 200) {
            console.error('VWorld API HTTP 에러:', apiResponse.statusCode);
            return res.status(apiResponse.statusCode).json({
                error: 'VWorld API Error',
                status: apiResponse.statusCode
            });
        }
        
        console.log('✅ VWorld API 성공');
        return res.status(200).json(apiResponse.data);
        
    } catch (error) {
        console.error('💥 서버리스 함수 에러:', error.message);
        console.error('에러 스택:', error.stack);
        
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};