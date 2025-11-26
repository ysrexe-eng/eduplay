import React, { useState, useEffect } from 'react';
import { GameModule, GameType, MixedStage } from '../types';
import { ChevronLeft, RotateCcw, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabase';
import { QuizPlayer, MatchingPlayer, TrueFalsePlayer, FlashcardPlayer, SequencePlayer, ClozePlayer, ScramblePlayer } from './GamePlayers';

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
    setScore(0);
    setIsFinished(false);
    setTimeLeft(game.settings?.timeLimit && game.settings.timeLimit > 0 ? game.settings.timeLimit : null);
    setTimerActive(true);
    
    if(supabase && game.id) {
        supabase.rpc('increment_plays', { row_id: game.id }).then(({ error }) => {});
    }
  }, [game]);

  useEffect(() => {
      if (timeLeft === null || !timerActive || isFinished) return;
      const timer = setInterval(() => {
          setTimeLeft(prev => {
              if (prev !== null && prev <= 1) {
                  clearInterval(timer);
                  setTimerActive(false);
                  setIsFinished(true);
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
        <h2 className="text-3xl font-bold text-white mb-4">{timeLeft === 0 ? "Süre Doldu!" : "Tebrikler!"}</h2>
        <div className="text-6xl font-black text-indigo-400 mb-6">{score}</div>
        <p className="text-gray-400 mb-8">Toplam Puan</p>
        <div className="flex justify-center space-x-4">
          <button onClick={onBack} className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-semibold transition-colors">Menüye Dön</button>
          <button onClick={() => { setIsFinished(false); setScore(0); setTimeLeft(game.settings?.timeLimit || null); setTimerActive(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-semibold flex items-center transition-colors"><RotateCcw className="w-5 h-5 mr-2" /> Tekrar Oyna</button>
        </div>
      </div>
    );
  }

  const renderGameContent = (type: GameType, data: any, onSubFinish: (s: number, t: number) => void) => {
      switch (type) {
          case GameType.QUIZ: return <QuizPlayer data={data} onFinish={onSubFinish} />;
          case GameType.MATCHING: return <MatchingPlayer data={data} onFinish={onSubFinish} />;
          case GameType.TRUE_FALSE: return <TrueFalsePlayer data={data} onFinish={onSubFinish} />;
          case GameType.FLASHCARD: return <FlashcardPlayer data={data} onFinish={() => onSubFinish(100, 100)} />;
          case GameType.SEQUENCE: return <SequencePlayer data={data} onFinish={onSubFinish} />;
          case GameType.CLOZE: return <ClozePlayer data={data} onFinish={onSubFinish} caseSensitive={game.settings?.caseSensitive} />;
          case GameType.SCRAMBLE: return <ScramblePlayer data={data} onFinish={onSubFinish} />;
          case GameType.MIXED: return <MixedPlayer stages={data.stages} onFinish={onSubFinish} settings={game.settings} />;
          default: return <div className="text-white text-center">Bilinmeyen oyun türü</div>;
      }
  };

  return (
      <div className="relative pb-20">
          <button onClick={onBack} className="absolute top-0 left-0 text-gray-400 hover:text-white flex items-center mb-4"><ChevronLeft className="w-5 h-5 mr-1"/> Çıkış</button>
          {timeLeft !== null && (
              <div className="fixed top-20 right-4 z-50 bg-slate-800 border border-slate-600 px-4 py-2 rounded-full shadow-lg flex items-center text-white font-mono font-bold">
                  <Clock className="w-4 h-4 mr-2 text-indigo-400"/> {formatTime(timeLeft)}
              </div>
          )}
          <div className="mt-8">{renderGameContent(game.gameType, game.data, handleFinish)}</div>
      </div>
  );
};

const MixedPlayer = ({ stages, onFinish, settings }: { stages: MixedStage[], onFinish: (s: number, t: number) => void, settings?: any }) => {
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [totalScore, setTotalScore] = useState(0);

    const handleStageFinish = (stageScore: number, stageTotal: number) => {
        const newScore = totalScore + stageScore;
        setTotalScore(newScore);
        if (currentStageIdx < stages.length - 1) {
            setCurrentStageIdx(prev => prev + 1);
        } else {
            onFinish(newScore, 100 * stages.length);
        }
    };

    const currentStage = stages[currentStageIdx];

    return (
        <div className="animate-fade-in">
             <div className="text-center mb-4"><span className="bg-indigo-900/50 text-indigo-200 text-xs px-3 py-1 rounded-full border border-indigo-700">Bölüm {currentStageIdx + 1} / {stages.length}</span></div>
             {(() => {
                 switch(currentStage.type) {
                     case GameType.QUIZ: return <QuizPlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.MATCHING: return <MatchingPlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.TRUE_FALSE: return <TrueFalsePlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.SEQUENCE: return <SequencePlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     case GameType.CLOZE: return <ClozePlayer data={currentStage.data as any} onFinish={handleStageFinish} caseSensitive={settings?.caseSensitive}/>;
                     case GameType.FLASHCARD: return <FlashcardPlayer data={currentStage.data as any} onFinish={() => handleStageFinish(100, 100)}/>;
                     case GameType.SCRAMBLE: return <ScramblePlayer data={currentStage.data as any} onFinish={handleStageFinish}/>;
                     default: return <div>Desteklenmeyen aşama türü</div>;
                 }
             })()}
        </div>
    );
};

export default GamePlayer;