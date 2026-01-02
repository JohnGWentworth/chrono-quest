import React, { useState, useEffect, useMemo } from 'react';
import { Share2, HelpCircle, Calendar, Trophy, ArrowUp, ArrowDown, Check, X, Settings } from 'lucide-react';

// --- DATA SOURCE CONFIGURATION ---

// 1. FOR LOCAL USE (When you run this on your computer):
//    Uncomment the line below. Make sure 'history_data.json' is in the same folder.
// import FULL_YEAR_DATA from './history_data.json'; 

// 2. FOR PREVIEW ONLY (So the app works right here):
const SAMPLE_DATA = [
  {
    "id": "01-01",
    "targetYear": 1863,
    "clue": "Abraham Lincoln issues a proclamation declaring that all persons held as slaves within the rebellious states are 'henceforward shall be free.'",
    "category": "Civil Rights",
    "funFact": "The proclamation didn't actually free all slaves immediately—only those in states not under Union control.",
    "articleTitle": "The Emancipation Proclamation",
    "articleContent": "On January 1, 1863, approaching the third year of the bloody Civil War, President Abraham Lincoln issued the Emancipation Proclamation. It fundamentally transformed the character of the war."
  },
   {
    "id": "10-24", // Example date for testing
    "targetYear": 1945,
    "clue": "The United Nations Charter enters into force, officially establishing the UN.",
    "category": "Politics",
    "funFact": "The term 'United Nations' was coined by Franklin D. Roosevelt during WWII to describe the Allied countries.",
    "articleTitle": "United Nations Day",
    "articleContent": "On October 24, 1945, the UN was officially born after a majority of signatories ratified the charter. Founded to prevent another world war, the organization replaced the ineffective League of Nations."
  }
];

// 3. DATA SWITCHER
//    Change 'SAMPLE_DATA' to 'FULL_YEAR_DATA' when running locally.
const GAME_DATA_SOURCE = SAMPLE_DATA; 

const MAX_GUESSES = 6;

// Utility to format date as MM-DD for looking up the puzzle
const formatDateKey = (date) => {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${m}-${d}`;
};

const App = () => {
  // --- STATE ---
  const [simulatedDate, setSimulatedDate] = useState(new Date());
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [message, setMessage] = useState('');
  const [streak, setStreak] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false); // Set to false for final launch
  const [shareButtonText, setShareButtonText] = useState('Share Result');

  // --- PUZZLE SELECTION LOGIC ---
  const puzzle = useMemo(() => {
    // 1. Get today's ID (e.g., "10-24")
    const dateKey = formatDateKey(simulatedDate);
    
    // 2. Find it in your JSON
    const found = GAME_DATA_SOURCE.find(p => p.id === dateKey);
    
    // 3. Fallback if date not found (defaults to the first entry to prevent crashing)
    return found || GAME_DATA_SOURCE[0];
  }, [simulatedDate]);

  // Reset game when the puzzle changes
  useEffect(() => {
    setGameState('playing');
    setGuesses([]);
    setMessage('');
    setCurrentGuess('');
    setShareButtonText('Share Result');
  }, [puzzle]);

  // Load streak from local storage on startup
  useEffect(() => {
    const savedStreak = localStorage.getItem('chronoStreak');
    if (savedStreak) setStreak(parseInt(savedStreak));
  }, []);

  const handleGuess = (e) => {
    e.preventDefault();
    const guessNum = parseInt(currentGuess);
    
    if (isNaN(guessNum) || guessNum < 0 || guessNum > 2030) {
      setMessage("Please enter a valid year.");
      return;
    }

    const newGuesses = [...guesses, guessNum];
    setGuesses(newGuesses);
    setMessage('');
    setCurrentGuess('');

    if (guessNum === puzzle.targetYear) {
      handleWin(newGuesses);
    } else if (newGuesses.length >= MAX_GUESSES) {
      handleLoss();
    }
  };

  const handleWin = (finalGuesses) => {
    setGameState('won');
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem('chronoStreak', newStreak);
    // Auto-scroll to the result area
    setTimeout(() => {
      document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLoss = () => {
    setGameState('lost');
    setStreak(0);
    localStorage.setItem('chronoStreak', 0);
    setTimeout(() => {
        document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const getFeedbackIcon = (guess) => {
    if (guess === puzzle.targetYear) return <Check className="w-5 h-5 text-green-500" />;
    if (guess < puzzle.targetYear) return <div className="flex items-center text-blue-500"><ArrowUp className="w-4 h-4 mr-1" /> Too Early</div>;
    return <div className="flex items-center text-red-500"><ArrowDown className="w-4 h-4 mr-1" /> Too Late</div>;
  };

  const getDistanceColor = (guess) => {
    const diff = Math.abs(puzzle.targetYear - guess);
    if (diff === 0) return "bg-green-100 border-green-300";
    if (diff <= 5) return "bg-yellow-100 border-yellow-300";
    if (diff <= 20) return "bg-orange-100 border-orange-300";
    return "bg-gray-100 border-gray-300";
  };

  // --- SHARE FUNCTIONALITY (ROBUST VERSION) ---
  const handleShare = async () => {
    const dateStr = simulatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let grid = "";
    
    // Generate emoji grid
    guesses.forEach(g => {
        const diff = Math.abs(puzzle.targetYear - g);
        if (diff === 0) grid += "🟩"; // Exact
        else if (diff <= 5) grid += "🟨"; // Close
        else if (g < puzzle.targetYear) grid += "⬆️"; // Too low
        else grid += "⬇️"; // Too high
        grid += "\n";
    });

    const resultText = `ChronoQuest (${dateStr})\n${gameState === 'won' ? guesses.length : 'X'}/${MAX_GUESSES}\n\n${grid}\nPlay at: www.chrono-quest.com`;

    try {
      // 1. Try the modern API first
      await navigator.clipboard.writeText(resultText);
      setShareButtonText('Copied!');
    } catch (err) {
      // 2. Fallback mechanism for restricted environments (like iframes or older browsers)
      // This works by creating a hidden text box, selecting it, and running the "copy" command.
      try {
        const textArea = document.createElement("textarea");
        textArea.value = resultText;
        
        // Ensure it's not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
           setShareButtonText('Copied!');
        } else {
           setShareButtonText('Error');
        }
      } catch (fallbackErr) {
        console.error('Copy failed', fallbackErr);
        setShareButtonText('Error');
      }
    }

    setTimeout(() => setShareButtonText('Share Result'), 2000);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 pb-20">
      
      {/* --- HEADER --- */}
      <header className="border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Chrono<span className="text-indigo-600">Quest</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Trophy className="w-4 h-4" />
              <span>{streak}</span>
            </div>
            <button onClick={() => setShowStats(!showStats)} className="p-2 hover:bg-slate-100 rounded-full">
              <HelpCircle className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        
        {/* Date Display */}
        <div className="text-center mb-4">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                {simulatedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>

        {/* --- GAME AREA --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 transition-all duration-300">
          <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wide mb-3">
              Daily Challenge
            </span>
            <h2 className="text-2xl font-serif font-medium text-slate-900 leading-snug">
              "{puzzle.clue}"
            </h2>
            <p className="mt-2 text-slate-500 text-sm">Category: {puzzle.category}</p>
          </div>

          <div className="p-6">
            {/* Input Form */}
            {gameState === 'playing' && (
              <form onSubmit={handleGuess} className="mb-8">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={currentGuess}
                    onChange={(e) => setCurrentGuess(e.target.value)}
                    placeholder="YYYY"
                    className="flex-1 p-4 text-center text-2xl font-bold tracking-widest border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-lg transition-colors"
                  >
                    Guess
                  </button>
                </div>
                {message && <p className="mt-2 text-red-500 text-sm text-center font-medium">{message}</p>}
                <p className="mt-3 text-center text-slate-400 text-sm">Attempts remaining: {MAX_GUESSES - guesses.length}</p>
              </form>
            )}

            {/* History Grid */}
            <div className="space-y-2">
              {guesses.map((guess, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${getDistanceColor(guess)}`}>
                  <span className="font-mono font-bold text-lg">{guess}</span>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {getFeedbackIcon(guess)}
                  </div>
                </div>
              ))}
              
              {/* Empty Rows */}
              {gameState === 'playing' && [...Array(MAX_GUESSES - guesses.length)].map((_, i) => (
                <div key={`empty-${i}`} className="h-12 border-2 border-dashed border-slate-200 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* --- GAME OVER STATE --- */}
          {gameState !== 'playing' && (
            <div id="result-area" className={`p-6 border-t ${gameState === 'won' ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${gameState === 'won' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {gameState === 'won' ? <Trophy className="w-8 h-8" /> : <X className="w-8 h-8" />}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">
                  {gameState === 'won' ? 'History Made!' : 'Time\'s Up!'}
                </h3>
                <p className="text-slate-600">The correct year was <span className="font-bold text-slate-900">{puzzle.targetYear}</span>.</p>
              </div>

              {/* Share Button */}
              <div className="flex justify-center mb-6">
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-lg hover:bg-slate-800 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {shareButtonText === 'Copied!' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {shareButtonText}
                </button>
              </div>

              {/* --- HIGH VALUE CONTENT (The "Meat" for AdSense) --- */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left animate-in slide-in-from-bottom duration-500">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Historical Context</h4>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{puzzle.articleTitle}</h3>
                
                <div className="prose prose-sm prose-slate text-slate-600">
                  <p className="mb-3"><span className="font-semibold text-indigo-600">Did you know?</span> {puzzle.funFact}</p>
                  <p>{puzzle.articleContent}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- SEO FOOTER (Crucial for AdSense Approval) --- */}
        <section className="mt-12 py-8 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Why ChronoQuest?</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed text-slate-600">
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Boost Cognitive Function</h4>
              <p className="mb-4">
                Engaging with date-based logic puzzles helps strengthen memory recall and sequencing skills. 
                Connecting events to specific timelines exercises the hippocampus, the part of the brain associated with memory.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Contextual Learning</h4>
              <p>
                Unlike rote memorization, ChronoQuest encourages players to use deductive reasoning. 
                By analyzing clues about technology, politics, and culture, you build a stronger mental web of history.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-6 text-center">
            © {new Date().getFullYear()} ChronoQuest. Daily History Challenge.
          </p>
        </section>

      </main>

      {/* --- DEV TOOLS (Hidden by default, used for testing dates) --- */}
      <div className="fixed bottom-4 left-4 z-50">
        <button 
            onClick={() => setShowDevTools(!showDevTools)} 
            className="bg-slate-800 text-white p-2 rounded-full shadow-lg opacity-30 hover:opacity-100 transition-opacity"
        >
            <Settings className="w-5 h-5" />
        </button>
        {showDevTools && (
            <div className="absolute bottom-12 left-0 bg-white p-4 rounded-xl shadow-xl border border-slate-200 w-48 animate-in slide-in-from-bottom">
                <p className="text-xs font-bold mb-2 uppercase text-slate-500">Dev: Time Travel</p>
                <input 
                    type="date" 
                    onChange={(e) => setSimulatedDate(new Date(e.target.value + 'T12:00:00'))}
                    className="border border-slate-300 p-2 rounded w-full text-sm"
                />
            </div>
        )}
      </div>

    </div>
  );
};

export default App;