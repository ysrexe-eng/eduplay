import React, { useState, useEffect } from 'react';
import { GameType, GameModule, QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, GameSettings, MixedStage } from '../types';
import { Save, Trash2, ArrowRight, ArrowLeft, Settings, Plus, Minus, X, Globe, Lock, Loader2, ListPlus, Edit, Check } from 'lucide-react';

interface CreateGameProps {
  onSave: (gameData: Partial<GameModule>, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
  initialGame?: GameModule | null;
  userId?: string;
}

const CreateGame: React.FC<CreateGameProps> = ({ onSave, onCancel, initialGame, userId }) => {
  const [step, setStep] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameType, setGameType] = useState<GameType>(GameType.QUIZ);
  const [isPublic, setIsPublic] = useState(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
      timeLimit: 0,
      randomizeOrder: false,
      allowRetry: true,
      caseSensitive: false
  });

  // Content State for Single Mode
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([]);
  const [tfItems, setTfItems] = useState<TrueFalseItem[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [sequenceItems, setSequenceItems] = useState<string[]>([]);
  const [sequenceQuestion, setSequenceQuestion] = useState('');
  const [clozeText, setClozeText] = useState('');

  // Mixed Mode State
  const [stages, setStages] = useState<MixedStage[]>([]);
  const [currentStageType, setCurrentStageType] = useState<GameType>(GameType.QUIZ);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);

  // Editing State for Items
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Temporary Inputs
  const [tempQ, setTempQ] = useState({ q: '', options: ['', ''], correct: 0 });
  const [tempMatch, setTempMatch] = useState({ a: '', b: '' });
  const [tempTf, setTempTf] = useState({ stmt: '', isTrue: true });
  const [tempFlash, setTempFlash] = useState({ f: '', b: '' });
  const [tempSeq, setTempSeq] = useState('');

  // Load initial data
  useEffect(() => {
    if (initialGame) {
      setTitle(initialGame.title);
      setDescription(initialGame.description);
      setGameType(initialGame.gameType);
      setIsPublic(initialGame.isPublic);
      setSettings(initialGame.settings || { timeLimit: 0, randomizeOrder: false, allowRetry: true });

      try {
          // Reset all inputs first
          setQuizItems([]); setMatchingPairs([]); setTfItems([]); setFlashcards([]); setSequenceItems([]); setStages([]);

          switch (initialGame.gameType) {
            case GameType.QUIZ: setQuizItems((initialGame.data as any).items || []); break;
            case GameType.MATCHING: setMatchingPairs((initialGame.data as any).pairs || []); break;
            case GameType.TRUE_FALSE: setTfItems((initialGame.data as any).items || []); break;
            case GameType.FLASHCARD: setFlashcards((initialGame.data as any).items || []); break;
            case GameType.MIXED: setStages((initialGame.data as any).stages || []); break;
            case GameType.SEQUENCE:
               const items = (initialGame.data as any).items as SequenceItem[] || [];
               setSequenceItems(items.sort((a,b) => a.order - b.order).map(i => i.text));
               setSequenceQuestion((initialGame.data as any).question || '');
               break;
            case GameType.CLOZE:
               const d = (initialGame.data as any).data as ClozeItem;
               if(d && d.textParts) {
                   let reconstructed = "";
                   d.textParts.forEach((part, i) => {
                       reconstructed += part;
                       if (i < d.answers.length) {
                           reconstructed += `[${d.answers[i]}]`;
                       }
                   });
                   setClozeText(reconstructed);
               }
               break;
          }
      } catch(e) {
          console.error("Error loading game data", e);
      }
    }
  }, [initialGame]);

  const generateDataForType = (type: GameType): any => {
      if (type === GameType.QUIZ) return { type: GameType.QUIZ, items: quizItems };
      if (type === GameType.MATCHING) return { type: GameType.MATCHING, pairs: matchingPairs };
      if (type === GameType.TRUE_FALSE) return { type: GameType.TRUE_FALSE, items: tfItems };
      if (type === GameType.FLASHCARD) return { type: GameType.FLASHCARD, items: flashcards };
      if (type === GameType.SEQUENCE) {
          const items: SequenceItem[] = sequenceItems.map((text, idx) => ({ id: Date.now().toString() + idx, text, order: idx }));
          return { type: GameType.SEQUENCE, items, question: sequenceQuestion };
      }
      if (type === GameType.CLOZE) {
          const regex = /\[(.*?)\]/g;
          const textParts = clozeText.split(regex).filter((_, i) => i % 2 === 0);
          const answers = [];
          let match;
          while ((match = regex.exec(clozeText)) !== null) answers.push(match[1]);
          return { type: GameType.CLOZE, data: { textParts, answers } };
      }
      return null;
  };

  const validateData = (type: GameType) => {
      if (type === GameType.QUIZ && quizItems.length === 0) return "En az bir soru ekleyin.";
      if (type === GameType.MATCHING && matchingPairs.length < 2) return "En az iki çift ekleyin.";
      if (type === GameType.TRUE_FALSE && tfItems.length === 0) return "En az bir ifade ekleyin.";
      if (type === GameType.FLASHCARD && flashcards.length === 0) return "En az bir kart ekleyin.";
      if (type === GameType.SEQUENCE && sequenceItems.length < 2) return "Sıralamak için en az iki öge ekleyin.";
      if (type === GameType.CLOZE && (!clozeText.includes('[') || !clozeText.includes(']'))) return "Boşlukları [köşeli parantez] ile belirtin.";
      return null;
  };

  const handleAddOrUpdateStage = () => {
      const error = validateData(currentStageType);
      if (error) return alert(error);

      const stageData = generateDataForType(currentStageType);
      const newStage: MixedStage = {
          id: editingStageIndex !== null ? stages[editingStageIndex].id : Math.random().toString(36).substr(2, 9),
          type: currentStageType,
          title: `Sahne ${editingStageIndex !== null ? editingStageIndex + 1 : stages.length + 1} (${currentStageType})`,
          data: stageData
      };

      if (editingStageIndex !== null) {
          // Update existing stage
          const updatedStages = [...stages];
          updatedStages[editingStageIndex] = newStage;
          setStages(updatedStages);
          setEditingStageIndex(null);
      } else {
          // Add new stage
          setStages([...stages, newStage]);
      }

      setIsAddingStage(false);
      clearInputs();
  };

  const clearInputs = () => {
      setQuizItems([]); setMatchingPairs([]); setTfItems([]); setFlashcards([]); setSequenceItems([]); setSequenceQuestion(''); setClozeText('');
      setEditingItemIndex(null);
      setTempQ({ q: '', options: ['', ''], correct: 0 });
      setTempMatch({ a: '', b: '' });
      setTempTf({ stmt: '', isTrue: true });
      setTempFlash({ f: '', b: '' });
      setTempSeq('');
  };

  const handleEditStage = (index: number) => {
      const stage = stages[index];
      setCurrentStageType(stage.type);
      setEditingStageIndex(index);
      
      // Load stage data into active buffers
      try {
          switch (stage.type) {
            case GameType.QUIZ: setQuizItems((stage.data as any).items || []); break;
            case GameType.MATCHING: setMatchingPairs((stage.data as any).pairs || []); break;
            case GameType.TRUE_FALSE: setTfItems((stage.data as any).items || []); break;
            case GameType.FLASHCARD: setFlashcards((stage.data as any).items || []); break;
            case GameType.SEQUENCE:
               const items = (stage.data as any).items as SequenceItem[] || [];
               setSequenceItems(items.sort((a,b) => a.order - b.order).map(i => i.text));
               setSequenceQuestion((stage.data as any).question || '');
               break;
            case GameType.CLOZE:
               const d = (stage.data as any).data as ClozeItem;
               if(d && d.textParts) {
                   let reconstructed = "";
                   d.textParts.forEach((part, i) => {
                       reconstructed += part;
                       if (i < d.answers.length) {
                           reconstructed += `[${d.answers[i]}]`;
                       }
                   });
                   setClozeText(reconstructed);
               }
               break;
          }
          setIsAddingStage(true);
      } catch(e) {
          console.error("Error loading stage for editing", e);
      }
  };

  const handleSaveClick = async () => {
    let finalData: any = null;

    if (gameType === GameType.MIXED) {
        if (stages.length === 0) return alert("En az bir sahne ekleyin.");
        finalData = { type: GameType.MIXED, stages };
    } else {
        const error = validateData(gameType);
        if (error) return alert(error);
        finalData = generateDataForType(gameType);
    }

    setIsSaving(true);
    try {
        const gamePayload: Partial<GameModule> = {
            id: initialGame?.id,
            title,
            description: description || `${gameType} oyunu.`,
            gameType,
            data: finalData,
            settings: settings,
            author_id: userId,
            isPublic,
            author: initialGame?.author || 'Sen'
        };

        await onSave(gamePayload, !!initialGame);
    } catch (err: any) {
        alert("Kaydetme hatası: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const renderTypeOption = (type: GameType, label: string) => (
    <div 
      onClick={() => !initialGame && setGameType(type)}
      className={`p-4 rounded-xl border cursor-pointer transition-all text-center font-bold 
        ${gameType === type ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-500'}
        ${initialGame ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {label}
    </div>
  );

  // --- ITEM EDITORS ---

  const renderQuizEditor = () => {
    const addOption = () => setTempQ({ ...tempQ, options: [...tempQ.options, ''] });
    const removeOption = (idx: number) => { if (tempQ.options.length > 2) setTempQ({ ...tempQ, options: tempQ.options.filter((_, i) => i !== idx), correct: 0 }) };
    
    const handleAddOrUpdateQuestion = () => {
        if (!tempQ.q || tempQ.options.some(o => !o.trim())) return;
        
        const newItem = { question: tempQ.q, options: tempQ.options, correctAnswer: tempQ.options[tempQ.correct] };
        
        if (editingItemIndex !== null) {
            const updated = [...quizItems];
            updated[editingItemIndex] = newItem;
            setQuizItems(updated);
            setEditingItemIndex(null);
        } else {
            setQuizItems([...quizItems, newItem]);
        }
        setTempQ({ q: '', options: ['', ''], correct: 0 });
    };

    const loadQuestionForEdit = (idx: number) => {
        const item = quizItems[idx];
        const correctIdx = item.options.indexOf(item.correctAnswer);
        setTempQ({ q: item.question, options: [...item.options], correct: correctIdx !== -1 ? correctIdx : 0 });
        setEditingItemIndex(idx);
    };

    return (
      <div className="space-y-6">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative">
              {editingItemIndex !== null && <span className="absolute top-2 right-2 text-xs text-yellow-500 font-bold">Düzenleniyor...</span>}
              <input placeholder="Soru metni..." value={tempQ.q} onChange={e => setTempQ({...tempQ, q: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white mb-4" />
              <div className="space-y-3 mb-4">{tempQ.options.map((opt, idx) => (<div key={idx} className="flex items-center gap-2"><input type="radio" name="correct" checked={tempQ.correct === idx} onChange={() => setTempQ({...tempQ, correct: idx})} className="accent-indigo-500"/><input placeholder={`Seçenek ${idx + 1}`} value={opt} onChange={e => {const newOpts = [...tempQ.options]; newOpts[idx] = e.target.value; setTempQ({...tempQ, options: newOpts});}} className={`flex-grow bg-slate-900 border rounded p-2 text-white text-sm ${tempQ.correct === idx ? 'border-emerald-500' : 'border-slate-600'}`}/>{tempQ.options.length > 2 && <X size={16} onClick={() => removeOption(idx)} className="text-slate-500 hover:text-red-400 cursor-pointer"/>}</div>))}</div>
              <div className="flex gap-2 mb-4"><button onClick={addOption} className="text-xs bg-slate-700 text-white px-3 py-1 rounded flex items-center"><Plus size={12} className="mr-1"/> Seçenek Ekle</button></div>
              
              <div className="flex gap-2">
                  {editingItemIndex !== null && <button onClick={() => { setEditingItemIndex(null); setTempQ({ q: '', options: ['', ''], correct: 0 }); }} className="flex-1 bg-slate-600 text-white py-2 rounded hover:bg-slate-500">İptal</button>}
                  <button onClick={handleAddOrUpdateQuestion} className={`flex-1 ${editingItemIndex !== null ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white py-2 rounded font-bold`}>
                      {editingItemIndex !== null ? 'Soruyu Güncelle' : 'Soru Ekle'}
                  </button>
              </div>
          </div>
          <div className="space-y-2">
              {quizItems.map((item, idx) => (
                  <div key={idx} className={`bg-slate-800 p-3 rounded border flex justify-between items-center ${editingItemIndex === idx ? 'border-yellow-500 bg-yellow-900/10' : 'border-slate-700'}`}> 
                        <div className="truncate text-white flex-1 mr-2"><span className="font-bold text-gray-400 mr-2">{idx+1}.</span>{item.question}</div> 
                        <div className="flex space-x-2">
                             <Edit onClick={() => loadQuestionForEdit(idx)} className="text-blue-400 cursor-pointer hover:text-blue-300" size={16} />
                             <Trash2 onClick={() => setQuizItems(quizItems.filter((_, i) => i !== idx))} className="text-red-400 cursor-pointer hover:text-red-300" size={16}/> 
                        </div>
                  </div>
              ))}
          </div>
      </div>
    );
  };
  
  const renderMatchingEditor = () => {
    const handleAddOrUpdatePair = () => {
         if (!tempMatch.a || !tempMatch.b) return; 
         
         const newPair = { id: editingItemIndex !== null ? matchingPairs[editingItemIndex].id : Math.random().toString(), itemA: tempMatch.a, itemB: tempMatch.b };

         if (editingItemIndex !== null) {
            const updated = [...matchingPairs];
            updated[editingItemIndex] = newPair;
            setMatchingPairs(updated);
            setEditingItemIndex(null);
         } else {
            setMatchingPairs([...matchingPairs, newPair]);
         }
         setTempMatch({ a: '', b: '' });
    };

    const loadPairForEdit = (idx: number) => {
        setTempMatch({ a: matchingPairs[idx].itemA, b: matchingPairs[idx].itemB });
        setEditingItemIndex(idx);
    };

    return ( 
      <div className="space-y-6"> 
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 relative"> 
                {editingItemIndex !== null && <span className="absolute top-2 right-2 text-xs text-yellow-500 font-bold">Düzenleniyor...</span>}
                <input placeholder="Öge A" value={tempMatch.a} onChange={e => setTempMatch({...tempMatch, a: e.target.value})} className="bg-slate-900 border border-slate-600 rounded p-2 text-white" /> 
                <input placeholder="Öge B" value={tempMatch.b} onChange={e => setTempMatch({...tempMatch, b: e.target.value})} className="bg-slate-900 border border-slate-600 rounded p-2 text-white" /> 
                
                <div className="md:col-span-2 flex gap-2">
                    {editingItemIndex !== null && <button onClick={() => { setEditingItemIndex(null); setTempMatch({ a: '', b: '' }); }} className="flex-1 bg-slate-600 text-white py-2 rounded">İptal</button>}
                    <button onClick={handleAddOrUpdatePair} className={`flex-1 ${editingItemIndex !== null ? 'bg-yellow-600' : 'bg-indigo-600'} text-white py-2 rounded`}>
                         {editingItemIndex !== null ? 'Çifti Güncelle' : 'Çift Ekle'}
                    </button> 
                </div>
          </div> 
          <div className="space-y-2">
              {matchingPairs.map((pair, idx) => (
                  <div key={idx} className={`bg-slate-800 p-3 rounded border flex justify-between items-center ${editingItemIndex === idx ? 'border-yellow-500 bg-yellow-900/10' : 'border-slate-700'}`}>
                      <div className="text-gray-300 truncate mr-2">{pair.itemA} ↔ {pair.itemB}</div>
                      <div className="flex space-x-2 shrink-0">
                          <Edit onClick={() => loadPairForEdit(idx)} className="text-blue-400 cursor-pointer hover:text-blue-300" size={16} />
                          <Trash2 onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer hover:text-red-300"/>
                      </div>
                  </div>
              ))}
          </div> 
      </div> 
    );
  };
  
  const renderSequenceEditor = () => {
    const handleAddOrUpdateSeq = () => {
        if(!tempSeq) return; 
        if (editingItemIndex !== null) {
            const updated = [...sequenceItems];
            updated[editingItemIndex] = tempSeq;
            setSequenceItems(updated);
            setEditingItemIndex(null);
        } else {
            setSequenceItems([...sequenceItems, tempSeq]); 
        }
        setTempSeq('');
    };

    const loadSeqForEdit = (idx: number) => {
        setTempSeq(sequenceItems[idx]);
        setEditingItemIndex(idx);
    };

    return ( 
        <div className="space-y-6"> 
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <label className="block text-sm text-gray-400 mb-2">Soru / Talimat (İsteğe bağlı)</label>
                <input placeholder="Örn: Küçükten büyüğe sıralayın..." value={sequenceQuestion} onChange={e => setSequenceQuestion(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mb-4" />
                
                <div className="flex gap-2"> 
                    <input placeholder="Sıralanacak öge..." value={tempSeq} onChange={e => setTempSeq(e.target.value)} className="flex-grow bg-slate-900 border border-slate-600 rounded p-2 text-white" /> 
                    {editingItemIndex !== null && <button onClick={() => { setEditingItemIndex(null); setTempSeq(''); }} className="bg-slate-600 text-white px-4 rounded">İptal</button>}
                    <button onClick={handleAddOrUpdateSeq} className={`${editingItemIndex !== null ? 'bg-yellow-600' : 'bg-indigo-600'} text-white px-4 rounded`}>
                        {editingItemIndex !== null ? <Check size={18}/> : 'Ekle'}
                    </button> 
                </div> 
            </div>
            <div className="space-y-2">
                {sequenceItems.map((item, idx) => (
                    <div key={idx} className={`bg-slate-800 p-3 rounded border flex justify-between ${editingItemIndex === idx ? 'border-yellow-500' : 'border-slate-700'}`}>
                        <span className="text-white"><span className="text-gray-500 font-bold mr-2">{idx+1}.</span> {item}</span>
                        <div className="flex space-x-2">
                            <Edit onClick={() => loadSeqForEdit(idx)} className="text-blue-400 cursor-pointer" size={16} />
                            <Trash2 onClick={() => setSequenceItems(sequenceItems.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer"/>
                        </div>
                    </div>
                ))}
            </div> 
        </div> 
    );
  };
  
  const renderClozeEditor = () => ( <div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><p className="text-gray-400 text-sm mb-2">Boşlukları [köşeli parantez] ile belirtin.</p><textarea rows={6} value={clozeText} onChange={e => setClozeText(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white font-mono" placeholder="Gökyüzü [mavi] renktedir."/></div> );

  const renderActiveEditor = (type: GameType) => {
      switch(type) {
          case GameType.QUIZ: return renderQuizEditor();
          case GameType.MATCHING: return renderMatchingEditor();
          case GameType.SEQUENCE: return renderSequenceEditor();
          case GameType.CLOZE: return renderClozeEditor();
          case GameType.TRUE_FALSE: return (<div className="space-y-4"><div className="bg-slate-800 p-4 rounded border border-slate-700"><input placeholder="İfade" value={tempTf.stmt} onChange={e => setTempTf({...tempTf, stmt: e.target.value})} className="w-full bg-slate-900 border border-slate-600 p-2 rounded text-white mb-2" /><div className="flex gap-4 mb-2"><label className="text-white"><input type="radio" className="mr-2" checked={tempTf.isTrue} onChange={() => setTempTf({...tempTf, isTrue: true})} />Doğru</label><label className="text-white"><input type="radio" className="mr-2" checked={!tempTf.isTrue} onChange={() => setTempTf({...tempTf, isTrue: false})} />Yanlış</label></div><button onClick={() => { if(tempTf.stmt) { setTfItems([...tfItems, { statement: tempTf.stmt, isTrue: tempTf.isTrue }]); setTempTf({stmt:'', isTrue:true}); } }} className="w-full bg-indigo-600 text-white py-2 rounded">Ekle</button></div>{tfItems.map((item, idx) => <div key={idx} className="text-gray-300 flex justify-between bg-slate-800 border border-slate-700 p-2 rounded"><span>{item.statement}</span><Trash2 onClick={() => setTfItems(tfItems.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer"/></div>)}</div>);
          case GameType.FLASHCARD: return (<div className="space-y-4"><div className="flex gap-2"><input placeholder="Ön" value={tempFlash.f} onChange={e => setTempFlash({...tempFlash, f: e.target.value})} className="w-1/2 bg-slate-900 border border-slate-600 p-2 rounded text-white" /><input placeholder="Arka" value={tempFlash.b} onChange={e => setTempFlash({...tempFlash, b: e.target.value})} className="w-1/2 bg-slate-900 border border-slate-600 p-2 rounded text-white" /></div><button onClick={() => { if(tempFlash.f && tempFlash.b) { setFlashcards([...flashcards, { front: tempFlash.f, back: tempFlash.b }]); setTempFlash({f:'', b:''}); } }} className="w-full bg-indigo-600 text-white py-2 rounded">Kart Ekle</button>{flashcards.map((item, idx) => <div key={idx} className="text-gray-300 flex justify-between bg-slate-800 border border-slate-700 p-2 rounded"><span>{item.front}</span><Trash2 onClick={() => setFlashcards(flashcards.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer"/></div>)}</div>);
          default: return null;
      }
  };

  const renderMixedEditor = () => {
    return (
        <div className="space-y-6">
            {!isAddingStage ? (
                <>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                        <h3 className="text-white font-bold mb-4">Oyun Sahneleri</h3>
                        {stages.length === 0 ? (
                            <p className="text-gray-500 mb-4">Henüz sahne eklenmedi. Başlamak için bir sahne ekleyin.</p>
                        ) : (
                            <div className="space-y-2 mb-4 text-left">
                                {stages.map((stage, idx) => (
                                    <div key={stage.id} className="p-3 bg-slate-700 rounded flex justify-between items-center group">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{idx + 1}. {stage.type}</span>
                                            <span className="text-xs text-gray-400">{stage.title}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleEditStage(idx)} className="p-2 bg-slate-600 rounded hover:bg-indigo-600 text-white transition-colors" title="Düzenle">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => setStages(stages.filter((_, i) => i !== idx))} className="p-2 bg-slate-600 rounded hover:bg-red-600 text-white transition-colors" title="Sil">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => { setIsAddingStage(true); clearInputs(); setEditingStageIndex(null); setCurrentStageType(GameType.QUIZ); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 flex items-center justify-center w-full">
                            <ListPlus className="mr-2"/> Yeni Sahne Ekle
                        </button>
                    </div>
                </>
            ) : (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 animate-fade-in relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">{editingStageIndex !== null ? 'Sahneyi Düzenle' : 'Yeni Sahne Oluştur'}</h3>
                        <button onClick={() => { setIsAddingStage(false); clearInputs(); }} className="text-sm text-gray-400 hover:text-white">İptal</button>
                    </div>
                    
                    <label className="block text-sm text-gray-400 mb-2">Sahne Türü</label>
                    <select 
                        value={currentStageType} 
                        onChange={(e) => setCurrentStageType(e.target.value as GameType)}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mb-6"
                        disabled={editingStageIndex !== null} // Disable type change when editing existing stage for simplicity
                    >
                        <option value={GameType.QUIZ}>Test</option>
                        <option value={GameType.MATCHING}>Eşleştirme</option>
                        <option value={GameType.TRUE_FALSE}>Doğru/Yanlış</option>
                        <option value={GameType.SEQUENCE}>Sıralama</option>
                        <option value={GameType.CLOZE}>Boşluk Doldurma</option>
                        <option value={GameType.FLASHCARD}>Kartlar</option>
                    </select>

                    <div className="mb-6">
                        {renderActiveEditor(currentStageType)}
                    </div>

                    <button onClick={handleAddOrUpdateStage} className={`w-full ${editingStageIndex !== null ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white py-2 rounded font-bold`}>
                        {editingStageIndex !== null ? 'Değişiklikleri Kaydet' : 'Sahneyi Kaydet ve Çık'}
                    </button>
                </div>
            )}
        </div>
    );
  };

  const renderSettings = () => (
      <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div onClick={() => setShowSettings(!showSettings)} className="p-4 bg-slate-750 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors">
              <div className="flex items-center text-white font-bold"><Settings className="w-5 h-5 mr-2 text-indigo-400" />Gelişmiş Ayarlar</div>
              {showSettings ? <Minus className="w-4 h-4 text-gray-400"/> : <Plus className="w-4 h-4 text-gray-400"/>}
          </div>
          {showSettings && (
              <div className="p-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div><label className="block text-sm text-gray-400 mb-1">Zaman Sınırı (Saniye)</label><input type="number" min="0" value={settings.timeLimit} onChange={e => setSettings({...settings, timeLimit: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="0 = sınır yok" /></div>
                  <div className="flex flex-col space-y-3 justify-center">
                      {(gameType === GameType.QUIZ || gameType === GameType.MIXED) && (<label className="flex items-center text-white cursor-pointer"><input type="checkbox" checked={settings.randomizeOrder} onChange={e => setSettings({...settings, randomizeOrder: e.target.checked})} className="w-4 h-4 mr-2 accent-indigo-500"/>Soruları Karıştır</label>)}
                      {(gameType === GameType.CLOZE || gameType === GameType.MIXED) && (<label className="flex items-center text-white cursor-pointer"><input type="checkbox" checked={settings.caseSensitive} onChange={e => setSettings({...settings, caseSensitive: e.target.checked})} className="w-4 h-4 mr-2 accent-indigo-500"/>Büyük/Küçük Harf Duyarlı</label>)}
                      <label className="flex items-center text-white cursor-pointer"><input type="checkbox" checked={settings.allowRetry} onChange={e => setSettings({...settings, allowRetry: e.target.checked})} className="w-4 h-4 mr-2 accent-indigo-500"/>Sınırsız Tekrar</label>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">{initialGame ? 'Uygulamayı Düzenle' : 'Yeni Uygulama Oluştur'}</h1>
      </div>
      {step === 1 && (
        <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 animate-fade-in">
           <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Adım 1: Genel Bilgiler</h2>
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
                        {isPublic ? 'Herkese Açık (Herkes görebilir)' : 'Gizli (Sadece sen)'}
                    </span>
                </label>
           </div>

           <label className="block text-sm text-gray-400 mb-2">Oyun Türü</label>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
               {renderTypeOption(GameType.QUIZ, "Test")}
               {renderTypeOption(GameType.MATCHING, "Eşleştirme")}
               {renderTypeOption(GameType.TRUE_FALSE, "Doğru/Yanlış")}
               {renderTypeOption(GameType.SEQUENCE, "Sıralama")}
               {renderTypeOption(GameType.CLOZE, "Boşluk Doldurma")}
               {renderTypeOption(GameType.FLASHCARD, "Kartlar")}
               {renderTypeOption(GameType.MIXED, "Karışık (Çoklu)")}
           </div>
           <div className="flex justify-end space-x-3">
               <button onClick={onCancel} className="px-6 py-2 text-gray-400 hover:text-white">İptal</button>
               <button onClick={() => { if(title) setStep(2); }} disabled={!title} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center">İleri <ArrowRight className="ml-2 w-4 h-4"/></button>
           </div>
        </div>
      )}
      {step === 2 && (
        <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 animate-fade-in">
             <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2"><h2 className="text-xl font-bold text-white">Adım 2: İçerik</h2><span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full border border-indigo-700">{gameType}</span></div>
             <div className="mb-8">
                 {gameType === GameType.MIXED ? renderMixedEditor() : renderActiveEditor(gameType)}
             </div>
             {!isAddingStage && renderSettings()}
             {!isAddingStage && (
                 <div className="flex justify-between pt-8 border-t border-slate-700 mt-6">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-400 hover:text-white flex items-center"><ArrowLeft className="mr-2 w-4 h-4"/> Geri</button>
                    <button onClick={handleSaveClick} disabled={isSaving} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center shadow-lg font-bold">
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-4 h-4" />} {initialGame ? 'Güncelle' : 'Yayınla'}
                    </button>
                 </div>
             )}
        </div>
      )}
    </div>
  );
};

export default CreateGame;