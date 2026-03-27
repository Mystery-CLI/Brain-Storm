'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

// ── Types ────────────────────────────────────────────────────────────────────

interface LessonDraft {
  id: string;
  title: string;
  content: string;
  videoUrl: string;
  durationMinutes: number;
}

interface ModuleDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

// ── Sortable Module Card ──────────────────────────────────────────────────────

function SortableModule({
  mod,
  index,
  onUpdate,
  onRemove,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
}: {
  mod: ModuleDraft;
  index: number;
  onUpdate: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onAddLesson: (moduleId: string) => void;
  onUpdateLesson: (moduleId: string, lessonId: string, field: keyof LessonDraft, value: string | number) => void;
  onRemoveLesson: (moduleId: string, lessonId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white shadow-sm">
      {/* Module header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gray-50 rounded-t-lg">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        <span className="text-sm font-medium text-gray-500 w-6">M{index + 1}</span>
        <input
          className="flex-1 border rounded px-3 py-1.5 text-sm font-medium"
          placeholder="Module title"
          value={mod.title}
          onChange={(e) => onUpdate(mod.id, e.target.value)}
        />
        <button
          type="button"
          onClick={() => onRemove(mod.id)}
          className="text-red-400 hover:text-red-600 text-sm px-2"
        >
          ✕
        </button>
      </div>

      {/* Lessons */}
      <div className="p-4 space-y-3">
        {mod.lessons.map((lesson, li) => (
          <div key={lesson.id} className="border rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5">L{li + 1}</span>
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Lesson title"
                value={lesson.title}
                onChange={(e) => onUpdateLesson(mod.id, lesson.id, 'title', e.target.value)}
              />
              <button
                type="button"
                onClick={() => onRemoveLesson(mod.id, lesson.id)}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm"
              rows={2}
              placeholder="Lesson content"
              value={lesson.content}
              onChange={(e) => onUpdateLesson(mod.id, lesson.id, 'content', e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Video URL (optional)"
                value={lesson.videoUrl}
                onChange={(e) => onUpdateLesson(mod.id, lesson.id, 'videoUrl', e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="w-28 border rounded px-2 py-1 text-sm"
                placeholder="Duration (min)"
                value={lesson.durationMinutes || ''}
                onChange={(e) => onUpdateLesson(mod.id, lesson.id, 'durationMinutes', Number(e.target.value))}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onAddLesson(mod.id)}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Lesson
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NewCoursePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    level: 'beginner',
    durationHours: '',
  });
  const [modules, setModules] = useState<ModuleDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  // ── Module helpers ──────────────────────────────────────────────────────────

  const addModule = () =>
    setModules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', lessons: [] },
    ]);

  const updateModule = (id: string, title: string) =>
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title } : m)));

  const removeModule = (id: string) =>
    setModules((prev) => prev.filter((m) => m.id !== id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setModules((prev) => {
        const oldIndex = prev.findIndex((m) => m.id === active.id);
        const newIndex = prev.findIndex((m) => m.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  // ── Lesson helpers ──────────────────────────────────────────────────────────

  const addLesson = (moduleId: string) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                { id: crypto.randomUUID(), title: '', content: '', videoUrl: '', durationMinutes: 0 },
              ],
            }
          : m,
      ),
    );

  const updateLesson = (
    moduleId: string,
    lessonId: string,
    field: keyof LessonDraft,
    value: string | number,
  ) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l)) }
          : m,
      ),
    );

  const removeLesson = (moduleId: string, lessonId: string) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m,
      ),
    );

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required.');
    setError('');
    setSubmitting(true);

    try {
      // 1. Create course
      const { data: course } = await api.post('/courses', {
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level,
        durationHours: Number(form.durationHours) || 0,
      });

      const courseId: string = course?.data?.id ?? course?.id;

      // 2. Create modules + lessons sequentially
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        const { data: createdMod } = await api.post(`/courses/${courseId}/modules`, {
          title: mod.title || `Module ${i + 1}`,
          order: i,
        });

        const moduleId: string = createdMod?.data?.id ?? createdMod?.id;

        for (let j = 0; j < mod.lessons.length; j++) {
          const lesson = mod.lessons[j];
          await api.post(`/modules/${moduleId}/lessons`, {
            title: lesson.title || `Lesson ${j + 1}`,
            content: lesson.content,
            videoUrl: lesson.videoUrl || undefined,
            durationMinutes: lesson.durationMinutes || 0,
            order: j,
          });
        }
      }

      router.push(`/courses/${courseId}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Are you logged in as an instructor?';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="text-gray-500 mt-1 text-sm">Fill in the details, then build your modules and lessons.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Course details ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Course Details</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Intro to Stellar Blockchain"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={4}
              placeholder="What will students learn?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Level</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Duration (hours)</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. 8"
                value={form.durationHours}
                onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* ── Module builder ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Modules &amp; Lessons</h2>
          <p className="text-sm text-gray-500">Drag modules to reorder them.</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {modules.map((mod, i) => (
                  <SortableModule
                    key={mod.id}
                    mod={mod}
                    index={i}
                    onUpdate={updateModule}
                    onRemove={removeModule}
                    onAddLesson={addLesson}
                    onUpdateLesson={updateLesson}
                    onRemoveLesson={removeLesson}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button type="button" variant="outline" onClick={addModule}>
            + Add Module
          </Button>
        </section>

        {/* ── Error + submit ── */}
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Course'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
