# English Tutor AI 🧑🏻‍🏫

실시간 문법 교정과 표현 개선을 통해 영어 회화 실력 향상을 도와주는 AI 챗봇입니다.

## 🏗️ 프로젝트 구조

```
english-tutor-ai/
├── index.html              # 메인 페이지
├── style.css              # 스타일시트
├── script.js              # 프론트엔드 로직
├── .netlify/
│   └── functions/
│       └── gemini.js      # Netlify 서버리스 함수
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions 배포 설정
├── netlify.toml          # Netlify 설정
└── package.json          # 프로젝트 정보

```

## 📝 주요 기능

- ✅ 실시간 영어 문법 교정
- ✅ 더 나은 표현 제안
- ✅ 자연스러운 대화 응답
- ✅ 반응형 디자인
- ✅ 에러 핸들링 및 재시도 로직

## 🔒 보안

- API 키는 서버측(Netlify Functions)에서만 사용
- CORS 설정으로 안전한 API 호출
- 환경변수를 통한 민감 정보 보호

## 🛠️ 기술 스택

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Netlify Functions (Node.js)
- **API**: Google Gemini Pro
- **Deployment**: GitHub Pages + Netlify
- **CI/CD**: GitHub Actions