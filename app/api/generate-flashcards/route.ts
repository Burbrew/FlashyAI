import { NextResponse, NextRequest } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import OpenAI from 'openai';
import { getAuth } from '@clerk/nextjs/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);  // Ensure userId is correctly retrieved
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, subject } = await request.json();

    if (!prompt || !subject) {
      return NextResponse.json({ error: 'Prompt and subject are required.' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are a flashcard generator that will receive a prompt from the user, which will be the title of the flashcard. Your job is to provide a concise definition in the format of typical flashcards. For each prompt, generate 10 different cards unless otherwise specified. Exclude any extra bits, such as 'Sure!' in the prompt, because it is not the purpose of this. For math formulas, the program will be using KaTeX to interpret and properly display them. Here are two different examples: 
          Ex 1
          Input:
          " 1. Derivative
            2. Integral
            3. Chain Rule
            4. Product Rule
            5. Quotient Rule
            6. Fundamental Theorem of Calculus "

          Output:
          " 1. **Derivative**: The derivative represents the rate of change of a function with respect to a variable. It is the slope of the tangent line to the curve of the function. Formula: $$ f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h} $$

            2. **Integral**: The integral of a function represents the accumulation of quantities and the area under the curve of the function. Formula: $$ \int_a^b f(x) \, dx $$

            3. **Chain Rule**: The chain rule is used to compute the derivative of a composite function. Formula: $$ \frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx} $$

            4. **Product Rule**: The product rule is used to find the derivative of the product of two functions. Formula: $$ \frac{d}{dx}(uv) = u'v + uv' $$

            5. **Quotient Rule**: The quotient rule is used to find the derivative of the quotient of two functions. Formula: $$ \frac{d}{dx}\left(\frac{u}{v}\right) = \frac{u'v - uv'}{v^2} $$

            6. **Fundamental Theorem of Calculus**: This theorem links the concept of differentiation with integration. If \( F(x) \) is an antiderivative of \( f(x) \), then: $$ \int_a^b f(x) \, dx = F(b) - F(a) $$ "


            Ex 2
          Input:
          " Calculus 1 concepts "

          Output:
          " 1. **Derivative**: The derivative represents the rate of change of a function with respect to a variable. It is the slope of the tangent line to the curve of the function. Formula: $$ f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h} $$

            2. **Integral**: The integral of a function represents the accumulation of quantities and the area under the curve of the function. Formula: $$ \int_a^b f(x) \, dx $$

            3. **Chain Rule**: The chain rule is used to compute the derivative of a composite function. Formula: $$ \frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx} $$

            4. **Product Rule**: The product rule is used to find the derivative of the product of two functions. Formula: $$ \frac{d}{dx}(uv) = u'v + uv' $$

            5. **Quotient Rule**: The quotient rule is used to find the derivative of the quotient of two functions. Formula: $$ \frac{d}{dx}\left(\frac{u}{v}\right) = \frac{u'v - uv'}{v^2} $$

            6. **Fundamental Theorem of Calculus**: This theorem links the concept of differentiation with integration. If \( F(x) \) is an antiderivative of \( f(x) \), then: $$ \int_a^b f(x) \, dx = F(b) - F(a) $$

            7. **Limits**: A limit is the value that a function approaches as the input approaches a certain value. It is fundamental in defining both derivatives and integrals. Formula: $$ \lim_{x \to a} f(x) = L $$

            8. **Continuity**: A function is continuous if, at every point in its domain, the limit of the function as it approaches that point equals the function’s value at that point. Formula: \( \lim_{x \to c} f(x) = f(c) \)

            9. **Taylor Series**: A Taylor series represents a function as an infinite sum of terms, calculated from the values of its derivatives at a single point. Formula: $$ f(x) = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \dots $$

            10. **L'Hôpital's Rule**: L'Hôpital's rule provides a method to evaluate limits of indeterminate forms, such as \( \frac{0}{0} \) or \( \frac{\infty}{\infty} \), by differentiating the numerator and denominator. Formula: $$ \lim_{x \to c} \frac{f(x)}{g(x)} = \lim_{x \to c} \frac{f'(x)}{g'(x)} $$ "
          ` },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json({ error: "Failed to generate flashcards." }, { status: 500 });
    }

    const flashcards = generatedText.split(/\n\d+\.\s/).filter(Boolean).map((item) => item.trim());

    // Save each flashcard as a separate document in Firestore
    const flashcardCollectionRef = collection(db, "users", userId, "subjects", subject, "flashcards");

    const flashcardPromises = flashcards.map(async (flashcard) => {
      return await addDoc(flashcardCollectionRef, {
        content: flashcard,
        createdAt: serverTimestamp(),
      });
    });

    // Wait for all flashcards to be saved
    await Promise.all(flashcardPromises);

    return NextResponse.json({ flashcards });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
