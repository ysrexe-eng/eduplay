import React, { useState, useEffect } from 'react';
import { GameType, GameModule, QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, GameSettings, MixedStage } from '../types';
import { Save, Trash2, ArrowLeft, Settings, Plus, Minus, X, Globe, Lock, Loader2, ListPlus, Edit, Check, Code, HelpCircle, FileJson } from 'lucide-react';

interface CreateGameProps {
  onSave: (gameData: Partial<GameModule>, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
  initialGame?: GameModule | null;
  userId?: string;
}

const CreateGame: React.FC<CreateGameProps> = ({ onSave, onCancel, initialGame, userId }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Force Mixed Type for everything now
  const [gameType] = useState<GameType>(GameType.MIXED);
  const [isPublic, setIsPublic] = useState(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
      timeLimit: 0,
      randomizeOrder: false,
      allowRetry: true,
      caseSensitive: false
  });

  // Content State for Single Mode - Kept for internal logic usage if needed, but primary interaction is via Stages now
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

  // JSON Editor State
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonGuide, setShowJsonGuide] = useState(false);

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
      setIsPublic(initialGame.isPublic);
      setSettings(initialGame.settings || { timeLimit: 0, randomizeOrder: false, allowRetry: true });

      try {
          if (initialGame.gameType === GameType.MIXED) {
              setStages((initialGame.data as any).stages || []);
          } else {
              // Convert legacy single-mode games to mixed stage format
               const stageData: MixedStage = {
                  id: 'legacy-1',
                  type: initialGame.gameType,
                  title: 'Bölüm 1',
                  data: initialGame.data
               };
               setStages([stageData]);
          }
      } catch(e) {
          console.error("Error loading game data", e);
      }
    }
  }, [initialGame]);

  // Sync JSON editor with current state when opened or state changes
  useEffect(() => {
    if (showJsonEditor && !jsonError) {
        const currentData = generateDataForType(currentStageType);
        // Clean up empty fields for cleaner JSON view
        if(currentStageType === GameType.QUIZ) delete (currentData as any).type;
        setJsonContent(JSON.stringify(currentData, null, 2));
    }
  }, [showJsonEditor, quizItems, matchingPairs, tfItems, flashcards, sequenceItems, sequenceQuestion, clozeText, currentStageType]);

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

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setJsonContent(val);
      try {
          const parsed = JSON.parse(val);
          setJsonError(null);
          
          // Reverse map JSON to state
          switch (currentStageType) {
            case GameType.QUIZ: setQuizItems(parsed.items || []); break;
            case GameType.MATCHING: setMatchingPairs(parsed.pairs || []); break;
            case GameType.TRUE_FALSE: setTfItems(parsed.items || []); break;
            case GameType.FLASHCARD: setFlashcards(parsed.items || []); break;
            case GameType.SEQUENCE: 
                setSequenceItems((parsed.items as any[] || []).map(i => i.text));
                setSequenceQuestion(parsed.question || '');
                break;
            case GameType.CLOZE: 
                // Cloze is hard to reverse map from split parts to bracket syntax without logic
                // For simplicity, we might just warn or handle basic cases.
                // Reconstructing cloze text:
                if (parsed.data && parsed.data.textParts && parsed.data.answers) {
                    let full = "";
                    parsed.data.textParts.forEach((part: string, i: number) => {
                        full += part;
                        if(i < parsed.data.answers.length) full += `[${parsed.data.answers[i]}]`;
                    });
                    setClozeText(full);
                }
                break;
          }
      } catch (err) {
          setJsonError("Geçersiz JSON formatı");
      }
  };

  const getJsonGuide = (type: GameType) => {
      switch(type) {
          case GameType.QUIZ: return `{
  "items": [
    {
      "question": "Soru metni buraya",
      "options": ["Cevap A", "Cevap B", "Cevap C"],
      "correctAnswer": "Cevap A"
    }
  ]
}`;
          case GameType.MATCHING: return `{
  "pairs": [
    { "id": "1", "itemA": "Elma", "itemB": "Apple" },
    { "id": "2", "itemA": "Süt", "itemB": "Milk" }
  ]
}`;
          case GameType.TRUE_FALSE: return `{
  "items": [
    { "statement": "Dünya düzdür.", "isTrue": false },
    { "statement": "Su 100 derecede kaynar.", "isTrue": true }
  ]
}`;
          case GameType.SEQUENCE: return `{
  "items": [ { "text": "Birinci Adım" }, { "text": "İkinci Adım" } ],
  "question": "Adımları sıralayın"
}`;
          default: return "{}";
      }
  };

  const handleAddOrUpdateStage = () => {
      if (jsonError && showJsonEditor) return alert("Lütfen JSON hatalarını düzeltin.");
      
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
          const updatedStages = [...stages];
          updatedStages[editingStageIndex] = newStage;
          setStages(updatedStages);
          setEditingStageIndex(null);
      } else {
          setStages([...stages, newStage]);
      }

      setIsAddingStage(false);
      setShowJsonEditor(false);
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
    if (stages.length === 0) return alert("En az bir sahne ekleyin.");
    
    setIsSaving(true);
    try {
        const gamePayload: Partial<GameModule> = {
            id: initialGame?.id,
            title,
            description: description || `Oyun`,
            gameType: GameType.MIXED,
            data: { type: GameType.MIXED, stages },
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

  // --- ITEM EDITORS (Same logic, slightly condensed view) ---

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
                  <button onClick={handleAddOrUpdateQuestion} className={`flex-1 ${editingItemIndex !== null ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white py-2 rounded font-bold`}>{editingItemIndex !== null ? 'Soruyu Güncelle' : 'Soru Ekle'}</button>
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
                    <button onClick={handleAddOrUpdatePair} className={`flex-1 ${editingItemIndex !== null ? 'bg-yellow-600' : 'bg-indigo-600'} text-white py-2 rounded`}>{editingItemIndex !== null ? 'Çifti Güncelle' : 'Çift Ekle'}</button> 
                </div>
          </div> 
          <div className="space-y-2">
              {matchingPairs.map((pair, idx) => (
                  <div key={idx} className={`bg-slate-800 p-3 rounded border flex justify-between items-center ${editingItemIndex === idx ? 'border-yellow-500 bg-yellow-900/10' : 'border-slate-700'}`}>
                      <div className="text-gray-300 truncate mr-2">{pair.itemA} ↔ {pair.itemB}</div>
                      <div className="flex space-x-2 shrink-0"><Edit onClick={() => loadPairForEdit(idx)} className="text-blue-400 cursor-pointer hover:text-blue-300" size={16} /><Trash2 onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer hover:text-red-300"/></div>
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
                    <button onClick={handleAddOrUpdateSeq} className={`${editingItemIndex !== null ? 'bg-yellow-600' : 'bg-indigo-600'} text-white px-4 rounded`}>{editingItemIndex !== null ? <Check size={18}/> : 'Ekle'}</button> 
                </div> 
            </div>
            <div className="space-y-2">
                {sequenceItems.map((item, idx) => (
                    <div key={idx} className={`bg-slate-800 p-3 rounded border flex justify-between ${editingItemIndex === idx ? 'border-yellow-500' : 'border-slate-700'}`}>
                        <span className="text-white"><span className="text-gray-500 font-bold mr-2">{idx+1}.</span> {item}</span>
                        <div className="flex space-x-2"><Edit onClick={() => loadSeqForEdit(idx)} className="text-blue-400 cursor-pointer" size={16} /><Trash2 onClick={() => setSequenceItems(sequenceItems.filter((_, i) => i !== idx))} size={16} className="text-red-400 cursor-pointer"/></div>
                    </div>
                ))}
            </div> 
        </div> 
    );
  };
  
  const renderActiveEditor = (type: GameType) => {
      switch(type) {
          case GameType.QUIZ: return renderQuizEditor();
          case GameType.MATCHING: return renderMatchingEditor();
          case GameType.SEQUENCE: return renderSequenceEditor();
          case GameType.CLOZE: return (<div className="bg-slate-800 p-4 rounded-lg border border-slate-700"><p className="text-gray-400 text-sm mb-2">Boşlukları [köşeli parantez] ile belirtin.</p><textarea rows={6} value={clozeText} onChange={e => setClozeText(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white font-mono" placeholder="Gökyüzü [mavi] renktedir."/></div>);
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
                        <button onClick={() => { setIsAddingStage(true); clearInputs(); setEditingStageIndex(null); setCurrentStageType(GameType.QUIZ); setShowJsonEditor(false); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 flex items-center justify-center w-full">
                            <ListPlus className="mr-2"/> Bir Sahne Ekle
                        </button>
                    </div>
                </>
            ) : (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 animate-fade-in relative">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                        <h3 className="text-white font-bold">{editingStageIndex !== null ? 'Sahneyi Düzenle' : 'Bir Sahne Oluştur'}</h3>
                        <button onClick={() => { setIsAddingStage(false); clearInputs(); }} className="text-sm text-gray-400 hover:text-white">İptal</button>
                    </div>

                    <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded mb-4 text-xs text-yellow-200">
                        <strong>Dikkat:</strong> Bir sahne = Bir sorudur. Buradan tek bir oyun birimi oluşturuyorsunuz.
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-gray-400">Sahne Türü</label>
                        <button onClick={() => setShowJsonEditor(!showJsonEditor)} className="text-xs flex items-center text-indigo-400 hover:text-indigo-300">
                            {showJsonEditor ? <Edit className="w-3 h-3 mr-1"/> : <Code className="w-3 h-3 mr-1"/>}
                            {showJsonEditor ? "Görsel Editör" : "Gelişmiş Ayarlar (JSON)"}
                        </button>
                    </div>

                    <select 
                        value={currentStageType} 
                        onChange={(e) => setCurrentStageType(e.target.value as GameType)}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mb-6"
                        disabled={editingStageIndex !== null}
                    >
                        <option value={GameType.QUIZ}>Test</option>
                        <option value={GameType.MATCHING}>Eşleştirme</option>
                        <option value={GameType.TRUE_FALSE}>Doğru/Yanlış</option>
                        <option value={GameType.SEQUENCE}>Sıralama</option>
                        <option value={GameType.CLOZE}>Boşluk Doldurma</option>
                        <option value={GameType.FLASHCARD}>Kartlar</option>
                    </select>

                    <div className="mb-6">
                        {showJsonEditor ? (
                            <div className="animate-fade-in">
                                <div className="flex justify-between items-center mb-2">
                                     <span className="text-xs text-gray-500">Doğrudan veri düzenleme</span>
                                     <button onClick={() => setShowJsonGuide(!showJsonGuide)} className="text-xs flex items-center text-indigo-400 hover:text-indigo-300">
                                         <HelpCircle className="w-3 h-3 mr-1"/> JSON Rehberi
                                     </button>
                                </div>
                                {showJsonGuide && (
                                    <div className="bg-slate-900 p-3 rounded mb-3 text-xs font-mono text-gray-300 border border-slate-700">
                                        <p className="mb-1 text-indigo-400">Örnek Yapı ({currentStageType}):</p>
                                        <pre className="overflow-x-auto">{getJsonGuide(currentStageType)}</pre>
                                    </div>
                                )}
                                <textarea 
                                    value={jsonContent} 
                                    onChange={handleJsonChange} 
                                    className={`w-full h-64 bg-slate-900 border rounded p-3 text-white font-mono text-sm ${jsonError ? 'border-red-500 focus:border-red-500' : 'border-slate-600 focus:border-indigo-500'}`}
                                    spellCheck={false}
                                />
                                {jsonError && <p className="text-red-400 text-xs mt-1">{jsonError}</p>}
                            </div>
                        ) : (
                            renderActiveEditor(currentStageType)
                        )}
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
              <div className="flex items-center text-white font-bold"><Settings className="w-5 h-5 mr-2 text-indigo-400" />Genel Oyun Ayarları</div>
              {showSettings ? <Minus className="w-4 h-4 text-gray-400"/> : <Plus className="w-4 h-4 text-gray-400"/>}
          </div>
          {showSettings && (
              <div className="p-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div><label className="block text-sm text-gray-400 mb-1">Zaman Sınırı (Saniye)</label><input type="number" min="0" value={settings.timeLimit} onChange={e => setSettings({...settings, timeLimit: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="0 = sınır yok" /></div>
                  <div className="flex flex-col space-y-3 justify-center">
                      <label className="flex items-center text-white cursor-pointer"><input type="checkbox" checked={settings.randomizeOrder} onChange={e => setSettings({...settings, randomizeOrder: e.target.checked})} className="w-4 h-4 mr-2 accent-indigo-500"/>Soruları Karıştır</label>
                      <label className="flex items-center text-white cursor-pointer"><input type="checkbox" checked={settings.caseSensitive} onChange={e => setSettings({...settings, caseSensitive: e.target.checked})} className="w-4 h-4 mr-2 accent-indigo-500"/>Büyük/Küçük Harf Duyarlı</label>
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
                        {isPublic ? 'Herkese Açık (Herkes görebilir)' : 'Gizli (Sadece sen)'}
                    </span>
                </label>
           </div>
      </div>

      <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 animate-fade-in">
             <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
                 <h2 className="text-xl font-bold text-white">İçerik</h2>
                 <span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full border border-indigo-700">Çoklu Sahne Modu</span>
             </div>
             
             <div className="mb-8">
                 {renderMixedEditor()}
             </div>

             {!isAddingStage && renderSettings()}

             {!isAddingStage && (
                 <div className="flex justify-between pt-8 border-t border-slate-700 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white flex items-center"><ArrowLeft className="mr-2 w-4 h-4"/> İptal</button>
                    <button onClick={handleSaveClick} disabled={isSaving || !title} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 w-4 h-4" />} {initialGame ? 'Güncelle' : 'Yayınla'}
                    </button>
                 </div>
             )}
        </div>
    </div>
  );
};

export default CreateGame;