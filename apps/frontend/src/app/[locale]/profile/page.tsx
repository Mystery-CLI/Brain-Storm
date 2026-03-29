'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import WalletSection from './WalletSection';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface User {
  id: string;
  username: string;
  email: string;
  bio: string;
  role: string;
  avatarUrl: string;
  createdAt: string;
  stellarPublicKey?: string;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', bio: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/users/me').then((r) => {
      setUser(r.data);
      setForm({ username: r.data.username, bio: r.data.bio ?? '', avatarUrl: r.data.avatarUrl ?? '' });
    });
  }, []);

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto p-8 text-gray-900 dark:text-gray-100">
        <p role="status" aria-live="polite">{t('loading')}</p>
      </main>
    );
  }
  if (!user) return (
    <main className="max-w-2xl mx-auto p-8 text-gray-900 dark:text-gray-100">{t('loading')}</main>
  );

  const joinedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(user.createdAt));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data } = await api.patch(`/users/${user.id}`, form);
    setUser({ ...user, ...data });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onWalletLinked = (key: string) => setUser({ ...user, stellarPublicKey: key });
  const onWalletUnlinked = () => setUser({ ...user, stellarPublicKey: undefined });

  return (
    <ProtectedRoute>
      <main className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={t('avatarAlt', { name: user.username })}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover"
            loading="eager"
            priority
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl font-bold text-blue-700 dark:text-blue-300 select-none"
          >
            {user.username[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
          <p className="text-gray-700 dark:text-gray-400 text-sm">
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
          : <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-300">{user.username[0]?.toUpperCase()}</div>
        }
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {user.email} · {user.role} · {t('joined', { date: joinedDate })}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4" noValidate>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('editProfile')}</h2>

        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {t('username')}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('editProfile')}</h2>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('username')}</label>
          <input
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {t('bio')}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('bio')}</label>
          <textarea
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="avatarUrl" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {t('avatarUrl')}
          </label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            autoComplete="photo"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('avatarUrl')}</label>
          <input
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
          />
        </div>

        {/* Live region announces save state to screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {saved ? t('saved') : ''}
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
        </Button>
      </form>

      <WalletSection
        userId={user.id}
        stellarPublicKey={user.stellarPublicKey}
        onLinked={onWalletLinked}
        onUnlinked={onWalletUnlinked}
      />
    </main>
    </ProtectedRoute>
  );
}
