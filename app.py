import os
import json
import time
import random
import logging
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv

# .env 파일에서 환경변수를 로드합니다.
load_dotenv()

# 로깅 설정 (개발 중 디버깅을 원활하게 돕습니다)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Flask 애플리케이션 생성
app = Flask(__name__)

# 설정값 불러오기
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
ACCESS_PIN = os.getenv("ACCESS_PIN", "1234").strip()
PORT = int(os.getenv("PORT", 5000))


def build_system_instruction() -> str:
    """
    AI 여행 플래너를 위한 페르소나 및 기본 시스템 지침을 생성합니다.
    """
    return (
        "당신은 15년 이상의 경력을 가진 세계적인 전문 여행 플래너이자 로컬 여행 컨시어지입니다.\n"
        "사용자가 제공한 [여행지, 여행 기간, 예산, 관심사/테마 우선순위, 동행자, 이동수단, 숙소 선호, 추가 요청사항]을 심층 분석하여,\n"
        "실제 여행자가 감동할 만큼 체계적이고, 동선이 효율적이며, 현실적인 일자별 맞춤형 여행 일정(Itinerary)을 기획합니다.\n\n"
        "반드시 준수해야 할 핵심 원칙:\n"
        "1. 지리적 동선 최적화: 같은 날 방문하는 장소들은 이동 시간이 최소화되도록 지리적으로 가까운 동선으로 배치하세요.\n"
        "2. 관심사 우선순위(1순위, 2순위, 3순위...) 철저 반영: 여행자가 선택한 관심사 우선순위 순서대로 높은 순위의 테마가 일정 전반의 핵심 컨셉과 매일의 주요 활동에 가장 높은 비중으로 배치되도록 하세요. 1순위 관심사는 매일 최소 1~2개 이상 반드시 포함되어야 합니다.\n"
        "3. 항공권/교통비 및 숙박비 시장가 직접 조사 및 정밀 산출 (단순 사용자 입력값 복사 절대 금지!):\n"
        "   - 사용자가 슬라이더로 입력한 항공권, 숙박비, 총경비 금액은 '지출 가능한 최대 예산 한도(상한선)'입니다. 플래너에 사용자가 설정한 슬라이더 숫자를 그대로 앵무새처럼 복사해 표기하지 마세요.\n"
        "   - 여행지와 일정, 시즌에 맞춰 실제 취항하는 항공편(LCC/FSC 직항 왕복) 시세, 공항 철도 및 현지 패스권, 추천 숙소들의 1박 평균 단가 x 숙박 일수를 직접 현실적으로 조사·계산하여, 사용자가 지정한 예산 상한선 이내(안쪽)에서 현실적이고 정확한 실제 예상 금액과 구체적 산출 근거를 'estimated_budget_breakdown'에 명시하세요.\n"
        "4. 일별 총 예상 금액 산출 (daily_estimated_cost): 각 일차마다 식음료비, 관광/입장료, 현지 교통비 등을 종합한 하루 총 예상 비용을 'daily_estimated_cost' 필드에 구체적인 금액(예: 약 85,000원)으로 빠짐없이 산출하세요.\n"
        "5. 일자별 추천 숙소 2~3곳 비교 (recommended_accommodations): 각 일차마다 해당 일차의 여행 동선과 사용자 예산/숙소 선호에 적합한 추천 숙소 2~3곳(숙소명, 숙소 유형, 1박 예상 가격, 핵심 장점/특징)을 'recommended_accommodations' 배열에 비교 분석하여 제공하세요. 마지막 날(귀국일)로 당일 귀국하여 숙박이 필요 없는 경우 '귀국 일정 (숙박 없음)' 또는 공항 인근 짐보관/휴식 라운지를 안내하세요.\n"
        "6. 장소명(place_name 및 숙소 name)의 명확성: 구글 지도(Google Maps)에서 바로 검색되고 위치를 확인할 수 있도록 구체적인 실제 상호명, 랜드마크 지점명(예: '이치란 라멘 도톤보리 본관', '도쿄 센소지', '호텔 그레이스리 신주쿠')으로 정확히 기재하세요.\n"
        "7. 실제 여행 날짜 및 요일 반영: 사용자가 지정한 출발(시작)일과 복귀(종료)일에 맞춰 각 일차의 date_title에 실제 날짜와 요일(예: 1일차 (10월 15일 목))을 명시하고, 주말/평일 운영시간 및 혼잡도를 동선에 반영하세요.\n"
        "8. 동행자 특성 반영: 예) 부모님 동반 시 여유로운 일정과 한식/편안한 좌석 고려, 커플 여행 시 로맨틱한 스팟과 야경, 아이 동반 시 키즈 프렌들리 스팟.\n"
        "9. 이동수단 맞춤: 렌터카일 경우 주차 및 드라이브 코스, 대중교통일 경우 지하철 노선/역명/패스권 활용 팁 포함.\n"
        "10. 시간대별(오전, 점심, 오후, 저녁, 야간) 구체적인 장소명과 실제 추천 메뉴/비용/소요시간 명시.\n"
        "11. 반드시 순수한 JSON 형식으로만 응답해야 하며, 마크다운 코드블록이나 불필요한 서두/말미 문장을 일절 포함하지 마세요."
    )


def build_user_prompt(data: dict) -> str:
    """
    사용자의 입력 데이터를 기반으로 정교한 프롬프트 문자열을 생성합니다.
    """
    destination = data.get("destination", "미지정")
    duration = data.get("duration", "2박 3일")
    start_date = data.get("start_date", "").strip()
    end_date = data.get("end_date", "").strip()

    if start_date and end_date:
        date_info_str = f"{start_date} ~ {end_date} (총 {duration})"
    else:
        date_info_str = duration

    # 세부 슬라이더 예산 (항공권, 숙박비, 총경비) 처리
    budget_flight = data.get("budget_flight")
    budget_hotel = data.get("budget_hotel")
    budget_total = data.get("budget_total")

    def format_money(val):
        try:
            n = int(val)
            if n == 0:
                return "0원 (예산 미책정/해당없음)"
            man = n // 10000
            rem = n % 10000
            if rem == 0:
                return f"{n:,}원({man}만원)"
            return f"{n:,}원"
        except (ValueError, TypeError):
            return str(val)

    if budget_total is not None or budget_flight is not None or budget_hotel is not None:
        t_won = format_money(budget_total) if budget_total is not None else "자율"
        f_won = format_money(budget_flight) if budget_flight is not None else "자율"
        h_won = format_money(budget_hotel) if budget_hotel is not None else "자율"
        budget = (
            f"사용자 설정 예산 한도(상한선): 총경비 한도 {t_won} | 항공권/교통비 한도 {f_won} | 숙박비 한도 {h_won}\n"
            f"  * [필수 지침 - 단순 설정 숫자 복사 절대 금지!]:\n"
            f"    사용자가 설정한 위 금액들은 지출 가능한 '최대 한도(상한선)'입니다. 플래너에 단순히 사용자가 입력한 숫자를 그대로 표기하지 마세요!\n"
            f"    반드시 목적지({destination})와 일정({duration}, 날짜: {start_date or '출발'}~{end_date or '도착'})에 맞춰 실제 취항하는 항공편(LCC/FSC 왕복) 시세, 공항-도심 이동편 및 현지 교통패스, 해당 지역 호텔 숙박비(1박당 단가 x 박수)를 직접 현실적으로 조사/산출하여, 사용자가 지정한 상한 금액 이내(안쪽)에서 '실제 예상 금액'과 '세부 산출 근거'를 정확하고 구체적으로 명시하세요."
        )
    else:
        budget = data.get("budget", "표준 (보통)")

    interests = data.get("interests", [])
    if isinstance(interests, list):
        if interests:
            formatted_items = []
            for idx, item in enumerate(interests):
                if "순위" in str(item):
                    formatted_items.append(f"  * {item}")
                else:
                    formatted_items.append(f"  * {idx + 1}순위: {item}")
            interests_str = "\n".join(formatted_items)
        else:
            interests_str = "  * 자유 여행 / 명소 탐방"
    else:
        interests_str = f"  * {interests}"

    companion = data.get("companion", "혼자 (솔로 여행)")
    transportation = data.get("transportation", "대중교통 (지하철/버스)")
    accommodation = data.get("accommodation", "도심 중심 호텔")
    extra_requests = data.get("extra_requests", "특별한 추가 요청 없음").strip() or "특별한 추가 요청 없음"

    prompt = f"""
다음 조건에 맞춘 최고의 맞춤형 여행 일정을 기획하여 아래 지정된 JSON 규격으로만 응답해주세요.

[여행자 조건]
- 목적지 (Destination): {destination}
- 여행 날짜 및 기간 (Dates & Duration): {date_info_str}
  * (출발일 {start_date or '시작'}부터 복귀일 {end_date or '종료'}까지의 실제 날짜와 요일, 계절 및 평일/주말 특성을 일정에 정확히 반영하고, daily_itinerary의 date_title에 '1일차 (M월 D일 요일): 핵심 타이틀' 형태로 실제 날짜와 요일을 반드시 함께 표기할 것)
- 여행 예산 수준 (Budget): {budget}
- 여행 테마 / 관심사 우선순위 (Priority Interests):
{interests_str}
  * (반드시 1순위 관심사를 여행의 최우선 메인 테마로 삼고, 2순위, 3순위 관심사 순서대로 각 일차의 주요 코스에 중점 배치할 것)
- 동행자 (Companion): {companion}
- 주 이동수단 (Transportation): {transportation}
- 숙소 선호 (Accommodation): {accommodation}
- 추가 요청사항 (Special Requests): {extra_requests}

[응답해야 할 JSON 구조 (반드시 이 구조를 100% 엄격하게 준수할 것)]:
{{
  "trip_title": "여행 전체를 관통하는 매력적이고 센스 있는 제목",
  "destination": "{destination}",
  "duration": "{duration}",
  "tagline": "여행을 한 문장으로 요약하는 멋진 슬로건",
  "theme_tags": ["테마1", "테마2", "테마3"],
  "overview": {{
    "summary": "이번 여행의 핵심 컨셉과 장점을 설명하는 요약 글 (3~4문장)",
    "weather_advice": "해당 여행지의 추천 복장 및 기후 주의사항",
    "packing_essentials": ["필수 준비물1", "필수 준비물2", "필수 준비물3", "필수 준비물4"],
    "estimated_budget_breakdown": {{
      "total_estimated": "실제 산출 총 예상 비용 (예: 1인 약 845,000원)",
      "user_budget_limit": "사용자 설정 총 한도 (예: 950,000원)",
      "budget_status": "예산 분석 총평 (예: 설정 한도(95만원) 내에서 약 105,000원의 여유 경비 확보 가능)",
      "flights_transit": "실제 조사 항공/교통비 (예: 약 305,000원)",
      "flights_transit_detail": "항공/교통 산출 근거 (예: 인천-간사이 LCC 왕복 직항 약 26만원 + 난카이 라피트 및 오사카 지하철 패스 약 4.5만원)",
      "accommodation": "실제 조사 숙박비 (예: 약 330,000원)",
      "accommodation_detail": "숙박비 산출 근거 (예: 난바/도톤보리 도심 3성급 호텔 3박 기준, 1박당 평균 약 110,000원 x 3박)",
      "food": "식음료비 예상 (예: 약 150,000원 (1일당 평균 약 50,000원 x 3일))",
      "food_detail": "식비 산출 근거 (예: 1일 3식 현지 대표 미식 및 카페 디저트)",
      "activities": "관광/입장료/체험비 (예: 약 60,000원)",
      "activities_detail": "체험/입장료 산출 근거 (예: 주요 유적지 및 전망대 입장료)"
    }}
  }},
  "daily_itinerary": [
    {{
      "day": 1,
      "date_title": "1일차: 핵심 타이틀 (예: 설레는 도착과 도심 속 야경 투어)",
      "theme": "해당 일차의 핵심 테마",
      "daily_estimated_cost": "1일차 총 예상 경비 (예: 약 85,000원)",
      "schedule": [
        {{
          "time_slot": "오전 (09:00 - 12:00)",
          "place_name": "방문 장소 또는 활동명 (구글 지도 검색이 가능한 실제 명칭)",
          "category": "이동 / 관광 / 식당 / 카페 / 쇼핑 / 휴식 중 택1",
          "description": "구체적인 활동 내용 및 즐길 거리 설명 (2~3문장)",
          "duration_hours": "예상 소요시간 (예: 2시간)",
          "cost_estimate": "예상 비용 (예: 입장료 1,500엔 또는 무료)",
          "tips": "현지 방문 꿀팁 (예: 사전 모바일 예매 시 대기 없이 입장 가능)"
        }},
        {{
          "time_slot": "점심 (12:00 - 13:30)",
          "place_name": "추천 식당 또는 먹거리 골목 (실제 상호명)",
          "category": "식당",
          "description": "추천 대표 메뉴와 식당 분위기 설명",
          "duration_hours": "1시간 30분",
          "cost_estimate": "1인 약 15,000원",
          "tips": "현지인 인기 맛집이므로 11시 40분 전 방문 추천"
        }},
        {{
          "time_slot": "오후 (14:00 - 17:30)",
          "place_name": "오후 주요 관광지 (실제 명칭)",
          "category": "관광",
          "description": "활동 설명",
          "duration_hours": "3시간",
          "cost_estimate": "무료",
          "tips": "사진 찍기 가장 좋은 포토존 위치 안내"
        }},
        {{
          "time_slot": "저녁 (18:00 - 20:00)",
          "place_name": "저녁 식사 스팟 (실제 상호명)",
          "category": "식당",
          "description": "저녁 메뉴 및 분위기",
          "duration_hours": "2시간",
          "cost_estimate": "1인 약 30,000원",
          "tips": "예약 권장"
        }},
        {{
          "time_slot": "야간 (20:30 - 22:00)",
          "place_name": "야경 명소 또는 바/산책로",
          "category": "휴식",
          "description": "야간 활동 및 하루 마무리",
          "duration_hours": "1시간 30분",
          "cost_estimate": "음료값 약 10,000원",
          "tips": "치안 주의 및 마지막 대중교통 시간 확인"
        }}
      ],
      "day_summary_tip": "1일차 동선 및 하루를 편안하게 보내기 위한 총괄 조언",
      "recommended_accommodations": [
        {{
          "name": "추천 숙소 1 (실제 호텔/숙소 정식 상호명, 예: 크로스 호텔 오사카)",
          "type": "숙소 유형 (예: 4성급 부티크 호텔 / 가성비 비즈니스 호텔 / 감성 료칸)",
          "price_range": "1박 예상 가격 (예: 1박 약 130,000원)",
          "highlights": "핵심 장점 및 추천 이유 (예: 도톤보리 도보 1분, 대욕장 구비, 조식 호평)"
        }},
        {{
          "name": "추천 숙소 2 (비교 호텔/숙소 상호명, 예: 온야도 노노 난바 내추럴 핫 스프링)",
          "type": "숙소 유형 (예: 3성급 천연 온천형 호텔)",
          "price_range": "1박 예상 가격 (예: 1박 약 115,000원)",
          "highlights": "핵심 장점 및 추천 이유 (예: 다다미 바닥, 무료 천연온천 사우나, 야식 라멘 무료 제공)"
        }},
        {{
          "name": "추천 숙소 3 (비교 호텔/숙소 상호명, 예: 호텔 몬터레이 그라스미어 오사카)",
          "type": "숙소 유형 (예: 4성급 고층 전망 호텔)",
          "price_range": "1박 예상 가격 (예: 1박 약 155,000원)",
          "highlights": "핵심 장점 및 추천 이유 (예: 난바역 지하 직통, 22층 로비 및 환상적인 시티 야경)"
        }}
      ]
    }}
  ],
  "practical_tips": [
    "교통 패스 및 현지 대중교통 이용 핵심 팁",
    "환전, 신용카드, 모바일 결제(애플페이/트래블로그 등) 활용 팁",
    "현지 에티켓 및 비상 시 대처법 (비상 연락처 및 병원 등)"
  ]
}}

주의: 사용자가 요청한 여행 기간({duration})의 일수(예: 2박 3일이면 Day 1부터 Day 3까지, 3박 4일이면 Day 1부터 Day 4까지)에 맞추어 daily_itinerary 배열 안에 각 일자별 스케줄과 각 일자별 추천 숙소 2~3곳 비교 목록(recommended_accommodations)을 빠짐없이 상세하게 생성하세요. 마지막 날(귀국일)의 경우 숙박이 불필요하면 1개 항목으로 '귀국 일정 (숙박 없음)' 또는 공항 인근 짐보관/라운지 정보를 적절히 안내하세요.
"""
    return prompt.strip()


def call_gemini_api(prompt: str, system_instruction: str) -> dict:
    """
    Google GenAI SDK를 사용하여 Gemini API를 호출하고 JSON 결과를 반환합니다.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_actual_gemini_api_key_here":
        raise ValueError(
            "GEMINI_API_KEY가 설정되지 않았습니다.\n"
            "프로젝트 루트의 .env 파일에 Google AI Studio에서 발급받은 실제 API 키를 입력해주세요.\n"
            "(키 발급: https://aistudio.google.com/app/apikey)"
        )

    from google import genai
    from google.genai import types

    # 공식 Google GenAI 클라이언트 초기화
    client = genai.Client(api_key=GEMINI_API_KEY)

    # .env에 설정된 모델(기본값: gemini-3.5-flash-lite)을 1순위 최우선 모델로 배치
    configured_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip() or "gemini-3.5-flash-lite"

    # 모델 후보 목록 (.env 모델 최우선 시도 후 장애 시 안정적인 대체 모델 순차 시도)
    candidate_models = [
        configured_model,
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-flash-lite-latest",
        "gemini-flash-latest",
    ]
    # 중복 제거 (.env에서 지정한 모델이 항상 첫 번째로 유지됨)
    models_to_try = []
    for m in candidate_models:
        if m and m not in models_to_try:
            models_to_try.append(m)

    last_exception = None

    for model_name in models_to_try:
        # .env 지정 모델 및 gemini-3.5-flash-lite는 최대 10회까지 시도, 그 외 대체 백업 모델은 3회 시도
        max_attempts = 10 if (model_name == configured_model or "gemini-3.5-flash-lite" in model_name) else 3

        for attempt in range(max_attempts):
            try:
                logger.info(f"Gemini API 호출 시도 중... 모델: {model_name} (시도 {attempt + 1}/{max_attempts})")
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    response_mime_type="application/json",
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                )
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )

                raw_text = response.text
                if not raw_text:
                    raise ValueError("Gemini API에서 빈 응답이 반환되었습니다.")

                # JSON 코드 블록(```json ... ```) 제거 처리
                cleaned_text = raw_text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                elif cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()

                parsed_json = json.loads(cleaned_text)
                logger.info(f"모델 {model_name}로부터 일정 생성 성공!")
                return parsed_json

            except Exception as e:
                err_str = str(e)
                logger.warning(f"모델 {model_name} (시도 {attempt + 1}/{max_attempts}) 에러 발생: {err_str}")
                last_exception = e

                # 404 모델 없음, 400 잘못된 요청 등 복구 불가 에러는 즉시 다음 모델로 건너뜀
                is_fatal_error = any(kw in err_str for kw in ["404", "NOT_FOUND", "400", "INVALID_ARGUMENT", "API_KEY_INVALID", "PERMISSION_DENIED"])
                if is_fatal_error:
                    logger.warning(f"모델 {model_name} 복구 불가 에러 감지. 다음 모델로 전환합니다.")
                    break

                # 503 과부하(UNAVAILABLE), 429 한도 초과 등 일시적 오류 시 지수 백오프(Exponential Backoff + Jitter) 대기 후 재시도
                if attempt < max_attempts - 1:
                    base_delay = min(2.0 * (1.35 ** attempt), 8.0)
                    jitter = random.uniform(0.2, 0.8)
                    wait_sec = round(base_delay + jitter, 1)
                    logger.info(f"구글 서버 과부하/일시적 오류 감지. 지수 백오프({wait_sec}초) 후 재시도합니다... (남은 시도: {max_attempts - 1 - attempt}회)")
                    time.sleep(wait_sec)
                    continue
                else:
                    logger.warning(f"모델 {model_name} 최대 시도 횟수({max_attempts}회)를 모두 소진했습니다. 다음 모델로 전환합니다.")
                    break

    # 모든 모델 시도가 실패한 경우
    raise last_exception or RuntimeError("Gemini API 호출에 실패했습니다.")


@app.route("/")
def index():
    """메인 웹페이지 렌더링"""
    return render_template("index.html")


@app.route("/manifest.json")
def serve_manifest():
    """PWA Web App Manifest 파일 제공"""
    return send_from_directory("static", "manifest.json", mimetype="application/manifest+json")


@app.route("/sw.js")
def serve_service_worker():
    """PWA Service Worker 스크립트 제공 (루트 스코프 '/' 허용)"""
    response = send_from_directory("static", "sw.js", mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


@app.route("/api/verify-pin", methods=["POST"])
def verify_access_pin():
    """
    4자리 보안 접근 비밀번호(PIN) 검증 엔드포인트
    """
    data = request.get_json() or {}
    input_pin = str(data.get("pin", "")).strip()

    # ACCESS_PIN이 비어 있으면 누구나 접근 가능
    if not ACCESS_PIN:
        return jsonify({"success": True, "message": "인증 완료"}), 200

    if input_pin == ACCESS_PIN:
        return jsonify({"success": True, "message": "인증 완료"}), 200
    else:
        return jsonify({"success": False, "error": "비밀번호 4자리가 일치하지 않습니다."}), 401


@app.route("/api/plan", methods=["POST"])
def generate_travel_plan():
    """
    클라이언트(브라우저)에서 여행 조건을 전송받아
    Gemini API를 통해 맞춤형 여행 일정을 생성하는 REST API 엔드포인트
    """
    try:
        # 0. 4자리 보안 비밀번호(PIN) 검증 (무단/크롤링 API 호출 차단)
        data = request.get_json() or {}
        if ACCESS_PIN:
            client_pin = request.headers.get("X-Access-PIN", "").strip() or str(data.get("access_pin", "")).strip()
            if client_pin != ACCESS_PIN:
                return jsonify({
                    "success": False,
                    "error": "접근 권한이 없습니다. 4자리 비밀번호를 올바르게 입력해주세요.",
                    "error_type": "AUTH_REQUIRED"
                }), 401

        # 1. 클라이언트 전송 JSON 검증
        if not data:
            return jsonify({"success": False, "error": "전송된 데이터가 올바른 JSON 형식이 아닙니다."}), 400

        destination = data.get("destination", "").strip()
        if not destination:
            return jsonify({"success": False, "error": "여행지(목적지)를 입력해주세요."}), 400

        duration = data.get("duration", "").strip()
        if not duration:
            return jsonify({"success": False, "error": "여행 기간을 선택하거나 입력해주세요."}), 400

        # 2. 프롬프트 및 시스템 지침 구축
        system_instruction = build_system_instruction()
        prompt = build_user_prompt(data)

        # 3. Gemini API 호출
        plan_result = call_gemini_api(prompt, system_instruction)

        # 4. 성공 결과 반환
        return jsonify({
            "success": True,
            "data": plan_result
        }), 200

    except ValueError as ve:
        # API 키 미설정 또는 입력값 오류
        logger.warning(f"검증 오류: {ve}")
        return jsonify({
            "success": False,
            "error": str(ve),
            "error_type": "CONFIG_ERROR"
        }), 400

    except Exception as e:
        logger.error(f"서버 내부 처리 오류: {str(e)}", exc_info=True)
        err_msg = str(e)
        if "503" in err_msg or "UNAVAILABLE" in err_msg or "high demand" in err_msg.lower():
            friendly_msg = "현재 구글 Gemini 무료 서버에 글로벌 접속량이 급증하여 응답이 지연되었습니다. 잠시 후(약 30초~1분 뒤) 다시 [생성하기] 버튼을 눌러주세요."
        elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            friendly_msg = "API 일일 또는 분당 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
        else:
            friendly_msg = f"일정 생성 중 오류가 발생했습니다: {err_msg}"

        return jsonify({
            "success": False,
            "error": friendly_msg,
            "error_type": "SERVER_ERROR"
        }), 500


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 AI 맞춤형 여행 플래너 (AI Travel Planner) 웹 서버 시작")
    print(f"📍 브라우저에서 접속: http://127.0.0.1:{PORT}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=PORT, debug=True)
