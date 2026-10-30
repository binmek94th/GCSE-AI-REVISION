// Pieces shared by the tutor landing page and its navigation.
// No "use client" here: these are plain components, so both the (server) layout
// side and the (client) page/nav can import them.
import Link from "next/link";
import Image from "next/image";

// Where the tutor buttons go (real routes in the app).
export const TUTOR_SIGNUP = "/tutors/signup";
export const TUTOR_LOGIN = "/tutors/login";
export const TUTOR_DASHBOARD = "/tutors/dashboard";

export function Brand({ footer = false }: { footer?: boolean }) {
    return (
            <Link href={"/"} className={"flex"}>
                <Image
                    width={120}
                    height={26}
                    src="/StudyCedoLogo.png"
                    alt="logo"
                />
                <span className={`text-xl font-extrabold tracking-[-0.035em] ${footer ? "text-white" : "text-slate-950"}`}>
          </span>
                <span className={`rounded-full px-2.5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] ${footer ? "bg-white/10 text-blue-100" : "bg-violet-100 text-violet-700"}`}>
            For Tutors
          </span>
            </Link>
    );
}

// Every call-to-action button creates a tutor account unless told otherwise.
// Internal routes use next/link (client-side navigation); "#section" links stay plain anchors.
export function PrimaryButton({ children, href = TUTOR_SIGNUP, className = "" }: { children: React.ReactNode; href?: string; className?: string }) {
    const classes = `inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 ${className}`;
    return href.startsWith("/") ? (
        <Link href={href} className={classes}>{children}</Link>
    ) : (
        <a href={href} className={classes}>{children}</a>
    );
}
