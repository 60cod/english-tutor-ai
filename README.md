# English Tutor AI 🤖

실시간 문법 교정과 표현 개선을 통해 영어 회화 실력 향상을 도와주는 AI 챗봇입니다.

## ✨ 주요 기능

### 1. 스마트 학습 도우미
- **실시간 문법 교정**: 문법 오류를 감지하고 올바른 표현으로 수정 제안
- **자연스러운 표현 제안**: 더 자연스럽고 세련된 영어 표현 추천
- **한영 혼용 대화**: 한글로 써도 영어로 응답하며 적절한 영어 표현 추천

### 2. 사용자 친화적 인터페이스
- **모바일 최적화**: 스마트폰에서도 편리한 학습 환경
- **헤더 토글**: 모바일에서 채팅창을 더 크게 볼 수 있는 접기/펼치기 기능
- **글씨 크기 조절**: 개인의 선호에 맞춰 텍스트 크기 자유 조정
- **반응형 디자인**: 어떤 기기에서든 최적화된 화면

### 3. 학습 도구
- **피드백 복사**: 유용한 표현과 교정 내용을 클립보드로 쉽게 복사
- **실시간 분석**: 메시지를 보내는 즉시 개선점과 제안사항 제공

---
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