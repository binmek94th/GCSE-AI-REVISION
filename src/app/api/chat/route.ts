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

        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const userData = userDoc.data();
        if (!userData) {
            return NextResponse.json({ error: "User data not found" }, { status: 404 });
        }
        if (userData.tokens === undefined || userData.tokens <= 0) {
            return NextResponse.json({ error: "Insufficient tokens" }, { status: 403 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
                    You are a school assistant AI.  
                    Rules:
                    1. Only respond if the user's question is school-related (subjects: math, physics, chemistry, biology, history, geography, literature, science, exams, essays, homework, etc).  
                    2. If the question is NOT school-related, politely decline and say: "I can only help with school-related questions. 📚"  
                    3. When responding, always return JSON in this format:
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
        const tokensUsed = completion.usage?.total_tokens || 0;


        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            const currentTokens = doc.exists ? doc.data()?.tokens || 0 : 0;
            transaction.set(userRef, { tokens: currentTokens - tokensUsed }, { merge: true });
        });

        return NextResponse.json(completion.choices[0].message);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
