import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Heart, 
  Zap, 
  HelpCircle, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Award, 
  Plus, 
  ChevronRight, 
  Check, 
  AlertTriangle,
  Flame,
  Clock,
  ThumbsUp,
  BookOpen
} from 'lucide-react';
import { Character, GameScreen, Obstacle, GameWord, Particle, FloatingText, WordCollectionLog } from './types';
import { SoundManager } from './SoundManager';
import { HowToPlayModal } from './components/HowToPlayModal';
import { CreateWordModal } from './components/CreateWordModal';

// Character Emoji Selection options
const CHARACTERS: Character[] = [
  { id: 'happy', emoji: '😀', name: '기쁨이', description: '매사에 긍정적이며 항상 미소를 잃지 않는 명랑한 친구', accentColor: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { id: 'cool', emoji: '😎', name: '멋쟁이', description: '거친 장애물 선인장도 쿨한 선글라스 하나로 넘기는 모험가', accentColor: 'border-sky-400 bg-sky-50 text-sky-700' },
  { id: 'smart', emoji: '🤓', name: '똑똑이', description: '언어의 본질과 부정 억제 회로를 연구하는 꼬마 박사님', accentColor: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { id: 'warm', emoji: '😊', name: '다정이', description: '상처받은 마음에 든든한 등대가 주어져 따스함을 나르는 수호자', accentColor: 'border-pink-400 bg-pink-50 text-pink-700' },
  { id: 'kitten', emoji: '🐱', name: '치즈냥', description: '나쁜 소리들을 신속한 스프링 몸놀림으로 가볍게 피하는 야옹이', accentColor: 'border-amber-400 bg-amber-50 text-amber-700' },
  { id: 'puppy', emoji: '🐶', name: '쿠키댕', description: '지친 친구를 보면 꼬리부터 흔들며 넘치는 위로를 해주는 백구', accentColor: 'border-orange-400 bg-orange-50 text-orange-700' },
];

// Initial Core Words lists
const INITIAL_POSITIVE_WORDS = [
  "고마워", "수고했어", "잘했어", "괜찮아", "할 수 있어", 
  "응원할게", "멋지다", "최고야", "믿어", "자랑스러워", 
  "좋은 생각이야", "함께 해보자", "고생했어"
];

const INITIAL_STRONG_POSITIVE_WORDS = [
  "나는 널 믿어", "잘하고 있어", "넌 소중해", "너에겐 빛이 있어"
];

const INITIAL_STRONG_NEGATIVE_WORDS = [
  "도대체 왜 사니", "또 전보다 못했어", "진짜 한심하다", "완전 엉망진창이야", "꿈도 꾸지 마라"
];

const NEGATIVE_WORDS = [
  "바보야", "넌 못해", "실패할 거야", "왜 그것도 못해", 
  "답답하다", "최악이야", "문제야", "한심해", 
  "실망이야", "별로야", "그만둬", "못한다", "늦었어", "포기해"
];

// Virtual Resolution coordinates used by the 2D Physics Canvas
const V_WIDTH = 800;
const V_HEIGHT = 400;
const GROUND_Y = 320;

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('START');
  const [selectedChar, setSelectedChar] = useState<Character>(CHARACTERS[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('word4you_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Modals state
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCreateWordOpen, setIsCreateWordOpen] = useState(false);

  // In-Game Live state synced from loop to React
  const [liveScore, setLiveScore] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [collectedPositives, setCollectedPositives] = useState<WordCollectionLog[]>([]);
  const [collidedNegatives, setCollidedNegatives] = useState<WordCollectionLog[]>([]);

  // Custom added vocabulary list by the user during session
  const [sessionCustomWords, setSessionCustomWords] = useState<string[]>([]);

  // Refs for the high-performance physics game context loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Mutable game simulation structure to avoid react re-render bottlenecks at 60fps
  const stateRef = useRef({
    screen: 'START' as GameScreen,
    score: 0,
    elapsedFrames: 0,
    speed: 5.5,
    combo: 0,
    maxCombo: 0,
    
    // Player Character state
    player: {
      x: 100,
      y: GROUND_Y - 55,
      width: 55,
      height: 55,
      vy: 0,
      isJumping: false,
      runFrame: 0,
    },
    
    // Arrays of simulated scrolling entities
    obstacles: [] as Obstacle[],
    words: [] as GameWord[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    
    // Logs for results dashboard
    collectedPositives: [] as WordCollectionLog[],
    collidedNegatives: [] as WordCollectionLog[],
    
    // Camera effect state
    shakeTime: 0,
    lastSpawnX: 0,
    spawnCooldown: 0,
    
    // Parallax scrolling backgrounds state
    bgOffsetClouds: 0,
    bgOffsetHills: 0,
    bgOffsetGround: 0,
  });

  // Handle Mute
  const handleToggleMute = () => {
    const muted = SoundManager.toggleMute();
    setIsMuted(muted);
  };

  // Update highscore logic
  const checkAndSaveHighScore = useCallback((finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('word4you_highscore', finalScore.toString());
    }
  }, [highScore]);

  // Handler for adding a new word text
  const handleAddCustomWord = (wordText: string) => {
    // Add to state and ref so it manifests in spawning queue
    setSessionCustomWords(prev => [...prev, wordText]);
  };

  // Helper trigger to initiate Jump
  const triggerPlayerJump = useCallback(() => {
    const game = stateRef.current;
    if (game.screen !== 'PLAYING') return;
    
    // Allow single jump
    if (!game.player.isJumping) {
      // Scale jump strength proportionally with speed so jumping remains snappy and physically possible at top speeds
      const jumpScale = Math.min(1.65, 1 + (game.speed - 5.5) * 0.052);
      game.player.vy = -12.5 * jumpScale; // Jump strength scaled
      game.player.isJumping = true;
      SoundManager.playJump();
      
      // Spawn tiny jump smoke particles
      for (let i = 0; i < 8; i++) {
        game.particles.push({
          id: `${Date.now()}-${Math.random()}`,
          x: game.player.x + game.player.width / 2,
          y: GROUND_Y - 5,
          vx: (Math.random() - 0.5) * 4 - 2,
          vy: -Math.random() * 2,
          color: 'rgba(203, 213, 225, 0.6)',
          size: Math.random() * 6 + 4,
          alpha: 1,
          decay: 0.04,
          life: 25
        });
      }
    }
  }, []);

  // Touch/Click directly on canvas handles jumps
  const handleCanvasTouchStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    triggerPlayerJump();
  };

  // Spawns a randomized object (either hurdle or word)
  const spawnRandomObject = (game: typeof stateRef.current): 'obstacle' | 'word' => {
    const activeCustomWords = [...INITIAL_STRONG_POSITIVE_WORDS, ...sessionCustomWords];
    const roll = Math.random();
    
    // Choose vertical positions: low (at foot), mid (require small jump), high (require high jump)
    const yLevels = [GROUND_Y - 55, GROUND_Y - 105, GROUND_Y - 170];
    const pickedLevelY = yLevels[Math.floor(Math.random() * yLevels.length)];

    if (roll < 0.44) {
      // 44% Chance: Spawn Obstacle on ground (increased from 38% for elevated difficulty!)
      const obstacleTypes: ('cactus' | 'rock' | 'brick' | 'spikes')[] = ['cactus', 'rock', 'brick', 'spikes'];
      const pickedType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      
      let emoji = '🌵';
      let offsetHeight = 55; // increased size
      let offsetWidth = 48; // increased size
      
      if (pickedType === 'rock') {
        emoji = '🪨';
        offsetHeight = 48; // increased size
        offsetWidth = 52; // increased size
      } else if (pickedType === 'brick') {
        emoji = '🧱';
        offsetHeight = 45; // increased size
        offsetWidth = 55; // increased size
      } else if (pickedType === 'spikes') {
        emoji = '📐';
        offsetHeight = 38; // increased size
        offsetWidth = 58; // increased size
      }

      game.obstacles.push({
        id: `obs-${Date.now()}-${Math.random()}`,
        x: V_WIDTH + 50,
        y: GROUND_Y - offsetHeight, // exactly resting on ground
        width: offsetWidth,
        height: offsetHeight,
        type: pickedType,
        emoji: emoji
      });
      return 'obstacle';
    } 
    else if (roll < 0.69) {
      // 25% Chance: Spawn general positive word (+20)
      const text = INITIAL_POSITIVE_WORDS[Math.floor(Math.random() * INITIAL_POSITIVE_WORDS.length)];
      game.words.push({
        id: `word-pos-${Date.now()}-${Math.random()}`,
        x: V_WIDTH + 60,
        y: pickedLevelY,
        width: text.length * 14.5 + 44, // increased width ratio and padding
        height: 35, // increased height
        text: text,
        type: 'positive',
        points: 20,
        collected: false,
        color: '#2D2D2D'
      });
      return 'word';
    } 
    else if (roll < 0.77) {
      // 8% Chance: Spawn strong positive word (+30) - includes user custom words!
      const text = activeCustomWords[Math.floor(Math.random() * activeCustomWords.length)];
      game.words.push({
        id: `word-str-${Date.now()}-${Math.random()}`,
        x: V_WIDTH + 60,
        y: pickedLevelY,
        width: text.length * 15.5 + 48, // increased width ratio and padding
        height: 38, // increased height
        text: text,
        type: 'strong_positive',
        points: 30,
        collected: false,
        color: '#2D2D2D'
      });
      return 'word';
    } 
    else if (roll < 0.91) {
      // 14% Chance: Spawn general negative word (-50)
      const text = NEGATIVE_WORDS[Math.floor(Math.random() * NEGATIVE_WORDS.length)];
      game.words.push({
        id: `word-neg-${Date.now()}-${Math.random()}`,
        x: V_WIDTH + 60,
        y: pickedLevelY,
        width: text.length * 14.5 + 44, // increased width ratio and padding
        height: 35, // increased height
        text: text,
        type: 'negative',
        points: -50,
        collected: false,
        color: '#2D2D2D'
      });
      return 'word';
    }
    else {
      // 9% Chance: Spawn strong negative word (-100) - Special Penalty!
      const text = INITIAL_STRONG_NEGATIVE_WORDS[Math.floor(Math.random() * INITIAL_STRONG_NEGATIVE_WORDS.length)];
      game.words.push({
        id: `word-strneg-${Date.now()}-${Math.random()}`,
        x: V_WIDTH + 60,
        y: pickedLevelY,
        width: text.length * 15.5 + 48, // increased width ratio and padding
        height: 38, // increased height
        text: text,
        type: 'strong_negative',
        points: -100,
        collected: false,
        color: '#2D2D2D'
      });
      return 'word';
    }
  };

  // Initialize and Game loop execution
  const startGame = useCallback((character: Character) => {
    SoundManager.playClick();
    
    // Reset mutable values inside physics container Ref
    const game = stateRef.current;
    game.screen = 'PLAYING';
    game.score = 0;
    game.elapsedFrames = 0;
    game.speed = 5.5;
    game.combo = 0;
    game.maxCombo = 0;
    
    // Player
    game.player.x = 100;
    game.player.y = GROUND_Y - 55;
    game.player.vy = 0;
    game.player.isJumping = false;
    
    // Entities cleaning
    game.obstacles = [];
    game.words = [];
    game.particles = [];
    game.floatingTexts = [];
    game.collectedPositives = [];
    game.collidedNegatives = [];
    game.shakeTime = 0;
    game.spawnCooldown = 60; // wait a tiny bit before first obstacle

    // Sync state for components
    setLiveScore(0);
    setElapsedSeconds(0);
    setMaxCombo(0);
    setCollectedPositives([]);
    setCollidedNegatives([]);
    setScreen('PLAYING');
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Space, Spacebar key, or ArrowUp key
      if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
        e.preventDefault();
        const game = stateRef.current;
        if (game.screen === 'PLAYING') {
          triggerPlayerJump();
        } else if (game.screen === 'START' || game.screen === 'GAMEOVER') {
          startGame(selectedChar);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerPlayerJump, startGame, selectedChar]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrame = 0;

    const gameLoop = () => {
      const game = stateRef.current;
      if (game.screen !== 'PLAYING') {
        // If not in game, only render background animations idling
        drawBackgroundOnly(ctx, localFrame);
        localFrame++;
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // 1. UPDATE SPEEDS & ACCELERATION OVER TIME
      game.elapsedFrames++;
      // Increment speed slightly faster as time persists (e.g. from 5.5 up to 18 max)
      game.speed = Math.min(18.0, 5.5 + (game.elapsedFrames / 450));
      
      // Increment survival score: scales up dynamically as game progresses!
      if (game.elapsedFrames % 60 === 0) {
        const elapsed = Math.floor(game.elapsedFrames / 60);
        const pointsToAdd = 1 + Math.floor(elapsed / 5); // increases score additions over time (+1, +2, +3...)
        game.score += pointsToAdd;
        
        // Spawn a tiny flying floating score text for the survival bonus
        game.floatingTexts.push({
          id: `float-survival-${Date.now()}-${Math.random()}`,
          text: `+${pointsToAdd} Survival Bonus!`,
          x: game.player.x + 10,
          y: game.player.y - 25,
          color: '#10B981',
          fontSize: 12,
          life: 0.8
        });

        setElapsedSeconds(elapsed);
        setLiveScore(game.score);
      }

      // Background scroll offsets
      game.bgOffsetClouds -= (game.speed * 0.1);
      game.bgOffsetHills -= (game.speed * 0.3);
      game.bgOffsetGround -= game.speed;

      // Restrain wrapping offsets
      if (game.bgOffsetClouds <= -800) game.bgOffsetClouds = 0;
      if (game.bgOffsetHills <= -800) game.bgOffsetHills = 0;
      if (game.bgOffsetGround <= -50) game.bgOffsetGround = 0;

      // 2. PLAYER SIMULATION (Physics)
      const playerObj = game.player;
      if (playerObj.isJumping) {
        // Dynamically scale gravity/snappiness with speed so high velocity ranges remain playable with tighter reaction jumps
        const gravityScale = Math.min(2.1, 1 + (game.speed - 5.5) * 0.082);
        playerObj.vy += 0.44 * gravityScale; // gravity pulling down
        playerObj.y += playerObj.vy;
        
        // Floor constraints
        if (playerObj.y >= GROUND_Y - playerObj.height) {
          playerObj.y = GROUND_Y - playerObj.height;
          playerObj.vy = 0;
          playerObj.isJumping = false;
        }
      } else {
        // Run cycle frame animation
        playerObj.runFrame += 0.15;
      }

      // Generate dusty trails if player is running
      if (!playerObj.isJumping && game.elapsedFrames % 8 === 0) {
        game.particles.push({
          id: `dust-${Date.now()}-${Math.random()}`,
          x: playerObj.x + 10,
          y: GROUND_Y - 4 - Math.random() * 5,
          vx: -(Math.random() * 1.5 + 1),
          vy: -Math.random() * 0.5,
          color: 'rgba(164, 150, 131, 0.4)',
          size: Math.random() * 5 + 3,
          alpha: 0.8,
          decay: 0.03,
          life: 20
        });
      }

      // 3. OBSTACLES & WORDS SIMULATION
      // Spawn items based on dynamic gap distances (faster speed = faster spawn rate to stay balanced)
      game.spawnCooldown--;
      if (game.spawnCooldown <= 0) {
        // Spawn interval gets tighter as speed grows for higher difficulty
        const baseInterval = Math.max(42, 92 - (game.speed * 4.2));
        const variance = Math.random() * 35 + 10;
        
        const spawnedType = spawnRandomObject(game);
        
        // At high speeds, if a physical obstacle is spawned on the ground, guarantee enough distance
        // for the player's reaction time and jump duration to clear it completely.
        const minGapFrames = spawnedType === 'obstacle' ? Math.max(38, Math.round(240 / game.speed)) : 16;
        
        game.spawnCooldown = Math.max(minGapFrames, baseInterval + variance);
      }

      // Move general obstacles
      for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed;

        // Bounding box collision checks
        const pLeft = playerObj.x + 8;
        const pRight = playerObj.x + playerObj.width - 8;
        const pTop = playerObj.y + 6;
        const pBottom = playerObj.y + playerObj.height - 2;

        const oLeft = obs.x + 3;
        const oRight = obs.x + obs.width - 3;
        const oTop = obs.y + 4;
        const oBottom = obs.y + obs.height;

        // Check intersection
        if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
          // General obstacle collision triggers Game Over instantly!
          SoundManager.playGameOver();
          game.screen = 'GAMEOVER';
          checkAndSaveHighScore(game.score);
          setScreen('GAMEOVER');
          
          // Generate final massive debris burst particles
          for (let p = 0; p < 24; p++) {
            game.particles.push({
              id: `debris-${p}-${Date.now()}`,
              x: playerObj.x + playerObj.width / 2,
              y: playerObj.y + playerObj.height / 2,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 1) * 7 - 2,
              color: p % 2 === 0 ? '#ef4444' : '#f59e0b',
              size: Math.random() * 9 + 4,
              alpha: 1,
              decay: 0.02,
              life: 40
            });
          }
        }

        // Drop out-of-screen obstacles
        if (obs.x < -100) {
          game.obstacles.splice(i, 1);
        }
      }

      // Move word items
      for (let i = game.words.length - 1; i >= 0; i--) {
        const word = game.words[i];
        word.x -= game.speed;

        // Bounding box collision with player
        const pLeft = playerObj.x;
        const pRight = playerObj.x + playerObj.width;
        const pTop = playerObj.y;
        const pBottom = playerObj.y + playerObj.height;

        const wLeft = word.x;
        const wRight = word.x + word.width;
        const wTop = word.y;
        const wBottom = word.y + word.height;

        // Check overlay intersection and not collected yet
        if (!word.collected && pRight > wLeft && pLeft < wRight && pBottom > wTop && pTop < wBottom) {
          word.collected = true;

          // Sound and scoring effects
          const isPos = word.type === 'positive' || word.type === 'strong_positive';
          const isStrong = word.type === 'strong_positive' || word.type === 'strong_negative';
          
          // Multiply positive points over time! "게임이 진행될수록 점수도 점점 늘어나게 해줘"
          const elapsed = Math.floor(game.elapsedFrames / 60);
          const pointsScaler = 1 + Math.floor(elapsed / 15) * 0.25; // +25% every 15 seconds of game time!
          const finalPoints = isPos ? Math.round(word.points * pointsScaler) : word.points;

          if (isPos) {
            // Positive Collection
            SoundManager.playCollectPositive(word.type === 'strong_positive');
            game.score += finalPoints;
            game.combo++;
            game.maxCombo = Math.max(game.maxCombo, game.combo);
            setMaxCombo(game.maxCombo);

            // Log entry
            const logEntry: WordCollectionLog = {
              text: word.text,
              type: word.type,
              timestamp: Date.now(),
              points: finalPoints
            };
            game.collectedPositives.unshift(logEntry);
            setCollectedPositives([...game.collectedPositives]);

            // Bounce positive particles
            const particleColor = isStrong ? '#fbbf24' : '#34d399'; // amber-400 or emerald-400
            for (let p = 0; p < 12; p++) {
              game.particles.push({
                id: `star-${p}-${Date.now()}`,
                x: word.x + word.width / 2,
                y: word.y + word.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                color: particleColor,
                size: Math.random() * 6 + 3,
                alpha: 1,
                decay: 0.045,
                life: 30
              });
            }

            // Floating text popup
            game.floatingTexts.push({
              id: `float-text-${Date.now()}`,
              text: `+${finalPoints} ${word.text} ✨`,
              x: playerObj.x + 20,
              y: playerObj.y - 15,
              color: isStrong ? '#d97706' : '#059669', // amber-600 or emerald-600
              fontSize: isStrong ? 20 : 16,
              life: 1.0
            });
          } 
          else {
            // Negative word Collided (-50 or -100 penalty!)
            SoundManager.playCollectNegative();
            game.score += finalPoints; // penalty
            game.combo = 0; // reset combo
            
            // Screen shake triggering (longer if strong negative)
            game.shakeTime = word.type === 'strong_negative' ? 22 : 14;

            // Log entry
            const logEntry: WordCollectionLog = {
              text: word.text,
              type: word.type,
              timestamp: Date.now(),
              points: finalPoints
            };
            game.collidedNegatives.unshift(logEntry);
            setCollidedNegatives([...game.collidedNegatives]);

            // Heavy dark red cloud burst
            const burstCount = word.type === 'strong_negative' ? 24 : 16;
            for (let p = 0; p < burstCount; p++) {
              game.particles.push({
                id: `darkcloud-${p}-${Date.now()}`,
                x: playerObj.x + playerObj.width / 2,
                y: playerObj.y + playerObj.height / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 + 1,
                color: p % 2 === 0 ? '#ef4444' : '#374151', // red or Slate 700
                size: Math.random() * 9 + 6,
                alpha: 0.9,
                decay: 0.04,
                life: 25
              });
            }

            // Floating text popup
            game.floatingTexts.push({
              id: `float-text-${Date.now()}`,
              text: `${finalPoints} [${word.text}] 💔`,
              x: playerObj.x + 20,
              y: playerObj.y - 15,
              color: word.type === 'strong_negative' ? '#7f1d1d' : '#dc2626', // darker red for strong
              fontSize: word.type === 'strong_negative' ? 24 : 21, // larger font size for strong negative
              life: 1.2
            });
          }

          // Force state update to React UI overlays
          setLiveScore(game.score);
        }

        // Drop words off left screen
        if (word.x < -200) {
          game.words.splice(i, 1);
        }
      }

      // Update particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.life--;

        if (p.life <= 0 || p.alpha <= 0) {
          game.particles.splice(i, 1);
        }
      }

      // Update floating texts
      for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
        const ft = game.floatingTexts[i];
        ft.y -= 1.4; // float upwards
        ft.life -= 0.02; // fade
        
        if (ft.life <= 0) {
          game.floatingTexts.splice(i, 1);
        }
      }

      // 4. RENDERING SECTION
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // Camera Shake setup
      ctx.save();
      if (game.shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 11;
        const dy = (Math.random() - 0.5) * 11;
        ctx.translate(dx, dy);
        game.shakeTime--;
      }

      drawGameScene(ctx, game, selectedChar);

      ctx.restore();

      localFrame++;
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    // Kickoff the loop
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [screen, selectedChar, startGame, checkAndSaveHighScore]);

  // Clean ambient background drawer when student sits at START or GAMEOVER menu
  const drawBackgroundOnly = (ctx: CanvasRenderingContext2D, frame: number) => {
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);
    
    // Draw sky gradient (light sky blue to off-white)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    skyGrad.addColorStop(0, '#E0F2FE');
    skyGrad.addColorStop(1, '#FAF7F2');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Draw lazy drifting cloud emojis (decorations)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(150 + Math.sin(frame * 0.002) * 20, 80, 25, 0, Math.PI * 2);
    ctx.arc(175 + Math.sin(frame * 0.002) * 20, 70, 35, 0, Math.PI * 2);
    ctx.arc(205 + Math.sin(frame * 0.002) * 20, 80, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(550 + Math.cos(frame * 0.002) * 20, 110, 20, 0, Math.PI * 2);
    ctx.arc(570 + Math.cos(frame * 0.002) * 20, 100, 30, 0, Math.PI * 2);
    ctx.arc(595 + Math.cos(frame * 0.002) * 20, 110, 22, 0, Math.PI * 2);
    ctx.fill();

    // Hills Parallax (minimalist brutalist look hills)
    ctx.fillStyle = '#CBD5E1'; // soft neutral grey-blue hills
    ctx.beginPath();
    ctx.arc(200, 410, 190, 0, Math.PI * 2);
    ctx.arc(600, 430, 220, 0, Math.PI * 2);
    ctx.fill();

    // Draw ground (pastel green grass-like floor from design)
    ctx.fillStyle = '#A8D5BA'; // Soft minty green floor (#A8D5BA from mockup)
    ctx.fillRect(0, GROUND_Y, V_WIDTH, V_HEIGHT - GROUND_Y);
    ctx.fillStyle = '#2D2D2D'; // solid brutal border
    ctx.fillRect(0, GROUND_Y, V_WIDTH, 4);

    // Grid lines on ground
    ctx.fillStyle = 'rgba(45, 45, 45, 0.1)';
    for (let x = 0; x < V_WIDTH; x += 40) {
      ctx.fillRect(x, GROUND_Y + 4, 2, V_HEIGHT - GROUND_Y);
    }
  };

  // Main Canvas Scene Drawer (Rendering active entities)
  const drawGameScene = (ctx: CanvasRenderingContext2D, game: typeof stateRef.current, char: Character) => {
    // 1. SKY & GRADIENT
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    skyGrad.addColorStop(0, '#E0F2FE'); // light sky blue
    skyGrad.addColorStop(1, '#FAF7F2'); // warm off-white bottom blending
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // 2. PARALLAX CLOUDS (High)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const renderCloud = (cx: number, cy: number, rSize: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rSize, 0, Math.PI * 2);
      ctx.arc(cx + rSize * 0.8, cy - rSize * 0.4, rSize * 1.3, 0, Math.PI * 2);
      ctx.arc(cx + rSize * 1.7, cy, rSize * 0.9, 0, Math.PI * 2);
      ctx.fill();
    };

    // Render 3 drifting clouds wrapping around boundaries
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    renderCloud((game.bgOffsetClouds + 100) % 900 - 100, 60, 16);
    renderCloud((game.bgOffsetClouds + 450) % 900 - 100, 90, 20);
    renderCloud((game.bgOffsetClouds + 800) % 900 - 100, 75, 14);

    // 3. PARALLAX HILLS (Medium)
    ctx.fillStyle = '#CBD5E1'; // soft neutral grey-blue hills
    ctx.beginPath();
    ctx.arc((game.bgOffsetHills + 150) % 900 - 100, 390, 180, 0, Math.PI * 2);
    ctx.arc((game.bgOffsetHills + 550) % 900 - 100, 410, 220, 0, Math.PI * 2);
    ctx.arc((game.bgOffsetHills + 900) % 900 - 100, 395, 160, 0, Math.PI * 2);
    ctx.fill();

    // 4. LANDSCAPE TREES
    ctx.font = '24px Arial';
    ctx.fillText('🌳', (game.bgOffsetHills + 120) % 900 - 20, GROUND_Y);
    ctx.fillText('🌱', (game.bgOffsetHills + 300) % 900 - 10, GROUND_Y);
    ctx.fillText('🌳', (game.bgOffsetHills + 500) % 900 - 20, GROUND_Y);
    ctx.fillText('🌿', (game.bgOffsetHills + 720) % 900 - 10, GROUND_Y);

    // 5. GROUND BED
    ctx.fillStyle = '#A8D5BA'; // Soft minty green floor (#A8D5BA from mockup)
    ctx.fillRect(0, GROUND_Y, V_WIDTH, V_HEIGHT - GROUND_Y);
    
    // Solid boundary line
    ctx.fillStyle = '#2D2D2D'; // solid brutal border
    ctx.fillRect(0, GROUND_Y - 2, V_WIDTH, 4);

    // Moving ground panels
    ctx.fillStyle = '#0F766E'; // dark teal outlines
    const gSize = 60;
    const offset = game.bgOffsetGround % gSize;
    for (let x = offset - gSize; x < V_WIDTH + gSize; x += gSize) {
      ctx.fillRect(x, GROUND_Y + 15, 2, V_HEIGHT - GROUND_Y);
      ctx.fillRect(x + gSize / 2, GROUND_Y + 45, 2, V_HEIGHT - GROUND_Y);
    }
    // Horizontal details
    ctx.fillRect(0, GROUND_Y + 15, V_WIDTH, 2);
    ctx.fillRect(0, GROUND_Y + 45, V_WIDTH, 2);

    // 6. PARTICLES
    for (const p of game.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. GAME WORDS (Flying bubbles with speech capsule wrapper)
    for (const w of game.words) {
      if (w.collected) continue; // skip collected items

      ctx.save();
      
      // Select capsule styles based on Word importance - ALL get the same clean neutral card styles!
      const fillStyle = '#FFFFFF'; // Neutral pure card white
      const borderStyle = '#2D2D2D'; // Bold solid brutal border
      const textStyle = '#2D2D2D'; 
      
      // 1) Styled capsule visual drop shadow to make them stand out
      ctx.shadowColor = 'rgba(45, 45, 45, 0.12)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2.5;
      ctx.shadowOffsetY = 2.5;

      // Draw Capsule Shape
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = borderStyle;
      ctx.lineWidth = 2.5;

      // Rounded Capsule Drawing
      const r = 12; // corner radius
      ctx.beginPath();
      ctx.moveTo(w.x + r, w.y);
      ctx.lineTo(w.x + w.width - r, w.y);
      ctx.quadraticCurveTo(w.x + w.width, w.y, w.x + w.width, w.y + r);
      ctx.lineTo(w.x + w.width, w.y + w.height - r);
      ctx.quadraticCurveTo(w.x + w.width, w.y + w.height, w.x + w.width - r, w.y + w.height);
      ctx.lineTo(w.x + r, w.y + w.height);
      ctx.quadraticCurveTo(w.x, w.y + w.height, w.x, w.y + w.height - r);
      ctx.lineTo(w.x, w.y + r);
      ctx.quadraticCurveTo(w.x, w.y, w.x + r, w.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Reset shadows for crisp text rendering
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 2) Draw high-contrast colored category dot on the left to make it distinguishable at a glance!
      let dotColor = '#10B981'; // general positive (emerald-500)
      if (w.type === 'strong_positive') {
        dotColor = '#FFD60A'; // strong positive (golden-yellow)
      } else if (w.type === 'negative') {
        dotColor = '#EF4444'; // general negative (rose-500)
      } else if (w.type === 'strong_negative') {
        dotColor = '#991B1B'; // strong negative (vivid dark crimson)
      }

      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(w.x + 16, w.y + w.height / 2, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2D2D2D';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 3) Write Capsule text content with larger and bolder font weights
      const isStrong = w.type === 'strong_positive' || w.type === 'strong_negative';
      ctx.font = isStrong ? 'bold 14.5px Noto Sans KR, sans-serif' : 'bold 13px Noto Sans KR, sans-serif';
      ctx.fillStyle = textStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Slide the text center position to account for the left dot beautifully
      const textX = w.x + 22 + (w.width - 22) / 2;
      ctx.fillText(w.text, textX, w.y + w.height / 2 + 1.2);
      ctx.restore();
    }

    // 8. CRITICAL FLOOR OBSTACLES (🌵, 🪨, etc.)
    for (const obs of game.obstacles) {
      ctx.save();
      
      const flash = Math.sin(Date.now() * 0.015) > 0;
      
      // 1) Bright prominent red warning glow/indicator under the obstacle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, GROUND_Y + 2, obs.width / 2 + 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 2) High-contrast brutal orange/red border box container to make the obstacle POP out instantly!
      ctx.fillStyle = '#FFEBEB'; // bright pinkish red background
      ctx.strokeStyle = '#EF4444'; // deep fire red
      ctx.lineWidth = 3.5;
      
      ctx.beginPath();
      ctx.roundRect(obs.x - 6, obs.y - 6, obs.width + 12, obs.height + 12, 16);
      ctx.fill();
      ctx.stroke();

      // 3) Draw animated flashing warning indicator overhead
      ctx.font = 'bold 12px Noto Sans KR, sans-serif';
      ctx.fillStyle = flash ? '#DC2626' : '#991B1B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('⚠️ 위험!!', obs.x + obs.width / 2, obs.y - 12);

      // 4) Draw Emoji content (extra large + clear contrast shadow)
      ctx.font = `${obs.height + 20}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.fillText(obs.emoji, obs.x + obs.width / 2, obs.y + obs.height / 2);
      
      ctx.restore();
    }

    // 9. PLAYER ANIMATION & RENDERING EMOJI
    const playerObj = game.player;
    ctx.save();
    
    // High-fidelity Jump squash/stretch
    let verticalOffset = 0;
    let squishWidth = playerObj.width;
    let squishHeight = playerObj.height;

    if (playerObj.isJumping) {
      // Ascending Stretch: taller and narrower
      if (playerObj.vy < 0) {
        squishWidth = playerObj.width - 4;
        squishHeight = playerObj.height + 6;
      } 
      // Descending Squash
      else {
        squishWidth = playerObj.width + 2;
        squishHeight = playerObj.height - 4;
      }
    } else {
      // Running bounce effect: bobbing y pos up and down
      verticalOffset = Math.sin(playerObj.runFrame) * 4.5;
    }

    // Draw chosen Character Emoji centered
    ctx.font = `${squishHeight + 6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Draw character emoji with slight tilt
    const tilt = playerObj.isJumping ? (playerObj.vy * 0.02) : (Math.sin(playerObj.runFrame) * 0.04);
    ctx.translate(playerObj.x + playerObj.width / 2, playerObj.y + playerObj.height + verticalOffset);
    ctx.rotate(tilt);
    ctx.fillText(char.emoji, 0, 6);
    
    ctx.restore();

    // 10. FLOATING POPUP TEXTS ON CANVAS
    for (const ft of game.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.fontSize}px Noto Sans KR, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  };

  // Helper calculation for grade metrics
  const getPerformanceRankDetails = (score: number) => {
    if (score >= 450) {
      return { grade: 'S', color: 'text-amber-500 bg-amber-50 border-amber-300', explanation: '당신은 상처받은 마음도 수사적으로 모두 보듬어줄 수 있는 진정한 마음 치료사입니다!' };
    } else if (score >= 260) {
      return { grade: 'A', color: 'text-emerald-600 bg-emerald-50 border-emerald-300', explanation: '서로 존중하며 따뜻한 말을 건네 아름다운 에너지를 만드는데 성공한 훌륭한 러너십입니다!' };
    } else if (score >= 100) {
      return { grade: 'B', color: 'text-blue-600 bg-blue-50 border-blue-300', explanation: '나쁜 말에 무너지지 않고 버텨냈지만, 부정 단어 한마디의 타격은 정말 컸습니다. 조금만 더 힘을 내서 높은 곳으로 날아봐요!' };
    } else {
      return { grade: 'C', color: 'text-rose-600 bg-rose-50 border-rose-300', explanation: '단 몇 마디의 부정 단어 타격(-50)이 평화로운 점수 레이스를 크게 허물어트렸습니다. 상처를 회복하려면 두 마디 이상의 깊은 위로가 필요함을 이제 알게 되었습니다.' };
    }
  };

  const currentRank = getPerformanceRankDetails(liveScore);

  return (
    <div id="word-for-you-app" className="flex flex-col items-center justify-center min-h-[100vh] bg-[#FAF7F2] p-3 md:p-6 select-none font-sans">
      
      {/* Outer Game Framing Frame */}
      <div className="w-full max-w-4xl bg-white border-4 border-[#2D2D2D] rounded-3xl overflow-hidden warm-shadow-lg flex flex-col relative text-[#2D2D2D]">
        
        {/* TOP STATUS NAVIGATION BAR */}
        <header className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-4 border-[#2D2D2D] bg-white text-[#2D2D2D]">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none font-display">
              Word for You
            </h1>
            <p className="text-base md:text-lg font-bold mt-2 text-gray-500">
              너에게 건네는 한마디 — <span className="italic font-black text-[#2D2D2D]">Bad is stronger than good</span>
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-3 w-full md:w-auto shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Highscore Status */}
              <div className="px-3 py-1.5 bg-[#FEF3C7] border-2 border-[#2D2D2D] rounded-xl flex items-center gap-1.5 text-xs font-black text-[#2D2D2D]">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>TOP SCORE: <span className="font-mono">{highScore}</span></span>
              </div>

              {/* Muted Controller Button */}
              <button
                id="sound-toggle-btn"
                onClick={handleToggleMute}
                className="p-2 bg-white border-2 border-[#2D2D2D] rounded-xl hover:bg-[#FEF3C7] active:translate-y-0.5 transition-all cursor-pointer font-bold"
                title="배경음 / 효과음 켜고 끄기"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-[#2D2D2D]" />}
              </button>

              {/* Help Button */}
              <button
                id="start-help-btn"
                onClick={() => { SoundManager.playClick(); setIsHowToPlayOpen(true); }}
                className="p-2 px-3 bg-white border-2 border-[#2D2D2D] text-[#2D2D2D] text-xs font-black uppercase rounded-xl hover:bg-gray-100 hover:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to Play</span>
              </button>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 md:text-right hidden sm:block">
              Educational Purpose
            </div>
          </div>
        </header>

        {/* -------------------- 1. START SCREEN LAYOUT -------------------- */}
        {screen === 'START' && (
          <div className="flex flex-col items-center justify-center p-6 md:p-10 space-y-8 bg-[#FAF7F2]">
            
            {/* Game Badge Intro Hero */}
            <div className="text-center space-y-4 max-w-xl">
              <div className="inline-flex gap-2 p-1.5 px-3 bg-[#DCFCE7] rounded-full text-xs font-black text-[#065F46] border-2 border-[#2D2D2D] shadow-[2px_2px_0px_#2D2D2D]">
                <span>📘 2026학년도 영어 독해 테마 수업 활동</span>
              </div>
              
              <div className="p-5 bg-white border-3 border-[#2D2D2D] rounded-2xl text-xs md:text-sm text-[#2D2D2D] leading-relaxed max-w-lg mx-auto shadow-[6px_6px_0px_#2D2D2D] text-left">
                <p className="font-extrabold text-xs mb-2 text-red-500 uppercase">💡 KEY BIOLOGY PRINCIPLE:</p>
                지문 <strong className="font-extrabold">“Bad is stronger than good”</strong>의 핵심 가치인 <br/>
                <span className="text-red-600 font-extrabold bg-[#FEE2E2] px-1 rounded border border-[#2D2D2D]">“부정적인 말 한마디는 긍정적인 말 여러 마디보다 훨씬 강한 해를 안긴다”</span>를<br/>
                실시간 2D 러닝 시뮬레이션을 돌며 직접 경험해 보는 가슴 벅찬 학술 활동입니다.
              </div>
            </div>

            {/* Character selection widget */}
            <div className="w-full max-w-2xl space-y-3.5">
              <label className="block text-center text-xs font-black text-[#2D2D2D] uppercase tracking-widest">
                🏃 활보할 캐릭터 외형을 선택하세요 (Choose Explorer)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {CHARACTERS.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => { SoundManager.playClick(); setSelectedChar(char); }}
                    className={`flex flex-col items-center p-3 rounded-2xl border-3 text-center cursor-pointer transition-all ${
                      selectedChar.id === char.id
                        ? `bg-[#FFD60A] border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D] -translate-y-1`
                        : 'border-[#2D2D2D] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-4xl md:text-5xl mb-2 animate-bounce hover:scale-110 transition-transform">{char.emoji}</span>
                    <span className="font-bold text-xs block text-[#2D2D2D] truncate w-full">{char.name}</span>
                  </button>
                ))}
              </div>

              {/* Character info panel */}
              <div className="bg-white p-3.5 px-5 rounded-2xl border-2 border-[#2D2D2D] text-center text-xs md:text-sm text-[#2D2D2D] font-medium max-w-md mx-auto shadow-[4px_4px_0px_#2D2D2D]">
                {selectedChar.description}
              </div>
            </div>

            {/* Main Action Controllers */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md pt-2">
              <button
                id="start-game-btn"
                onClick={() => startGame(selectedChar)}
                className="w-full sm:w-auto px-10 py-4 bg-[#4ADE80] text-[#2D2D2D] font-black text-lg uppercase rounded-2xl border-3 border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Flame className="w-6 h-6 text-[#2D2D2D] animate-pulse fill-green-300" />
                <span>체험 시작하기</span>
              </button>

              <button
                id="manage-custom-words-btn"
                onClick={() => { SoundManager.playClick(); setIsCreateWordOpen(true); }}
                className="w-full sm:w-auto px-5 py-4 bg-white text-[#2D2D2D] font-black rounded-2xl border-3 border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4 text-[#2D2D2D]" />
                <span>보너스 긍정어 개조 ({INITIAL_STRONG_POSITIVE_WORDS.length + sessionCustomWords.length})</span>
              </button>
            </div>

            {/* Summary instruction footnote */}
            <p className="text-[11px] text-slate-400 text-center font-mono">
              ※ 게임 조작: [스페이스바] 또는 [↑ 위 방향키] 또는 [화면 어디든 터치]
            </p>
          </div>
        )}

        {/* -------------------- 2. INTERACTIVE GAMEPLAY SCREEN -------------------- */}
        {screen === 'PLAYING' && (
          <div className="w-full h-full relative flex flex-col bg-[#E0F2FE]">
            
            {/* Live stats overlay header */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap justify-between items-center bg-white px-4 py-2.5 rounded-2xl border-3 border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D] gap-3">
              <div className="flex items-center gap-3.5">
                {/* Active runner selected profile */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl bg-[#FEF3C7] border-2 border-[#2D2D2D] p-0.5 px-1.5 rounded-xl animate-bounce">{selectedChar.emoji}</span>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-black">RUNNER</span>
                    <p className="text-xs font-black text-[#2D2D2D] leading-none">{selectedChar.name}</p>
                  </div>
                </div>

                <div className="h-6 w-px bg-[#2D2D2D]" />

                {/* Live Current Score */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-600 font-extrabold block">LIVE SCORE</span>
                  <p className="text-xl font-mono font-black tracking-tight text-[#2D2D2D] leading-none flex items-center gap-1.5">
                    {liveScore}점
                    {liveScore < 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1 border border-red-500 rounded font-sans font-black animate-pulse">영혼 부채!</span>}
                  </p>
                </div>

                {/* Lives survived Elapsed timer */}
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-[10px] text-blue-600 font-extrabold block">SURVIVAL TIME</span>
                  <p className="text-sm font-mono font-black text-blue-800 leading-none flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#2D2D2D]" />
                    {elapsedSeconds}초
                  </p>
                </div>
              </div>

              {/* Ticker counts collected */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#DCFCE7] px-2 py-1 rounded-xl border-2 border-[#2D2D2D] text-xs font-black">
                  <Heart className="w-3.5 h-3.5 text-[#10B981] fill-[#10B981]" />
                  <span>긍정어: <span className="font-mono">{collectedPositives.length}</span></span>
                </div>

                <div className="flex items-center gap-1.5 bg-[#FEE2E2] px-2 py-1 rounded-xl border-2 border-[#2D2D2D] text-xs font-black">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>부정어: <span className="font-mono">{collidedNegatives.length}</span></span>
                </div>

                {/* Reset key */}
                <button
                  id="reset-during-run-btn"
                  onClick={() => {
                    if (window.confirm('게임을 포기하고 리셋할까요?')) {
                      SoundManager.playClick();
                      setScreen('START');
                    }
                  }}
                  className="p-1.5 bg-white border-2 border-[#2D2D2D] rounded-lg text-[#2D2D2D] hover:bg-red-100 transition-all cursor-pointer text-xs flex items-center gap-1 shadow-[1px_1px_0px_#2D2D2D]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dynamic Scrolling Word Collection Logs Sidebar */}
            <div className="absolute right-3.5 top-20 z-10 w-44 hidden md:flex flex-col space-y-1.5 p-2 bg-white rounded-2xl border-2 border-[#2D2D2D] text-xs text-[#2D2D2D] max-h-[180px] overflow-hidden shadow-[3px_3px_0px_#2D2D2D]">
              <span className="font-black text-[10px] text-gray-500 border-b-2 border-gray-100 pb-1 uppercase tracking-wider">수집 로그 피드</span>
              
              <div className="space-y-1 overflow-y-auto max-h-[140px] pr-1">
                {collectedPositives.length === 0 && collidedNegatives.length === 0 && (
                  <p className="text-[10px] text-gray-400 font-bold italic text-center py-4">체험 분석 기록 대기 중...</p>
                )}
                
                {[...collectedPositives, ...collidedNegatives]
                  .sort((a,b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map((log, index) => {
                    const isPos = log.type === 'positive' || log.type === 'strong_positive';
                    return (
                      <div 
                        key={index}
                        className={`p-1 rounded-lg border-2 text-[10px] font-black flex justify-between items-center ${
                          isPos 
                            ? 'bg-[#DCFCE7] border-[#2D2D2D] text-[#065F46]' 
                            : 'bg-[#FEE2E2] border-[#2D2D2D] text-[#B91C1C]'
                        }`}
                      >
                        <span className="truncate max-w-[80px]">
                          {isPos ? '♥' : '⚡'} {log.text}
                        </span>
                        <span className="font-mono text-[9px]">
                          {log.points > 0 ? `+${log.points}` : log.points}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* High fidelity HTML5 Physics Canvas */}
            <div className="border-b-4 border-[#2D2D2D]">
              <canvas
                ref={canvasRef}
                width={V_WIDTH}
                height={V_HEIGHT}
                onMouseDown={handleCanvasTouchStart}
                onTouchStart={handleCanvasTouchStart}
                className="w-full h-auto cursor-pointer block select-none bg-sky-200 touch-action-none"
                style={{ maxHeight: '420px' }}
              />
            </div>

            {/* Bottom Floating mobile action visual hint */}
            <div className="bg-[#FAF7F2] p-2 text-center text-xs font-bold text-gray-650">
              ⚡ 장애물(선인장, 돌)은 즉시 게임오버! • 긍정어(+20, +30)는 먹고! • 부정어(-50)는 점프해서 피하세요!
            </div>
          </div>
        )}

        {/* -------------------- 3. GAME OVER & DETAILED SCORE DASHBOARD SCREEN -------------------- */}
        {screen === 'GAMEOVER' && (
          <div className="flex flex-col p-6 md:p-8 space-y-6 bg-[#FAF7F2] text-[#2D2D2D] animate-fade-in">
            
            {/* Header game status alert */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1 p-1 bg-[#FEE2E2] text-red-800 text-xs px-2.5 rounded-full border-2 border-[#2D2D2D] font-black uppercase tracking-wider">
                💥 장애물 충돌로 인해 질주 활동이 완주되었습니다.
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#2D2D2D] font-display uppercase tracking-tight leading-none">Word for You 체험 분석표</h2>
              <p className="text-xs font-bold text-gray-500">지정된 3~5분 체험 활동을 통해 얻은 심리학 단어 수치화 보고서</p>
            </div>

            {/* Score core metrics columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Primary Score Ring Card */}
              <div className="p-5 bg-white border-3 border-[#2D2D2D] rounded-3xl text-center flex flex-col justify-center items-center shadow-[4px_4px_0px_#2D2D2D] relative overflow-hidden bg-gradient-to-b from-white to-[#FAF7F2]">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">최종 점수</span>
                <p className="text-4xl md:text-5xl font-black font-mono tracking-tight leading-none text-[#2D2D2D]">
                  {liveScore}점
                </p>
                <div className="mt-3 text-xs text-gray-500 font-bold">
                  생존시간 가점 + 수집 점수
                </div>
              </div>

              {/* Statistics detailed tallies */}
              <div className="p-5 bg-[#2D2D2D] text-white rounded-3xl flex flex-col justify-center space-y-1.5 shadow-[4px_4px_0px_rgba(0,0,0,0.15)]">
                <h4 className="text-xs font-black text-[#FFD60A] uppercase tracking-widest border-b border-white/10 pb-1">레이스 마일스톤 로그</h4>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="text-gray-300 flex items-center gap-1 font-bold"><Clock className="w-3.5 h-3.5 text-blue-400" /> 생존 기록:</span>
                    <span className="font-mono font-bold text-white">{elapsedSeconds}초</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="text-gray-300 flex items-center gap-1 font-bold"><Flame className="w-3.5 h-3.5 text-yellow-400" /> 최대 콤보:</span>
                    <span className="font-mono font-bold text-white">{maxCombo}회 연속</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="text-[#34D399] flex items-center gap-1 font-bold"><Heart className="w-3.5 h-3.5 fill-[#34D399] text-[#34D399]" /> 긍정 단어 획득:</span>
                    <span className="font-mono font-bold text-[#34D399]">{collectedPositives.length}개</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="text-[#F87171] flex items-center gap-1 font-bold"><AlertTriangle className="w-3.5 h-3.5 text-[#F87171]" /> 부정 자극 충격:</span>
                    <span className="font-mono font-bold text-[#F87171]">{collidedNegatives.length}회</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Encouragement message box rendering */}
            <div className="bg-white p-5 rounded-3xl border-3 border-[#2D2D2D] shadow-[4px_4px_0px_#2D2D2D]">
              <p className="font-black text-center text-xs md:text-sm text-[#2D2D2D] font-display leading-relaxed">
                🌻 격려의 한마디: {liveScore < 100 
                  ? "“어려운 시련이 눈앞에 나타났지만, 나를 지지해주는 소중한 말의 무게가 더 귀해졌음을 상기하세요. 다시 도전해보세요!”" 
                  : "“뛰어난 다정함과 집중력으로 많은 긍정 단어를 빛나게 수집해주셨습니다! 앞으로도 주변인에게 긍정 에너지를 가득 전달해 주세요.”"}
              </p>
            </div>

            {/* Collected detailed records list (Vocabulary learning reviews) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Positive Words review */}
              <div className="bg-[#DCFCE7] p-4 rounded-2xl border-2 border-[#2D2D2D]">
                <h4 className="text-xs font-black text-[#047857] mb-2 flex items-center gap-2 uppercase tracking-widest">
                  <ThumbsUp className="w-4 h-4" />
                  이번 판 수집한 긍정 어휘록 ({collectedPositives.length}개)
                </h4>
                {collectedPositives.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">긍정 단어를 모으지 못했습니다. 다음엔 높이 뛰어보세요!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1">
                    {Array.from(new Set(collectedPositives.map(x=>x.text))).map((wordText, i) => (
                      <span key={i} className="text-xs border-2 border-[#2D2D2D] bg-white text-[#2D2D2D] font-black px-2 py-1 rounded-lg">
                        ♥ {wordText}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Negative Words avoided/collided review */}
              <div className="bg-[#FEE2E2] p-4 rounded-2xl border-2 border-[#2D2D2D]">
                <h4 className="text-xs font-black text-[#B91C1C] mb-2 flex items-center gap-2 uppercase tracking-widest">
                  <AlertTriangle className="w-4 h-4" />
                  이번 판 격돌한 부정 단어 목록 ({collidedNegatives.length}개)
                </h4>
                {collidedNegatives.length === 0 ? (
                  <p className="text-xs text-[#065F46] font-extrabold py-4 text-center">🎉 단 하나의 나쁜 말도 받지 않고 완벽한 청정 질주를 달성했습니다!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1">
                    {Array.from(new Set(collidedNegatives.map(x=>x.text))).map((wordText, i) => (
                      <span key={i} className="text-xs border-2 border-[#2D2D2D] bg-white text-[#2D2D2D] font-black px-2 py-1 rounded-lg">
                        🩹 {wordText}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Final Action navigation controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-2">
              <button
                id="restart-game-btn"
                onClick={() => startGame(selectedChar)}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#FFD60A] text-[#2D2D2D] font-black rounded-xl brutal-btn uppercase tracking-widest text-sm"
              >
                나쁜 말 극복하러 다시 뛰기
              </button>

              <button
                id="add-word-gameover-btn"
                onClick={() => { SoundManager.playClick(); setIsCreateWordOpen(true); }}
                className="w-full sm:w-auto px-6 py-3.5 bg-white text-[#2D2D2D] font-black rounded-xl brutal-btn uppercase tracking-widest text-sm"
              >
                나만의 긍정어 추가
              </button>

              <button
                id="exit-to-start-btn"
                onClick={() => { SoundManager.playClick(); setScreen('START'); }}
                className="w-full sm:w-auto px-6 py-3.5 bg-white text-gray-400 font-grey rounded-xl brutal-btn uppercase tracking-widest text-sm"
              >
                시작 홈 화면으로
              </button>
            </div>

          </div>
        )}

      </div>

      {/* MODAL LIGHTBOXES */}
      <HowToPlayModal 
        isOpen={isHowToPlayOpen} 
        onClose={() => setIsHowToPlayOpen(false)} 
      />

      <CreateWordModal 
        isOpen={isCreateWordOpen} 
        onClose={() => setIsCreateWordOpen(false)} 
        onAddWord={handleAddCustomWord}
      />

      {/* Footer Branding credits */}
      <div className="mt-8 text-center space-y-1">
        <p className="text-xs font-bold text-slate-400 font-display">
          © 2026 Word for You — 너에게 건네는 한마디
        </p>
        <p className="text-[10px] text-slate-300">
          “부정적인 강도에 비례해 따뜻함과 마음 수련을 실천합시다”
        </p>
      </div>

    </div>
  );
}
