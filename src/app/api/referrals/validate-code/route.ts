import { NextRequest, NextResponse } from 'next/server';
import { resolveTutorByReferralCode } from '@/lib/referral';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
        return NextResponse.json({ valid: false });
    }

    const tutor = await resolveTutorByReferralCode(code);
    if (!tutor) {
        return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true, tutorName: tutor.name });
}