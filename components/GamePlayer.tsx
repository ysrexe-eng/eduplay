import React, { useState, useEffect, useMemo } from 'react';
import { GameModule, GameType, QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, MixedStage } from '../types';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, RotateCcw, ArrowDown, Check, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabase';

interface GamePlayerProps {
  game: GameModule;
  onBack: () => void;
}

const GamePlayer: React.FC<GamePlayerProps> = ({ game, onBack }) => {
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(game.settings?.timeLimit ? game.settings.timeLimit : null);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    // Reset state on new game
    setScore(0);
    setIsFinished(false);
    setTimeLeft(game.settings?.timeLimit && game.settings.timeLimit > 0 ? game.settings.timeLimit : null);
    setTimerActive(true);
    
    // Increment play count safely using RPC
    if(supabase && game.id) {
        supabase.rpc('increment_plays', { row_id: game.id }).then(({ error }) => {
            if (error) {
                // console.warn("Play count update failed", error);
            }
        });
    }

  }, [game]);

  useEffect(() => {
      if (timeLeft === null || !timerActive || isFinished) return;
      
      const timer = setInterval(() => {
          setTimeLeft(prev => {
              if (prev !== null && prev <= 1) {
                  clearInterval(timer);
                  setTimerActive(false);
                  setIsFinished(true); // Auto finish on time out
                  return 0;
              }
              return prev ? prev - 1 : 0;
          });
      }, 1000);

      return () => clearInterval(timer);
  }, [timeLeft, timerActive, isFinished]);

  const handleFinish = (finalScore: number, total: number) => {
    setTimerActive(false);
    setScore(finalScore);
    setIsFinished(true);
    if (finalScore / total > 0.7) {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#10b981', '#f43f5e', '#fbbf24']
        });
    }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-slate-800 rounded-2xl shadow-xl text-center border border-slate-700 animate-fade-in mt-10">
        <h2 className="text-3xl font-bold text-white mb-4">
            {timeLeft === 0 ? "Süre Doldu!" : "Tebrikler!"}
        </h2>
        <div className="text-6xl font-black text-indigo-400 mb-6">{score}</div>
        <p className="text-gray-400 mb-8">Toplam Puan</p>
        <div className="flex justify-center space-x-4">
          <button onClick={onBack} className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-semibold transition-colors">
            Menüye Dön
          </button>
          <button onClick={() => {
              setIsFinished(false);
              setScore(0);
              setTimeLeft(game.settings?.timeLimit || null);
              setTimerActive(true);
          }} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-semibold flex items-center transition-colors">
            <RotateCcw className="w-5 h-5 mr-2" /> Tekrar Oyna
          </button>
        </div>
      </div>
    );
  }

  const renderGameContent = (type: GameType, data: any, onSubFinish: (s: number, t: number) => void) => {
      switch (type) {
          case GameType.QUIZ:
            return <QuizPlayer data={data} onFinish={onSubFinish} randomize={game.settings?.randomizeOrder} />;
          case GameType.MATCHING:
            return <MatchingPlayer data={data} onFinish={onSubFinish} />;
          case GameType.TRUE_FALSE:
            return <TrueFalsePlayer data={data} onFinish={onSubFinish} />;
          case GameType.FLASHCARD:
            return <FlashcardPlayer data={data} onFinish={() => onSubFinish(100, 100)} />;
          case GameType.SEQUENCE:
            return <SequencePlayer data={data} onFinish={onSubFinish} />;
          case GameType.CLOZE:
            return <ClozePlayer data={data} onFinish={onSubFinish} caseSensitive={game.settings?.caseSensitive} />;
          case GameType.MIXED:
            return <MixedPlayer stages={data.stages} onFinish={onSubFinish} settings={game.settings} />;
          default:
            return <div className="text-white text-center">Bilinmeyen oyun türü</div>;
      }
  };

  return (
      <div className="relative pb-20">
          <button onClick={onBack} className="absolute top-0 left-0 text-gray-400 hover:text-white flex items-center mb-4">
              <ChevronLeft className="w-5 h-5 mr-1"/> Çıkış
          </button>

          {timeLeft !== null && (
              <div className="fixed top-20 right-4 z-50 bg-slate-800 border border-slate-600 px-4 py-2 rounded-full shadow-lg flex items-center text-white font-mono font-bold">
                  <Clock className="w-4 h-4 mr-2 text-indigo-400"/>
                  {formatTime(timeLeft)}
              </div>
          )}
          
          <div className="mt-8">
            {renderGameContent(game.gameType, game.data, handleFinish)}
          </div>
      </div>
  );
};

/* --- Sub-Components --- */

const MixedPlayer = ({ stages, onFinish, settings }: { stages: MixedStage[], onFinish: (s: number, t: number) => void, settings?: any }) => {
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [totalScore, setTotalScore] = useState(0);

    const handleStageFinish = (stageScore: number, stageTotal: number) => {
        // Normalize score to avoid massive numbers, or just sum them up. Let's sum up.
        const newScore = totalScore + stageScore;
        setTotalScore(newScore);

        if (currentStageIdx < stages.length - 1) {
            setCurrentStageIdx(prev => prev + 1);
        } else {
            onFinish(newScore, 100 * stages.length); // Assuming ~100 per stage max for simplicity
        }
    };

    const currentStage = stages[currentStageIdx];

    return (
        <div className="animate-fade-in">
             <div className="text-center mb-4">
                 <span className="bg-indigo-900/50 text-indigo-200 text-xs px-3 py-1 rounded-full border border-indigo-700">
                     Bölüm {currentStageIdx + 1} / {stages.length}
                 </span>
             </div>
             {(() => {
                 switch(currentStage.type) {
                     case GameType.QUIZ: return <QuizPlayer data={currentStage.data as any} onFinish={handleStageFinish} randomize={settings?.randomizeOrder}/>;
                     case GameType.MATCHING: return <MatchingPlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.TRUE_FALSE: return <TrueFalsePlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.SEQUENCE: return <SequencePlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.CLOZE: return <ClozePlayer data={currentStage.data as any} onFinish={handleStageFinish} caseSensitive={settings?.caseSensitive}/>;
                     case GameType.FLASHCARD: return <FlashcardPlayer data={currentStage.data as any} onFinish={() => handleStageFinish(100, 100)}/>;
                     default: return <div>Desteklenmeyen aşama türü</div>;
                 }
             })()}
        </div>
    );
};

const QuizPlayer = ({ data, onFinish, randomize }: { data: { items: QuizItem[] }, onFinish: (s: number, t: number) => void, randomize?: boolean }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const questions = useMemo(() => {
      if (randomize) {
          return [...data.items].sort(() => Math.random() - 0.5);
      }
      return data.items;
  }, [data, randomize]);

  const currentQ = questions[currentIdx];

  const shuffledOptions = useMemo(() => {
      return [...currentQ.options].sort(() => Math.random() - 0.5);
  }, [currentQ]);

  const handleAnswer = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    if (option === currentQ.correctAnswer) {
      setScore(s => s + 10);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      onFinish(score + (selectedOption === currentQ.correctAnswer ? 10 : 0), questions.length * 10);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 mt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <span className="text-sm font-semibold text-gray-400">Soru {currentIdx + 1} / {questions.length}</span>
        <span className="text-sm font-bold text-indigo-400">Puan: {score}</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-6">{currentQ.question}</h2>
      
      <div className="grid grid-cols-1 gap-3">
        {shuffledOptions.map((option, idx) => {
           let btnClass = "w-full p-4 text-left border rounded-lg transition-all text-white font-medium ";
           if (showResult) {
             if (option === currentQ.correctAnswer) btnClass += "bg-emerald-900/50 border-emerald-500 text-emerald-200";
             else if (option === selectedOption) btnClass += "bg-red-900/50 border-red-500 text-red-200";
             else btnClass += "bg-slate-700/50 border-slate-600 text-gray-500 opacity-50";
           } else {
             btnClass += "bg-slate-700 border-slate-600 hover:bg-indigo-900/30 hover:border-indigo-500";
           }

           return (
             <button key={idx} onClick={() => handleAnswer(option)} disabled={showResult} className={btnClass}>
               {option}
               {showResult && option === currentQ.correctAnswer && <CheckCircle className="inline float-right h-5 w-5 text-emerald-500" />}
               {showResult && option === selectedOption && option !== currentQ.correctAnswer && <XCircle className="inline float-right h-5 w-5 text-red-500" />}
             </button>
           )
        })}
      </div>

      {showResult && (
        <div className="mt-6 animate-fade-in">
           <button onClick={nextQuestion} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors">
             {currentIdx === questions.length - 1 ? "Testi Bitir" : "Sonraki Soru"}
           </button>
        </div>
      )}
    </div>
  );
};

const MatchingPlayer = ({ data, onFinish }: { data: { pairs: MatchingPair[] }, onFinish: (s: number, t: number) => void }) => {
  const [leftItems, setLeftItems] = useState<{id: string, text: string, pairId: string}[]>([]);
  const [rightItems, setRightItems] = useState<{id: string, text: string, pairId: string}[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    // Randomize both sides
    const left = data.pairs.map(p => ({ id: `L-${p.id}`, text: p.itemA, pairId: p.id }));
    const right = data.pairs.map(p => ({ id: `R-${p.id}`, text: p.itemB, pairId: p.id }));
    
    setLeftItems(left.sort(() => Math.random() - 0.5));
    setRightItems(right.sort(() => Math.random() - 0.5));
    setMatchedIds(new Set());
    setMistakes(0);
    setSelectedLeft(null);
  }, [data]);

  const handleLeftClick = (id: string) => {
     if (matchedIds.has(leftItems.find(i => i.id === id)?.pairId || "")) return;
     setSelectedLeft(id);
  };

  const handleRightClick = (rItem: {id: string, pairId: string}) => {
    if (!selectedLeft) return;
    if (matchedIds.has(rItem.pairId)) return;

    const lItem = leftItems.find(i => i.id === selectedLeft);
    if (lItem && lItem.pairId === rItem.pairId) {
      const newMatched = new Set(matchedIds);
      newMatched.add(rItem.pairId);
      setMatchedIds(newMatched);
      setSelectedLeft(null);

      if (newMatched.size === data.pairs.length) {
         setTimeout(() => onFinish(Math.max(0, 100 - (mistakes * 5)), 100), 1000);
      }
    } else {
      setMistakes(m => m + 1);
      setSelectedLeft(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 animate-fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 text-center">
         <p className="text-indigo-300 font-medium">Soldaki ögeyi seçip sağdaki eşini bul.</p>
         <p className="text-sm text-gray-500 mt-1">Hatalar: {mistakes}</p>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3">
          {leftItems.map(item => {
            const isMatched = matchedIds.has(item.pairId);
            const isSelected = selectedLeft === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleLeftClick(item.id)}
                disabled={isMatched}
                className={`w-full p-4 rounded-lg shadow-sm border text-sm md:text-base font-medium transition-all
                  ${isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                  ${isSelected ? 'bg-indigo-600 text-white border-indigo-500 transform scale-105' : 'bg-slate-800 text-gray-200 border-slate-700 hover:bg-slate-700'}
                `}
              >
                {item.text}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {rightItems.map(item => {
             const isMatched = matchedIds.has(item.pairId);
             return (
              <button
                key={item.id}
                onClick={() => handleRightClick(item)}
                disabled={isMatched}
                 className={`w-full p-4 rounded-lg shadow-sm border text-sm md:text-base font-medium transition-all
                  ${isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                  bg-slate-800 text-gray-200 border-slate-700 hover:bg-slate-700
                `}
              >
                {item.text}
              </button>
             );
          })}
        </div>
      </div>
    </div>
  );
};

const TrueFalsePlayer = ({ data, onFinish }: { data: { items: TrueFalseItem[] }, onFinish: (s: number, t: number) => void }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const item = data.items[currentIdx];

    const handleGuess = (guess: boolean) => {
        if (feedback) return;
        const isCorrect = guess === item.isTrue;
        if (isCorrect) setScore(s => s + 10);
        setFeedback(isCorrect ? 'correct' : 'wrong');
        setTimeout(() => {
            if (currentIdx < data.items.length - 1) {
                setCurrentIdx(c => c + 1);
                setFeedback(null);
            } else {
                onFinish(score + (isCorrect ? 10 : 0), data.items.length * 10);
            }
        }, 1500);
    };

    return (
        <div className="max-w-xl mx-auto bg-slate-800 rounded-xl shadow-lg p-8 text-center border border-slate-700 mt-4 animate-fade-in">
             <div className="mb-8">
                 <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">İfade {currentIdx + 1} / {data.items.length}</span>
                 <h2 className="text-2xl font-bold text-white mt-4 leading-relaxed">{item.statement}</h2>
             </div>
             {feedback ? (
                 <div className={`p-4 rounded-lg mb-6 ${feedback === 'correct' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                     {feedback === 'correct' ? <div className="font-bold">Doğru!</div> : <div><div className="font-bold">Yanlış</div>{item.correction && <p className="text-sm mt-2">{item.correction}</p>}</div>}
                 </div>
             ) : (
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleGuess(true)} className="p-6 rounded-xl border-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xl">DOĞRU</button>
                    <button onClick={() => handleGuess(false)} className="p-6 rounded-xl border-2 border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-all font-bold text-xl">YANLIŞ</button>
                 </div>
             )}
        </div>
    );
};

const FlashcardPlayer = ({ data, onFinish }: { data: { items: FlashcardItem[] }, onFinish: () => void }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const item = data.items[currentIdx];

    const nextCard = () => {
        setIsFlipped(false);
        if (currentIdx < data.items.length - 1) setTimeout(() => setCurrentIdx(c => c + 1), 150);
        else onFinish();
    };
    const prevCard = () => {
        setIsFlipped(false);
        if (currentIdx > 0) setTimeout(() => setCurrentIdx(c => c - 1), 150);
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center mt-4 animate-fade-in">
            <div className="w-full text-center mb-4 text-gray-400">Kart {currentIdx + 1} / {data.items.length}</div>
            <div className="group w-full h-80 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)} style={{ perspective: '1000px' }}>
                <div className={`relative w-full h-full text-center transition-transform duration-500 transform-style-3d shadow-xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                    <div className="absolute w-full h-full backface-hidden bg-slate-800 rounded-2xl flex items-center justify-center p-8 border border-slate-700" style={{ backfaceVisibility: 'hidden' }}><h2 className="text-3xl font-bold text-white">{item.front}</h2><span className="absolute bottom-4 text-xs text-gray-500">Çevirmek için tıkla</span></div>
                    <div className="absolute w-full h-full backface-hidden bg-indigo-700 rounded-2xl flex items-center justify-center p-8 text-white rotate-y-180" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><p className="text-xl font-medium leading-relaxed">{item.back}</p></div>
                </div>
            </div>
            <div className="flex space-x-6 mt-8">
                <button onClick={prevCard} disabled={currentIdx === 0} className="p-3 rounded-full bg-slate-800 shadow hover:bg-slate-700 disabled:opacity-50 text-indigo-400 border border-slate-700"><ChevronLeft className="w-8 h-8" /></button>
                <button onClick={nextCard} className="p-3 rounded-full bg-slate-800 shadow hover:bg-slate-700 text-indigo-400 border border-slate-700">{currentIdx === data.items.length - 1 ? <CheckCircle className="w-8 h-8" /> : <ChevronRight className="w-8 h-8" />}</button>
            </div>
        </div>
    );
};

const SequencePlayer = ({ data, onFinish }: { data: { items: SequenceItem[]; question?: string }, onFinish: (s: number, t: number) => void }) => {
    const [items, setItems] = useState<SequenceItem[]>([]);
    const [checked, setChecked] = useState(false);
    useEffect(() => { setItems([...data.items].sort(() => Math.random() - 0.5)); setChecked(false); }, [data]);
    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (checked) return;
        const newItems = [...items];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex >= 0 && swapIndex < newItems.length) {
            [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
            setItems(newItems);
        }
    };
    const checkOrder = () => {
        let correct = 0;
        items.forEach((item, index) => { if (item.order === index) correct++; });
        setChecked(true);
        setTimeout(() => { if (correct === items.length) onFinish(100, 100); }, 1500);
    };
    return (
        <div className="max-w-xl mx-auto mt-4 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
                <h3 className="text-lg font-bold text-white mb-4 text-center">{data.question || "Doğru sıraya dizin"}</h3>
                <div className="space-y-2">{items.map((item, idx) => (<div key={item.id} className={`p-4 rounded-lg flex items-center justify-between border ${checked ? (item.order === idx ? 'bg-emerald-900/40 border-emerald-500' : 'bg-red-900/40 border-red-500') : 'bg-slate-700 border-slate-600'}`}><span className="text-white font-medium">{item.text}</span>{!checked && (<div className="flex flex-col space-y-1 ml-4"><button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 text-gray-300"><ChevronLeft className="w-4 h-4 rotate-90" /></button><button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1} className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 text-gray-300"><ChevronLeft className="w-4 h-4 -rotate-90" /></button></div>)}</div>))}</div>
                {!checked ? <button onClick={checkOrder} className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-500">Kontrol Et</button> : <button onClick={() => setChecked(false)} className="w-full mt-6 bg-slate-600 text-white py-3 rounded-lg font-bold hover:bg-slate-500">Tekrar Dene</button>}
            </div>
        </div>
    );
};

const ClozePlayer = ({ data, onFinish, caseSensitive }: { data: { data: ClozeItem }, onFinish: (s: number, t: number) => void, caseSensitive?: boolean }) => {
    const [inputs, setInputs] = useState<string[]>(Array(data.data.answers.length).fill(""));
    const [checked, setChecked] = useState(false);
    const handleCheck = () => {
        setChecked(true);
        let correct = 0;
        inputs.forEach((val, i) => {
            const v = caseSensitive ? val.trim() : val.trim().toLowerCase();
            const a = caseSensitive ? data.data.answers[i] : data.data.answers[i].toLowerCase();
            if (v === a) correct++;
        });
        if (correct === data.data.answers.length) setTimeout(() => onFinish(100, 100), 1000);
    };
    return (
        <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl border border-slate-700 mt-4 animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Boşlukları Doldurun</h3>
            <div className="text-lg leading-loose text-gray-200">{data.data.textParts.map((part, index) => (<React.Fragment key={index}><span>{part}</span>{index < data.data.answers.length && (<span className="inline-block mx-1"><input type="text" value={inputs[index]} onChange={(e) => { if (checked) setChecked(false); const newInputs = [...inputs]; newInputs[index] = e.target.value; setInputs(newInputs); }} disabled={checked && (caseSensitive ? inputs[index].trim() === data.data.answers[index] : inputs[index].trim().toLowerCase() === data.data.answers[index].toLowerCase())} className={`w-32 bg-slate-900 border-b-2 px-2 py-1 outline-none text-center transition-colors ${checked ? ((caseSensitive ? inputs[index].trim() === data.data.answers[index] : inputs[index].trim().toLowerCase() === data.data.answers[index].toLowerCase()) ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400') : 'border-slate-500 text-white focus:border-indigo-500'}`} /></span>)}</React.Fragment>))}</div>
            <div className="mt-8"><button onClick={handleCheck} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors">Cevapları Kontrol Et</button></div>
        </div>
    );
};

export default GamePlayer;