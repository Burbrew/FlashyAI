'use client';

import { useEffect, useState } from "react";
import Link from 'next/link';
import { collection, query, getDocs, doc, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Flashcard from "../../components/Flashcard";
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface FlashcardData {
  content: string;
  id?: string;
  order: number;
  type: 'flashcard' | 'divider';
}

interface FlashcardProps {
  flashcard: FlashcardData;
  index: number;
  flashcardsLength: number; // Add flashcardsLength as prop
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  deleteFlashcard: (flashcardId: string) => void;
  moveFlashcard: (index: number, direction: 'up' | 'down') => void;
}

const FlashcardItem = ({ flashcard, index, flashcardsLength, moveCard, deleteFlashcard, moveFlashcard }: FlashcardProps) => {
  const [, drag] = useDrag({
    type: 'flashcard',
    item: { index }
  });

  const [, drop] = useDrop({
    accept: 'flashcard',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveCard(draggedItem.index, index);
        draggedItem.index = index;
      }
    }
  });

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
            onClick={() => moveFlashcard(index, 'up')}
            className="text-gray-500 hover:text-gray-700"
          >
            ▲
          </button>
        )}
        {index < flashcardsLength - 1 && (
          <button
            onClick={() => moveFlashcard(index, 'down')}
            className="text-gray-500 hover:text-gray-700"
          >
            ▼
          </button>
        )}
      </div>
      <button
        onClick={() => deleteFlashcard(flashcard.id!)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        &times;
      </button>
      {flashcard.type === 'divider' ? (
        <div className="text-center text-gray-800 font-bold text-xl border-2 border-gray-400 bg-gray-200 p-2 rounded-lg">
          {flashcard.content}
        </div>
      ) : (
        <Flashcard content={flashcard.content} />
      )}
    </div>
  );
};

export default function SubjectFlashcardsPage({ params }: { params: { subject: string } }) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [dividerName, setDividerName] = useState<string>("");
  const { subject } = params;

  useEffect(() => {
    if (isLoaded && userId) {
      const fetchFlashcards = async () => {
        setFetching(true);
        try {
          const q = query(collection(db, "users", userId, "subjects", subject, "flashcards"));
          const querySnapshot = await getDocs(q);
          const flashcardsList: FlashcardData[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            flashcardsList.push({ content: data.content, id: doc.id, order: data.order, type: data.type || 'flashcard' });
          });
          flashcardsList.sort((a, b) => a.order - b.order);
          setFlashcards(flashcardsList);
        } catch (error) {
          console.error("Error fetching flashcards:", error);
        } finally {
          setFetching(false);
        }
      };
      fetchFlashcards();
    }
  }, [isLoaded, userId, subject]);

  const generateFlashcards = async () => {
    if (!prompt) return;

    setLoading(true);
    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, subject }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate flashcards.");
      }

      const data = await response.json();
      if (data.flashcards && Array.isArray(data.flashcards)) {
        const newOrder = flashcards.length;
        const newFlashcards = await Promise.all(
          data.flashcards.map(async (content: string, index: number) => {
            const flashcardData: FlashcardData = {
              content,
              order: newOrder + index,
              type: 'flashcard',
            };
            const docRef = await addDoc(collection(db, "users", userId!, "subjects", subject!, "flashcards"), flashcardData);
            return { ...flashcardData, id: docRef.id };
          })
        );
        setFlashcards([...flashcards, ...newFlashcards]);
      } else {
        console.error("Unexpected response format:", data);
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
    } finally {
      setLoading(false);
    }
  };

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const newFlashcards = Array.from(flashcards);
    const [moved] = newFlashcards.splice(dragIndex, 1);
    newFlashcards.splice(hoverIndex, 0, moved);
    setFlashcards(newFlashcards);
  };

  const saveOrderToFirestore = async (newFlashcards: FlashcardData[]) => {
    const savePromises = newFlashcards.map((flashcard, index) =>
      updateDoc(doc(db, "users", userId!, "subjects", subject!, "flashcards", flashcard.id!), { order: index })
    );
    await Promise.all(savePromises);
  };

  const addDivider = async () => {
    if (userId && subject) {
      try {
        const newOrder = flashcards.length;
        const dividerData: FlashcardData = {
          content: dividerName,
          order: newOrder,
          type: 'divider',
        };
        const docRef = await addDoc(collection(db, "users", userId, "subjects", subject, "flashcards"), dividerData);
        setFlashcards([...flashcards, { ...dividerData, id: docRef.id }]);
      } catch (error) {
        console.error("Error adding divider:", error);
      }
    }
  };

  const deleteFlashcard = async (flashcardId: string) => {
    if (userId && subject) {
      try {
        await deleteDoc(doc(db, "users", userId, "subjects", subject, "flashcards", flashcardId));
        setFlashcards(flashcards.filter((flashcard) => flashcard.id !== flashcardId));
      } catch (error) {
        console.error("Error deleting flashcard:", error);
      }
    }
  };

  const moveFlashcard = (index: number, direction: 'up' | 'down') => {
    const newFlashcards = [...flashcards];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFlashcards.length) {
      const [movedCard] = newFlashcards.splice(index, 1);
      newFlashcards.splice(targetIndex, 0, movedCard);
      setFlashcards(newFlashcards);
      saveOrderToFirestore(newFlashcards); // Save order to Firestore after moving
    }
  };

  const deleteSubject = async () => {
    if (!userId || !subject) return;

    try {
      const flashcardsRef = collection(db, "users", userId, "subjects", subject, "flashcards");

      const flashcardsSnapshot = await getDocs(flashcardsRef);

      const deletePromises = flashcardsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      const subjectRef = doc(db, "users", userId, "subjects", subject);
      await deleteDoc(subjectRef);

      router.push("/");
    } catch (error) {
      console.error("Error deleting subject and flashcards:", error);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading flashcards...</p>
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
          href={`/flashcards/${subject}/generate-questions`}
          className="mb-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition duration-300"
        >
          Generate Test Questions
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">{subject} Flashcards</h1>

        <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6 mb-6">
          <textarea
            className="w-full h-32 p-4 border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt (e.g., 'Calculus 1 concepts')"
          />
          <button
            onClick={generateFlashcards}
            disabled={loading}
            className="w-full mt-4 p-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Flashcards"}
          </button>

          <div className="mt-4">
            <input
              className="w-full p-2 border text-black bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              value={dividerName}
              onChange={(e) => setDividerName(e.target.value)}
              placeholder="Enter divider name"
            />
            <button
              onClick={addDivider}
              className="w-full mt-4 p-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition duration-300"
            >
              Add Divider
            </button>
          </div>
        </div>

        <div className="w-full max-w-lg space-y-4">
          {flashcards.map((flashcard, index) => (
            <FlashcardItem
              key={flashcard.id}
              flashcard={flashcard}
              index={index}
              flashcardsLength={flashcards.length} // Pass the length here
              moveCard={moveCard}
              deleteFlashcard={deleteFlashcard}
              moveFlashcard={moveFlashcard}
            />
          ))}
        </div>


        <button
          onClick={deleteSubject}
          className="mt-8 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition duration-300"
        >
          Delete Subject
        </button>
      </div>
    </DndProvider>
  );
}
