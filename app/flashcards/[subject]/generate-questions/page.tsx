'use client';

import { useEffect, useState } from "react";
import Link from 'next/link';
import { collection, query, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useAuth } from '@clerk/nextjs';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { useRouter } from 'next/navigation';

interface QuestionData {
  question: string;
  answerKey: string;
  id?: string;
  order: number;
  type: 'question';
}

interface QuestionProps {
  question: QuestionData;
  index: number;
  questionsLength: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  deleteQuestion: (questionId: string) => void;
  moveQuestion: (index: number, direction: 'up' | 'down') => void;
}

const QuestionItem = ({ question, index, questionsLength, moveCard, deleteQuestion, moveQuestion }: QuestionProps) => {
  const [, drag] = useDrag({
    type: 'question',
    item: { index }
  });

  const [, drop] = useDrop({
    accept: 'question',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveCard(draggedItem.index, index);
        draggedItem.index = index;
      }
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }
  }, []);

  const ref = (node: HTMLDivElement | null) => {
    if (node) {
      drag(node);
      drop(node);
    }
  };

  return (
    <div ref={ref} className="relative bg-white p-4 rounded-lg shadow-lg">
      <div className="absolute top-2 left-2 flex space-x-2">
        {index > 0 && (
          <button
            onClick={() => moveQuestion(index, 'up')}
            className="text-gray-500 hover:text-gray-700"
          >
            ▲
          </button>
        )}
        {index < questionsLength - 1 && (
          <button
            onClick={() => moveQuestion(index, 'down')}
            className="text-gray-500 hover:text-gray-700"
          >
            ▼
          </button>
        )}
      </div>
      <button
        onClick={() => deleteQuestion(question.id!)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        &times;
      </button>
      {/* Use dangerouslySetInnerHTML to render the question content */}
      <div dangerouslySetInnerHTML={{ __html: question.question }} />
      <p className="text-sm text-gray-600">Answer Key: <span dangerouslySetInnerHTML={{ __html: question.answerKey }} /></p>
    </div>
  );
};

export default function SubjectQuestionsPage({ params }: { params: { subject: string } }) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const { subject } = params;

  useEffect(() => {
    if (isLoaded && userId) {
      const fetchQuestions = async () => {
        setFetching(true);
        try {
          const q = query(collection(db, "users", userId, "subjects", subject, "questions"));
          const querySnapshot = await getDocs(q);
          const questionsList: QuestionData[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            questionsList.push({ question: data.question, answerKey: data.answerKey, id: doc.id, order: data.order, type: 'question' });
          });
          questionsList.sort((a, b) => a.order - b.order);
          setQuestions(questionsList);
        } catch (error) {
          console.error("Error fetching questions:", error);
        } finally {
          setFetching(false);
        }
      };
      fetchQuestions();
    }
  }, [isLoaded, userId, subject]);

  const generateQuestions = async () => {
    if (!prompt) return;

    setLoading(true);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, subject }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions.");
      }

      const data = await response.json();
      console.log("Generated Questions API Response: ", data); // Log the response for debugging

      if (data.questions && Array.isArray(data.questions)) {
        // Save each question-answer pair to Firestore
        await saveQuestionsToFirestore(data.questions);

        // Update the state with the new questions
        setQuestions((prevQuestions) => [...prevQuestions, ...data.questions]);
      } else {
        console.error("Unexpected response format:", data);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to save questions to Firestore
  const saveQuestionsToFirestore = async (questions: any[]) => {
    for (const question of questions) {
      await addDoc(collection(db, "users", userId!, "subjects", subject!, "questions"), {
        question: question.question,
        answerKey: question.answerKey,
        createdAt: new Date(),
      });
    }
  };

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const updatedQuestions = [...questions];
    const [draggedQuestion] = updatedQuestions.splice(dragIndex, 1);
    updatedQuestions.splice(hoverIndex, 0, draggedQuestion);
    setQuestions(updatedQuestions);
  };

  const deleteQuestion = async (questionId: string) => {
    await deleteDoc(doc(db, "users", userId!, "subjects", subject!, "questions", questionId));
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const updatedQuestions = [...questions];
    const [movedQuestion] = updatedQuestions.splice(index, 1);
    if (direction === 'up') {
      updatedQuestions.splice(index - 1, 0, movedQuestion);
    } else {
      updatedQuestions.splice(index + 1, 0, movedQuestion);
    }
    setQuestions(updatedQuestions);
  };

  const deleteSubject = async () => {
    // Logic to delete the subject
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading questions...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-r from-gray-100 to-gray-300 flex flex-col items-center p-4">
        <Link href="/" className="mb-4 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition duration-300">
          Back to Homepage
        </Link>

        <Link
          href={`/flashcards/${subject}`}
          className="mb-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Generate Flashcards
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">{subject} Test Questions</h1>

        <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6 mb-6">
          <textarea
            className="w-full h-32 p-4 border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt (e.g., 'Physics questions on kinematics')"
          />
          <button
            onClick={generateQuestions}
            disabled={loading}
            className="w-full mt-4 p-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Questions"}
          </button>
        </div>

        <div className="w-full max-w-lg space-y-4 text-black">
          {questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              index={index}
              questionsLength={questions.length} // Pass the length here
              moveCard={moveCard}
              deleteQuestion={deleteQuestion}
              moveQuestion={moveQuestion}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}
