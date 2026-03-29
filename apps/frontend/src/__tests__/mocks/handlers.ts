import { http, HttpResponse } from 'msw';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const handlers = [
  http.get(`${BASE}/courses`, () =>
    HttpResponse.json({
      data: [
        { id: '1', title: 'Intro to Stellar Blockchain', level: 'beginner', durationHours: 4, isPublished: true },
        { id: '2', title: 'Soroban Smart Contracts', level: 'intermediate', durationHours: 8, isPublished: true },
      ],
      total: 2,
      page: 1,
      limit: 20,
    }),
  ),

  http.get(`${BASE}/users/me`, () =>
    HttpResponse.json({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student',
      avatarUrl: '',
      bio: '',
      createdAt: '2024-01-01T00:00:00.000Z',
      stellarPublicKey: 'GABC...',
    }),
  ),

  http.get(`${BASE}/users/user-1/token-balance`, () =>
    HttpResponse.json({ balance: 850 }),
  ),

  http.get(`${BASE}/users/user-1/progress`, () =>
    HttpResponse.json([
      { id: 'progress-1', userId: 'user-1', courseId: '1', progressPct: 45 },
      { id: 'progress-2', userId: 'user-1', courseId: '2', progressPct: 100 },
    ]),
  ),

  http.get(`${BASE}/credentials/user-1`, () =>
    HttpResponse.json([
      { id: 'cred-123', userId: 'user-1', courseId: '2', issuedAt: '2026-03-28T15:00:00.000Z', course: { id: '2', title: 'Soroban Smart Contracts' } },
    ]),
  ),

  http.get(`${BASE}/courses/1`, () =>
    HttpResponse.json({ id: '1', title: 'Intro to Stellar Blockchain' }),
  ),

  http.get(`${BASE}/courses/2`, () =>
    HttpResponse.json({ id: '2', title: 'Soroban Smart Contracts' }),
  ),
];
