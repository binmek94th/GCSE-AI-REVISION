import { ImageResponse } from "next/og";

// Generated at build time: the preview card shown when the site is shared on WhatsApp, X, Slack, etc.
export const alt = "StudyCedo – AI revision for GCSE and A-Level";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: 80,
                    background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                    color: "white",
                }}
            >
                <div style={{ fontSize: 44, fontWeight: 700, opacity: 0.9 }}>StudyCedo</div>
                <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>
                    Revision that adapts to you
                </div>
                <div style={{ fontSize: 34, marginTop: 28, opacity: 0.92 }}>
                    AI study plans, quizzes and mocks for GCSE &amp; A-Level
                </div>
            </div>
        ),
        size,
    );
}
