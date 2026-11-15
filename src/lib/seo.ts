// Single source of truth for SEO values. Import from here instead of repeating them.

export const SITE_NAME = "StudyCedo";

// Set NEXT_PUBLIC_BASE_URL in production to your real domain, e.g. https://www.studycedo.com
// (it is the same variable Stripe checkout already uses). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const SITE_DESCRIPTION =
    "StudyCedo is an AI revision platform for GCSE and A-Level students. Get a free personalised study plan, exam-focused notes, quizzes, mock exams and an AI tutor built around your weak topics and exam date.";

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
