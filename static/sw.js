/**
 * AI 맞춤형 여행 플래너 - Progressive Web App (PWA) Service Worker
 * 버전: v1.0.0
 */

const CACHE_NAME = 'ai-travel-planner-v1';

// 오프라인 및 빠른 로딩을 위한 핵심 정적 자원 목록
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. 설치(Install) 이벤트: 핵심 정적 자원 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 핵심 정적 자원 사전 캐싱 중...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] 일부 자원 캐싱 실패 (계속 진행):', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. 활성화(Activate) 이벤트: 이전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] 이전 캐시 삭제:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. 네트워크 요청(Fetch) 이벤트
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // API 요청 (/api/...)은 항상 네트워크로 직접 전송 (캐시 제외)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // GET 요청에 대해서만 캐시 전략 적용
  if (event.request.method !== 'GET') {
    return;
  }

  // Stale-While-Revalidate 전략: 캐시 우선 반환 후 백그라운드에서 최신화
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // 유효한 응답만 캐시에 저장
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[Service Worker] 네트워크 오프라인 상태:', err);
          // 오프라인이고 캐시도 없으면 fallback (루트 페이지)
          if (!cachedResponse && event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
