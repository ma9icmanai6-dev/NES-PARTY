import React, { useState, useEffect, useRef } from "react";
import { PartySocket } from "../../services/socket";
import { NesButton } from "../../types";
import { Wifi, WifiOff, Maximize2, Minimize2, Users, RefreshCw, Volume2, VolumeX, Shield } from "lucide-react";

interface PhoneControllerProps {
  socket: PartySocket;
  roomId: string;
  initialSlot?: 1 | 2;
  onExit?: () => void;
}

export const PhoneController: React.FC<PhoneControllerProps> = ({
  socket,
  roomId,
  initialSlot,
  onExit,
}) => {
  const [slot, setSlot] = useState<1 | 2 | "spectator">(initialSlot || socket.getSlot() || 1);
  const [status, setStatus] = useState(socket.getStatus());
  const [ping, setPing] = useState(socket.getPing() || 0);
  const [activeButtons, setActiveButtons] = useState<Set<NesButton>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio click context
  const audioCtxRef = useRef<AudioContext | null>(null);

  // WakeLock to keep phone screen awake
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        // Ignore wakeLock errors
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Socket listener bindings
  useEffect(() => {
    const unsubStatus = socket.onStatusChange((s) => setStatus(s));
    const unsubPing = socket.onPing((p) => setPing(p));
    const unsubAssigned = socket.onAssigned((newSlot) => setSlot(newSlot));

    return () => {
      unsubStatus();
      unsubPing();
      unsubAssigned();
    };
  }, [socket]);

  // Audio click feedback generator
  const playClickFeedback = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, audioCtxRef.current.currentTime + 0.03);
      gain.gain.setValueAtTime(0.2, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.03);
    } catch (e) {}
  };

  // Haptic feedback
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }
    } catch (e) {}
  };

  // Button down
  const handleButtonDown = (btn: NesButton, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveButtons((prev) => new Set(prev).add(btn));
    socket.sendInput(btn, true);
    triggerHaptic();
    playClickFeedback();
  };

  // Button up
  const handleButtonUp = (btn: NesButton, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveButtons((prev) => {
      const next = new Set(prev);
      next.delete(btn);
      return next;
    });
    socket.sendInput(btn, false);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const isConnected = status === "connected";
  const isP1 = slot === 1;

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col justify-between select-none touch-none overflow-hidden font-grotesk">
      {/* Top Status & HUD Bar */}
      <div className="h-14 bg-zinc-900 border-b-2 border-zinc-800 px-3 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5">
          {/* Player badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1 rounded-xl font-display font-black text-xs uppercase tracking-wide shadow-sm border-2 ${
              isP1
                ? "bg-red-600 border-red-500 text-white shadow-red-900/50"
                : slot === 2
                ? "bg-blue-600 border-blue-500 text-white shadow-blue-900/50"
                : "bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{isP1 ? "PLAYER 1" : slot === 2 ? "PLAYER 2" : "SPECTATOR"}</span>
          </div>

          {/* Room info */}
          <span className="font-grotesk font-semibold text-xs text-zinc-400">
            ROOM: <span className="text-white font-black tracking-wider">{roomId}</span>
          </span>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-2">
          {/* Ping latency indicator */}
          <div className="flex items-center gap-1.5 text-xs font-grotesk font-bold text-zinc-400 bg-zinc-800/80 border border-zinc-700 px-2.5 py-1 rounded-lg">
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            )}
            <span>{isConnected ? `${ping}ms` : "OFFLINE"}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 cursor-pointer transition-colors"
            title="Toggle Click Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 cursor-pointer transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onExit && (
            <button
              onClick={onExit}
              className="text-xs font-grotesk font-black uppercase text-zinc-400 hover:text-white px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer transition-colors"
            >
              EXIT
            </button>
          )}
        </div>
      </div>

      {/* Main NES Controller Body Canvas */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 relative">
        <div className="w-full max-w-4xl h-full max-h-[500px] bg-zinc-300 rounded-3xl p-4 sm:p-7 border-8 border-zinc-400 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          {/* Classic NES Controller Inset Panel */}
          <div className="absolute inset-x-4 top-4 bottom-4 bg-zinc-900 rounded-2xl border-4 border-zinc-950 shadow-inner pointer-events-none" />

          {/* Controller Top Label */}
          <div className="relative z-10 flex justify-between items-center px-4">
            <div className="font-display font-black text-sm sm:text-base text-red-600 uppercase tracking-tight">
              Nintendo
            </div>
            <div className="font-grotesk font-black text-xs text-zinc-400 tracking-widest uppercase">
              WIRELESS APU CONTROLLER
            </div>
          </div>

          {/* Main Controls Row: D-PAD on Left, SELECT/START in Center, A/B on Right */}
          <div className="relative z-20 flex-1 grid grid-cols-12 items-center gap-2">
            {/* Left: Classic D-Pad */}
            <div className="col-span-5 flex items-center justify-center">
              <div className="relative w-44 h-44 sm:w-56 sm:h-56">
                {/* D-Pad Center Base */}
                <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 bg-zinc-950 rounded-sm shadow-inner" />

                {/* UP */}
                <button
                  id="btn-up"
                  onTouchStart={(e) => handleButtonDown("UP", e)}
                  onTouchEnd={(e) => handleButtonUp("UP", e)}
                  onMouseDown={(e) => handleButtonDown("UP", e)}
                  onMouseUp={(e) => handleButtonUp("UP", e)}
                  className={`absolute top-0 left-1/3 w-1/3 h-1/3 rounded-t-xl bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center transition-all cursor-pointer ${
                    activeButtons.has("UP")
                      ? "bg-red-600 shadow-[0_0_15px_#dc2626] scale-95 border-red-500"
                      : "active:bg-zinc-700 shadow-md"
                  }`}
                >
                  <span className="text-white text-lg">▲</span>
                </button>

                {/* DOWN */}
                <button
                  id="btn-down"
                  onTouchStart={(e) => handleButtonDown("DOWN", e)}
                  onTouchEnd={(e) => handleButtonUp("DOWN", e)}
                  onMouseDown={(e) => handleButtonDown("DOWN", e)}
                  onMouseUp={(e) => handleButtonUp("DOWN", e)}
                  className={`absolute bottom-0 left-1/3 w-1/3 h-1/3 rounded-b-xl bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center transition-all cursor-pointer ${
                    activeButtons.has("DOWN")
                      ? "bg-red-600 shadow-[0_0_15px_#dc2626] scale-95 border-red-500"
                      : "active:bg-zinc-700 shadow-md"
                  }`}
                >
                  <span className="text-white text-lg">▼</span>
                </button>

                {/* LEFT */}
                <button
                  id="btn-left"
                  onTouchStart={(e) => handleButtonDown("LEFT", e)}
                  onTouchEnd={(e) => handleButtonUp("LEFT", e)}
                  onMouseDown={(e) => handleButtonDown("LEFT", e)}
                  onMouseUp={(e) => handleButtonUp("LEFT", e)}
                  className={`absolute top-1/3 left-0 w-1/3 h-1/3 rounded-l-xl bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center transition-all cursor-pointer ${
                    activeButtons.has("LEFT")
                      ? "bg-red-600 shadow-[0_0_15px_#dc2626] scale-95 border-red-500"
                      : "active:bg-zinc-700 shadow-md"
                  }`}
                >
                  <span className="text-white text-lg">◀</span>
                </button>

                {/* RIGHT */}
                <button
                  id="btn-right"
                  onTouchStart={(e) => handleButtonDown("RIGHT", e)}
                  onTouchEnd={(e) => handleButtonUp("RIGHT", e)}
                  onMouseDown={(e) => handleButtonDown("RIGHT", e)}
                  onMouseUp={(e) => handleButtonUp("RIGHT", e)}
                  className={`absolute top-1/3 right-0 w-1/3 h-1/3 rounded-r-xl bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center transition-all cursor-pointer ${
                    activeButtons.has("RIGHT")
                      ? "bg-red-600 shadow-[0_0_15px_#dc2626] scale-95 border-red-500"
                      : "active:bg-zinc-700 shadow-md"
                  }`}
                >
                  <span className="text-white text-lg">▶</span>
                </button>
              </div>
            </div>

            {/* Center: SELECT and START Pill Buttons */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-6">
              <div className="flex gap-4 sm:gap-6 transform -rotate-12">
                {/* SELECT */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-select"
                    onTouchStart={(e) => handleButtonDown("SELECT", e)}
                    onTouchEnd={(e) => handleButtonUp("SELECT", e)}
                    onMouseDown={(e) => handleButtonDown("SELECT", e)}
                    onMouseUp={(e) => handleButtonUp("SELECT", e)}
                    className={`w-12 sm:w-16 h-4 sm:h-5 rounded-full bg-zinc-950 border border-zinc-600 shadow-inner transition-transform cursor-pointer ${
                      activeButtons.has("SELECT") ? "scale-90 bg-red-600" : ""
                    }`}
                  />
                  <span className="font-display font-black text-[9px] sm:text-[10px] text-red-600 mt-2 tracking-wider">
                    SELECT
                  </span>
                </div>

                {/* START */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-start"
                    onTouchStart={(e) => handleButtonDown("START", e)}
                    onTouchEnd={(e) => handleButtonUp("START", e)}
                    onMouseDown={(e) => handleButtonDown("START", e)}
                    onMouseUp={(e) => handleButtonUp("START", e)}
                    className={`w-12 sm:w-16 h-4 sm:h-5 rounded-full bg-zinc-950 border border-zinc-600 shadow-inner transition-transform cursor-pointer ${
                      activeButtons.has("START") ? "scale-90 bg-red-600" : ""
                    }`}
                  />
                  <span className="font-display font-black text-[9px] sm:text-[10px] text-red-600 mt-2 tracking-wider">
                    START
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Round Action Buttons B & A (+ Turbo B & A) */}
            <div className="col-span-5 flex flex-col items-center justify-center gap-3">
              {/* Turbo Row */}
              <div className="flex gap-4 sm:gap-6 mb-1">
                <div className="flex flex-col items-center">
                  <button
                    id="btn-turbo-b"
                    onTouchStart={(e) => handleButtonDown("TURBO_B", e)}
                    onTouchEnd={(e) => handleButtonUp("TURBO_B", e)}
                    onMouseDown={(e) => handleButtonDown("TURBO_B", e)}
                    onMouseUp={(e) => handleButtonUp("TURBO_B", e)}
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#7f1d1d] border-2 border-red-500 flex items-center justify-center font-display font-black text-xs text-white shadow-lg transition-transform cursor-pointer ${
                      activeButtons.has("TURBO_B") ? "scale-90 bg-red-500" : ""
                    }`}
                  >
                    TB
                  </button>
                  <span className="text-[10px] font-grotesk font-black text-zinc-400 mt-1 uppercase">TURBO B</span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    id="btn-turbo-a"
                    onTouchStart={(e) => handleButtonDown("TURBO_A", e)}
                    onTouchEnd={(e) => handleButtonUp("TURBO_A", e)}
                    onMouseDown={(e) => handleButtonDown("TURBO_A", e)}
                    onMouseUp={(e) => handleButtonUp("TURBO_A", e)}
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#7f1d1d] border-2 border-red-500 flex items-center justify-center font-display font-black text-xs text-white shadow-lg transition-transform cursor-pointer ${
                      activeButtons.has("TURBO_A") ? "scale-90 bg-red-500" : ""
                    }`}
                  >
                    TA
                  </button>
                  <span className="text-[10px] font-grotesk font-black text-zinc-400 mt-1 uppercase">TURBO A</span>
                </div>
              </div>

              {/* Primary Action B and A */}
              <div className="flex gap-4 sm:gap-7 items-center">
                {/* B Button */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-b"
                    onTouchStart={(e) => handleButtonDown("B", e)}
                    onTouchEnd={(e) => handleButtonUp("B", e)}
                    onMouseDown={(e) => handleButtonDown("B", e)}
                    onMouseUp={(e) => handleButtonUp("B", e)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 border-4 border-red-700 flex items-center justify-center font-display font-black text-lg sm:text-2xl text-white shadow-2xl transition-all cursor-pointer ${
                      activeButtons.has("B")
                        ? "bg-red-400 scale-90 shadow-[0_0_20px_#ef4444]"
                        : "active:scale-95 shadow-red-950/60"
                    }`}
                  >
                    B
                  </button>
                  <span className="font-display font-black text-[10px] sm:text-xs text-red-600 mt-1.5 uppercase tracking-wider">
                    BUTTON B
                  </span>
                </div>

                {/* A Button */}
                <div className="flex flex-col items-center">
                  <button
                    id="btn-a"
                    onTouchStart={(e) => handleButtonDown("A", e)}
                    onTouchEnd={(e) => handleButtonUp("A", e)}
                    onMouseDown={(e) => handleButtonDown("A", e)}
                    onMouseUp={(e) => handleButtonUp("A", e)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 border-4 border-red-700 flex items-center justify-center font-display font-black text-lg sm:text-2xl text-white shadow-2xl transition-all cursor-pointer ${
                      activeButtons.has("A")
                        ? "bg-red-400 scale-90 shadow-[0_0_20px_#ef4444]"
                        : "active:scale-95 shadow-red-950/60"
                    }`}
                  >
                    A
                  </button>
                  <span className="font-display font-black text-[10px] sm:text-xs text-red-600 mt-1.5 uppercase tracking-wider">
                    BUTTON A
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Switch Player Slot */}
          <div className="relative z-10 flex justify-between items-center text-[11px] text-zinc-600 px-4">
            <button
              onClick={() => {
                const nextSlot = slot === 1 ? 2 : 1;
                socket.send({
                  type: "join-controller",
                  roomId,
                  requestedSlot: nextSlot,
                });
              }}
              className="text-zinc-700 hover:text-zinc-900 underline font-grotesk font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Switch to {slot === 1 ? "Player 2" : "Player 1"}</span>
            </button>
            <span className="font-grotesk font-bold uppercase tracking-wider text-[10px] text-zinc-500">FAST SUB-MS DISPATCH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
