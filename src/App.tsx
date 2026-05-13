import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Lightbulb, Play, Sparkles, RefreshCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Visual Components (SVG Anime Style) ---

const PySenseiAvatar = ({ className = "" }: { className?: string }) => (
  <motion.div 
    className={`relative ${className}`}
    animate={{ 
      y: [0, -8, 0],
      rotate: [0, 1, -1, 0]
    }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  >
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
      {/* Hair (Back) */}
      <path d="M40 100 Q40 40 100 40 Q160 40 160 100" fill="#4B2C20" />
      {/* Face */}
      <circle cx="100" cy="110" r="60" fill="#FFE4D1" />
      {/* Hair (Front/Bangs) */}
      <path d="M40 90 Q70 60 100 70 Q130 60 160 90" fill="#4B2C20" />
      <path d="M60 70 Q80 40 100 60" fill="#4B2C20" />
      {/* Eyes */}
      <motion.g animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2] }}>
        <circle cx="75" cy="115" r="12" fill="#333" />
        <circle cx="78" cy="110" r="5" fill="white" />
        <circle cx="125" cy="115" r="12" fill="#333" />
        <circle cx="128" cy="110" r="5" fill="white" />
      </motion.g>
      {/* Blush */}
      <circle cx="60" cy="130" r="8" fill="#FFB7C5" opacity="0.6" />
      <circle cx="140" cy="130" r="8" fill="#FFB7C5" opacity="0.6" />
      {/* Mouth */}
      <path d="M90 145 Q100 155 110 145" fill="none" stroke="#E57373" strokeWidth="4" strokeLinecap="round" />
      {/* Wizard Hat */}
      <path d="M30 65 L100 10 L170 65 Z" fill="#2563EB" />
      <path d="M20 65 Q100 80 180 65" fill="none" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" />
      {/* Stars on Hat */}
      <path d="M100 25 L105 35 L115 35 L107 42 L110 52 L100 45 L90 52 L93 42 L85 35 L95 35 Z" fill="#FDE047" />
    </svg>
    {/* Sparkle effects */}
    <motion.div 
      animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute top-0 right-0 text-yellow-400"
    >
      <Sparkles size={32} />
    </motion.div>
  </motion.div>
);

const PyBotAvatar = ({ className = "" }: { className?: string }) => (
  <motion.div 
    className={`relative ${className}`}
    animate={{ 
      scale: [1, 1.05, 1],
      rotate: [-2, 2, -2]
    }}
    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
  >
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
      {/* Body */}
      <rect x="50" y="70" width="100" height="100" rx="40" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="4" />
      {/* Screen/Face Area */}
      <rect x="65" y="85" width="70" height="50" rx="15" fill="#334155" />
      {/* Eyes (Glowing) */}
      <motion.g animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <circle cx="85" cy="110" r="8" fill="#38BDF8" />
        <circle cx="115" cy="110" r="8" fill="#38BDF8" />
      </motion.g>
      {/* Python Logo on Chest */}
      <circle cx="100" cy="150" r="15" fill="white" />
      <path d="M92 145 Q100 140 108 145 L108 155 Q100 160 92 155 Z" fill="#38BDF8" />
      <path d="M92 145 C92 140 108 140 108 145 M92 155 C92 160 108 160 108 155" fill="none" stroke="#1E293B" strokeWidth="1" />
      {/* Cat Ears */}
      <path d="M60 75 L45 40 L85 70 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="4" />
      <path d="M140 75 L155 40 L115 70 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="4" />
      {/* Antenna */}
      <line x1="100" y1="70" x2="100" y2="40" stroke="#94A3B8" strokeWidth="4" />
      <circle cx="100" cy="35" r="5" fill="#FB7185" />
    </svg>
  </motion.div>
);

// --- Assets --- (No longer needed, but keeping structure clean)
const IMAGES = {
  SENSEI: 'SENSEI_SVG',
  BOT: 'BOT_SVG'
};

// --- Types ---
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface Mission {
  textGoal: string;
  displayGoal: string; // The text we want the user to output (e.g., "Hello Malaysia")
  explanation: string;
  blocks: Block[];
  errorToFix?: string; 
}

const MISSION_LIST: Record<Difficulty, Mission[]> = {
  Easy: [
    {
      textGoal: "print('Hello')",
      displayGoal: "Hello",
      explanation: "The basics! Start with a simple greeting.",
      blocks: [
        { id: 'e1-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'e1-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'e1-3', content: "'Hello'", color: 'bg-amber-400 border-amber-600' },
        { id: 'e1-4', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print('hello Malaysia')",
      displayGoal: "hello Malaysia",
      explanation: "Let's send a warm greeting to Malaysia! 🌸",
      blocks: [
        { id: 'e2-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'e2-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'e2-3', content: "'hello Malaysia'", color: 'bg-emerald-400 border-emerald-600' },
        { id: 'e2-4', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    }
  ],
  Medium: [
    {
      textGoal: "print(12)",
      displayGoal: "12",
      explanation: "Numbers are special! They don't need 'quotes'.",
      blocks: [
        { id: 'm1-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'm1-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'm1-3', content: "12", color: 'bg-amber-400 border-amber-600' },
        { id: 'm1-4', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print(5+5)",
      displayGoal: "10 (the result of 5+5)",
      explanation: "Calculations! Python can show the result of math.",
      blocks: [
        { id: 'm2-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'm2-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'm2-3', content: "5", color: 'bg-amber-400 border-amber-600' },
        { id: 'm2-4', content: "+", color: 'bg-rose-400 border-rose-600' },
        { id: 'm2-5', content: "5", color: 'bg-amber-400 border-amber-600' },
        { id: 'm2-6', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    }
  ],
  Hard: [
    {
      textGoal: "print('hello',123)",
      displayGoal: "hello 123",
      explanation: "Mixed data types! Use a comma to print them together.",
      blocks: [
        { id: 'h1-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'h1-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'h1-3', content: "'hello'", color: 'bg-amber-400 border-amber-600' },
        { id: 'h1-4', content: ",", color: 'bg-slate-400 border-slate-600' },
        { id: 'h1-5', content: "123", color: 'bg-emerald-400 border-emerald-600' },
        { id: 'h1-6', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print('Result:',50/2)",
      displayGoal: "Result: 25.0",
      explanation: "Advanced: Combining strings with live math!",
      blocks: [
        { id: 'h2-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'h2-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'h2-3', content: "'Result:'", color: 'bg-amber-400 border-amber-600' },
        { id: 'h2-4', content: ",", color: 'bg-slate-400 border-slate-600' },
        { id: 'h2-5', content: "50", color: 'bg-emerald-400 border-emerald-600' },
        { id: 'h2-6', content: "/", color: 'bg-rose-400 border-rose-600' },
        { id: 'h2-7', content: "2", color: 'bg-emerald-400 border-emerald-600' },
        { id: 'h2-8', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print('FixMe')",
      displayGoal: "FixMe",
      explanation: "BUG HUNT! This code is broken: print(FixMe). Can you fix it?",
      errorToFix: "print(FixMe)",
      blocks: [
        { id: 'h3-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'h3-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'h3-3', content: "'FixMe'", color: 'bg-amber-400 border-amber-600' },
        { id: 'h3-4', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print('Ninja')",
      displayGoal: "Ninja",
      explanation: "Identify the Error: This case is WRONG: Print('Ninja'). Fix the function name!",
      errorToFix: "Print('Ninja')",
      blocks: [
        { id: 'h4-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'h4-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'h4-3', content: "'Ninja'", color: 'bg-amber-400 border-amber-600' },
        { id: 'h4-4', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print('Total:',100)",
      displayGoal: "Total: 100",
      explanation: "Logic Leak! This is missing something: print('Total:' 100). Find the missing comma!",
      errorToFix: "print('Total:' 100)",
      blocks: [
        { id: 'h5-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'h5-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'h5-3', content: "'Total:'", color: 'bg-amber-400 border-amber-600' },
        { id: 'h5-4', content: ",", color: 'bg-slate-400 border-slate-600' },
        { id: 'h5-5', content: "100", color: 'bg-emerald-400 border-emerald-600' },
        { id: 'h5-6', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    },
    {
      textGoal: "print('Wizard')",
      displayGoal: "Wizard",
      explanation: "Ancient Error! Python 2 didn't need brackets, but Python 3 DOES! Fix print 'Wizard'",
      errorToFix: "print 'Wizard'",
      blocks: [
        { id: 'h6-1', content: "print", color: 'bg-sky-400 border-sky-600' },
        { id: 'h6-2', content: "(", color: 'bg-indigo-400 border-indigo-600' },
        { id: 'h6-3', content: "'Wizard'", color: 'bg-amber-400 border-amber-600' },
        { id: 'h6-4', content: ")", color: 'bg-indigo-400 border-indigo-600' },
      ]
    }
  ]
};

interface Block {
  id: string;
  content: string;
  color: string;
}

// --- Components ---

const SortableBlock: React.FC<{ block: Block }> = ({ block }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`px-6 py-3 rounded-2xl border-b-8 text-white font-mono font-black text-xl cursor-grab active:cursor-grabbing transition-all hover:scale-110 hover:-rotate-2 ${block.color}`}
    >
      {block.content}
    </div>
  );
};

const MascotSpeech = ({ text, character = 'sensei' }: { text: string; character?: 'sensei' | 'bot' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-6 max-w-4xl mx-auto p-4"
    >
      <div className="relative shrink-0">
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center p-2"
        >
          {character === 'sensei' ? <PySenseiAvatar /> : <PyBotAvatar />}
        </motion.div>
        <div className="absolute -bottom-2 -right-2 bg-sakura-500 text-white px-3 py-1 rounded-full text-sm font-bold border-2 border-white z-20">
          {character === 'sensei' ? 'Py-Sensei' : 'Py-Bot'}
        </div>
      </div>
      
      <div className="flex-1 mt-4">
        <div className="speech-bubble text-lg md:text-xl font-medium text-slate-800 leading-relaxed shadow-sm">
          {text}
        </div>
      </div>
    </motion.div>
  );
};

type Stage = 'welcome' | 'lesson' | 'training' | 'test' | 'test-result';

interface TestQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of options
  explanation: string;
}

const TEST_QUESTIONS: TestQuestion[] = [
  {
    question: "Which of these is the correct way to print 'Hello'?",
    options: ["print('Hello')", "Print('Hello')", "print Hello"],
    correctAnswer: 0,
    explanation: "Functions in Python are case-sensitive and need parentheses!"
  },
  {
    question: "What is the error in: print('Welcome!)",
    options: ["Missing comma", "Missing closing quote", "Missing bracket"],
    correctAnswer: 1,
    explanation: "Quotes must always come in pairs! One to start, one to end."
  },
  {
    question: "How do you print a number like 123 without quotes?",
    options: ["print(123)", "print('123')", "print {123}"],
    correctAnswer: 0,
    explanation: "Numbers don't need quotes in Python!"
  },
  {
    question: "What happens when you run: print(5 + 5)?",
    options: ["It prints 5 + 5", "It prints 10", "It shows an error"],
    correctAnswer: 1,
    explanation: "Python performs the math calculation before printing the result."
  },
  {
    question: "How do you separate text and a number in one print statement?",
    options: ["Use a space", "Use a comma (,)", "Use a plus (+)"],
    correctAnswer: 1,
    explanation: "A comma is the best way to combine different types of data in print()."
  },
  {
    question: "Is 'Print' the same as 'print' in Python?",
    options: ["Yes, Python ignores case", "No, it's case-sensitive", "Only on Windows"],
    correctAnswer: 1,
    explanation: "Python is strictly case-sensitive. 'print' must be lowercase."
  },
  {
    question: "What is the error in: print 'Hello'?",
    options: ["Missing quotes", "Missing parentheses ()", "Must use double quotes"],
    correctAnswer: 1,
    explanation: "In Python 3, parentheses are mandatory for the print function."
  },
  {
    question: "Which option combines 'Age:' and 10 correctly?",
    options: ["print('Age:', 10)", "print('Age:' 10)", "print('Age:' + 10)"],
    correctAnswer: 0,
    explanation: "The comma adds a required separator between the string and integer."
  },
  {
    question: "What will print('5' + '5') output?",
    options: ["10", "55", "Error"],
    correctAnswer: 1,
    explanation: "Adding two strings just joins them together! This is called concatenation."
  },
  {
    question: "What symbol is used for multiplication in Python print statements?",
    options: ["x", "*", "X"],
    correctAnswer: 1,
    explanation: "The asterisk (*) is the universal symbol for multiplication in code."
  },
  {
    question: "What is wrong here: print(\"Hello', 123)?",
    options: ["Mixing single/double quotes", "Missing a comma", "Nothing is wrong"],
    correctAnswer: 0,
    explanation: "You should stick to one type of quote (' or \") for a single piece of text."
  },
  {
    question: "Which function prints output to the screen?",
    options: ["output()", "display()", "print()"],
    correctAnswer: 2,
    explanation: "print() is one of the most fundamental built-in functions in Python."
  },
  {
    question: "What is a 'String' in Python?",
    options: ["A piece of thread", "A sequence of characters/text", "A type of number"],
    correctAnswer: 1,
    explanation: "We call text 'Strings' because they are just a string of characters tied together."
  },
  {
    question: "What will print(10 / 2) show?",
    options: ["5", "5.0", "10/2"],
    correctAnswer: 1,
    explanation: "Division in Python 3 always results in a decimal (float)."
  },
  {
    question: "Can you print emojis in Python?",
    options: ["No, only text", "Yes, if they are inside quotes", "Only on mobile"],
    correctAnswer: 1,
    explanation: "Emojis are just characters! Wrap them in quotes and they'll print fine."
  },
  {
    question: "Why use print('Result:', 10*2) instead of print(20)?",
    options: ["It's faster", "It provides context/labels", "It makes the code shorter"],
    correctAnswer: 1,
    explanation: "Labeling your output makes it easier for humans to understand."
  },
  {
    question: "Does print() move to a new line automatically?",
    options: ["Yes", "No", "Only if you type \\n"],
    correctAnswer: 0,
    explanation: "By default, every print() statement starts on a new line."
  },
  {
    question: "Which of these prints a blank line?",
    options: ["print()", "print('')", "Both of these"],
    correctAnswer: 2,
    explanation: "Calling print with nothing or an empty string both create a new empty line."
  },
  {
    question: "What is the result of print(10 > 5)?",
    options: ["True", "False", "Error"],
    correctAnswer: 0,
    explanation: "Python can print the result of comparisons (Booleans)."
  },
  {
    question: "What is the best way to master Python?",
    options: ["Reading a book", "Watching others", "PRACTICE with Py-Sensei!"],
    correctAnswer: 2,
    explanation: "Active practice is the quickest path to mastery! Sugoi!"
  }
];

export default function App() {
  const [stage, setStage] = useState<Stage>('welcome');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [missionIndex, setMissionIndex] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  // Test State
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testFeedback, setTestFeedback] = useState<boolean | null>(null);

  // Drag and Drop blocks
  const [blocks, setBlocks] = useState<Block[]>([]);

  // --- Sound Effects Helper ---
  const playSound = useCallback((type: 'click' | 'correct' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'correct') {
        osc.type = 'sine';
        // Ascending Sugoi scale
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }, []);

  const currentMission = MISSION_LIST[difficulty][missionIndex];

  const startTraining = (level: Difficulty) => {
    playSound('click');
    setDifficulty(level);
    setMissionIndex(0);
    const firstMission = MISSION_LIST[level][0];
    setBlocks([...firstMission.blocks].sort(() => Math.random() - 0.5));
    setStage('training');
    setCurrentSlide(0);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const normalizeForComparison = (code: string) => {
    // 1. Remove all spaces
    // 2. Convert all double quotes to single quotes
    // 3. Keep case for the text content but normalize the print function (not strictly required here since text input check is .toLowerCase, but let's be more precise)
    return code.replace(/\s/g, '').replace(/"/g, "'");
  };

  const checkDragAnswer = () => {
    const result = normalizeForComparison(blocks.map(b => b.content).join(''));
    const target = normalizeForComparison(currentMission.textGoal);
    if (result === target) {
      playSound('correct');
      setIsCorrect(true);
      triggerConfetti();
    } else {
      playSound('error');
      setIsCorrect(false);
      // Feedback remains for a bit
      setTimeout(() => setIsCorrect(null), 3000);
    }
  };

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fb7185', '#38bdf8', '#fde047', '#a855f7']
    });
  }, []);

  const validateTextInput = () => {
    const normalizedInput = normalizeForComparison(textInput).toLowerCase();
    const normalizedTarget = normalizeForComparison(currentMission.textGoal).toLowerCase();
    
    if (normalizedInput === normalizedTarget) {
      playSound('correct');
      setIsCorrect(true);
      triggerConfetti();
    } else {
      playSound('error');
      setIsCorrect(false);
      setTimeout(() => setIsCorrect(null), 2000);
    }
  };

  const nextSlide = () => {
    playSound('click');
    setIsCorrect(null);
    setShowHint(false);
    setCurrentSlide(prev => Math.min(prev + 1, 3));
  };

  const prevSlide = () => {
    playSound('click');
    setIsCorrect(null);
    setShowHint(false);
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  const nextMission = () => {
    playSound('click');
    setIsCorrect(null);
    setTextInput('');
    setCurrentSlide(0);
    if (missionIndex < MISSION_LIST[difficulty].length - 1) {
      setMissionIndex(prev => prev + 1);
      const nextM = MISSION_LIST[difficulty][missionIndex + 1];
      setBlocks([...nextM.blocks].sort(() => Math.random() - 0.5));
    } else {
      setStage('test'); // Push to test after finishing a track
      setTestIndex(0);
      setTestScore(0);
      setCurrentSlide(0);
    }
  };

  const startTest = () => {
    playSound('click');
    setTestIndex(0);
    setTestScore(0);
    setTestFeedback(null);
    setStage('test');
  };

  const handleTestAnswer = (index: number) => {
    if (testFeedback !== null) return; // Prevent double clicks

    const correct = index === TEST_QUESTIONS[testIndex].correctAnswer;
    if (correct) {
      playSound('correct');
      setTestScore(prev => prev + 1);
      setTestFeedback(true);
    } else {
      playSound('error');
      setTestFeedback(false);
    }

    setTimeout(() => {
      setTestFeedback(null);
      if (testIndex < TEST_QUESTIONS.length - 1) {
        setTestIndex(prev => prev + 1);
      } else {
        setStage('test-result');
        triggerConfetti();
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 via-white to-sky-50 flex flex-col items-center justify-center p-4">
      
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-sakura-400 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-sky-400 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-yellow-300 rounded-full blur-2xl opacity-40" />
      </div>

      <main className="w-full max-w-5xl relative z-10">
        <AnimatePresence mode="wait">
          {stage === 'welcome' && (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center gap-8 py-12"
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-sakura-400/20 rounded-full blur-2xl group-hover:bg-sakura-400/40 transition-all duration-500" />
                <PySenseiAvatar className="w-64 h-64 md:w-80 md:h-80 relative" />
              </div>
              <div className="space-y-4">
                <motion.h1 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-6xl md:text-8xl font-black text-slate-800 tracking-tighter uppercase italic"
                >
                  Python <span className="text-sakura-500">Quest!</span>
                </motion.h1>
                <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-lg mx-auto">
                  Master the secret arts of coding with Py-Sensei. Your journey starts now!
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={() => { playSound('click'); setStage('lesson'); }}
                  className="anime-button bg-sakura-500 hover:bg-sakura-600 text-white px-16 py-6 rounded-[40px] text-3xl font-black shadow-2xl flex items-center gap-4 transition-all hover:scale-110 active:scale-95"
                >
                  START LEARNING <ChevronRight size={36} />
                </button>
                <button 
                  onClick={startTest}
                  className="anime-button bg-slate-800 hover:bg-slate-900 text-white px-16 py-6 rounded-[40px] text-3xl font-black shadow-2xl flex items-center gap-4 transition-all hover:scale-110 active:scale-95 border-b-8 border-slate-950"
                >
                  SKILL TEST <Sparkles className="text-yellow-400" size={36} />
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'lesson' && (
            <motion.div 
              key="lesson"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card p-8 md:p-12 flex flex-col gap-10"
            >
              <div className="flex flex-col md:flex-row gap-8 items-center border-b-4 border-slate-100 pb-10">
                <PySenseiAvatar className="w-40 h-40 shrink-0" />
                <div className="text-center md:text-left">
                   <h2 className="text-5xl font-black text-slate-800 mb-2">The Scroll of <span className="text-sky-500">print()</span></h2>
                   <p className="text-slate-500 font-bold text-xl">Every great wizard begins by making their voice heard across the digital realm!</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white border-4 border-slate-100 p-8 rounded-[40px] shadow-sm hover:translate-y-[-8px] transition-all group">
                  <div className="w-16 h-16 bg-sky-100 text-sky-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Play size={32} />
                  </div>
                  <h3 className="font-black text-2xl mb-3">The Purpose</h3>
                  <p className="text-slate-600 text-lg">The <b>print()</b> function tells the computer to show words or numbers on the screen!</p>
                </div>

                <div className="bg-white border-4 border-slate-100 p-8 rounded-[40px] shadow-sm hover:translate-y-[-8px] transition-all group">
                  <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="font-black text-2xl mb-3">Strings & Quotes</h3>
                  <p className="text-slate-600 text-lg">When printing text, wrap it in <b>'quotes'</b>. These tell Python it's a "String" of characters!</p>
                </div>

                <div className="bg-white border-4 border-slate-100 p-8 rounded-[40px] shadow-sm hover:translate-y-[-8px] transition-all group">
                  <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Lightbulb size={32} />
                  </div>
                  <h3 className="font-black text-2xl mb-3">Numbers too!</h3>
                  <p className="text-slate-600 text-lg">Python is smart! <b>print(5 + 5)</b> will show <b>10</b> on the screen. No quotes needed for math!</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[50px] p-10 text-sky-300 font-mono text-2xl relative overflow-hidden group border-8 border-slate-800">
                <div className="absolute top-4 right-8 bg-slate-800 text-slate-500 px-4 py-1 rounded-full text-sm font-bold">EXPERT SCROLL</div>
                <div className="flex gap-4">
                   <div className="text-slate-600">1</div>
                   <div className="flex gap-2">
                     <span className="text-indigo-400">print</span>
                     <span className="text-white">(</span>
                     <span className="text-amber-300">'Hello, Ninja!'</span>
                     <span className="text-white">)</span>
                   </div>
                </div>
                <div className="flex gap-4 mt-2">
                   <div className="text-slate-600">2</div>
                   <div className="flex gap-2">
                     <span className="text-indigo-400">print</span>
                     <span className="text-white">(</span>
                     <span className="text-emerald-300">100 * 2</span>
                     <span className="text-white">)</span>
                   </div>
                </div>
                <div className="absolute right-[-40px] bottom-[-40px] opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles size={250} />
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-4">
                <button 
                  onClick={() => { playSound('click'); setStage('welcome'); }}
                  className="flex items-center gap-2 font-black text-slate-400 hover:text-sakura-500 transition-colors uppercase tracking-widest"
                >
                  <ChevronLeft size={24} /> BACK HOME
                </button>
                <div className="flex items-center gap-6 w-full md:w-auto">
                   <p className="hidden lg:block text-slate-400 font-bold italic animate-pulse">Mastered the theory? Time for practice!</p>
                   <button 
                    onClick={() => { playSound('click'); setCurrentSlide(-1); }}
                    className="flex-1 md:flex-none anime-button bg-sakura-500 text-white px-12 py-6 rounded-[40px] text-2xl font-black shadow-xl flex items-center justify-center gap-3"
                  >
                    CHOOSE DIFFICULTY <ChevronRight size={28} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'training' && (
            <motion.div 
              key="training"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              {/* Header / Progress */}
              <div className="flex justify-between items-center px-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => { playSound('click'); setStage('lesson'); }}
                >
                  <div className="w-12 h-12 bg-sakura-500 rounded-2xl flex items-center justify-center text-white shadow-lg transform -rotate-3 transition-transform hover:rotate-0">
                    <Play fill="currentColor" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Python Quest</h1>
                    <span className="text-xs font-bold text-sakura-500 tracking-widest uppercase">{difficulty} TRACK - MISSION {missionIndex + 1}</span>
                  </div>
                </motion.div>
                <div className="flex gap-2 bg-white/50 p-2 rounded-full backdrop-blur-sm shadow-inner">
                  {MISSION_LIST[difficulty].map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-3 rounded-full transition-all duration-500 ${idx <= missionIndex ? 'w-10 bg-sky-500' : 'w-3 bg-slate-200'}`}
                    />
                  ))}
                  <div className="w-[2px] bg-slate-300 mx-1" />
                  {[0, 1, 2].map(i => (
                    <div 
                      key={i} 
                      className={`h-3 rounded-full transition-all duration-500 ${i <= currentSlide ? 'w-8 bg-sakura-500' : 'w-3 bg-slate-200'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Training Slides */}
              <motion.div
                key={`${difficulty}-${missionIndex}-slide-${currentSlide}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="glass-card p-6 md:p-10 min-h-[520px] flex flex-col items-stretch overflow-hidden relative"
              >
                {currentSlide === 0 && (
                  <div className="flex flex-col gap-8 flex-1">
                    <MascotSpeech text={`Mission ${missionIndex + 1}: ${currentMission.explanation}`} />
                    
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-6">
                        {currentMission.errorToFix ? (
                          <div className="bg-red-50 border-4 border-red-100 rounded-3xl p-8 relative">
                            <div className="absolute -top-4 -left-4 bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold border-2 border-white shadow-md">Broken Code! 💢</div>
                            <code className="text-red-600 font-mono text-2xl font-bold">{currentMission.errorToFix}</code>
                          </div>
                        ) : (
                          <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl font-mono text-xl text-sky-400 border-4 border-slate-700 relative group">
                            <div className="absolute -top-4 -left-4 bg-slate-800 text-slate-400 px-4 py-1 rounded-full text-sm font-bold border-2 border-slate-700">Target Output</div>
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-white font-sans font-black italic">"{currentMission.displayGoal}"</span>
                            </div>
                          </div>
                        )}
                        <p className="text-slate-600 text-lg leading-relaxed bg-sky-50 p-4 rounded-2xl border-l-8 border-sky-400">
                          {currentMission.errorToFix 
                            ? "Can you spot what's wrong? Type the corrected version in the next step!" 
                            : currentMission.textGoal.includes(',') ? "Notice how we use a comma (,) to separate different types of data!" : "Remember the brackets and quotes!"}
                        </p>
                      </div>
                      <div className="hidden md:flex justify-center">
                         <PyBotAvatar className="w-48 h-48" />
                      </div>
                    </div>

                    <div className="mt-auto flex justify-end">
                      <button onClick={nextSlide} className="anime-button bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-2xl font-black text-xl flex items-center gap-2 shadow-lg">
                        {currentMission.errorToFix ? "FIX IT NOW!" : "PRACTICE TYPING"} <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>
                )}

                {currentSlide === 1 && (
                  <div className="flex flex-col gap-8 flex-1">
                    <MascotSpeech text={`Please print the output: ${currentMission.displayGoal}`} />
                    
                    <div className="max-w-2xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-center">
                      <div className="relative group">
                        <div className="absolute -top-3 left-6 px-3 bg-white text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-slate-100 rounded-full z-10">Magic Console</div>
                        <input 
                          type="text"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="Type your code spell here..."
                          className="w-full bg-slate-50 border-4 border-slate-200 rounded-3xl p-6 font-mono text-2xl focus:border-sakura-400 focus:outline-none transition-all shadow-inner group-hover:border-slate-300"
                          onKeyDown={(e) => e.key === 'Enter' && validateTextInput()}
                        />
                        <AnimatePresence>
                          {isCorrect === true && (
                            <motion.div 
                              initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                              className="absolute right-6 top-1/2 -translate-y-1/2 text-green-500 flex items-center gap-2 font-black text-xl"
                            >
                              <div className="bg-green-100 px-4 py-2 rounded-2xl border-2 border-green-200">SUGOI! ✨</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={validateTextInput}
                          className="flex-1 anime-button bg-sakura-500 text-white py-5 rounded-3xl font-black text-2xl shadow-xl hover:-translate-y-1"
                        >
                          CAST SPELL!
                        </button>
                        <button 
                           onClick={() => { playSound('click'); setShowHint(!showHint); }}
                           className={`px-8 rounded-3xl transition-all border-4 ${showHint ? 'bg-yellow-100 border-yellow-200 text-yellow-600' : 'bg-slate-50 border-white text-slate-400 hover:text-sakura-400'}`}
                        >
                           <Lightbulb size={32} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {showHint && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-yellow-50 border-2 border-yellow-100 p-5 rounded-3xl text-yellow-800 font-medium overflow-hidden shadow-sm flex items-center gap-4"
                          >
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-white shrink-0">?</div>
                            <p>Hint: Try typing <code className="font-mono bg-white px-3 py-1 rounded-xl font-bold border border-yellow-200">{currentMission.textGoal}</code> – case sensitive! 🌸</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isCorrect === false && (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          className="text-center bg-red-50 text-red-500 p-4 rounded-3xl border-2 border-red-100 font-bold flex items-center justify-center gap-2"
                        >
                           Ganbatte! (Keep trying!) Check your characters! 💢
                        </motion.div>
                      )}

                      {isCorrect === true && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mt-4">
                          <button onClick={nextSlide} className="px-12 py-4 bg-green-500 hover:bg-green-600 text-white rounded-3xl font-black text-xl flex items-center gap-3 shadow-xl transform transition-transform hover:scale-105 active:scale-95">
                            DRAG CHALLENGE! <ChevronRight size={24} />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {currentSlide === 2 && (
                  <div className="flex flex-col gap-8 flex-1">
                    <MascotSpeech 
                      character={isCorrect ? 'sensei' : 'bot'} 
                      text={
                        isCorrect === true ? "Sugoi! (Amazing!) You fixed it! You're a natural wizard!" : 
                        isCorrect === false ? "Ganbatte! (Keep trying!) Almost there, check the sequence once more!" :
                        "Critical error! My logic circuits are scrambled! Help me print the output: " + currentMission.displayGoal
                      } 
                    />
                    
                    <div className="flex flex-col gap-10 items-center justify-center flex-1">
                      <div className="relative">
                        {isCorrect === true && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: [1, 1.5, 1], rotate: [0, 90, 180] }}
                              className="bg-yellow-400/30 w-full h-full rounded-full blur-3xl"
                            />
                            <div className="absolute top-0 animate-ping">
                              <Sparkles className="text-yellow-400 w-20 h-20" />
                            </div>
                          </div>
                        )}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-500 text-white rounded-full font-bold text-sm shadow-md animate-pulse z-20">DRAG BLOCKS</div>
                        <DndContext 
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={`bg-slate-50 p-12 rounded-[40px] border-4 border-dashed transition-colors ${isCorrect === true ? 'border-green-400 bg-green-50' : 'border-slate-200'} min-w-[360px] flex gap-4 md:gap-6 shadow-inner flex-wrap justify-center relative`}>
                            <SortableContext 
                              items={blocks.map(b => b.id)}
                              strategy={horizontalListSortingStrategy}
                            >
                              {blocks.map((block) => (
                                <SortableBlock key={block.id} block={block} />
                              ))}
                            </SortableContext>
                          </div>
                        </DndContext>
                      </div>

                      <div className="flex gap-4 w-full max-sm:flex-col items-center justify-center">
                        <button 
                          onClick={checkDragAnswer}
                          className="w-full max-w-xs anime-button bg-sakura-500 text-white py-5 rounded-3xl text-2xl font-black shadow-xl hover:-translate-y-1"
                        >
                          VERIFY ORDER!
                        </button>
                        <button 
                          onClick={() => { playSound('click'); setBlocks([...blocks].sort(() => Math.random() - 0.5)); }}
                          className="p-5 bg-white border-4 border-slate-100 rounded-3xl text-slate-400 hover:text-sakura-500 transition-all hover:bg-slate-50"
                          title="Shuffle Blocks"
                        >
                          <RefreshCcw size={28} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isCorrect === true && (
                          <motion.div 
                            className="fixed inset-0 z-50 flex items-center justify-center bg-sakura-500/80 backdrop-blur-lg p-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <motion.div 
                              initial={{ scale: 0.5, y: 50 }}
                               animate={{ scale: 1, y: 0 }}
                               className="bg-white p-12 rounded-[50px] shadow-2xl flex flex-col items-center gap-6 max-w-lg w-full text-center border-8 border-white"
                            >
                              <div className="relative">
                                <PySenseiAvatar className="w-48 h-48" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Sparkles className="text-yellow-400 scale-[3] opacity-50 animate-ping" />
                                </div>
                              </div>
                              <div>
                                 <h2 className="text-5xl font-black text-sakura-500 mb-2 uppercase italic tracking-tighter tracking-widest">MISSION CLEAR!</h2>
                                 <p className="text-slate-600 text-xl font-medium">
                                   {missionIndex < MISSION_LIST[difficulty].length - 1 
                                     ? `Sugoi! You finished Mission ${missionIndex + 1}. Get ready for the next one!` 
                                     : `Incredible! You've mastered all ${difficulty} missions! ✨`}
                                 </p>
                              </div>
                              <button 
                                onClick={nextMission}
                                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-2xl hover:scale-105 transition-transform shadow-xl"
                               >
                                 {missionIndex < MISSION_LIST[difficulty].length - 1 ? 'NEXT MISSION' : 'COMPLETE TRACK'}
                               </button>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isCorrect === false && (
                        <motion.div 
                          initial={{ x: -10 }} 
                          animate={{ x: 10 }}
                          className="bg-red-100 text-red-600 px-6 py-2 rounded-2xl font-bold animate-shake"
                        >
                          ❌ Ganbatte! Check the order again!
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Training Footer */}
              <div className="flex justify-between items-center px-4 pb-4">
                <button 
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className={`flex items-center gap-2 font-black text-lg transition-all ${currentSlide === 0 ? 'opacity-0' : 'text-slate-400 hover:text-sakura-500 hover:-translate-x-2'}`}
                >
                  <ChevronLeft size={28} /> BACK
                </button>
                <div className="text-slate-300 font-black tracking-widest bg-white/50 px-6 py-2 rounded-full border-2 border-white shadow-sm flex items-center gap-3">
                   <span className="w-2 h-2 bg-sakura-400 rounded-full animate-pulse" />
                   STEP {currentSlide + 1}/3
                </div>
                <button 
                  onClick={nextSlide}
                  disabled={currentSlide === 2}
                  className={`flex items-center gap-2 font-black text-lg transition-all ${currentSlide === 2 ? 'opacity-0' : 'text-slate-400 hover:text-sakura-500 hover:translate-x-2'}`}
                >
                  NEXT <ChevronRight size={28} />
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'test' && (
            <motion.div 
              key="test"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-10 flex flex-col gap-10"
            >
              <div className="flex justify-between items-center bg-slate-900 -mx-10 -mt-10 p-6 rounded-t-[40px]">
                <div className="text-white">
                  <h3 className="font-black text-2xl uppercase italic tracking-tighter">Skill Test Protocol</h3>
                  <p className="text-slate-400 text-sm font-bold">QUESTION {testIndex + 1} OF {TEST_QUESTIONS.length}</p>
                </div>
                <div className="text-yellow-400 font-black text-3xl">
                  Score: {testScore}
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <MascotSpeech text={TEST_QUESTIONS[testIndex].question} />
                
                <div className="grid grid-cols-1 gap-4">
                  {TEST_QUESTIONS[testIndex].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTestAnswer(idx)}
                      disabled={testFeedback !== null}
                      className={`p-6 rounded-3xl text-left font-bold text-xl transition-all border-4 flex items-center justify-between group ${
                        testFeedback === null 
                          ? 'bg-white border-slate-100 hover:border-sakura-400 hover:bg-sakura-50 hover:translate-x-2' 
                          : idx === TEST_QUESTIONS[testIndex].correctAnswer
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : testFeedback === false && idx === idx // This idx logic is a placeholder for "is this the one I clicked"
                              ? 'bg-red-100 border-red-500 text-red-700'
                              : 'bg-slate-50 border-slate-100 opacity-50'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + idx)}) {option}</span>
                      {testFeedback !== null && idx === TEST_QUESTIONS[testIndex].correctAnswer && (
                        <Sparkles className="text-green-500" />
                      )}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {testFeedback !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-3xl font-medium text-lg text-center ${testFeedback ? 'bg-green-50 text-green-700 border-2 border-green-100' : 'bg-red-50 text-red-700 border-2 border-red-100'}`}
                    >
                      {testFeedback ? "Correct! Sugoi! 🌟 " : "Not quite! Ganbatte! 💢 "}
                      {TEST_QUESTIONS[testIndex].explanation}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {stage === 'test-result' && (
            <motion.div 
              key="test-result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center flex flex-col items-center gap-8"
            >
              <div className="relative">
                <PySenseiAvatar className="w-64 h-64 mx-auto" />
                <motion.div 
                  className="absolute -top-4 -right-4 bg-yellow-400 text-slate-900 font-black text-4xl p-6 rounded-full shadow-2xl border-8 border-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.5 }}
                >
                  {Math.round((testScore / TEST_QUESTIONS.length) * 100)}%
                </motion.div>
              </div>

              <div className="space-y-4">
                <h2 className="text-6xl font-black text-slate-800 uppercase italic">Test Completed!</h2>
                <p className="text-2xl text-slate-500 font-bold">
                  You scored <span className="text-sakura-500">{testScore}</span> out of <span className="text-sky-500">{TEST_QUESTIONS.length}</span> points!
                </p>
                <p className="text-slate-400 max-w-md mx-auto">
                  {testScore === TEST_QUESTIONS.length 
                    ? "UNBELIEVABLE! You are a true Python Sage! ✨" 
                    : testScore > TEST_QUESTIONS.length / 2 
                      ? "Great job! You have a solid grasp of the basics! ⚡" 
                      : "Keep practicing! Every master was once a beginner! 🌱"}
                </p>
              </div>

              <button 
                onClick={() => { playSound('click'); setStage('welcome'); }}
                className="anime-button bg-slate-900 text-white px-16 py-6 rounded-[40px] text-3xl font-black shadow-2xl flex items-center gap-4 transition-all hover:scale-110 active:scale-95"
              >
                RETURN HOME <ChevronRight size={36} />
              </button>
            </motion.div>
          )}

          {/* Difficulty Modal (Triggered from Lesson) */}
          {stage === 'lesson' && currentSlide === -1 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-6">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-10 rounded-[50px] shadow-2xl max-w-2xl w-full flex flex-col gap-8 relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-slate-800">Choose Training Level!</h3>
                    <p className="text-slate-500 text-lg font-medium">Which challenge will you take on today?</p>
                  </div>
                  <button onClick={() => { playSound('click'); setCurrentSlide(0); }} className="text-slate-300 hover:text-rose-500">
                    <RefreshCcw size={40} className="rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => startTraining(level)}
                      className={`group relative p-8 rounded-[40px] border-b-8 transition-all hover:-translate-y-2 active:translate-y-0 flex flex-col items-center gap-4 ${
                        level === 'Easy' ? 'bg-green-400 border-green-600 text-white' :
                        level === 'Medium' ? 'bg-sky-400 border-sky-600 text-white' :
                        'bg-rose-400 border-rose-600 text-white'
                      }`}
                    >
                      <span className="text-5xl">{level === 'Hard' ? '🔥' : level === 'Medium' ? '⚡' : '🌱'}</span>
                      <span className="text-2xl font-black uppercase tracking-tighter">{level}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Anime Character Floater */}
      <div className="fixed bottom-[-20px] left-10 opacity-30 pointer-events-none scale-75 md:scale-100 blur-[2px] transition-all hover:blur-0 hover:opacity-100 w-48 h-48">
         <PyBotAvatar className="w-full h-full" />
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.15s ease-in-out 0s 2;
        }
        ::selection {
          background: #fb7185;
          color: white;
        }
      `}</style>
    </div>
  );
}
