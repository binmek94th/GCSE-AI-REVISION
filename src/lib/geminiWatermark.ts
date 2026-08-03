const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeneratedImage {
    buffer: Buffer;
    mimeType: string;
}

/**
 * Sends an image to Gemini with a watermark-removal prompt and returns the
 * edited image bytes. Mirrors the approach used in the Python
 * gemini_image-regenerate_a_level.py pipeline, but over the REST API so it
 * can run inside a Next.js route without adding the Python-only SDK.
 */
export async function removeWatermark(
    imageBuffer: Buffer,
    mimeType: string
): Promise<GeneratedImage> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY (or GEMINI_API_KEY) is not set");
    }

    const prompt =
        "Remove any watermark, logo overlay, or semi-transparent stamped text from this image. " +
        "Keep everything else about the image — content, composition, colors, quality — exactly the same. " +
        "Do not add any new text or graphics.";

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
                    ],
                },
            ],
            generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
            },
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);

    if (!imagePart) {
        const textPart = parts.find((p: any) => p.text)?.text;
        throw new Error(
            `Gemini did not return an image.${textPart ? ` Response: ${textPart}` : ""}`
        );
    }

    return {
        buffer: Buffer.from(imagePart.inlineData.data, "base64"),
        mimeType: imagePart.inlineData.mimeType || "image/png",
    };
}