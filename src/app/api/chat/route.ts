import { NextResponse } from "next/server";
import OpenAI from "openai";
import admin from "@/lib/firebaseAdmin";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);

        const userDoc = await userRef.get();
        if (!userDoc.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const data = userDoc.data();
        const tokens = data?.tokens ?? 1000; 
        const subscription = data?.subscription ?? { status: null };

        if (tokens <= 0 && subscription.status !== "active") {
            return NextResponse.json(
                { allowed: false, message: "Subscribe to continue" },
                { status: 403 }
            );
        }

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

        if (subscription.status !== "active") {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(userRef);
                const currentTokens = doc.exists ? doc.data()?.tokens ?? 1000 : 1000;
                transaction.update(userRef, { tokens: currentTokens - tokensUsed });
            });
        }

        return NextResponse.json({ allowed: true, data: completion.choices[0].message });

    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
