import { NextResponse } from "next/server";
import OpenAI from "openai";
import admin from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const { messages } = await req.json();

        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
            You are a school assistant AI.  
            Rules:
            1. Only respond if the user's question is school-related (math, physics, chemistry, biology, history, geography, literature, science, exams, essays, homework, etc).  
            2. If the question is NOT school-related, politely decline: "I can only help with school-related questions. 📚"  
            3. Always return JSON:
            {
              "title": "string",
              "sections": [
                { "heading": "string", "content": ["bullet", "points"] }
              ]
            }
          `,
                },
                ...messages,
            ],
            response_format: { type: "json_object" },
        });

        const tokensUsed = completion.usage?.total_tokens ?? 0;

        await checkAITutorBadges(uid);

        return NextResponse.json({
            allowed: true,
            data: completion.choices[0].message,
            tokensUsed,
        });

    } catch (err: any) {
        console.error("AI Chat Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function checkAITutorBadges(userId: string) {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const data = userSnap.data();

    const badges = data?.badges?.tutor || [];
    const aiStats = data?.stats?.aiInteractions || { total: 0, weekCount: 0, lastInteraction: null };
    const newBadges = [...badges];

    const now = new Date();
    const lastInteraction = aiStats.lastInteraction ? new Date(aiStats.lastInteraction) : null;

    const daysSinceLast = lastInteraction
        ? Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const weekCount = daysSinceLast !== null && daysSinceLast <= 7 ? aiStats.weekCount + 1 : 1;

    if (weekCount >= 10 && !badges.includes("Tutor Whisperer")) {
        newBadges.push("Tutor Whisperer");
    }

    await userRef.update({
        "stats.aiInteractions": {
            total: (aiStats.total || 0) + 1,
            weekCount,
            lastInteraction: now.toISOString(),
        },
        ...(newBadges.length > badges.length && { "badges.tutor": newBadges }),
    });
}