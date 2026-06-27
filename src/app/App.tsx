import { useState, useRef, useEffect } from "react";

const TOTAL_ROUNDS = 10;

type ComboType = "snake-eyes" | "doubles" | "lucky-7" | "yo-leven" | "boxcars" | "normal";

type LogEntry = {
  id: number;
  dice: [number, number];
  baseSum: number;
  pointsEarned: number;
  combo: ComboType;
  runningScore: number;
  isBonusRoll: boolean;
};

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

const COMBO_INFO: Record<ComboType, { label: string; color: string; emoji: string }> = {
  "snake-eyes": { label: "Snake Eyes! Buy a round!", color: "text-red-400",     emoji: "🍺" },
  "doubles":    { label: "Doubles! Bonus roll!",      color: "text-primary",     emoji: "🎰" },
  "lucky-7":    { label: "Lucky 7! +7 bonus!",        color: "text-emerald-400", emoji: "🍀" },
  "yo-leven":   { label: "Yo-Leven! +11 bonus!",      color: "text-primary",     emoji: "⚡" },
  "boxcars":    { label: "Boxcars! Score doubled!",    color: "text-yellow-300",  emoji: "🎲" },
  "normal":     { label: "",                           color: "text-foreground",  emoji: "" },
};

function getCombo(d1: number, d2: number): ComboType {
  const sum = d1 + d2;
  if (d1 === 1 && d2 === 1) return "snake-eyes";
  if (d1 === d2) return "doubles";
  if (sum === 12) return "boxcars";
  if (sum === 11) return "yo-leven";
  if (sum === 7) return "lucky-7";
  return "normal";
}

function calcPoints(d1: number, d2: number, combo: ComboType): number {
  const sum = d1 + d2;
  if (combo === "snake-eyes") return -10;
  if (combo === "boxcars") return sum * 2;
  if (combo === "lucky-7") return sum + 7;
  if (combo === "yo-leven") return sum + 11;
  return sum;
}

function Die({ value, rolling, delay = 0 }: { value: number; rolling: boolean; delay?: number }) {
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <div
      className="relative rounded-2xl bg-[#f5edcf] shadow-[inset_0_2px_6px_rgba(0,0,0,0.2),0_8px_28px_rgba(0,0,0,0.45)]"
      style={{
        width: "clamp(88px, 22vw, 112px)",
        height: "clamp(88px, 22vw, 112px)",
        transform: rolling ? `scale(0.92) rotate(${delay > 0 ? -14 : 14}deg)` : "scale(1) rotate(0deg)",
        transition: rolling
          ? `transform 0.07s ease-in-out ${delay}ms`
          : `transform 0.3s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
      }}
    >
      {dots.map(([cx, cy], i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#1c1208]"
          style={{
            width: "clamp(10px, 3vw, 14px)",
            height: "clamp(10px, 3vw, 14px)",
            left: `${cx}%`,
            top: `${cy}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 120) * 100));
  return (
    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${score < 0 ? "bg-red-400" : "bg-primary"}`}
        style={{ width: `${score < 0 ? 8 : pct}%` }}
      />
    </div>
  );
}

function RulesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card text-sm font-mono text-muted-foreground active:opacity-70 transition-opacity"
      >
        <span>How to play</span>
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-1 px-4 py-3 rounded-xl border border-border bg-card text-xs font-mono space-y-2 text-muted-foreground">
          <p className="text-foreground font-semibold">Last Call — Bar Dice</p>
          <p><span className="text-red-400">🍺 Snake Eyes (1+1)</span> — Lose 10 pts</p>
          <p><span className="text-primary">🎰 Doubles</span> — Free bonus roll</p>
          <p><span className="text-emerald-400">🍀 Lucky 7</span> — Sum + 7 pts</p>
          <p><span className="text-primary">⚡ Yo-Leven (11)</span> — Sum + 11 pts</p>
          <p><span className="text-yellow-300">🎲 Boxcars (12)</span> — Score × 2</p>
          <p className="pt-1.5 border-t border-border">{TOTAL_ROUNDS} rounds. Highest score wins the tab.</p>
        </div>
      )}
    </div>
  );
}

type GameState = "idle" | "playing" | "rolling" | "combo-bonus" | "done";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [comboFlash, setComboFlash] = useState<ComboType | null>(null);
  const [pendingBonusRoll, setPendingBonusRoll] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  function animateRoll(onDone: (d1: number, d2: number) => void) {
    setGameState("rolling");
    let ticks = 0;
    const iv = setInterval(() => {
      setDice([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      ticks++;
      if (ticks >= 12) {
        clearInterval(iv);
        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        setDice([d1, d2]);
        onDone(d1, d2);
      }
    }, 55);
  }

  function commitRoll(d1: number, d2: number, isBonusRoll: boolean, currentScore: number, currentRound: number) {
    const combo = getCombo(d1, d2);
    const pts = calcPoints(d1, d2, combo);
    const newScore = currentScore + pts;
    const newRound = isBonusRoll ? currentRound : currentRound + 1;
    setScore(newScore);
    setRound(newRound);
    setLog((prev) => [
      ...prev,
      { id: idRef.current++, dice: [d1, d2], baseSum: d1 + d2, pointsEarned: pts, combo, runningScore: newScore, isBonusRoll },
    ]);
    setComboFlash(combo);
    setTimeout(() => setComboFlash(null), 1600);

    if (combo === "doubles" && !isBonusRoll) {
      setPendingBonusRoll(true);
      setGameState("combo-bonus");
    } else if (newRound >= TOTAL_ROUNDS) {
      setGameState("done");
    } else {
      setGameState("playing");
    }
  }

  function handleRoll() {
    if (gameState === "rolling") return;
    const isBonusRoll = pendingBonusRoll;
    if (isBonusRoll) setPendingBonusRoll(false);
    animateRoll((d1, d2) => commitRoll(d1, d2, isBonusRoll, score, round));
  }

  function startGame() {
    setScore(0); setRound(0); setLog([]); setDice([1, 1]);
    setComboFlash(null); setPendingBonusRoll(false);
    setGameState("playing");
  }

  function resetGame() {
    setGameState("idle"); setScore(0); setRound(0); setLog([]); setDice([1, 1]);
    setComboFlash(null); setPendingBonusRoll(false);
  }

  const isRolling = gameState === "rolling";
  const flashInfo = comboFlash ? COMBO_INFO[comboFlash] : null;
  const avgPts = log.length > 0 ? (log.reduce((s, e) => s + e.pointsEarned, 0) / log.length).toFixed(1) : null;

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Fixed header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">Last Call</h1>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Bar Dice · {TOTAL_ROUNDS} rounds</p>
        </div>
        {gameState !== "idle" && (
          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums leading-none ${score < 0 ? "text-red-400" : "text-primary"}`}>
              {score}
            </p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              {gameState !== "done"
                ? pendingBonusRoll ? "Bonus!" : `Rd ${round + 1}/${TOTAL_ROUNDS}`
                : "Final"}
            </p>
          </div>
        )}
      </header>

      {/* Scrollable body */}
      <main className="flex-1 flex flex-col items-center gap-4 px-4 pt-5 pb-36">
        {/* Score bar */}
        {gameState !== "idle" && (
          <div className="w-full">
            <ScoreBar score={score} />
          </div>
        )}

        {/* Rules */}
        <RulesPanel />

        {/* Dice */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex gap-5 items-center">
            <Die value={dice[0]} rolling={isRolling} delay={0} />
            <span className="text-muted-foreground font-bold text-xl select-none">+</span>
            <Die value={dice[1]} rolling={isRolling} delay={30} />
          </div>

          {/* Combo flash */}
          <div className="h-6 flex items-center justify-center">
            {flashInfo?.label ? (
              <p className={`text-sm font-semibold font-mono ${flashInfo.color} animate-pulse`}>
                {flashInfo.emoji} {flashInfo.label}
              </p>
            ) : null}
          </div>
        </div>

        {/* End screen */}
        {gameState === "done" && (
          <div className="w-full text-center px-4 py-5 rounded-2xl border border-border bg-card">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Final Score</p>
            <p className={`text-6xl font-bold tabular-nums ${score < 0 ? "text-red-400" : "text-primary"}`}>{score}</p>
            <p className="text-sm text-muted-foreground mt-2 font-mono">
              {score >= 100 ? "🏆 Tab champion!" :
               score >= 60  ? "🍻 Solid game!" :
               score >= 30  ? "😅 Not bad..." :
               score >= 0   ? "😬 Better luck next time" :
                              "🍺 You're buying the whole bar!"}
            </p>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                Roll History
              </span>
              {avgPts && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  Avg {avgPts} pts/roll
                </span>
              )}
            </div>
            <div
              ref={logRef}
              className="rounded-xl border border-border bg-card overflow-y-auto"
              style={{ maxHeight: "240px", scrollbarWidth: "none" }}
            >
              <div className="divide-y divide-border">
                {[...log].reverse().map((entry, i) => {
                  const info = COMBO_INFO[entry.combo];
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-3 py-2.5 text-xs font-mono"
                      style={{ opacity: Math.max(0.45, 1 - i * 0.07) }}
                    >
                      <div className="flex items-center gap-1.5">
                        {entry.isBonusRoll && (
                          <span className="text-primary text-[9px] border border-primary/40 rounded px-1 py-0.5 leading-none">BONUS</span>
                        )}
                        <span className="text-foreground">[{entry.dice[0]}][{entry.dice[1]}]={entry.baseSum}</span>
                        {info.emoji && <span>{info.emoji}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={entry.pointsEarned < 0 ? "text-red-400" : "text-primary"}>
                          {entry.pointsEarned >= 0 ? "+" : ""}{entry.pointsEarned}
                        </span>
                        <span className="text-muted-foreground w-8 text-right">{entry.runningScore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4 safe-area-bottom">
        {gameState === "idle" && (
          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg tracking-wide
              active:scale-[0.97] transition-transform shadow-[0_4px_20px_rgba(212,168,71,0.4)]"
          >
            Start Game
          </button>
        )}

        {(gameState === "playing" || gameState === "combo-bonus") && (
          <button
            onClick={handleRoll}
            disabled={isRolling}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg tracking-wide
              active:scale-[0.97] transition-transform disabled:opacity-50
              shadow-[0_4px_20px_rgba(212,168,71,0.4)]"
          >
            {pendingBonusRoll ? "Claim Bonus Roll 🎰" : isRolling ? "Rolling…" : "Roll Dice"}
          </button>
        )}

        {gameState === "done" && (
          <button
            onClick={resetGame}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg tracking-wide
              active:scale-[0.97] transition-transform shadow-[0_4px_20px_rgba(212,168,71,0.4)]"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
