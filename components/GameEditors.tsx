import React, { useState, useEffect } from 'react';
import { QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, ScrambleItem } from '../types';
import { Plus, X, Edit, Trash2, Check } from 'lucide-react';

// Helper for keyboard shortcuts
const useCtrlEnter = (action: () => void) => {
    return (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            action();
        }
    };
};

/* --- QUIZ EDITOR --- */
export const QuizEditor = ({ items, setItems, onUpdate }: { items: QuizItem[], setItems: (i: QuizItem[]) => void, onUpdate?: () => void }) => {
    const [tempQ, setTempQ] = useState({ q: '', options: ['', ''], correct: 0 });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const addOption = () => {
        if (tempQ.options.length < 8) setTempQ({ ...tempQ, options: [...tempQ.options, ''] });
    };
    
    const removeOption = (idx: number) => { 
        if (tempQ.options.length > 2) setTempQ({ ...tempQ, options: tempQ.options.filter((_, i) => i !== idx), correct: 0 });
    };

    const handleSave = () => {
        if (!tempQ.q || tempQ.options.some(o => !o.trim())) return;
        const newItem = { question: tempQ.q, options: tempQ.options, correctAnswer: tempQ.options[tempQ.correct] };
        
        if (editingIndex !== null) {
            const updated = [...items];
            updated[editingIndex] = newItem;
            setItems(updated);
            setEditingIndex(null);
        } else {
            setItems([newItem]);
        }
        setTempQ({ q: '', options: ['', ''], correct: 0 });
    };

    const onKeyDown = useCtrlEnter(handleSave);

    useEffect(() => {
        if (items.length > 0 && editingIndex === null) {
            const item = items[0];
            const correctIdx = item.options.indexOf(item.correctAnswer);
            setTempQ({ q: item.question, options: [...item.options], correct: correctIdx !== -1 ? correctIdx : 0 });
            setEditingIndex(0);
        }
    }, [items]);

    return (
      <div className="space-y-4" onKeyDown={onKeyDown}>
          <input 
              placeholder="Soru metni..." 
              value={tempQ.q} 
              onChange={e => setTempQ({...tempQ, q: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white mb-2" 
          />
          <div className="space-y-2">
              {tempQ.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={tempQ.correct === idx} onChange={() => setTempQ({...tempQ, correct: idx})} className="accent-indigo-500 h-5 w-5"/>
                      <input placeholder={`Seçenek ${idx + 1}`} value={opt} onChange={e => {const newOpts = [...tempQ.options]; newOpts[idx] = e.target.value; setTempQ({...tempQ, options: newOpts});}} className={`flex-grow bg-slate-900 border rounded p-2 text-white text-sm ${tempQ.correct === idx ? 'border-emerald-500' : 'border-slate-600'}`}/>
                      {tempQ.options.length > 2 && <X size={16} onClick={() => removeOption(idx)} className="text-slate-500 hover:text-red-400 cursor-pointer"/>}
                  </div>
              ))}
          </div>
          {tempQ.options.length < 8 && <button onClick={addOption} className="text-xs bg-slate-700 text-white px-3 py-1 rounded flex items-center mt-2"><Plus size={12} className="mr-1"/> Seçenek Ekle</button>}
          {/* Note: Quiz saves automatically via effect or state lift for single item, but we keep structure generic */}
      </div>
    );
};

/* --- MATCHING EDITOR --- */
export const MatchingEditor = ({ pairs, setPairs }: { pairs: MatchingPair[], setPairs: (p: MatchingPair[]) => void }) => {
    const [temp, setTemp] = useState({ a: '', b: '' });
    const [editing, setEditing] = useState<number | null>(null);

    const save = () => {
         if (!temp.a || !temp.b) return;
         const newPair = { id: editing !== null ? pairs[editing].id : Math.random().toString(), itemA: temp.a, itemB: temp.b };
         if (editing !== null) {
            const updated = [...pairs];
            updated[editing] = newPair;
            setPairs(updated);
            setEditing(null);
         } else {
            if (pairs.length >= 5) return alert("En fazla 5 çift eklenebilir.");
            setPairs([...pairs, newPair]);
         }
         setTemp({ a: '', b: '' });
    };

    const onKeyDown = useCtrlEnter(save);

    return ( 
      <div className="space-y-4"> 
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4" onKeyDown={onKeyDown}> 
                <input placeholder="Öge A" value={temp.a} onChange={e => setTemp({...temp, a: e.target.value})} className="bg-slate-900 border border-slate-600 rounded p-2 text-white" /> 
                <input placeholder="Öge B" value={temp.b} onChange={e => setTemp({...temp, b: e.target.value})} className="bg-slate-900 border border-slate-600 rounded p-2 text-white" /> 
                <button onClick={save} className="md:col-span-2 bg-indigo-600 text-white py-2 rounded font-bold">{editing !== null ? 'Güncelle' : 'Çift Ekle'}</button>
          </div> 
          <div className="space-y-2">
              {pairs.map((p, idx) => (
                  <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700 flex justify-between">
                      <span className="text-white text-sm">{p.itemA} ↔ {p.itemB}</span>
                      <div className="flex space-x-2">
                          <Edit size={16} className="text-blue-400 cursor-pointer" onClick={() => { setTemp({a: p.itemA, b: p.itemB}); setEditing(idx); }} />
                          <Trash2 size={16} className="text-red-400 cursor-pointer" onClick={() => setPairs(pairs.filter((_, i) => i !== idx))} />
                      </div>
                  </div>
              ))}
          </div> 
      </div> 
    );
};

/* --- SEQUENCE EDITOR --- */
export const SequenceEditor = ({ items, setItems, question, setQuestion }: { items: string[], setItems: (i: string[]) => void, question: string, setQuestion: (q: string) => void }) => {
    const [temp, setTemp] = useState('');
    
    const add = () => {
        if(!temp) return;
        setItems([...items, temp]);
        setTemp('');
    };

    const onKeyDown = useCtrlEnter(add);

    return (
        <div className="space-y-4">
            <input placeholder="Soru / Talimat (örn: Küçükten büyüğe sırala)" value={question} onChange={e => setQuestion(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
            <div className="flex gap-2">
                <input 
                    placeholder="Sıralanacak öge..." 
                    value={temp} 
                    onChange={e => setTemp(e.target.value)} 
                    className="flex-grow bg-slate-900 border border-slate-600 rounded p-2 text-white" 
                    onKeyDown={onKeyDown}
                />
                <button onClick={add} className="bg-indigo-600 text-white px-4 rounded">Ekle</button>
            </div>
            <div className="space-y-1">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between bg-slate-800 p-2 rounded border border-slate-700">
                        <span className="text-white"><span className="text-gray-500 font-bold mr-2">{idx+1}.</span>{item}</span>
                        <Trash2 size={16} className="text-red-400 cursor-pointer" onClick={() => setItems(items.filter((_, i) => i !== idx))} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/* --- SCRAMBLE EDITOR --- */
export const ScrambleEditor = ({ items, setItems }: { items: ScrambleItem[], setItems: (i: ScrambleItem[]) => void }) => {
    const [temp, setTemp] = useState({ w: '', h: '' });

    const add = () => {
        if(!temp.w) return;
        if(items.length >= 5) return alert("En fazla 5 kelime.");
        setItems([...items, { word: temp.w, hint: temp.h }]);
        setTemp({w:'', h:''});
    };

    const onKeyDown = useCtrlEnter(add);

    return (
        <div className="space-y-4">
             <div className="flex gap-2" onKeyDown={onKeyDown}>
                 <input placeholder="Kelime" value={temp.w} onChange={e => setTemp({...temp, w: e.target.value})} className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                 <input placeholder="İpucu (Opsiyonel)" value={temp.h} onChange={e => setTemp({...temp, h: e.target.value})} className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                 <button onClick={add} className="bg-indigo-600 text-white px-4 rounded">Ekle</button>
             </div>
             <div>
                 {items.map((item, idx) => (
                     <div key={idx} className="flex justify-between bg-slate-800 p-2 rounded border border-slate-700 mb-1">
                         <span className="text-white">{item.word} <span className="text-gray-500 text-xs">({item.hint})</span></span>
                         <Trash2 size={16} className="text-red-400 cursor-pointer" onClick={() => setItems(items.filter((_, i) => i !== idx))} />
                     </div>
                 ))}
             </div>
        </div>
    );
};