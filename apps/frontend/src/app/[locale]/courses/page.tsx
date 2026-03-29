import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function CoursesPage() {
  const t = useTranslations('courses');

  const courses = [
    { id: 1, title: 'Intro to Stellar Blockchain', level: 'Beginner' as const, duration: '4h' },
    { id: 2, title: 'Soroban Smart Contracts', level: 'Intermediate' as const, duration: '8h' },
    { id: 3, title: 'DeFi on Stellar', level: 'Advanced' as const, duration: '12h' },
  ];

  return (
    <ProtectedRoute>
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('title')}</h1>
        {/* List semantics so screen readers announce item count */}
        <ul className="grid gap-4 list-none p-0">
          {courses.map((course) => (
            <li
              key={course.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
              <p className="text-gray-700 dark:text-gray-400 mt-1">
                {t(`levels.${course.level}`)} · {course.duration}
              </p>
              <Link
                href={`/courses/${course.id}`}
                aria-label={t('viewCourseLabel', { title: course.title })}
                className="mt-3 inline-block text-blue-700 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {t('viewCourse')}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </ProtectedRoute>
  );
}
      </div>
    </main>
  );
}
