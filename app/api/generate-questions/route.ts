import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, subject } = await req.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You are an advanced test question generator. Generate both multiple-choice and free-response questions. Please provide the question, options (if applicable), and the answer key. You MUST USE LaTeX formatting for any mathematical expressions.
            For multiple-choice questions, unless specified, provide four answer choices with one being the correct answer option (make sure each option is under its own line). For free-response questions, indicate where the correct answer should be placed.
            The subject is ${subject}.
            Generate each question completely separately.
            Here is an example (ignore when it says Question or Answer Key when creating the response):
            Entered prompt: Generate 3 test questions on calculus.:
              
              Question 1: What is the derivative of \(x^2\)?
              Answer Key: The derivative is \(2x\).

              Question 2: Solve the integral \(\int x^2 dx\).
              Answer Key: The solution is \(\frac{x^3}{3} + C\).

              Question 3: What is the value of the limit \(\lim_{x \to 0} \frac{\sin(x)}{x}\)?
              Answer Key: The value of the limit is 1.`,
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json({ error: 'Failed to generate questions.' }, { status: 500 });
    }

    // Properly split the questions using stricter splitting rules
    const questionBlocks = generatedText
      .split(/(?=Question\s\d*:)/g) // Split at "Question" followed by a number
      .map((block) => block.trim()) // Ensure no leading/trailing spaces
      .filter(Boolean); // Remove empty blocks

    const formattedQuestions = questionBlocks.map((block: string, index: number) => {
      // We add a stricter split for the answer key and question separation
      const [questionPart, answerKeyPart] = block.split(/Answer Key:/).map((text: string) => text.trim());
      return {
        question: `${questionPart}`,
        answerKey: answerKeyPart || 'No answer provided',
      };
    });

    return NextResponse.json({ questions: formattedQuestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
