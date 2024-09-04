import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      console.error('Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, subject } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a flashcard generator. Create 10 flashcards based on the provided prompt.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json({ error: "Failed to generate flashcards." }, { status: 500 });
    }

    const flashcards = generatedText.split(/\n\d+\.\s/).filter(Boolean);

    await addDoc(collection(db, "flashcards"), {
      userId,
      subject,
      flashcards,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ flashcards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
