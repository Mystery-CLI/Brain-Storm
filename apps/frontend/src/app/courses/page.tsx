'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    })
    .catch((err) => {
      throw err;
    });

type Course = {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  description?: string;
};

type CoursesResponse = {
  data: Course[];
  total: number;
  page: number;
  limit: number;
};

function SkeletonCard() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const currentSearch = searchParams.get('search') ?? '';
    const currentLevel = searchParams.get('level') ?? '';
    const currentPage = Number(searchParams.get('page') ?? '1') || 1;

    setQuery(currentSearch);
    setLevel(currentLevel);
    setPage(currentPage);
  }, [searchParams]);

  const apiParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (level) params.set('level', level);
    params.set('page', String(page));
    params.set('limit', '5');
    return params;
  }, [query, level, page]);

  const { data, error, isLoading } = useSWR<CoursesResponse>(
    `/courses?${apiParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const courses = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 5;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateUrl = (nextSearch: string, nextLevel: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set('search', nextSearch.trim());
    if (nextLevel) params.set('level', nextLevel);
    params.set('page', String(nextPage));
    router.push(`/courses?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateUrl(query, level, 1);
  };

  const handlePrevious = () => {
    if (page > 1) updateUrl(query, level, page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) updateUrl(query, level, page + 1);
  };

  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Courses</h1>

        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20">
            Error: {error.message}
          </div>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => <SkeletonCard key={idx} />)
          ) : courses.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No courses match those filters.</p>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {course.title}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {course.level} · {course.durationHours ?? '-'}h
                </p>
                <Link
                  href={`/courses/${course.id}`}
                  className="mt-3 inline-block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Course →
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={page <= 1 || isLoading}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <button
            onClick={handleNext}
            disabled={page >= totalPages || isLoading}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
