import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';

// Mock next/navigation and next-intl so the component renders in jsdom
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Use the non-locale courses page (pure component, no async server component)
import CoursesPage from '@/app/courses/page';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CoursesPage', () => {
  it('renders the courses heading', () => {
    render(<CoursesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders all static course titles', () => {
    render(<CoursesPage />);
    expect(screen.getByText('Intro to Stellar Blockchain')).toBeInTheDocument();
    expect(screen.getByText('Soroban Smart Contracts')).toBeInTheDocument();
    expect(screen.getByText('DeFi on Stellar')).toBeInTheDocument();
  });

  it('renders view course links for each course', () => {
    render(<CoursesPage />);
    const links = screen.getAllByRole('link');
    // Each course has a link to its detail page
    expect(links.length).toBeGreaterThanOrEqual(3);
  });

  it('links point to correct course detail URLs', () => {
    render(<CoursesPage />);
    const links = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/courses/'));
    expect(links[0]).toHaveAttribute('href', '/courses/1');
    expect(links[1]).toHaveAttribute('href', '/courses/2');
  });
});
