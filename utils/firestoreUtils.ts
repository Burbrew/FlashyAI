import { db } from '../lib/firebase';
import { doc, setDoc, getDocs, addDoc, collection, getDoc, query, deleteDoc, updateDoc } from 'firebase/firestore';

// Add a flashcard to the 'flashcards' collection
export const addFlashcard = async (
  flashcardData: { title: string; content: string; subject: string }
) => {
  const flashcardRef = collection(db, "flashcards"); // flashcards collection at the root
  await addDoc(flashcardRef, {
    ...flashcardData,
    createdAt: new Date(), // Add createdAt timestamp
  });
};

// Fetch all flashcards from the 'flashcards' collection
export const getFlashcards = async () => {
  const q = query(collection(db, "flashcards")); // flashcards collection at the root
  const querySnapshot = await getDocs(q);
  const flashcardsList: { title: string; content: string; subject: string }[] = [];
  querySnapshot.forEach((doc) => {
    flashcardsList.push(doc.data() as { title: string; content: string; subject: string });
  });
  return flashcardsList;
};

// Add a question to the 'questions' collection
export const addQuestion = async (
  questionData: { question: string; answer: string }
) => {
  const questionRef = collection(db, "questions"); // questions collection at the root
  await addDoc(questionRef, {
    ...questionData,
    createdAt: new Date(), // Add createdAt timestamp
  });
};

// Fetch all questions from the 'questions' collection
export const getQuestions = async () => {
  const q = query(collection(db, "questions")); // questions collection at the root
  const querySnapshot = await getDocs(q);
  const questionsList: { question: string; answer: string; createdAt: any }[] = [];
  querySnapshot.forEach((doc) => {
    questionsList.push(doc.data() as { question: string; answer: string; createdAt: any });
  });
  return questionsList;
};

// Update a specific question in the 'questions' collection
export const updateQuestion = async (questionId: string, updateData: object) => {
  const questionRef = doc(db, 'questions', questionId); // direct reference to a question document
  await updateDoc(questionRef, updateData);
};

// Delete a specific question from the 'questions' collection
export const deleteQuestion = async (questionId: string) => {
  const questionRef = doc(db, 'questions', questionId); // direct reference to a question document
  await deleteDoc(questionRef);
};

// Delete a specific flashcard from the 'flashcards' collection
export const deleteFlashcard = async (flashcardId: string) => {
  const flashcardRef = doc(db, 'flashcards', flashcardId); // direct reference to a flashcard document
  await deleteDoc(flashcardRef);
};
