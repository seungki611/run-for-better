import React from 'react';
import { X, ArrowUp, Zap, HelpCircle, Heart, ShieldAlert } from 'lucide-react';
import { SoundManager } from '../SoundManager';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    SoundManager.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in text-[#2D2D2D]">
      <div 
        id="how-to-play-card" 
        className="w-full max-w-2xl bg-[#FAF7F2] border-4 border-[#2D2D2D] rounded-3xl overflow-hidden warm-shadow-lg flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#FFD60A] border-b-4 border-[#2D2D2D] p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-[#2D2D2D] animate-bounce" />
            <h2 className="text-2xl font-black font-display text-[#2D2D2D] tracking-tight uppercase">
              Word for You 게임 방법
            </h2>
          </div>
          <button 
            id="close-modal-btn"
            onClick={handleClose}
            className="p-1 px-3 bg-white border-2 border-[#2D2D2D] rounded-xl hover:bg-red-50 text-[#2D2D2D] transition-colors cursor-pointer font-bold shadow-[2px_2px_0px_#2D2D2D]"
          >
            <X className="w-5 h-5 inline" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-[#2D2D2D]">
          
          {/* Controls */}
          <div>
            <h3 className="font-extrabold text-lg text-[#2D2D2D] flex items-center gap-2 mb-3 uppercase tracking-tight">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#FFD60A] border border-[#2D2D2D] text-[#2D2D2D] text-xs font-black">1</span>
              점프 조작 방식 (Jump Controls)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border-2 border-[#2D2D2D] flex items-center gap-4 shadow-[2px_2px_0px_#2D2D2D]">
                <div className="flex gap-1">
                  <span className="px-3 py-1.5 bg-gray-100 border-2 border-[#2D2D2D] rounded-lg shadow font-mono text-xs font-black text-[#2D2D2D]">Spacebar</span>
                  <span className="px-2 py-1.5 bg-gray-100 border-2 border-[#2D2D2D] rounded-lg shadow font-mono text-xs font-black text-[#2D2D2D]">↑</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#2D2D2D] text-sm">PC 웹사이트</h4>
                  <p className="text-xs text-gray-500 font-bold">스페이스바 또는 위 방향키 입력</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border-2 border-[#2D2D2D] flex items-center gap-4 shadow-[2px_2px_0px_#2D2D2D]">
                <div className="px-3 py-2 bg-yellow-100 rounded-xl border-2 border-[#2D2D2D]">
                  <span className="text-xl animate-pulse">👆</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#2D2D2D] text-sm">모바일 / 터치</h4>
                  <p className="text-xs text-gray-500 font-bold">화면의 아무 곳이나 터치하기</p>
                </div>
              </div>
            </div>
          </div>

          {/* Core Objects Rule */}
          <div>
            <h3 className="font-extrabold text-lg text-[#2D2D2D] flex items-center gap-2 mb-3 uppercase tracking-tight">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#FFD60A] border border-[#2D2D2D] text-[#2D2D2D] text-xs font-black">2</span>
              세 가지 오브젝트 규칙
            </h3>
            <div className="space-y-3">
              
              {/* Positive Words */}
              <div className="p-4 bg-[#DCFCE7] border-2 border-[#2D2D2D] rounded-2xl flex items-start gap-4 shadow-[2px_2px_0px_#2D2D2D]">
                <div className="text-3xl p-1 bg-white rounded-xl border-2 border-[#2D2D2D] flex items-center justify-center shadow-sm shrink-0">
                  ❤️
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-[#065F46] text-sm md:text-base">긍정 단어 (Positive Words)</h4>
                    <span className="px-2 py-0.2 bg-white text-[#2D2D2D] border border-[#2D2D2D] rounded-full text-xs font-black">+20점 / +30점</span>
                  </div>
                  <p className="text-xs md:text-sm text-[#065F46] font-medium mt-1">
                    <em>"고마워", "잘하고 있어", "넌 소중해", "수고했어"</em> 등의 긍정어를 획득하여 마음의 힘과 높은 점수를 수집하세요. 강한 긍정 단어는 <b>+30점</b>에 빛나는 금빛 테두리를 띱니다.
                  </p>
                </div>
              </div>

              {/* Negative Words */}
              <div className="p-4 bg-[#FEE2E2] border-2 border-[#2D2D2D] rounded-2xl flex items-start gap-4 shadow-[2px_2px_0px_#2D2D2D]">
                <div className="text-3xl p-1 bg-white rounded-xl border-2 border-[#2D2D2D] flex items-center justify-center shadow-sm shrink-0">
                  ⚡
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-[#B91C1C] text-sm md:text-base">부정 단어 (Negative Words)</h4>
                    <span className="px-2 py-0.2 bg-white text-red-600 border border-[#2D2D2D] rounded-full text-xs font-black">-50점 감점</span>
                  </div>
                  <p className="text-xs md:text-sm text-[#B91C1C] font-medium mt-1">
                    <em>"바보야", "넌 못해", "실패할 거야", "포기해"</em> 같은 말들입니다. 충돌해도 즉시 탈락하지는 않지만, 무려 <b>-50점</b>이라는 치명적인 점수 손실을 입게 됩니다.
                  </p>
                </div>
              </div>

              {/* Obstacles */}
              <div className="p-4 bg-white border-2 border-[#2D2D2D] rounded-2xl flex items-start gap-4 shadow-[2px_2px_0px_#2D2D2D]">
                <div className="text-3xl p-1 bg-white rounded-xl border-2 border-[#2D2D2D] flex items-center justify-center shadow-sm shrink-0">
                  🌵
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-[#2D2D2D] text-sm md:text-base">일반 장애물 (Obstacles)</h4>
                    <span className="px-2 py-0.2 bg-red-600 text-white rounded-full text-xs font-black">즉시 탈락</span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 font-bold mt-1">
                    <em>Cactus (선인장), Rock (돌), Spikes (가시), Brick (벽돌)</em> 등 바닥에 배치된 장애물과 스치기만 해도 즉시 게임 오버됩니다. 반드시 점프하여 피해야 합니다.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Educational Concept */}
          <div className="bg-white p-5 rounded-2xl border-3 border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D]">
            <h3 className="font-extrabold text-[#2D2D2D] flex items-center gap-2 text-sm md:text-base mb-2 uppercase tracking-tight">
              <Zap className="w-5 h-5 text-[#FFD60A] fill-yellow-400" />
              핵심 교육 교훈: 왜 부정 단어는 -50점인가요?
            </h3>
            <p className="text-xs md:text-sm text-[#2D2D2D] font-medium leading-relaxed">
              우리가 공부하는 영어 지문 <strong>"Bad is stronger than good"</strong>에 그 비밀이 있습니다!<br/>
              뇌신경학적 연구에 따르면, 사람의 뇌는 긍정적인 가치나 칭찬보다 부정역습이나 힐난에 <strong>약 3~4배 더 민감하게 기억하고 고통</strong>을 느낍니다. 이를 심리학에서는 <strong>'부정 편향(Negativity Bias)'</strong>이라고 불러요.<br/>
              나쁜 말 1번의 충격(-50점)을 따뜻한 위로와 격려(+20점/+30점)로 만회하려면, 무려 <strong>최소 2번 이상의 좋은 말</strong>이 필요하다는 사실을 직접 플레이해보며 마음으로 느껴보세요.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white border-t-4 border-[#2D2D2D] p-4 text-center">
          <button 
            id="start-on-modal-btn"
            onClick={handleClose}
            className="px-8 py-3 bg-[#FFD60A] text-[#2D2D2D] font-black rounded-xl border-3 border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all cursor-pointer uppercase text-xs"
          >
            확인했습니다! 게임으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
