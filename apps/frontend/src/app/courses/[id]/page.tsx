import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-storm.app';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  durationHours: number;
}

async function getCourse(id: string): Promise<Course | null> {
  try {
    const res = await fetch(`${API_URL}/courses/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    // handle both { data: course } and bare course shapes
    return json?.data ?? json;
  } catch {
    return null;
  }
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const course = await getCourse(params.id);

  if (!course) {
    return {
      title: 'Course Not Found | Brain-Storm',
      robots: { index: false },
    };
  }

  const title = `${course.title} | Brain-Storm`;
  const description = course.description?.slice(0, 160) || 'Learn blockchain development on Stellar.';
  const canonical = `${SITE_URL}/courses/${course.id}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Brain-Storm',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await getCourse(params.id);

  if (!course) {
    return (
      <main className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-gray-500">Course not found.</p>
        <Link href="/courses" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Courses
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-4">
      <Link href="/courses" className="text-sm text-blue-600 hover:underline">
        ← Back to Courses
      </Link>
      <h1 className="text-3xl font-bold">{course.title}</h1>
      <p className="text-gray-500 text-sm">
        {course.level} · {course.durationHours}h
      </p>
      <p className="text-gray-700 leading-relaxed">{course.description}</p>
    </main>
  );
}
