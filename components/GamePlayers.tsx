import React, { useState, useEffect, useMemo } from 'react';
import { QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, ScrambleItem } from '../types';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';

/* --- QUIZ PLAYER --- */
export const QuizPlayer = ({ data, onFinish, randomize }: { data: { items: QuizItem[] }, onFinish: (s: number, t: number) => void, randomize?: boolean }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const questions = useMemo(() => {
     return [...data.items].sort(() => Math.random() - 0.5);
  }, [data]);

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
    <div className="max-w-3xl mx-auto bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-700 mt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Soru {currentIdx + 1} / {questions.length}</span>
        <span className="text-sm font-bold text-white bg-slate-700 px-3 py-1 rounded-full">Puan: {score}</span>
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-white mb-8 leading-snug break-words">{currentQ.question}</h2>
      
      <div className="grid grid-cols-1 gap-3">
        {shuffledOptions.map((option, idx) => {
           let btnClass = "w-full p-4 text-left border rounded-xl transition-all text-white font-medium break-words ";
           if (showResult) {
             if (option === currentQ.correctAnswer) btnClass += "bg-emerald-950/50 border-emerald-500 text-emerald-200";
             else if (option === selectedOption) btnClass += "bg-red-950/50 border-red-500 text-red-200";
             else btnClass += "bg-slate-700/50 border-slate-600 text-slate-500 opacity-50";
           } else {
             btnClass += "bg-slate-900 border-slate-700 hover:bg-slate-700 hover:border-slate-500";
           }

           return (
             <button key={idx} onClick={() => handleAnswer(option)} disabled={showResult} className={btnClass}>
               <div className="flex justify-between items-center">
                   <span>{option}</span>
                   {showResult && option === currentQ.correctAnswer && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 ml-2" />}
                   {showResult && option === selectedOption && option !== currentQ.correctAnswer && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 ml-2" />}
               </div>
             </button>
           )
        })}
      </div>

      {showResult && (
        <div className="mt-8 animate-fade-in">
           <button onClick={nextQuestion} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-lg">
             {currentIdx === questions.length - 1 ? "Testi Bitir" : "Sonraki Soru"}
           </button>
        </div>
      )}
    </div>
  );
};

/* --- MATCHING PLAYER --- */
export const MatchingPlayer = ({ data, onFinish }: { data: { pairs: MatchingPair[] }, onFinish: (s: number, t: number) => void }) => {
  const [leftItems, setLeftItems] = useState<{id: string, text: string, pairId: string}[]>([]);
  const [rightItems, setRightItems] = useState<{id: string, text: string, pairId: string}[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
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
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 text-center">
         <p className="text-white font-medium">Soldaki ögeyi seçip sağdaki eşini bul.</p>
         <p className="text-sm text-slate-500 mt-2">Hatalar: {mistakes}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-3">
          {leftItems.map(item => {
            const isMatched = matchedIds.has(item.pairId);
            const isSelected = selectedLeft === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleLeftClick(item.id)}
                disabled={isMatched}
                className={`w-full p-4 rounded-xl shadow-sm border text-sm md:text-base font-medium transition-all break-words
                  ${isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                  ${isSelected ? 'bg-indigo-600 text-white border-indigo-500 transform scale-105' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'}
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
                 className={`w-full p-4 rounded-xl shadow-sm border text-sm md:text-base font-medium transition-all break-words
                  ${isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                  bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white
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

/* --- TRUE/FALSE PLAYER --- */
export const TrueFalsePlayer = ({ data, onFinish }: { data: { items: TrueFalseItem[] }, onFinish: (s: number, t: number) => void }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const items = useMemo(() => [...data.items].sort(() => Math.random() - 0.5), [data]);
    const item = items[currentIdx];

    const handleGuess = (guess: boolean) => {
        if (feedback) return;
        const isCorrect = guess === item.isTrue;
        if (isCorrect) setScore(s => s + 10);
        setFeedback(isCorrect ? 'correct' : 'wrong');
        setTimeout(() => {
            if (currentIdx < items.length - 1) {
                setCurrentIdx(c => c + 1);
                setFeedback(null);
            } else {
                onFinish(score + (isCorrect ? 10 : 0), items.length * 10);
            }
        }, 1500);
    };

    return (
        <div className="max-w-xl mx-auto bg-slate-800 rounded-2xl shadow-xl p-8 text-center border border-slate-700 mt-4 animate-fade-in">
             <div className="mb-10">
                 <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-4">İfade {currentIdx + 1} / {items.length}</span>
                 <h2 className="text-2xl font-bold text-white leading-relaxed break-words">{item.statement}</h2>
             </div>
             {feedback ? (
                 <div className={`p-6 rounded-xl mb-6 border ${feedback === 'correct' ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 'bg-red-950/30 border-red-900 text-red-400'}`}>
                     {feedback === 'correct' ? <div className="font-bold text-lg">Doğru!</div> : <div><div className="font-bold text-lg">Yanlış</div>{item.correction && <p className="text-sm mt-2 text-slate-400">{item.correction}</p>}</div>}
                 </div>
             ) : (
                 <div className="grid grid-cols-2 gap-6">
                    <button onClick={() => handleGuess(true)} className="p-6 rounded-2xl bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:text-emerald-500 text-slate-300 transition-all font-bold text-xl">DOĞRU</button>
                    <button onClick={() => handleGuess(false)} className="p-6 rounded-2xl bg-slate-900 border border-slate-700 hover:border-red-500 hover:text-red-500 text-slate-300 transition-all font-bold text-xl">YANLIŞ</button>
                 </div>
             )}
        </div>
    );
};

/* --- FLASHCARD PLAYER --- */
export const FlashcardPlayer = ({ data, onFinish }: { data: { items: FlashcardItem[] }, onFinish: () => void }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    const items = useMemo(() => [...data.items].sort(() => Math.random() - 0.5), [data]);
    const item = items[currentIdx];

    const nextCard = () => {
        setIsFlipped(false);
        if (currentIdx < items.length - 1) setTimeout(() => setCurrentIdx(c => c + 1), 150);
        else onFinish();
    };
    const prevCard = () => {
        setIsFlipped(false);
        if (currentIdx > 0) setTimeout(() => setCurrentIdx(c => c - 1), 150);
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center mt-4 animate-fade-in px-4">
            <div className="w-full text-center mb-6 text-slate-500 text-sm font-bold tracking-widest">KART {currentIdx + 1} / {items.length}</div>
            <div className="group w-full h-80 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)} style={{ perspective: '1000px' }}>
                <div className={`relative w-full h-full text-center transition-transform duration-500 transform-style-3d shadow-2xl rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                    <div className="absolute w-full h-full backface-hidden bg-slate-800 rounded-3xl flex items-center justify-center p-8 border border-slate-700" style={{ backfaceVisibility: 'hidden' }}><h2 className="text-3xl font-bold text-white break-words">{item.front}</h2><span className="absolute bottom-6 text-xs text-slate-500 uppercase tracking-widest">Çevir</span></div>
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl flex items-center justify-center p-8 text-black rotate-y-180" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><p className="text-xl font-medium leading-relaxed break-words">{item.back}</p></div>
                </div>
            </div>
            <div className="flex space-x-6 mt-10">
                <button onClick={prevCard} disabled={currentIdx === 0} className="p-4 rounded-full bg-slate-800 shadow-lg hover:bg-slate-700 disabled:opacity-30 text-white border border-slate-700 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={nextCard} className="p-4 rounded-full bg-slate-800 shadow-lg hover:bg-slate-700 text-white border border-slate-700 transition-colors">{currentIdx === items.length - 1 ? <CheckCircle className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}</button>
            </div>
        </div>
    );
};

/* --- SEQUENCE PLAYER --- */
export const SequencePlayer = ({ data, onFinish }: { data: { items: SequenceItem[]; question?: string }, onFinish: (s: number, t: number) => void }) => {
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
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 mb-6">
                <h3 className="text-xl font-bold text-white mb-6 text-center break-words">{data.question || "Doğru sıraya dizin"}</h3>
                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div key={item.id} className={`p-4 rounded-xl flex items-center justify-between border transition-colors ${checked ? (item.order === idx ? 'bg-emerald-950/30 border-emerald-900 text-emerald-100' : 'bg-red-950/30 border-red-900 text-red-100') : 'bg-slate-900 border-slate-700'}`}>
                            <span className="text-white font-medium break-words pr-2">{item.text}</span>
                            {!checked && (
                                <div className="flex flex-col space-y-1 ml-4 flex-shrink-0">
                                    <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400"><ChevronLeft className="w-4 h-4 rotate-90" /></button>
                                    <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1} className="p-1 hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400"><ChevronLeft className="w-4 h-4 -rotate-90" /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {!checked ? <button onClick={checkOrder} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-500 shadow-lg">Kontrol Et</button> : <button onClick={() => setChecked(false)} className="w-full mt-8 bg-slate-700 text-white py-4 rounded-xl font-bold hover:bg-slate-600">Tekrar Dene</button>}
            </div>
        </div>
    );
};

/* --- CLOZE PLAYER --- */
export const ClozePlayer = ({ data, onFinish, caseSensitive }: { data: { data: ClozeItem }, onFinish: (s: number, t: number) => void, caseSensitive?: boolean }) => {
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
        <div className="max-w-3xl mx-auto bg-slate-800 p-8 md:p-10 rounded-2xl border border-slate-700 mt-4 animate-fade-in shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Boşlukları Doldurun</h3>
            <div className="text-lg md:text-xl leading-loose text-slate-200 font-light">
                {data.data.textParts.map((part, index) => (
                    <React.Fragment key={index}>
                        <span className="break-words">{part}</span>
                        {index < data.data.answers.length && (
                            <span className="inline-block mx-1">
                                <input 
                                    type="text" 
                                    value={inputs[index]} 
                                    onChange={(e) => { if (checked) setChecked(false); const newInputs = [...inputs]; newInputs[index] = e.target.value; setInputs(newInputs); }} 
                                    disabled={checked && (caseSensitive ? inputs[index].trim() === data.data.answers[index] : inputs[index].trim().toLowerCase() === data.data.answers[index].toLowerCase())} 
                                    className={`min-w-[80px] w-auto max-w-[150px] bg-transparent border-b-2 px-1 py-0.5 outline-none text-center transition-colors font-medium
                                        ${checked 
                                            ? ((caseSensitive ? inputs[index].trim() === data.data.answers[index] : inputs[index].trim().toLowerCase() === data.data.answers[index].toLowerCase()) 
                                                ? 'border-emerald-500 text-emerald-400' 
                                                : 'border-red-500 text-red-400') 
                                            : 'border-slate-500 text-white focus:border-white'}`} 
                                />
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>
            <div className="mt-10">
                <button onClick={handleCheck} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-lg">Cevapları Kontrol Et</button>
            </div>
        </div>
    );
};

/* --- SCRAMBLE PLAYER --- */
export const ScramblePlayer = ({ data, onFinish }: { data: { items: ScrambleItem[] }, onFinish: (s: number, t: number) => void }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const items = useMemo(() => [...data.items].sort(() => Math.random() - 0.5), [data]);
    const item = items[currentIdx];

    const scrambledWord = useMemo(() => {
        return item.word.split('').sort(() => Math.random() - 0.5).join('');
    }, [item]);

    const handleCheck = () => {
        if (userInput.trim().toLowerCase() === item.word.toLowerCase()) {
            setFeedback('correct');
            setTimeout(() => {
                setFeedback(null);
                setUserInput('');
                if (currentIdx < items.length - 1) {
                    setCurrentIdx(c => c + 1);
                } else {
                    onFinish(100, 100);
                }
            }, 1000);
        } else {
            setFeedback('wrong');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-slate-800 p-8 rounded-2xl border border-slate-700 mt-4 text-center shadow-xl">
            <h3 className="text-xl font-bold text-white mb-2">Kelime Avı</h3>
            <p className="text-slate-500 mb-8">Harfleri düzelterek kelimeyi bul</p>
            
            <div className="text-4xl md:text-5xl font-mono tracking-[0.2em] text-white mb-8 break-all">{scrambledWord.toUpperCase()}</div>
            
            {item.hint && <div className="text-sm text-yellow-500/90 mb-6 bg-yellow-900/10 border border-yellow-900/20 p-2 rounded inline-block px-4">İpucu: {item.hint}</div>}

            <input 
                value={userInput}
                onChange={e => { setUserInput(e.target.value); setFeedback(null); }}
                className={`w-full bg-slate-900 border p-4 rounded-xl text-center text-xl text-white mb-6 outline-none transition-all ${feedback === 'correct' ? 'border-emerald-500 ring-1 ring-emerald-500' : feedback === 'wrong' ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600 focus:border-indigo-500'}`}
                placeholder="Kelimeyi yazın..."
            />
            
            <button onClick={handleCheck} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-500 transition-colors">Kontrol Et</button>
        </div>
    );
};