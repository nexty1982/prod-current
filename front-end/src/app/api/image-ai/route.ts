import { NextResponse } from "next/server";

import { GoogleGenAI, Modality } from "@google/genai";

const imageData = [
  "/images/image-ai/flower1.jpg",
  "/images/image-ai/flower2.jpg",
  "/images/image-ai/flower3.jpg",
  "/images/image-ai/flower4.jpg",
  "/images/image-ai/spaceship1.jpg",
  "/images/image-ai/spaceship2.jpg",
  "/images/image-ai/spaceship3.jpg",
  "/images/image-ai/spaceship4.jpg",
  "/images/image-ai/leptop1.jpg",
  "/images/image-ai/leptop2.jpg",
  "/images/image-ai/leptop3.jpg",
  "/images/image-ai/leptop4.jpg",
];

export async function GET() {
  return NextResponse.json({ status: 200, images: imageData });
}

export async function POST(req: any) {
  const { prompt, currentIndex = 0 } = await req.json();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    // MOCK mode
    const nextIndex = currentIndex % imageData.length;
    let nextImages = imageData.slice(nextIndex, nextIndex + 4);

    if (nextImages.length < 4) {
      nextImages = nextImages.concat(imageData.slice(0, 4 - nextImages.length));
    }

    return NextResponse.json({
      images: imageData,
      isMock: true,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response: any = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const generatedImages: string[] = [];

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.contentType || "image/png";

        // Convert base64 image data into data URL
        const dataUrl = `data:${mimeType};base64,${imageData}`;
        generatedImages.push(dataUrl);
      }
    }

    return NextResponse.json({
      images: generatedImages,
      isMock: false,
    });
  } catch (err: any) {
    console.error("Error generating with Gemini AI:", err);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
