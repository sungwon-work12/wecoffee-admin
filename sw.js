// sw.js
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '위커피 알림';
  const options = {
    body: data.body || '새로운 소식이 있습니다.',
    icon: 'https://cdn.prod.website-files.com/67d58619cd2bfc505c3f713a/67d5867ba383cf9945f323d9_%E1%84%8B%E1%85%B1%E1%84%8F%E1%85%A5%E1%84%91%E1%85%B5%20%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9-01.png', // 위커피 로고
    badge: 'https://cdn.prod.website-files.com/67d58619cd2bfc505c3f713a/67d5867ba383cf9945f323d9_%E1%84%8B%E1%85%B1%E1%84%8F%E1%85%A5%E1%84%91%E1%85%B5%20%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9-01.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/')); // 알림 클릭 시 사이트로 이동
});
