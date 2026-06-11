import React, { useState } from 'react';
import { X, Sparkles, Smile } from 'lucide-react';
import { SoundManager } from '../SoundManager';

interface CreateWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (wordText: string) => void;
}

export const CreateWordModal: React.FC<CreateWordModalProps> = ({ isOpen, onClose, onAddWord }) => {
  const [wordText, setWordText] = useState('');
  const [isStrong, setIsStrong] = useState(true); 
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    SoundManager.playClick();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = wordText.trim();
    if (!trimmed) {
      setError('격려할 따뜻한 한마디를 입력해주세요.');
      return;
    }
    if (trimmed.length > 15) {
      setError('글자수가 너무 깁니다. (최대 15자 이내)');
      return;
    }

    onAddWord(trimmed);
    SoundManager.playCollectPositive(true);
    setWordText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in text-[#2D2D2D]">
      <div 
        id="create-word-card" 
        className="w-full max-w-md bg-[#FAF7F2] border-4 border-[#2D2D2D] rounded-3xl overflow-hidden warm-shadow-lg"
      >
        {/* Header */}
        <div className="bg-[#FFD60A] border-b-4 border-[#2D2D2D] p-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#2D2D2D] animate-spin" />
            <h2 className="text-xl font-black font-display text-[#2D2D2D] tracking-tight uppercase">
              나만의 긍정 단어 보태기
            </h2>
          </div>
          <button 
            id="close-create-btn"
            onClick={handleClose}
            className="p-1 px-3 bg-white border-2 border-[#2D2D2D] rounded-xl hover:bg-red-50 text-[#2D2D2D] transition-colors cursor-pointer font-black shadow-[2px_2px_0px_#2D2D2D]"
          >
            <X className="w-5 h-5 inline" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs md:text-sm text-[#2D2D2D] font-medium leading-relaxed">
            나뿐만 아니라 지치고 아파하는 내 주변 사람들에게 힘이 되어줄 수 있는 <strong className="font-extrabold">나만의 긍정 한마디</strong>를 작성해보세요. 게임 속에서 특별한 보너스 단어로 직접 등장합니다!
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest text-[#2D2D2D]">
              나를 위로할 긍정 단어 (최대 15자)
            </label>
            <div className="relative">
              <input
                id="word-input-field"
                type="text"
                value={wordText}
                onChange={(e) => {
                  setWordText(e.target.value);
                  setError('');
                }}
                maxLength={15}
                placeholder="예: 너는 정말 보석 같아!, 훌륭히 해낼 거야!"
                className="w-full px-4 py-3 bg-white border-3 border-[#2D2D2D] rounded-xl focus:bg-[#FEF3C7] text-[#2D2D2D] placeholder-gray-400 font-sans focus:outline-none text-sm transition-all shadow-inner"
              />
              <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-mono font-bold">
                {wordText.length}/15
              </span>
            </div>
            {error && (
              <p className="text-xs text-rose-500 font-bold px-1 flex items-center gap-1">
                ⚠️ {error}
              </p>
            )}
          </div>

          <div className="p-3 bg-[#DCFCE7] rounded-xl border-2 border-[#2D2D2D] flex items-start gap-2.5 shadow-[2px_2px_0px_#2D2D2D]">
            <Smile className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-[#065F46] leading-relaxed font-bold">
              <strong>보너스 적용:</strong> 내가 직접 쓴 이 한마디는 게임 중 하늘을 날아다니는 <strong>강한 긍정 단어 (+30점)</strong>로 출현하며 눈부신 별빛 파편 효과가 생깁니다!
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              id="cancel-create-btn"
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 bg-white border-2 border-[#2D2D2D] rounded-xl text-[#2D2D2D] font-bold hover:bg-gray-100 transition-colors cursor-pointer text-sm shadow-[2px_2px_0px_#2D2D2D]"
            >
              취소
            </button>
            <button
              id="submit-word-btn"
              type="submit"
              className="px-5 py-2.5 bg-[#4ADE80] border-2 border-[#2D2D2D] text-[#2D2D2D] font-extrabold rounded-xl shadow-[3px_3px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-sm"
            >
              게임에 추가하기 🌟
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
