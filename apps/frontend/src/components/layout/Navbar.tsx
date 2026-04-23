'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount, clearUnread } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.endsWith(href)
      ? 'text-blue-600 dark:text-blue-400 font-semibold'
      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white';

  const navLinks = (
    <>
      <Link
        href="/courses"
        aria-current={pathname.endsWith('/courses') ? 'page' : undefined}
        className={`text-sm transition-colors ${isActive('/courses')}`}
        onClick={() => setMenuOpen(false)}
      >
        Courses
      </Link>
      {isAuthenticated && (
        <Link
          href="/dashboard"
          aria-current={pathname.endsWith('/dashboard') ? 'page' : undefined}
          className={`text-sm transition-colors ${isActive('/dashboard')}`}
          onClick={() => setMenuOpen(false)}
        >
          Dashboard
        </Link>
      )}
    </>
  );

  return (
    <nav
      aria-label="Site navigation"
      className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors relative z-40"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-lg text-gray-900 dark:text-white">
          Brain-Storm
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          {navLinks}
          <LanguageSwitcher />
          <ThemeToggle />
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <Link
                href="/notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                onClick={clearUnread}
                className="relative p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  aria-label="User menu"
                  className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-300">
                      {user.username[0]?.toUpperCase()}
                    </span>
                  )}
                </button>
                {dropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
                  >
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/credentials"
                      role="menuitem"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Credentials
                    </Link>
                    <button
                      role="menuitem"
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col gap-3 bg-white dark:bg-gray-900">
          {navLinks}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                className="text-sm text-gray-700 dark:text-gray-200"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/credentials"
                className="text-sm text-gray-700 dark:text-gray-200"
                onClick={() => setMenuOpen(false)}
              >
                Credentials
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="text-left text-sm text-red-600 dark:text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-gray-700 dark:text-gray-200"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
