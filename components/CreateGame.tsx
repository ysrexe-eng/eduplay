import React, { useState, useEffect } from 'react';
import { GameType, GameModule, QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, GameSettings, MixedStage, ScrambleItem } from '../types';
import { Save, Trash2, ArrowLeft, Globe, Lock, Loader2, ListPlus, Edit, Check, Code } from 'lucide-react';
import { QuizEditor, MatchingEditor, SequenceEditor, ScrambleEditor, ClozeEditor } from './GameEditors';

interface CreateGameProps {
  onSave: (gameData: Partial<GameModule>, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
  initialGame?: GameModule | null;
  userId?: string;
}

export const CreateGame: React.FC<CreateGameProps> = ({ onSave, onCancel, initialGame, userId }) => {
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

  // JSON Editor
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState('');

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
      setShowJsonEditor(false); setJsonContent('');
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
              if (quizItems.length === 0) return alert("Lütfen soruyu oluşturun ve 'Soruyu Ekle' butonuna basın.");
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
                    className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${currentStageType === t.id ? 'border-indigo-500 bg-indigo-900/20 shadow-xl scale-105' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}
                  >
                      <div className={`w-5 h-5 rounded-full border mb-2 flex items-center justify-center transition-colors ${currentStageType === t.id ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>
                          {currentStageType === t.id && <Check size={12} className="text-white"/>}
                      </div>
                      <span className="font-bold text-white text-sm">{t.label}</span>
                      <span className="text-xs text-slate-400 mt-1">Maks. {t.limit} Soru</span>
                  </div>
              ))}
          </div>
      );
  };

  const renderActiveEditor = () => {
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
          case GameType.CLOZE: return <ClozeEditor text={clozeText} setText={setClozeText} />;
          case GameType.TRUE_FALSE: return (
            <div className="space-y-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <input 
                        placeholder="İfade" 
                        value={tempTf.stmt} 
                        onChange={e => setTempTf({...tempTf, stmt: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white mb-4 focus:border-indigo-500 outline-none" 
                        onKeyDown={(e) => handleKeyDownSimple(e, () => {
                            if(tempTf.stmt) { 
                                if(tfItems.length>=5) return alert('Limit 5'); 
                                setTfItems([...tfItems, { statement: tempTf.stmt, isTrue: tempTf.isTrue }]); 
                                setTempTf({stmt:'', isTrue:true}); 
                            }
                        })}
                    />
                    <div className="flex gap-4 mb-4">
                        <label className="text-white flex items-center cursor-pointer bg-slate-900 px-4 py-2 rounded border border-slate-700 hover:border-slate-500"><input type="radio" className="mr-2 accent-indigo-500" checked={tempTf.isTrue} onChange={() => setTempTf({...tempTf, isTrue: true})} />Doğru</label>
                        <label className="text-white flex items-center cursor-pointer bg-slate-900 px-4 py-2 rounded border border-slate-700 hover:border-slate-500"><input type="radio" className="mr-2 accent-indigo-500" checked={!tempTf.isTrue} onChange={() => setTempTf({...tempTf, isTrue: false})} />Yanlış</label>
                    </div>
                    <button onClick={() => { if(tempTf.stmt) { if(tfItems.length>=5) return alert('Limit 5'); setTfItems([...tfItems, { statement: tempTf.stmt, isTrue: tempTf.isTrue }]); setTempTf({stmt:'', isTrue:true}); } }} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors">Ekle</button>
                </div>
                {tfItems.map((item, idx) => <div key={idx} className="text-slate-300 flex justify-between items-center bg-slate-800 border border-slate-700 p-3 rounded-lg"><span className="break-words mr-2">{item.statement} <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.isTrue ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>{item.isTrue ? 'D' : 'Y'}</span></span><Trash2 onClick={() => setTfItems(tfItems.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer flex-shrink-0"/></div>)}
            </div>
          );
          case GameType.FLASHCARD: return (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        placeholder="Ön Yüz" 
                        value={tempFlash.f} 
                        onChange={e => setTempFlash({...tempFlash, f: e.target.value})} 
                        className="w-1/2 bg-slate-900 border border-slate-600 p-3 rounded-lg text-white focus:border-indigo-500 outline-none" 
                        onKeyDown={(e) => handleKeyDownSimple(e, () => {
                             if(tempFlash.f && tempFlash.b) { 
                                if(flashcards.length>=5) return alert('Limit 5'); 
                                setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); 
                                setTempFlash({f:'', b:''}); 
                            } 
                        })}
                    />
                    <input 
                        placeholder="Arka Yüz" 
                        value={tempFlash.b} 
                        onChange={e => setTempFlash({...tempFlash, b: e.target.value})} 
                        className="w-1/2 bg-slate-900 border border-slate-600 p-3 rounded-lg text-white focus:border-indigo-500 outline-none" 
                        onKeyDown={(e) => handleKeyDownSimple(e, () => {
                             if(tempFlash.f && tempFlash.b) { 
                                if(flashcards.length>=5) return alert('Limit 5'); 
                                setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); 
                                setTempFlash({f:'', b:''}); 
                            } 
                        })}
                    />
                </div>
                <button onClick={() => { if(tempFlash.f && tempFlash.b) { if(flashcards.length>=5) return alert('Limit 5'); setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); setTempFlash({f:'', b:''}); } }} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors">Kart Ekle</button>
                {flashcards.map((item, idx) => <div key={idx} className="text-slate-300 flex justify-between bg-slate-800 border border-slate-700 p-3 rounded-lg"><span className="break-words mr-2">{item.front} ↔ {item.back}</span><Trash2 onClick={() => setFlashcards(flashcards.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer flex-shrink-0"/></div>)}
            </div>
          );
          default: return null;
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-6">
      <div className="mb-8 text-center pt-4"><h1 className="text-3xl font-bold text-white tracking-tight">{initialGame ? 'Uygulamayı Düzenle' : 'Yeni Uygulama Oluştur'}</h1></div>

      <div className="bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-700 animate-fade-in mb-8">
           <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Uygulama Bilgileri</h2>
           <div className="space-y-4 mb-6">
               <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white focus:border-indigo-500 outline-none transition-colors" placeholder="Uygulama Başlığı" />
               <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white focus:border-indigo-500 outline-none transition-colors" placeholder="Açıklama" />
           </div>
           <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <label className="flex items-center cursor-pointer">
                    <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ${isPublic ? 'bg-indigo-500' : 'bg-slate-600'}`} onClick={() => setIsPublic(!isPublic)}>
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${isPublic ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-white font-medium flex items-center">
                        {isPublic ? <Globe className="w-4 h-4 mr-2 text-indigo-400"/> : <Lock className="w-4 h-4 mr-2 text-slate-500"/>}
                        {isPublic ? 'Herkese Açık (Toplulukta Görünür)' : 'Gizli (Sadece Ben)'}
                    </span>
                </label>
           </div>
      </div>

      <div className="bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-700 animate-fade-in">
             <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                 <h2 className="text-xl font-bold text-white">Oyun Birimleri ({stages.length}/40)</h2>
                 {!isAddingStage && stages.length < 40 && (
                     <button onClick={() => { setIsAddingStage(true); resetEditor(); setEditingStageIndex(null); setCurrentStageType(null); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-500 flex items-center transition-colors">
                        <ListPlus size={16} className="mr-2"/> Yeni Ekle
                     </button>
                 )}
             </div>
             
             {!isAddingStage ? (
                 <>
                    <div className="space-y-3 mb-6">
                        {stages.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
                                <ListPlus className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                                <p className="text-slate-500">Henüz hiç oyun birimi eklenmemiş.</p>
                                <button onClick={() => { setIsAddingStage(true); resetEditor(); setEditingStageIndex(null); setCurrentStageType(null); }} className="mt-4 text-indigo-400 hover:text-indigo-300 underline">
                                    İlk birimi ekle
                                </button>
                            </div>
                        )}
                        {stages.map((stage, idx) => (
                            <div key={stage.id} className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex justify-between items-center group hover:border-slate-500 transition-all">
                                <div>
                                    <span className="text-slate-500 font-bold mr-3">#{idx + 1}</span>
                                    <span className="text-white font-medium">{stage.title}</span>
                                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded ml-3">{stage.type}</span>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleEditStage(idx)} className="p-2 bg-slate-800 rounded hover:bg-white hover:text-black text-slate-300 transition-colors"><Edit size={16} /></button>
                                    <button onClick={() => setStages(stages.filter((_, i) => i !== idx))} className="p-2 bg-slate-800 rounded hover:bg-red-900 hover:text-red-200 text-slate-300 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 </>
             ) : (
                 <div className="animate-fade-in">
                     <div className="flex justify-between mb-6">
                        <h3 className="text-white font-bold text-lg">Mod Seçimi</h3>
                        <button onClick={() => setIsAddingStage(false)} className="text-slate-400 hover:text-white text-sm">İptal</button>
                     </div>
                     {renderTypeSelector()}
                     
                     {currentStageType && (
                         <div className="mt-8 border-t border-slate-700 pt-8">
                             <div className="flex justify-between items-center mb-4">
                                 <h4 className="text-white font-bold">İçerik Düzenleyici</h4>
                                 <button onClick={() => setShowJsonEditor(!showJsonEditor)} className="text-xs flex items-center text-slate-500 hover:text-slate-300"><Code size={12} className="mr-1"/> {showJsonEditor ? 'Basit Görünüm' : 'Gelişmiş (JSON)'}</button>
                             </div>
                             
                             {renderActiveEditor()}

                             {['QUIZ', 'SEQUENCE', 'CLOZE'].includes(currentStageType) && (
                                <div className="mt-2 text-xs text-yellow-600/80 bg-yellow-900/10 p-2 rounded border border-yellow-900/20">
                                    Dikkat: Bir sahne = Bir sorudur. Buradan tek bir oyun birimi oluşturuyorsunuz.
                                </div>
                             )}

                             <button onClick={saveStage} className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-500 shadow-lg transition-all flex justify-center items-center">
                                 <Save className="mr-2 h-5 w-5"/> Birimi Kaydet
                             </button>
                         </div>
                     )}
                 </div>
             )}

             {!isAddingStage && (
                 <div className="flex justify-between pt-8 border-t border-slate-700 mt-6">
                    <button onClick={onCancel} className="px-6 py-3 text-slate-400 hover:text-white flex items-center font-medium"><ArrowLeft className="mr-2 w-4 h-4"/> İptal</button>
                    <button onClick={async () => { setIsSaving(true); await onSave({ id: initialGame?.id, title, description, gameType: GameType.MIXED, data: { type: GameType.MIXED, stages }, settings, author_id: userId, isPublic }, !!initialGame); setIsSaving(false); }} disabled={isSaving || !title || stages.length===0} className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 flex items-center shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-5 h-5" />} {initialGame ? 'Güncelle' : 'Yayınla'}
                    </button>
                 </div>
             )}
        </div>
    </div>
  );
};