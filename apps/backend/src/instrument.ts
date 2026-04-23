import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry before any other imports
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.GIT_COMMIT_SHA || 'unknown',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event, _hint) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
      }
    }
    return event;
  },
});
