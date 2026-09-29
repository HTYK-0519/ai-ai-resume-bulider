/**
 * AI 맞춤형 여행 플래너 (AI Travel Planner)
 * 프론트엔드 비동기 통신 & UI 렌더링 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const form = document.getElementById('travelForm');
  const submitBtn = document.getElementById('submitBtn');
  
  // 상태 컨테이너
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const resultContent = document.getElementById('resultContent');
  
  // 에러 요소
  const errorMessage = document.getElementById('errorMessage');
  const btnRetry = document.getElementById('btnRetry');

  // 여행 날짜 요소 (시작일 ~ 종료일)
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const durationInput = document.getElementById('duration');
  const calculatedDurationText = document.getElementById('calculatedDurationText');

  function formatDateYYYYMMDD(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(d, days) {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  }

  function calculateDurationFromDates() {
    if (!startDateInput || !endDateInput) return;
    const sVal = startDateInput.value;
    const eVal = endDateInput.value;
    if (!sVal || !eVal) return;

    const s = new Date(sVal);
    const e = new Date(eVal);

    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      endDateInput.value = startDateInput.value;
      calculateDurationFromDates();
      return;
    }

    let durText = '';
    if (diffDays === 0) {
      durText = '당일치기 (1일)';
    } else {
      durText = `${diffDays}박 ${diffDays + 1}일`;
    }

    if (durationInput) durationInput.value = durText;
    if (calculatedDurationText) calculatedDurationText.textContent = durText;
  }

  // 기본 날짜 초기화 (오늘 기준 2주 뒤 ~ 3박 4일)
  const today = new Date();
  const defaultStart = addDays(today, 14);
  const defaultEnd = addDays(defaultStart, 3);

  if (startDateInput && !startDateInput.value) {
    startDateInput.value = formatDateYYYYMMDD(defaultStart);
    startDateInput.min = formatDateYYYYMMDD(today);
  }
  if (endDateInput && !endDateInput.value) {
    endDateInput.value = formatDateYYYYMMDD(defaultEnd);
    endDateInput.min = startDateInput ? startDateInput.value : formatDateYYYYMMDD(today);
  }
  calculateDurationFromDates();

  if (startDateInput) {
    startDateInput.addEventListener('change', () => {
      if (endDateInput) {
        endDateInput.min = startDateInput.value;
        if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
          const newEnd = addDays(new Date(startDateInput.value), 3);
          endDateInput.value = formatDateYYYYMMDD(newEnd);
        }
      }
      calculateDurationFromDates();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener('change', calculateDurationFromDates);
  }

  // 예산 슬라이더 요소 (윈도우 볼륨 스타일)
  const sliderFlight = document.getElementById('sliderFlight');
  const sliderHotel = document.getElementById('sliderHotel');
  const sliderTotal = document.getElementById('sliderTotal');
  const dispBudgetFlight = document.getElementById('dispBudgetFlight');
  const dispBudgetHotel = document.getElementById('dispBudgetHotel');
  const dispBudgetTotal = document.getElementById('dispBudgetTotal');
  const budgetSummaryBadge = document.getElementById('budgetSummaryBadge');
  const budgetFeedbackText = document.getElementById('budgetFeedbackText');
  const budgetCalcFeedback = document.getElementById('budgetCalcFeedback');

  // 배너 및 요약 요소
  const badgeDest = document.getElementById('badgeDest');
  const badgeDuration = document.getElementById('badgeDuration');
  const badgeCompanion = document.getElementById('badgeCompanion');
  const tripTitle = document.getElementById('tripTitle');
  const tripTagline = document.getElementById('tripTagline');
  const themeTagsContainer = document.getElementById('themeTagsContainer');
  
  const overviewSummary = document.getElementById('overviewSummary');
  const weatherAdvice = document.getElementById('weatherAdvice');
  const budgetTotal = document.getElementById('budgetTotal');
  const budgetTransit = document.getElementById('budgetTransit');
  const budgetHotel = document.getElementById('budgetHotel');
  const budgetFood = document.getElementById('budgetFood');
  const budgetActivities = document.getElementById('budgetActivities');
  const packingList = document.getElementById('packingList');

  // 일정표 컨테이너
  const dayTabsContainer = document.getElementById('dayTabsContainer');
  const dailyCardsContainer = document.getElementById('dailyCardsContainer');
  const practicalTipsList = document.getElementById('practicalTipsList');

  // 액션 버튼
  const btnCopyText = document.getElementById('btnCopyText');
  const btnPrint = document.getElementById('btnPrint');
  const toast = document.getElementById('toast');

  // 구글 지도 검색 URL 생성 헬퍼 함수
  function getGoogleMapsUrl(placeName, destination) {
    if (!placeName) return 'https://www.google.com/maps';
    let query = placeName.trim();
    if (destination) {
      const cleanDest = destination.split('&')[0].replace(/[\(\)\[\]]/g, ' ').trim();
      if (!query.includes(cleanDest) && cleanDest.length > 1) {
        query = `${query} ${cleanDest}`;
      }
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  // 윈도우 볼륨 슬라이더 금액 포맷 함수
  function formatKoreanWon(amount) {
    const num = Number(amount) || 0;
    if (num === 0) return '0원 (미포함)';
    const man = Math.floor(num / 10000);
    const rem = num % 10000;
    if (rem === 0) {
      return `${num.toLocaleString()}원 (${man}만원)`;
    }
    return `${num.toLocaleString()}원 (${man}만 ${rem.toLocaleString()}원)`;
  }

  // 슬라이더 바 트랙 채우기(Windows 볼륨 스타일) & 텍스트 갱신
  function updateSlider(slider, displayEl) {
    if (!slider) return;
    const val = Number(slider.value) || 0;
    const max = Number(slider.max) || 2000000;
    const pct = Math.min(100, Math.max(0, (val / max) * 100));
    slider.style.setProperty('--fill-pct', `${pct}%`);
    if (displayEl) {
      displayEl.textContent = formatKoreanWon(val);
    }
  }

  function updateAllBudgetSliders() {
    updateSlider(sliderFlight, dispBudgetFlight);
    updateSlider(sliderHotel, dispBudgetHotel);
    updateSlider(sliderTotal, dispBudgetTotal);

    const f = Number(sliderFlight?.value) || 0;
    const h = Number(sliderHotel?.value) || 0;
    const t = Number(sliderTotal?.value) || 0;

    // 배지 업데이트
    if (budgetSummaryBadge) {
      const man = Math.floor(t / 10000);
      budgetSummaryBadge.textContent = `총경비: ${t.toLocaleString()}원 (${man}만원)`;
    }

    // 남은 경비 계산 (총경비 - 항공권 - 숙박비)
    const remaining = t - (f + h);
    if (budgetCalcFeedback && budgetFeedbackText) {
      if (remaining >= 0) {
        budgetCalcFeedback.classList.remove('warning');
        budgetFeedbackText.innerHTML = `식비·관광·쇼핑 등 현지 여유 경비: <strong>약 ${formatKoreanWon(remaining)}</strong>`;
      } else {
        budgetCalcFeedback.classList.add('warning');
        budgetFeedbackText.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 총경비가 항공+숙박비보다 <strong>${formatKoreanWon(Math.abs(remaining))}</strong> 부족합니다. 총경비를 늘리거나 항목을 조절해주세요.`;
      }
    }
  }

  // 슬라이더 실시간 조작 이벤트 바인딩
  [sliderFlight, sliderHotel, sliderTotal].forEach(slider => {
    if (slider) {
      slider.addEventListener('input', updateAllBudgetSliders);
    }
  });

  // 초기 로드 시 슬라이더 상태 렌더링
  updateAllBudgetSliders();

  // 빠른 프리셋 데이터 정의 (항공권, 숙박비, 총경비 슬라이더 값 및 추천 일정 연동)
  const PRESETS = {
    osaka: {
      destination: '일본 오사카 & 교토',
      duration: '3박 4일',
      start_days_offset: 7,
      nights: 3,
      budget_flight: 300000,
      budget_hotel: 350000,
      budget_total: 950000,
      companion: '연인 / 커플 (로맨틱 & 데이트)',
      interests: ['맛집 & 미식 탐방', '감성 카페 & 힐링', '유명 명소 & 랜드마크', '야경 & 낭만적인 밤거리'],
      transportation: '대중교통 (지하철, 버스, 기차)',
      accommodation: '도심 중심 호텔 (교통 편리)',
      extra_requests: '도톤보리와 우메다 야경을 즐기고 싶고, 하루는 교토 청수사(기요미즈데라) 당일치기를 포함해주세요.'
    },
    jeju: {
      destination: '제주도',
      duration: '2박 3일',
      start_days_offset: 14,
      nights: 2,
      budget_flight: 150000,
      budget_hotel: 250000,
      budget_total: 600000,
      companion: '친구와 함께 (즐거운 추억 만들기)',
      interests: ['맛집 & 미식 탐방', '감성 카페 & 힐링', '자연 경관 & 산책', '액티비티 & 레저 체험'],
      transportation: '렌터카 / 자차 운전',
      accommodation: '자연 속 리조트 / 펜션 / 온천 료칸',
      extra_requests: '제주 서쪽(애월/협재)과 남쪽(서귀포) 위주로 오션뷰 카페와 흑돼지, 고기국수 맛집 추천해주세요.'
    },
    paris: {
      destination: '프랑스 파리',
      duration: '4박 5일',
      start_days_offset: 30,
      nights: 4,
      budget_flight: 1100000,
      budget_hotel: 600000,
      budget_total: 2000000,
      companion: '혼자 (나 홀로 자유여행)',
      interests: ['유명 명소 & 랜드마크', '역사 & 문화 유적', '감성 카페 & 힐링', '쇼핑 & 스트리트 패션'],
      transportation: '대중교통 (지하철, 버스, 기차)',
      accommodation: '도심 중심 호텔 (교통 편리)',
      extra_requests: '루브르와 오르세 미술관 관람, 센강 유람선(바토무슈) 탑승을 원하며 소매치기 주의 구역도 알려주세요.'
    }
  };

  // 관심사 우선순위 관리 (1, 2, 3...)
  let selectedPriorities = ['맛집 & 미식 탐방', '감성 카페 & 힐링', '유명 명소 & 랜드마크'];
  const priorityChips = document.querySelectorAll('.priority-chip-item');
  const prioritySummaryText = document.getElementById('prioritySummaryText');
  const btnResetInterests = document.getElementById('btnResetInterests');

  function updatePriorityChipsUI() {
    priorityChips.forEach(chip => {
      const theme = chip.dataset.theme;
      const badge = chip.querySelector('.priority-badge-pill');
      const idx = selectedPriorities.indexOf(theme);
      if (idx !== -1) {
        chip.classList.add('active');
        if (badge) {
          badge.style.display = 'inline-flex';
          badge.textContent = idx + 1;
        }
      } else {
        chip.classList.remove('active');
        if (badge) {
          badge.style.display = 'none';
        }
      }
    });

    if (prioritySummaryText) {
      if (selectedPriorities.length > 0) {
        prioritySummaryText.innerHTML = selectedPriorities
          .map((theme, idx) => `<span class="priority-order-tag">${idx + 1}순위: ${escapeHtml(theme.split(' ')[0])}</span>`)
          .join(' <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; color: #94a3b8;"></i> ');
      } else {
        prioritySummaryText.innerHTML = '<span style="color: #94a3b8;">관심사 칩을 클릭하는 순서대로 1, 2, 3... 우선순위가 자동 지정됩니다.</span>';
      }
    }
  }

  // 관심사 칩 클릭 이벤트: 클릭 순서대로 1, 2, 3... 지정
  priorityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const theme = chip.dataset.theme;
      const idx = selectedPriorities.indexOf(theme);
      if (idx !== -1) {
        // 이미 선택된 항목 클릭 시 제거 (우선순위 재정렬)
        selectedPriorities.splice(idx, 1);
      } else {
        // 미선택 항목 클릭 시 다음 우선순위로 추가
        selectedPriorities.push(theme);
      }
      updatePriorityChipsUI();
    });
  });

  // 우선순위 초기화 버튼
  if (btnResetInterests) {
    btnResetInterests.addEventListener('click', () => {
      selectedPriorities = [];
      updatePriorityChipsUI();
    });
  }

  // 초기 로드 시 관심사 우선순위 렌더링
  updatePriorityChipsUI();

  // 현재 로드된 여행 일정 데이터 캐시
  let currentTripData = null;

  // 1. 프리셋 버튼 이벤트 연결
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      const data = PRESETS[presetKey];
      if (!data) return;

      document.getElementById('destination').value = data.destination;
      document.getElementById('transportation').value = data.transportation;
      document.getElementById('accommodation').value = data.accommodation;
      document.getElementById('extra_requests').value = data.extra_requests;

      // 추천 날짜 자동 세팅
      if (data.start_days_offset !== undefined && startDateInput && endDateInput) {
        const s = addDays(today, data.start_days_offset);
        const e = addDays(s, data.nights || 3);
        startDateInput.value = formatDateYYYYMMDD(s);
        endDateInput.value = formatDateYYYYMMDD(e);
        calculateDurationFromDates();
      }

      // 슬라이더 예산 적용
      if (data.budget_flight !== undefined && sliderFlight) sliderFlight.value = data.budget_flight;
      if (data.budget_hotel !== undefined && sliderHotel) sliderHotel.value = data.budget_hotel;
      if (data.budget_total !== undefined && sliderTotal) sliderTotal.value = data.budget_total;
      updateAllBudgetSliders();

      // 라디오: 동행자
      const compRadio = document.querySelector(`input[name="companion"][value="${data.companion}"]`);
      if (compRadio) compRadio.checked = true;

      // 관심사 우선순위 적용
      if (data.interests && Array.isArray(data.interests)) {
        selectedPriorities = [...data.interests];
        updatePriorityChipsUI();
      }

      // 효과: 입력 필드로 부드럽게 스크롤
      document.getElementById('destination').focus();
    });
  });

  // 2. 폼 제출 이벤트 처리
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 폼 입력값 수집
    const destination = document.getElementById('destination').value.trim();
    const startDate = startDateInput?.value || '';
    const endDate = endDateInput?.value || '';
    const duration = durationInput?.value || '2박 3일';
    const transportation = document.getElementById('transportation').value;
    const accommodation = document.getElementById('accommodation').value;
    const extra_requests = document.getElementById('extra_requests').value.trim();

    // 슬라이더 예산 수집
    const budgetFlight = Number(sliderFlight?.value) || 0;
    const budgetHotel = Number(sliderHotel?.value) || 0;
    const budgetTotal = Number(sliderTotal?.value) || 0;

    const selectedCompanion = document.querySelector('input[name="companion"]:checked')?.value || '혼자';

    // 우선순위가 반영된 관심사 목록 생성
    const prioritizedInterests = selectedPriorities.length > 0 
      ? selectedPriorities.map((t, i) => `${i + 1}순위: ${t}`)
      : ['자유 여행 / 명소 탐방'];

    if (!destination) {
      alert('여행지를 입력해 주세요!');
      document.getElementById('destination').focus();
      return;
    }

    const payload = {
      destination,
      start_date: startDate,
      end_date: endDate,
      duration: duration,
      budget_flight: budgetFlight,
      budget_hotel: budgetHotel,
      budget_total: budgetTotal,
      budget: `총경비 ${formatKoreanWon(budgetTotal)} (항공권: ${formatKoreanWon(budgetFlight)}, 숙박비: ${formatKoreanWon(budgetHotel)})`,
      companion: selectedCompanion,
      interests: prioritizedInterests,
      transportation,
      accommodation,
      extra_requests
    };

    // UI 상태: 로딩 시작
    showLoadingState();

    try {
      // Flask 백엔드 REST API 호출
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || '일정 생성에 실패했습니다.');
      }

      // 결과 렌더링
      currentTripData = resData.data;
      renderTripPlan(resData.data);
      showResultState();

    } catch (err) {
      console.error('API Error:', err);
      showErrorState(err.message);
    }
  });

  // 3. 재시도 버튼
  btnRetry.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth' });
    hideAllStates();
    emptyState.style.display = 'block';
  });

  // 4. 로딩 상태 시뮬레이션 애니메이션 및 타이머 관리
  let animationTimers = [];

  function clearAnimationTimers() {
    animationTimers.forEach(t => clearTimeout(t));
    animationTimers = [];
  }

  function startStepAnimation() {
    clearAnimationTimers();
    const s1 = document.getElementById('step1');
    const s2 = document.getElementById('step2');
    const s3 = document.getElementById('step3');
    const loadingMessage = document.getElementById('loadingMessage');

    s1.className = 'step-item active';
    s2.className = 'step-item';
    s3.className = 'step-item';
    if (loadingMessage) {
      loadingMessage.textContent = '잠시만 기다려주세요 (약 5~10초 소요)';
    }

    animationTimers.push(setTimeout(() => {
      s1.className = 'step-item done';
      s2.className = 'step-item active';
    }, 2500));

    animationTimers.push(setTimeout(() => {
      s2.className = 'step-item done';
      s3.className = 'step-item active';
    }, 5500));

    // 트래픽 지연 및 재시도 감지 시 안내 문구 전환
    animationTimers.push(setTimeout(() => {
      if (loadingMessage) {
        loadingMessage.innerHTML = '<span style="color: #f59e0b;"><i class="fa-solid fa-arrows-rotate fa-spin"></i> 구글 AI 서버 트래픽이 많아 재시도하며 안전하게 연결 중입니다...</span>';
      }
    }, 8000));

    animationTimers.push(setTimeout(() => {
      if (loadingMessage) {
        loadingMessage.innerHTML = '<span style="color: #3b82f6;"><i class="fa-solid fa-wand-magic-sparkles fa-bounce"></i> 맞춤형 일정과 로컬 꿀팁을 구성하고 있습니다...</span>';
      }
    }, 18000));
  }

  function showLoadingState() {
    hideAllStates();
    loadingState.style.display = 'block';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 맞춤 일정 설계 중...';
    startStepAnimation();
  }

  function showResultState() {
    clearAnimationTimers();
    hideAllStates();
    resultContent.style.display = 'flex';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 맞춤 여행 일정 생성하기</span>';
    
    // 모바일 등에서 생성된 일정으로 스크롤 이동
    resultContent.scrollIntoView({ behavior: 'smooth' });
  }

  function showErrorState(msg) {
    clearAnimationTimers();
    hideAllStates();
    errorState.style.display = 'block';
    errorMessage.textContent = msg;

    // 만약 API 키 관련 오류라면 추가 가이드 표시
    if (msg.includes('GEMINI_API_KEY')) {
      errorGuide.style.display = 'block';
      errorGuide.innerHTML = `
        <strong>💡 API 키 설정 가이드:</strong><br>
        1. <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #2563eb; text-decoration: underline;">Google AI Studio</a>에서 무료 API 키를 발급받으세요.<br>
        2. 프로젝트 폴더의 <code>.env</code> 파일을 열고 <code>GEMINI_API_KEY=발급받은키</code>를 입력한 뒤 저장하세요.<br>
        3. 터미널의 서버를 재시작하거나 다시 생성 버튼을 누르면 정상 작동합니다.
      `;
    } else {
      errorGuide.style.display = 'none';
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-text"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 맞춤 여행 일정 생성하기</span>';
  }

  function hideAllStates() {
    clearAnimationTimers();
    emptyState.style.display = 'none';
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    resultContent.style.display = 'none';
  }

  // 5. 여행 일정 렌더링 함수
  function renderTripPlan(data) {
    // 1) 상단 배너
    badgeDest.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${escapeHtml(data.destination || '여행지')}`;
    const sDate = startDateInput?.value;
    const eDate = endDateInput?.value;
    if (sDate && eDate) {
      badgeDuration.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${escapeHtml(data.duration || '일정')} (${sDate} ~ ${eDate})`;
    } else {
      badgeDuration.innerHTML = `<i class="fa-regular fa-clock"></i> ${escapeHtml(data.duration || '일정')}`;
    }
    
    const companionVal = document.querySelector('input[name="companion"]:checked')?.value || '동행';
    badgeCompanion.innerHTML = `<i class="fa-solid fa-user-group"></i> ${escapeHtml(companionVal.split(' ')[0])}`;

    tripTitle.textContent = data.trip_title || `${data.destination} 맞춤 여행 일정`;
    tripTagline.textContent = data.tagline ? `“${data.tagline}”` : '';

    // 테마 태그
    themeTagsContainer.innerHTML = '';
    if (data.theme_tags && Array.isArray(data.theme_tags)) {
      data.theme_tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'theme-tag-pill';
        span.textContent = `#${tag}`;
        themeTagsContainer.appendChild(span);
      });
    }

    // 2) 개요 & 예산
    const overview = data.overview || {};
    overviewSummary.textContent = overview.summary || '즐겁고 안전한 여행이 되시길 바랍니다.';
    weatherAdvice.textContent = overview.weather_advice || '계절에 알맞은 편안한 복장과 운동화를 준비하세요.';

    const budget = overview.estimated_budget_breakdown || {};
    budgetTotal.textContent = budget.total_estimated || '현지 경비 확인 요망';

    // 총 예산 상태 코멘트 / 여유 경비 배너
    const budgetStatusBanner = document.getElementById('budgetStatusBanner');
    const budgetStatusText = document.getElementById('budgetStatusText');
    if (budgetStatusBanner && budgetStatusText) {
      if (budget.budget_status) {
        budgetStatusBanner.style.display = 'flex';
        budgetStatusText.textContent = budget.budget_status;
      } else if (budget.savings_or_margin) {
        budgetStatusBanner.style.display = 'flex';
        budgetStatusText.textContent = `설정 한도 대비: ${budget.savings_or_margin}`;
      } else {
        budgetStatusBanner.style.display = 'none';
      }
    }

    // 실제 조사 항공/교통비 & 세부 근거
    budgetTransit.textContent = budget.flights_transit || '-';
    const budgetTransitDetail = document.getElementById('budgetTransitDetail');
    if (budgetTransitDetail) {
      if (budget.flights_transit_detail) {
        budgetTransitDetail.style.display = 'block';
        budgetTransitDetail.textContent = budget.flights_transit_detail;
      } else {
        budgetTransitDetail.style.display = 'none';
      }
    }

    // 실제 조사 숙박비 & 세부 근거
    budgetHotel.textContent = budget.accommodation || '-';
    const budgetHotelDetail = document.getElementById('budgetHotelDetail');
    if (budgetHotelDetail) {
      if (budget.accommodation_detail) {
        budgetHotelDetail.style.display = 'block';
        budgetHotelDetail.textContent = budget.accommodation_detail;
      } else {
        budgetHotelDetail.style.display = 'none';
      }
    }

    // 식음료비 & 세부 근거
    budgetFood.textContent = budget.food || '-';
    const budgetFoodDetail = document.getElementById('budgetFoodDetail');
    if (budgetFoodDetail) {
      if (budget.food_detail) {
        budgetFoodDetail.style.display = 'block';
        budgetFoodDetail.textContent = budget.food_detail;
      } else {
        budgetFoodDetail.style.display = 'none';
      }
    }

    // 관광/체험비 & 세부 근거
    budgetActivities.textContent = budget.activities || '-';
    const budgetActivitiesDetail = document.getElementById('budgetActivitiesDetail');
    if (budgetActivitiesDetail) {
      if (budget.activities_detail) {
        budgetActivitiesDetail.style.display = 'block';
        budgetActivitiesDetail.textContent = budget.activities_detail;
      } else {
        budgetActivitiesDetail.style.display = 'none';
      }
    }

    // 사용자 설정 한도 배지 표시 (슬라이더에서 설정한 금액)
    const limitTransitBadge = document.getElementById('limitTransitBadge');
    const limitHotelBadge = document.getElementById('limitHotelBadge');
    const fLimitVal = Number(sliderFlight?.value) || 0;
    const hLimitVal = Number(sliderHotel?.value) || 0;

    if (limitTransitBadge) {
      if (fLimitVal > 0) {
        limitTransitBadge.style.display = 'inline-flex';
        limitTransitBadge.textContent = `한도 ${Math.floor(fLimitVal / 10000)}만원 내`;
      } else {
        limitTransitBadge.style.display = 'none';
      }
    }

    if (limitHotelBadge) {
      if (hLimitVal > 0) {
        limitHotelBadge.style.display = 'inline-flex';
        limitHotelBadge.textContent = `한도 ${Math.floor(hLimitVal / 10000)}만원 내`;
      } else {
        limitHotelBadge.style.display = 'none';
      }
    }

    // 준비물 리스트
    packingList.innerHTML = '';
    const essentials = overview.packing_essentials || ['여권/신분증', '보조배터리', '상비약', '편한 운동화'];
    essentials.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      packingList.appendChild(li);
    });

    // 3) 일자별 탭 및 일정 카드 생성
    renderDailyItinerary(data.daily_itinerary || []);

    // 4) 실전 꿀팁
    practicalTipsList.innerHTML = '';
    const tips = data.practical_tips || [
      '대중교통 이용 시 교통카드 또는 사전 패스권을 구매하면 경비를 크게 절약할 수 있습니다.',
      '해외 결제 수수료가 없는 트래블로그/트래블월렛 카드를 소지하시면 편리합니다.'
    ];
    tips.forEach(tip => {
      const li = document.createElement('li');
      li.textContent = tip;
      practicalTipsList.appendChild(li);
    });
  }

  // 6. 일자별 탭 & 타임라인 카드 렌더링
  function renderDailyItinerary(days) {
    dayTabsContainer.innerHTML = '';
    dailyCardsContainer.innerHTML = '';

    if (!days.length) {
      dailyCardsContainer.innerHTML = '<p style="color: #64748b;">상세 일정이 제공되지 않았습니다.</p>';
      return;
    }

    // "전체 보기" 탭 추가
    const allTabBtn = document.createElement('button');
    allTabBtn.type = 'button';
    allTabBtn.className = 'btn-day-tab active';
    allTabBtn.textContent = '전체 보기';
    allTabBtn.addEventListener('click', () => {
      setActiveDayTab(allTabBtn, 'all');
    });
    dayTabsContainer.appendChild(allTabBtn);

    // 각 일자별 탭 추가
    days.forEach((dayObj, idx) => {
      const dayNum = dayObj.day || (idx + 1);
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = 'btn-day-tab';
      tabBtn.textContent = `Day ${dayNum}`;
      tabBtn.addEventListener('click', () => {
        setActiveDayTab(tabBtn, dayNum);
      });
      dayTabsContainer.appendChild(tabBtn);

      // 일자별 카드 생성
      const dayCard = createDayCard(dayObj, dayNum);
      dailyCardsContainer.appendChild(dayCard);
    });
  }

  function setActiveDayTab(activeBtn, targetDay) {
    document.querySelectorAll('.btn-day-tab').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');

    const dayCards = document.querySelectorAll('.day-card');
    dayCards.forEach(card => {
      if (targetDay === 'all' || card.dataset.day == targetDay) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 일자별 카드 DOM 생성
  function createDayCard(dayObj, dayNum) {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.day = dayNum;

    // 헤더
    const header = document.createElement('div');
    header.className = 'day-card-header';
    header.innerHTML = `
      <div class="day-badge-title">
        <h4>${escapeHtml(dayObj.date_title || `Day ${dayNum}`)}</h4>
        ${dayObj.theme ? `<span class="day-theme-pill">${escapeHtml(dayObj.theme)}</span>` : ''}
      </div>
    `;
    card.appendChild(header);

    // 타임라인 스케줄
    const timeline = document.createElement('div');
    timeline.className = 'schedule-timeline';

    const schedules = dayObj.schedule || [];
    schedules.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'schedule-item';

      const cat = item.category || '관광';
      const catClass = `cat-${cat}`;
      const mapsUrl = getGoogleMapsUrl(item.place_name, currentTripData?.destination);

      itemEl.innerHTML = `
        <div class="item-top">
          <div class="item-time-cat">
            <span class="time-slot"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.time_slot || '')}</span>
            <span class="category-tag ${catClass}">${escapeHtml(cat)}</span>
          </div>
          <div class="item-meta">
            ${item.duration_hours ? `<span><i class="fa-regular fa-hourglass-half"></i> ${escapeHtml(item.duration_hours)}</span>` : ''}
            ${item.cost_estimate ? `<span><i class="fa-solid fa-coins"></i> ${escapeHtml(item.cost_estimate)}</span>` : ''}
          </div>
        </div>
        <div class="place-name-wrap">
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="place-name-link" title="구글 지도에서 '${escapeHtml(item.place_name || '')}' 위치 확인하기">
            <span class="place-name-text">${escapeHtml(item.place_name || '')}</span>
            <span class="maps-tag"><i class="fa-solid fa-map-location-dot"></i> 지도</span>
          </a>
        </div>
        <p class="place-desc">${escapeHtml(item.description || '')}</p>
        ${item.tips ? `
          <div class="place-tip-box">
            <i class="fa-regular fa-lightbulb"></i>
            <div><strong>Tip:</strong> ${escapeHtml(item.tips)}</div>
          </div>
        ` : ''}
      `;
      timeline.appendChild(itemEl);
    });

    card.appendChild(timeline);

    // 일차별 총괄 팁 & 일일 예상 총 금액
    if (dayObj.day_summary_tip || dayObj.daily_estimated_cost) {
      const summaryBox = document.createElement('div');
      summaryBox.className = 'day-summary-box';

      const costBadgeHtml = dayObj.daily_estimated_cost ? `
        <span class="day-cost-badge">
          <i class="fa-solid fa-coins"></i> 예상 총 금액: <strong>${escapeHtml(dayObj.daily_estimated_cost)}</strong>
        </span>
      ` : '';

      summaryBox.innerHTML = `
        <div class="day-summary-top">
          <div class="day-summary-title">
            <i class="fa-solid fa-circle-info"></i>
            <span>Day ${dayNum} 가이드 조언</span>
          </div>
          ${costBadgeHtml}
        </div>
        ${dayObj.day_summary_tip ? `<p class="day-summary-text">${escapeHtml(dayObj.day_summary_tip)}</p>` : ''}
      `;
      card.appendChild(summaryBox);
    }

    // 일차별 추천 숙소 2~3곳 비교 섹션 (가이드 조언 바로 밑에 배치)
    const accoms = dayObj.recommended_accommodations || dayObj.recommended_hotels || dayObj.accommodations || [];
    if (accoms && accoms.length > 0) {
      const accomSection = document.createElement('div');
      accomSection.className = 'day-accommodations-section';

      let cardsHtml = '';
      accoms.forEach((acc, aIdx) => {
        const accName = acc.name || '추천 숙소';
        const isNoStay = accName.includes('숙박 없음') || accName.includes('귀국');
        const accMapsUrl = getGoogleMapsUrl(accName, currentTripData?.destination);

        cardsHtml += `
          <div class="accom-card ${isNoStay ? 'accom-card-nostay' : ''}">
            <div class="accom-card-top">
              <span class="accom-rank-pill"><i class="fa-solid fa-hotel"></i> 추천 ${aIdx + 1}</span>
              ${acc.type ? `<span class="accom-type-pill">${escapeHtml(acc.type)}</span>` : ''}
              ${acc.price_range ? `<span class="accom-price-pill"><i class="fa-solid fa-coins"></i> ${escapeHtml(acc.price_range)}</span>` : ''}
            </div>
            <div class="accom-name-box">
              ${isNoStay ? `
                <span class="accom-name-static">${escapeHtml(accName)}</span>
              ` : `
                <a href="${accMapsUrl}" target="_blank" rel="noopener noreferrer" class="accom-name-link" title="구글 지도에서 '${escapeHtml(accName)}' 위치 및 리뷰 보기">
                  <span class="accom-name-text">${escapeHtml(accName)}</span>
                  <i class="fa-solid fa-arrow-up-right-from-square accom-link-icon"></i>
                </a>
              `}
            </div>
            ${acc.highlights ? `
              <p class="accom-highlights">
                <i class="fa-solid fa-circle-check"></i>
                <span>${escapeHtml(acc.highlights)}</span>
              </p>
            ` : ''}
            ${!isNoStay ? `
              <div class="accom-card-action">
                <a href="${accMapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-accom-maps">
                  <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 위치 확인
                </a>
              </div>
            ` : ''}
          </div>
        `;
      });

      accomSection.innerHTML = `
        <div class="day-accom-header">
          <div class="day-accom-title">
            <i class="fa-solid fa-bed"></i>
            <span>Day ${dayNum} 추천 숙소 비교 (2~3선)</span>
          </div>
          <span class="day-accom-sub">동선 최적화 & 예산 맞춤 추천</span>
        </div>
        <div class="accommodations-grid">
          ${cardsHtml}
        </div>
      `;
      card.appendChild(accomSection);
    }

    return card;
  }

  // 7. 일정 복사 기능
  btnCopyText.addEventListener('click', () => {
    if (!currentTripData) return;

    let text = `✈️ [AI 여행 플래너] ${currentTripData.trip_title}\n`;
    text += `📍 여행지: ${currentTripData.destination} | 기간: ${currentTripData.duration}` + 
      (startDateInput?.value && endDateInput?.value ? ` (${startDateInput.value} ~ ${endDateInput.value})\n` : `\n`);
    if (currentTripData.tagline) text += `💬 "${currentTripData.tagline}"\n`;
    text += `\n[여행 개요]\n${currentTripData.overview?.summary || ''}\n`;
    
    if (currentTripData.overview?.estimated_budget_breakdown?.total_estimated) {
      const b = currentTripData.overview.estimated_budget_breakdown;
      text += `\n💰 [AI 조사 산출 예산]\n`;
      text += `• 총 예상 경비: ${b.total_estimated}\n`;
      if (b.budget_status) text += `  * 현황: ${b.budget_status}\n`;
      text += `• 항공/교통비: ${b.flights_transit || '-'}`;
      if (b.flights_transit_detail) text += ` (${b.flights_transit_detail})`;
      text += `\n• 숙박비: ${b.accommodation || '-'}`;
      if (b.accommodation_detail) text += ` (${b.accommodation_detail})`;
      text += `\n• 식음료비: ${b.food || '-'}`;
      if (b.food_detail) text += ` (${b.food_detail})`;
      text += `\n• 관광/체험비: ${b.activities || '-'}`;
      if (b.activities_detail) text += ` (${b.activities_detail})`;
      text += `\n`;
    }

    text += `\n==============================\n`;
    (currentTripData.daily_itinerary || []).forEach((day, idx) => {
      text += `\n📅 ${day.date_title || `Day ${day.day || idx + 1}`}\n`;
      if (day.daily_estimated_cost) text += `💰 Day ${day.day || idx + 1} 예상 총 금액: ${day.daily_estimated_cost}\n`;
      (day.schedule || []).forEach(s => {
        text += `• [${s.time_slot}] ${s.place_name} (${s.category})\n  - ${s.description}\n`;
        if (s.tips) text += `  * 팁: ${s.tips}\n`;
      });
      if (day.day_summary_tip) text += `💡 가이드 조언: ${day.day_summary_tip}\n`;
      
      const dayAccoms = day.recommended_accommodations || day.recommended_hotels || day.accommodations || [];
      if (dayAccoms.length > 0) {
        text += `🏨 추천 숙소 비교:\n`;
        dayAccoms.forEach((acc, i) => {
          text += `  - [추천 ${i + 1}] ${acc.name || ''} [${acc.type || '숙소'}] (${acc.price_range || ''}): ${acc.highlights || ''}\n`;
        });
      }
    });

    text += `\n==============================\n`;
    text += `📌 실전 꿀팁:\n`;
    (currentTripData.practical_tips || []).forEach(t => {
      text += `- ${t}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('일정 내용이 클립보드에 복사되었습니다!');
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
      showToast('클립보드 복사에 실패했습니다.');
    });
  });

  // 8. PDF / 인쇄 기능
  btnPrint.addEventListener('click', () => {
    // 인쇄 시 모든 날짜 카드가 보이도록 전체 탭 활성화
    const allTabBtn = dayTabsContainer.querySelector('.btn-day-tab');
    if (allTabBtn) allTabBtn.click();
    window.print();
  });

  // 9. 토스트 알림 헬퍼
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // 10. XSS 방지를 위한 HTML 이스케이프 함수
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
