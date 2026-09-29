# ✈️ AI 맞춤형 여행 플래너 (AI Travel Planner)

> 사용자의 여행지, 일정, 예산, 동행자, 취향을 바탕으로 **Google Gemini API**를 활용해 동선이 최적화된 맞춤형 일자별 여행 일정을 생성해주는 풀스택 웹 애플리케이션입니다.

---

## 📂 프로젝트 구조

```text
travel-planner/
├── app.py                  # Flask 백엔드 서버 & Gemini API 통신 & 프롬프트 엔지니어링
├── requirements.txt        # 필요한 파이썬 라이브러리 목록
├── .env                    # 환경변수 파일 (API 키 보관, 절대 Git에 올리지 않음)
├── .env.example            # 환경변수 템플릿 예시
├── .gitignore              # Git 형상관리 제외 목록 (.env, 캐시 등)
├── README.md               # 프로젝트 가이드 문서
├── templates/
│   └── index.html          # 프론트엔드 메인 웹 페이지 (Jinja2 / HTML5)
└── static/
    ├── css/
    │   └── style.css       # 반응형 & 모던 UI 디자인 스타일시트
    └── js/
        └── app.js          # 비동기 REST API 통신(fetch) & 일정표 동적 렌더링
```

---

## 🛠️ 기술 스택 (Tech Stack)

- **Backend**: Python 3, Flask, `python-dotenv`
- **AI & SDK**: Google Gemini 2.5 Flash, `google-genai` SDK
- **Frontend**: Vanilla JavaScript (ES6+ Fetch API), HTML5, Modern CSS3 (Grid, Flexbox, Animation)
- **Prompt Engineering**: Role-based Persona, Few-shot Instruction, Strict JSON Schema Enforcement

---

## 🚀 빠른 시작 가이드 (초보자용 3단계)

### 1단계: 패키지 설치
터미널을 열고 필요한 라이브러리를 설치합니다.
```bash
pip install -r requirements.txt
```

### 2단계: Gemini API 키 설정
1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속하여 무료 API 키를 발급받습니다.
2. 프로젝트 루트의 `.env` 파일을 열고 다음과 같이 입력합니다:
```ini
GEMINI_API_KEY=AIzaSy...실제_발급받은_키...
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

### 3단계: Flask 서버 실행
```bash
python app.py
```
서버가 실행되면 웹 브라우저를 열고 `http://127.0.0.1:5000` 으로 접속하세요!

---

## 🎯 주요 기능 및 특징

1. **지리적 동선 최적화 프롬프트**:
   - 하루 일정 내에서 불필요한 이동 시간을 최소화하도록 지리적 위치를 고려한 스케줄링.
2. **동행자 & 이동수단 맞춤 설계**:
   - 부모님/아이/커플/나홀로 여행에 따른 맞춤 코스.
   - 렌터카 vs 대중교통에 맞춘 전용 팁과 추천 동선.
3. **체계적인 정보 제공**:
   - 시간대별(오전, 점심, 오후, 저녁, 야간) 장소, 예상 비용, 소요시간, 로컬 꿀팁.
   - 총 예상 경비 내역(교통, 숙박, 식비, 관광) 및 필수 준비물 체크리스트.
4. **유용한 부가 기능**:
   - **원클릭 빠른 예시**: 오사카, 제주도, 파리 예시 데이터 즉시 입력.
   - **일정 텍스트 복사**: 메신저나 메모장에 붙여넣을 수 있는 깔끔한 텍스트 변환.
   - **PDF / 인쇄 최적화**: 브라우저 인쇄 시 불필요한 UI를 숨기고 일정표만 A4 용지에 맞게 인쇄.
