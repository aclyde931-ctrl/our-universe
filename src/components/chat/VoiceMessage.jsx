import { Loader2, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const VOICE_PLAY_EVENT = "together:voice-play";

export default function VoiceMessage({ url, duration, isOwnMessage }) {
  const audioRef = useRef(null);
  const instanceIdRef = useRef(crypto.randomUUID());

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [metadataDuration, setMetadataDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  function formatVoiceTime(value) {
    const numericValue = Number(value);
    const safeValue =
      Number.isFinite(numericValue) && numericValue > 0
        ? Math.floor(numericValue)
        : 0;

    const minutes = Math.floor(safeValue / 60);
    const seconds = safeValue % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function getSavedDuration() {
    const numericDuration = Number(duration);

    return Number.isFinite(numericDuration) && numericDuration > 0
      ? numericDuration
      : 0;
  }

  function updateAudioDuration(audio) {
    const browserDuration = Number(audio?.duration);

    if (Number.isFinite(browserDuration) && browserDuration > 0) {
      setMetadataDuration(browserDuration);
      return;
    }

    const savedDuration = getSavedDuration();

    if (savedDuration > 0) {
      setMetadataDuration(savedDuration);
    }
  }

  function handleLoadedMetadata(event) {
    const audio = event.currentTarget;
    const browserDuration = Number(audio.duration);

    if (Number.isFinite(browserDuration) && browserDuration > 0) {
      setMetadataDuration(browserDuration);
      setIsLoading(false);
      return;
    }

    if (browserDuration === Infinity) {
      const handleDurationSeek = () => {
        audio.removeEventListener("seeked", handleDurationSeek);

        const calculatedDuration = Number(audio.duration);

        if (Number.isFinite(calculatedDuration) && calculatedDuration > 0) {
          setMetadataDuration(calculatedDuration);
        } else {
          setMetadataDuration(getSavedDuration());
        }

        audio.currentTime = 0;
        setCurrentTime(0);
        setIsLoading(false);
      };

      audio.addEventListener("seeked", handleDurationSeek, { once: true });

      try {
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      } catch {
        audio.removeEventListener("seeked", handleDurationSeek);
        setMetadataDuration(getSavedDuration());
        setIsLoading(false);
      }

      return;
    }

    setMetadataDuration(getSavedDuration());
    setIsLoading(false);
  }

  async function togglePlayback(event) {
    event.stopPropagation();

    const audio = audioRef.current;
    if (!audio || isLoading) return;

    try {
      if (audio.paused) {
        window.dispatchEvent(
          new CustomEvent(VOICE_PLAY_EVENT, {
            detail: { id: instanceIdRef.current },
          }),
        );

        audio.playbackRate = playbackRate;
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error("Unable to play voice message:", error);
      setIsPlaying(false);
    }
  }

  function handleSeek(event) {
    event.stopPropagation();

    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = Number(event.target.value);

    if (!Number.isFinite(nextTime)) return;

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function changePlaybackRate(event) {
    event.stopPropagation();

    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];

    setPlaybackRate(nextRate);

    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }

  useEffect(() => {
    function pauseWhenAnotherVoiceStarts(event) {
      if (event.detail?.id === instanceIdRef.current) return;

      const audio = audioRef.current;

      if (audio && !audio.paused) {
        audio.pause();
      }
    }

    window.addEventListener(VOICE_PLAY_EVENT, pauseWhenAnotherVoiceStarts);

    return () => {
      window.removeEventListener(VOICE_PLAY_EVENT, pauseWhenAnotherVoiceStarts);
    };
  }, []);

  useEffect(() => {
    setCurrentTime(0);
    setMetadataDuration(0);
    setIsPlaying(false);
    setIsLoading(true);

    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
  }, [url]);

  const savedDuration = getSavedDuration();

  const totalDuration =
    Number.isFinite(metadataDuration) && metadataDuration > 0
      ? metadataDuration
      : savedDuration > 0
        ? savedDuration
        : 1;

  const progress = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  const waveformBars = useMemo(() => {
    const source = String(url || "");
    let seed = 0;

    for (let index = 0; index < source.length; index += 1) {
      seed = (seed * 31 + source.charCodeAt(index)) >>> 0;
    }

    return Array.from({ length: 34 }, (_, index) => {
      seed = (seed * 1664525 + 1013904223 + index) >>> 0;
      return 25 + (seed % 76);
    });
  }, [url]);

  return (
    <div className="flex min-w-[230px] items-center gap-3 py-1 sm:min-w-[280px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadStart={() => setIsLoading(true)}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={(event) => updateAudioDuration(event.currentTarget)}
        onCanPlay={(event) => {
          updateAudioDuration(event.currentTarget);
          setIsLoading(false);
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => {
          const nextTime = Number(event.currentTarget.currentTime);
          setCurrentTime(Number.isFinite(nextTime) ? nextTime : 0);
        }}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
        }}
      />

      <button
        type="button"
        onClick={togglePlayback}
        disabled={isLoading}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:cursor-wait ${
          isOwnMessage
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-rose-100 text-rose-500 hover:bg-rose-200"
        }`}
        aria-label={
          isLoading
            ? "Loading voice message"
            : isPlaying
              ? "Pause voice message"
              : "Play voice message"
        }
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="relative h-8 w-full">
          <div className="absolute inset-0 flex items-center gap-[2px] overflow-hidden">
            {waveformBars.map((height, index) => {
              const barProgress = ((index + 1) / waveformBars.length) * 100;
              const isPlayed = barProgress <= progress;

              return (
                <span
                  key={index}
                  className={`block min-w-0 flex-1 rounded-full transition-colors ${
                    isOwnMessage
                      ? isPlayed
                        ? "bg-white"
                        : "bg-white/35"
                      : isPlayed
                        ? "bg-rose-500"
                        : "bg-rose-200"
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.05"
            value={Math.min(currentTime, totalDuration)}
            onChange={handleSeek}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Voice message progress"
          />
        </div>

        <div
          className={`mt-0.5 flex items-center justify-between text-[10px] ${
            isOwnMessage ? "text-white/80" : "text-gray-400"
          }`}
        >
          <span>{formatVoiceTime(currentTime)}</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={changePlaybackRate}
              onPointerDown={(event) => event.stopPropagation()}
              className={`rounded-full px-1.5 py-0.5 font-semibold transition ${
                isOwnMessage
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : "bg-rose-50 text-rose-500 hover:bg-rose-100"
              }`}
              aria-label={`Playback speed ${playbackRate} times`}
            >
              {playbackRate}×
            </button>

            <span>{formatVoiceTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}