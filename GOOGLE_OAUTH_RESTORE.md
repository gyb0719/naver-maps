# Google OAuth 복원 가이드

## 🔧 현재 상태 (개발용)
Google OAuth 로그인이 임시 비활성화되어 있습니다.

## 📋 비활성화된 항목들
1. `public/index.html` - Google Identity Services 스크립트 주석처리
2. 환경변수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`는 설정되어 있음

## ✅ 복원 방법

### 1단계: Google Console 설정
**고객 또는 소유자가 수행:**
- Google Cloud Console → APIs & Services → Credentials
- 클라이언트 ID: `1006610066972-6nqfmk0634uuv70f8gov48q37p06nvl3` 편집
- **승인된 JavaScript 원본**에 추가:
  ```
  https://parcel-management-system-pink.vercel.app
  ```
- **승인된 리디렉션 URI**에 추가:
  ```
  https://parcel-management-system-pink.vercel.app
  https://parcel-management-system-pink.vercel.app/
  ```

### 2단계: 코드 복원
`public/index.html` 파일에서 주석 해제:
```html
<!-- 변경 전 (현재) -->
<!-- <script src="https://accounts.google.com/gsi/client" async defer></script> -->

<!-- 변경 후 (복원) -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 3단계: 배포
```bash
git add public/index.html
git commit -m "🔄 Restore Google OAuth login functionality"
git push parcel-system main
```

## 🔑 환경변수 확인
Vercel에서 다음 환경변수가 설정되어 있는지 확인:
```
GOOGLE_CLIENT_ID=1006610066972-6nqfmk0634uuv70f8gov48q37p06nvl3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## 🧪 테스트 기능
- 네이버 지도 표시/조작 ✅ 작동
- VWorld API 필지 데이터 ✅ 작동  
- Supabase 실시간 동기화 ✅ 작동
- Google Sheets 연동 ❌ 비활성화 (OAuth 복원 후 작동)
- Google 로그인 ❌ 비활성화 (OAuth 복원 후 작동)

## 📞 연락처
복원 시 도움이 필요하면 개발자에게 문의하세요.