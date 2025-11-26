import React, { useState, useEffect } from 'react';
import { GameType, GameModule, QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, GameSettings, MixedStage, ScrambleItem } from '../types';
import { Save, Trash2, ArrowLeft, Globe, Lock, Loader2, ListPlus, Edit, Check } from 'lucide-react';
import { QuizEditor, MatchingEditor, SequenceEditor, ScrambleEditor } from './GameEditors';

interface CreateGameProps {
  onSave: (gameData: Partial<GameModule>, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
  initialGame?: GameModule | null;
  userId?: string;
}

const CreateGame: React.FC<CreateGameProps> = ({ onSave, onCancel, initialGame, userId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({ timeLimit: 0, randomizeOrder: true, allowRetry: true, caseSensitive: false });

  // Stage Management
  const [stages, setStages] = useState<MixedStage[]>([]);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  
  // Editor State
  const [currentStageType, setCurrentStageType] = useState<GameType | null>(null);
  
  // Temporary Data Holders
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([]);
  const [tfItems, setTfItems] = useState<TrueFalseItem[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [sequenceItems, setSequenceItems] = useState<string[]>([]);
  const [sequenceQuestion, setSequenceQuestion] = useState('');
  const [clozeText, setClozeText] = useState('');
  const [scrambleItems, setScrambleItems] = useState<ScrambleItem[]>([]);

  // Other temp inputs for simple editors
  const [tempTf, setTempTf] = useState({ stmt: '', isTrue: true });
  const [tempFlash, setTempFlash] = useState({ f: '', b: '' });

  useEffect(() => {
    if (initialGame) {
      setTitle(initialGame.title);
      setDescription(initialGame.description);
      setIsPublic(initialGame.isPublic);
      setSettings(initialGame.settings || { timeLimit: 0, randomizeOrder: true, allowRetry: true });
      if (initialGame.gameType === GameType.MIXED) {
          setStages((initialGame.data as any).stages || []);
      } else {
           const stageData: MixedStage = {
              id: 'legacy-1',
              type: initialGame.gameType,
              title: 'Bölüm 1',
              data: initialGame.data
           };
           setStages([stageData]);
      }
    }
  }, [initialGame]);

  const resetEditor = () => {
      setQuizItems([]); setMatchingPairs([]); setTfItems([]); setFlashcards([]); 
      setSequenceItems([]); setSequenceQuestion(''); setClozeText(''); setScrambleItems([]);
      setTempTf({stmt:'', isTrue:true}); setTempFlash({f:'', b:''});
  };

  const handleEditStage = (index: number) => {
      const stage = stages[index];
      setEditingStageIndex(index);
      setCurrentStageType(stage.type);
      resetEditor();
      
      const d = stage.data as any;
      switch (stage.type) {
        case GameType.QUIZ: setQuizItems(d.items || []); break;
        case GameType.MATCHING: setMatchingPairs(d.pairs || []); break;
        case GameType.TRUE_FALSE: setTfItems(d.items || []); break;
        case GameType.FLASHCARD: setFlashcards(d.items || []); break;
        case GameType.SCRAMBLE: setScrambleItems(d.items || []); break;
        case GameType.SEQUENCE:
           const items = d.items as SequenceItem[] || [];
           setSequenceItems(items.sort((a,b) => a.order - b.order).map(i => i.text));
           setSequenceQuestion(d.question || '');
           break;
        case GameType.CLOZE:
           const c = d.data as ClozeItem;
           if(c) {
               let txt = "";
               c.textParts.forEach((part, i) => {
                   txt += part;
                   if (i < c.answers.length) txt += `[${c.answers[i]}]`;
               });
               setClozeText(txt);
           }
           break;
      }
      setIsAddingStage(true);
  };

  const saveStage = () => {
      if (!currentStageType) return;
      
      let data: any = null;
      let title = `Oyun Birimi (${currentStageType})`;

      // Constraints
      if (['QUIZ', 'SEQUENCE', 'CLOZE'].includes(currentStageType)) {
          // Limit 1
          if (currentStageType === GameType.QUIZ) {
              if (quizItems.length === 0) return alert("Lütfen en az bir soru oluşturun.");
              if (quizItems.length > 1) return alert("Bu modda sadece 1 soru ekleyebilirsiniz.");
          }
          if (currentStageType === GameType.SEQUENCE) {
              if (sequenceItems.length < 2) return alert("Sıralama için en az 2 öge gerekir.");
          }
          if (currentStageType === GameType.CLOZE) {
              if (!clozeText.includes('[') || !clozeText.includes(']')) return alert("En az bir boşluk tanımlayın.");
          }
      } else {
          // Limit 5
          const limit = 5;
          const countMap = {
              [GameType.MATCHING]: matchingPairs.length,
              [GameType.TRUE_FALSE]: tfItems.length,
              [GameType.FLASHCARD]: flashcards.length,
              [GameType.SCRAMBLE]: scrambleItems.length
          };
          const count = countMap[currentStageType as any] || 0;
          if (count === 0) return alert("En az 1 öge ekleyin.");
          if (count > limit) return alert(`Bu modda en fazla ${limit} öge ekleyebilirsiniz.`);
      }

      switch (currentStageType) {
          case GameType.QUIZ: data = { type: GameType.QUIZ, items: quizItems }; break;
          case GameType.MATCHING: data = { type: GameType.MATCHING, pairs: matchingPairs }; break;
          case GameType.TRUE_FALSE: data = { type: GameType.TRUE_FALSE, items: tfItems }; break;
          case GameType.FLASHCARD: data = { type: GameType.FLASHCARD, items: flashcards }; break;
          case GameType.SCRAMBLE: data = { type: GameType.SCRAMBLE, items: scrambleItems }; break;
          case GameType.SEQUENCE: 
              data = { 
                  type: GameType.SEQUENCE, 
                  items: sequenceItems.map((text, idx) => ({ id: `${Date.now()}-${idx}`, text, order: idx })),
                  question: sequenceQuestion
              }; 
              break;
          case GameType.CLOZE:
               const regex = /\[(.*?)\]/g;
               const textParts = clozeText.split(regex).filter((_, i) => i % 2 === 0);
               const answers = [];
               let match;
               while ((match = regex.exec(clozeText)) !== null) answers.push(match[1]);
               data = { type: GameType.CLOZE, data: { textParts, answers } };
               break;
      }

      const newStage: MixedStage = {
          id: editingStageIndex !== null ? stages[editingStageIndex].id : Math.random().toString(36),
          type: currentStageType,
          title,
          data
      };

      if (editingStageIndex !== null) {
          const u = [...stages];
          u[editingStageIndex] = newStage;
          setStages(u);
      } else {
          if (stages.length >= 40) return alert("En fazla 40 oyun birimi oluşturabilirsiniz.");
          setStages([...stages, newStage]);
      }
      setIsAddingStage(false);
      setEditingStageIndex(null);
      setCurrentStageType(null);
  };

  const renderTypeSelector = () => {
      const types = [
          { id: GameType.QUIZ, label: 'Test', limit: 1 },
          { id: GameType.SEQUENCE, label: 'Sıralama', limit: 1 },
          { id: GameType.CLOZE, label: 'Boşluk Doldurma', limit: 1 },
          { id: GameType.MATCHING, label: 'Eşleştirme', limit: 5 },
          { id: GameType.TRUE_FALSE, label: 'Doğru/Yanlış', limit: 5 },
          { id: GameType.SCRAMBLE, label: 'Kelime Avı', limit: 5 },
          { id: GameType.FLASHCARD, label: 'Kartlar', limit: 5 },
      ];

      return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {types.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => { setCurrentStageType(t.id); resetEditor(); }}
                    className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${currentStageType === t.id ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}
                  >
                      <div className={`w-5 h-5 rounded border mb-2 flex items-center justify-center ${currentStageType === t.id ? 'bg-indigo-600 border-indigo-600' : 'border-gray-500'}`}>
                          {currentStageType === t.id && <Check size={14} className="text-white"/>}
                      </div>
                      <span className="font-bold text-white text-sm">{t.label}</span>
                      <span className="text-xs text-gray-500 mt-1">Maks. {t.limit} Soru</span>
                  </div>
              ))}
          </div>
      );
  };

  const renderActiveEditor = () => {
      // Helper for simple text inputs to submit on Ctrl+Enter
      const handleKeyDownSimple = (e: React.KeyboardEvent, action: () => void) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              action();
          }
      };

      switch(currentStageType) {
          case GameType.QUIZ: return <QuizEditor items={quizItems} setItems={setQuizItems} />;
          case GameType.MATCHING: return <MatchingEditor pairs={matchingPairs} setPairs={setMatchingPairs} />;
          case GameType.SEQUENCE: return <SequenceEditor items={sequenceItems} setItems={setSequenceItems} question={sequenceQuestion} setQuestion={setSequenceQuestion}/>;
          case GameType.SCRAMBLE: return <ScrambleEditor items={scrambleItems} setItems={setScrambleItems}/>;
          case GameType.CLOZE: return (
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <p className="text-gray-400 text-sm mb-2">Boşlukları [köşeli parantez] ile belirtin.</p>
                  <textarea 
                    rows={6} 
                    value={clozeText} 
                    onChange={e => setClozeText(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white font-mono" 
                    placeholder="Gökyüzü [mavi] renktedir."
                    onKeyDown={(e) => handleKeyDownSimple(e, saveStage)}
                  />
                  <p className="text-xs text-slate-500 mt-2">Kaydetmek için CTRL + Enter</p>
              </div>
          );
          case GameType.TRUE_FALSE: return (
            <div className="space-y-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <input 
                        placeholder="İfade" 
                        value={tempTf.stmt} 
                        onChange={e => setTempTf({...tempTf, stmt: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-600 p-2 rounded text-white mb-2" 
                        onKeyDown={(e) => handleKeyDownSimple(e, () => {
                            if(tempTf.stmt) { 
                                if(tfItems.length>=5) return alert('Limit 5'); 
                                setTfItems([...tfItems, { statement: tempTf.stmt, isTrue: tempTf.isTrue }]); 
                                setTempTf({stmt:'', isTrue:true}); 
                            }
                        })}
                    />
                    <div className="flex gap-4 mb-2">
                        <label className="text-white flex items-center"><input type="radio" className="mr-2" checked={tempTf.isTrue} onChange={() => setTempTf({...tempTf, isTrue: true})} />Doğru</label>
                        <label className="text-white flex items-center"><input type="radio" className="mr-2" checked={!tempTf.isTrue} onChange={() => setTempTf({...tempTf, isTrue: false})} />Yanlış</label>
                    </div>
                    <button onClick={() => { if(tempTf.stmt) { if(tfItems.length>=5) return alert('Limit 5'); setTfItems([...tfItems, { statement: tempTf.stmt, isTrue: tempTf.isTrue }]); setTempTf({stmt:'', isTrue:true}); } }} className="w-full bg-indigo-600 text-white py-2 rounded">Ekle</button>
                </div>
                {tfItems.map((item, idx) => <div key={idx} className="text-gray-300 flex justify-between bg-slate-800 border border-slate-700 p-2 rounded"><span>{item.statement}</span><Trash2 onClick={() => setTfItems(tfItems.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer"/></div>)}
            </div>
          );
          case GameType.FLASHCARD: return (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        placeholder="Ön" 
                        value={tempFlash.f} 
                        onChange={e => setTempFlash({...tempFlash, f: e.target.value})} 
                        className="w-1/2 bg-slate-900 border border-slate-600 p-2 rounded text-white" 
                        onKeyDown={(e) => handleKeyDownSimple(e, () => {
                             if(tempFlash.f && tempFlash.b) { 
                                if(flashcards.length>=5) return alert('Limit 5'); 
                                setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); 
                                setTempFlash({f:'', b:''}); 
                            } 
                        })}
                    />
                    <input 
                        placeholder="Arka" 
                        value={tempFlash.b} 
                        onChange={e => setTempFlash({...tempFlash, b: e.target.value})} 
                        className="w-1/2 bg-slate-900 border border-slate-600 p-2 rounded text-white" 
                        onKeyDown={(e) => handleKeyDownSimple(e, () => {
                             if(tempFlash.f && tempFlash.b) { 
                                if(flashcards.length>=5) return alert('Limit 5'); 
                                setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); 
                                setTempFlash({f:'', b:''}); 
                            } 
                        })}
                    />
                </div>
                <button onClick={() => { if(tempFlash.f && tempFlash.b) { if(flashcards.length>=5) return alert('Limit 5'); setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); setTempFlash({f:'', b:''}); } }} className="w-full bg-indigo-600 text-white py-2 rounded">Kart Ekle</button>
                {flashcards.map((item, idx) => <div key={idx} className="text-gray-300 flex justify-between bg-slate-800 border border-slate-700 p-2 rounded"><span>{item.front}</span><Trash2 onClick={() => setFlashcards(flashcards.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer"/></div>)}
            </div>
          );
          default: return null;
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 px-2 sm:px-0">
      <div className="mb-8 text-center"><h1 className="text-3xl font-bold text-white">{initialGame ? 'Uygulamayı Düzenle' : 'Yeni Uygulama Oluştur'}</h1></div>

      <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 animate-fade-in mb-8">
           <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Uygulama Bilgileri</h2>
           <div className="space-y-4 mb-6">
               <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" placeholder="Uygulama Başlığı" />
               <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" placeholder="Açıklama" />
           </div>
           <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <label className="flex items-center cursor-pointer">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-indigo-600' : 'bg-slate-600'}`} onClick={() => setIsPublic(!isPublic)}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isPublic ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-white font-medium flex items-center">
                        {isPublic ? <Globe className="w-4 h-4 mr-2 text-indigo-400"/> : <Lock className="w-4 h-4 mr-2 text-gray-400"/>}
                        {isPublic ? 'Herkese Açık' : 'Gizli'}
                    </span>
                </label>
           </div>
      </div>

      <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 animate-fade-in">
             <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
                 <h2 className="text-xl font-bold text-white">Oyun Birimleri ({stages.length}/40)</h2>
             </div>
             
             {!isAddingStage ? (
                 <>
                    <div className="space-y-2 mb-6">
                        {stages.map((stage, idx) => (
                            <div key={stage.id} className="p-3 bg-slate-700 rounded flex justify-between items-center">
                                <span className="text-white font-medium">{idx + 1}. {stage.type}</span>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleEditStage(idx)} className="p-2 bg-slate-600 rounded hover:bg-indigo-600 text-white"><Edit size={16} /></button>
                                    <button onClick={() => setStages(stages.filter((_, i) => i !== idx))} className="p-2 bg-slate-600 rounded hover:bg-red-600 text-white"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => { setIsAddingStage(true); resetEditor(); setEditingStageIndex(null); setCurrentStageType(null); }} className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-500 font-bold flex items-center justify-center">
                        <ListPlus className="mr-2"/> Yeni Birim Ekle
                    </button>
                 </>
             ) : (
                 <div className="animate-fade-in">
                     <div className="flex justify-between mb-4">
                        <h3 className="text-white font-bold">Mod Seçimi</h3>
                        <button onClick={() => setIsAddingStage(false)} className="text-gray-400">İptal</button>
                     </div>
                     {renderTypeSelector()}
                     
                     {currentStageType && (
                         <div className="mt-6 border-t border-slate-700 pt-6">
                             {renderActiveEditor()}
                             <button onClick={saveStage} className="w-full mt-4 bg-emerald-600 text-white py-2 rounded font-bold">Birim Kaydet</button>
                         </div>
                     )}
                 </div>
             )}

             {!isAddingStage && (
                 <div className="flex justify-between pt-8 border-t border-slate-700 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white flex items-center"><ArrowLeft className="mr-2 w-4 h-4"/> İptal</button>
                    <button onClick={async () => { setIsSaving(true); await onSave({ id: initialGame?.id, title, description, gameType: GameType.MIXED, data: { type: GameType.MIXED, stages }, settings, author_id: userId, isPublic }, !!initialGame); setIsSaving(false); }} disabled={isSaving || !title || stages.length===0} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center shadow-lg font-bold disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-4 h-4" />} {initialGame ? 'Güncelle' : 'Yayınla'}
                    </button>
                 </div>
             )}
        </div>
    </div>
  );
};

export default CreateGame;