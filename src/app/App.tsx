import { useState, useRef, useEffect } from "react";

type LogEntry = {
  id: number;
  roll: number;
  timestamp: string;
};

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <div
      className={`relative w-36 h-36 rounded-2xl bg-[#f7f0dc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.15),0_8px_32px_rgba(0,0,0,0.4)] transition-transform duration-100 ${
        rolling ? "scale-95 rotate-12" : "scale-100 rotate-0"
      }`}
      style={{ transition: rolling ? "transform 0.08s ease-in-out" : "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      {dots.map(([cx, cy], i) => (
        <div
          key={i}
          className="absolute w-4 h-4 rounded-full bg-[#1a1a1a]"
          style={{
            left: `${cx}%`,
            top: `${cy}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

function RollLabel({ value }: { value: number }) {
  const labels: Record<number, string> = {
    1: "Snake eyes",
    2: "Low roll",
    3: "Below average",
    4: "Above average",
    5: "High roll",
    6: "Max — Lucky!",
  };
  return <span className="text-muted-foreground text-sm font-mono">{labels[value] ?? ""}</span>;
}

export default function App() {
  const [currentRoll, setCurrentRoll] = useState<number>(1);
  const [rolling, setRolling] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [idCounter, setIdCounter] = useState(0);
  const [hasRolled, setHasRolled] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  function roll() {
    if (rolling) return;
    setRolling(true);
    setHasRolled(true);

    let ticks = 0;
    const totalTicks = 10;
    intervalRef.current = setInterval(() => {
      setCurrentRoll(Math.ceil(Math.random() * 6));
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(intervalRef.current!);
        const final = Math.ceil(Math.random() * 6);
        setCurrentRoll(final);
        setRolling(false);
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLog((prev) => [...prev, { id: idCounter, roll: final, timestamp }]);
        setIdCounter((c) => c + 1);
      }
    }, 60);
  }

  function clearLog() {
    setLog([]);
  }

  const total = log.reduce((sum, e) => sum + e.roll, 0);
  const avg = log.length > 0 ? (total / log.length).toFixed(2) : "—";

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-8 px-4 py-12"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Dice Roller</h1>
        <p className="text-muted-foreground text-sm mt-1 font-mono">Session log clears on exit</p>
      </div>

      {/* Dice + Button */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <DiceFace value={currentRoll} rolling={rolling} />
          {hasRolled && !rolling && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-5xl font-bold text-primary tabular-nums">{currentRoll}</span>
              <RollLabel value={currentRoll} />
            </div>
          )}
          {!hasRolled && (
            <span className="text-muted-foreground text-sm">Click to roll</span>
          )}
        </div>

        <button
          onClick={roll}
          disabled={rolling}
          className="px-10 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base tracking-wide
            hover:brightness-110 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
            shadow-[0_4px_16px_rgba(212,168,71,0.35)]"
        >
          {rolling ? "Rolling…" : "Roll Dice"}
        </button>
      </div>

      {/* Log */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Session Log · {log.length} roll{log.length !== 1 ? "s" : ""}
          </span>
          {log.length > 0 && (
            <button
              onClick={clearLog}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>

        <div
          ref={logRef}
          className="rounded-xl border border-border bg-card overflow-y-auto"
          style={{ maxHeight: "220px", scrollbarWidth: "none" }}
        >
          {log.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-muted-foreground text-sm font-mono">
              No rolls yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[...log].reverse().map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm font-mono"
                  style={{ opacity: i === 0 ? 1 : 0.6 + (1 - i / log.length) * 0.4 }}
                >
                  <span className="text-muted-foreground">{entry.timestamp}</span>
                  <span className="text-foreground font-semibold tabular-nums">
                    Rolled a{" "}
                    <span className={entry.roll === 6 ? "text-primary" : "text-foreground"}>
                      {entry.roll}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {log.length > 1 && (
          <div className="flex justify-between px-1 text-xs font-mono text-muted-foreground">
            <span>Total: <span className="text-foreground">{total}</span></span>
            <span>Avg: <span className="text-foreground">{avg}</span></span>
            <span>Best: <span className="text-primary">{Math.max(...log.map((e) => e.roll))}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
