// src/lib/authErrors.ts
//
// Turns whatever Firebase Auth throws into a stable "auth/..." code and a
// message the person can act on. Needed because the error doesn't always come
// back as a clean FirebaseError: some paths surface the raw Identity Toolkit
// body instead, e.g.
//   {"error":{"code":400,"message":"EMAIL_EXISTS", ...}}
// which has no usable `.code`.

const SERVER_CODE_MAP: [RegExp, string][] = [
    [/EMAIL_EXISTS/i, 'auth/email-already-in-use'],
    [/CREDENTIAL_ALREADY_IN_USE/i, 'auth/credential-already-in-use'],
    [/INVALID_LOGIN_CREDENTIALS|INVALID_CREDENTIAL|INVALID_PASSWORD|REQUEST_HAD_INVALID_AUTHENTICATION_CREDENTIALS/i, 'auth/invalid-credential'],
    [/EMAIL_NOT_FOUND/i, 'auth/user-not-found'],
    [/WEAK_PASSWORD/i, 'auth/weak-password'],
    [/INVALID_EMAIL/i, 'auth/invalid-email'],
    [/TOO_MANY_ATTEMPTS_TRY_LATER/i, 'auth/too-many-requests'],
    [/USER_DISABLED/i, 'auth/user-disabled'],
    [/NETWORK/i, 'auth/network-request-failed'],
];

export function normalizeAuthErrorCode(err: unknown): string {
    const e = err as any;
    if (typeof e?.code === 'string' && e.code.startsWith('auth/')) return e.code;

    const raw: string =
        e?.customData?._tokenResponse?.error?.message ||
        e?.error?.message ||
        e?.message ||
        (typeof err === 'string' ? err : '') ||
        '';
    for (const [pattern, code] of SERVER_CODE_MAP) {
        if (pattern.test(raw)) return code;
    }
    return typeof e?.code === 'string' ? e.code : '';
}

/** Our own API routes throw plain Errors with a safe message and no `.code`. */
function ownServerMessage(err: unknown): string | null {
    if (err instanceof Error && !(err as any).code && err.message && !/firebase|auth\//i.test(err.message)) {
        return err.message;
    }
    return null;
}

const CREDENTIAL_CODES = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'];
export const isCredentialError = (code: string) => CREDENTIAL_CODES.includes(code);

export function signupErrorMessage(err: unknown): string {
    switch (normalizeAuthErrorCode(err)) {
        case 'auth/email-already-in-use':
            return "An account with this email already exists, but the password you entered doesn't match it. Use that account's password, or log in instead.";
        case 'auth/weak-password':
            return 'That password is too weak. Please use at least 6 characters.';
        case 'auth/invalid-email':
            return "That email address doesn't look right. Please check it and try again.";
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a few minutes and try again.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        default:
            return ownServerMessage(err) ?? 'Something went wrong. Please try again.';
    }
}

export function loginErrorMessage(err: unknown): string {
    const code = normalizeAuthErrorCode(err);
    if (isCredentialError(code)) return 'Invalid email or password.'; // deliberately one message for "wrong password" and "no such account"
    switch (code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please wait a few minutes, or reset your password, then try again.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.';
        default:
            return 'Something went wrong. Please try again.';
    }
}
