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
    }),
  ),
];
