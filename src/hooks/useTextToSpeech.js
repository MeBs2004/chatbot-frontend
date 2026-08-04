import { useCallback, useEffect, useRef, useState } from "react";

export default function useTextToSpeech() {
  const synth = useRef(window.speechSynthesis);
  const voicesRef = useRef([]);

  const [supported] = useState(
    typeof window !== "undefined" && "speechSynthesis" in window
  );

  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = synth.current.getVoices();

      console.log("🎤 Available Voices");

      voicesRef.current.forEach((voice, index) => {
        console.log(
          `${index + 1}. ${voice.name} | ${voice.lang} | Default: ${voice.default}`
        );
      });
    };

    loadVoices();

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      synth.current.cancel();
    };
  }, []);

  // Wait until voices are available
  const getVoices = () => {
    return new Promise((resolve) => {
      let voices = synth.current.getVoices();

      if (voices.length) {
        resolve(voices);
        return;
      }

      speechSynthesis.onvoiceschanged = () => {
        voices = synth.current.getVoices();
        voicesRef.current = voices;
        resolve(voices);
      };
    });
  };

  const speak = useCallback(
    async (text, lang = "en-US") => {
      if (!supported || !text) return;

      synth.current.cancel();

      const cleanText = text
        .replace(/[#*_>`~-]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

      const voices = await getVoices();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      let voice = null;

      // =========================
      // Hindi Voices (Priority)
      // =========================

      if (lang.startsWith("hi")) {
        voice =
          voices.find(v => v.name.includes("Google हिन्दी")) ||
          voices.find(v => v.name.includes("Google Hindi")) ||
          voices.find(v => v.name.includes("Microsoft Heera")) ||
          voices.find(v => v.name.includes("Heera")) ||
          voices.find(v => v.name.includes("Hindi")) ||
          voices.find(v => v.lang === "hi-IN") ||
          voices.find(v => v.lang.startsWith("hi"));

        utterance.rate = 0.82;
        utterance.pitch = 1;
      }

      // =========================
      // English Voices
      // =========================

      else {
        voice =
          voices.find(v => v.name.includes("Google UK English Female")) ||
          voices.find(v => v.name.includes("Google US English")) ||
          voices.find(v => v.name.includes("Google UK English Male")) ||
          voices.find(v => v.name.includes("Microsoft Sonia")) ||
          voices.find(v => v.name.includes("Microsoft Zira")) ||
          voices.find(v => v.name.includes("Microsoft Aria")) ||
          voices.find(v => v.name.includes("Rishi")) ||
          voices.find(v => v.lang === "en-IN") ||
          voices.find(v => v.lang === "en-GB") ||
          voices.find(v => v.lang === "en-US") ||
          voices.find(v => v.lang.startsWith("en"));

        utterance.rate = 0.96;
        utterance.pitch = 1;
      }

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang;
      }

      utterance.volume = 1;

      console.log(
        "🎙 Using Voice:",
        utterance.voice?.name || "Default",
        "|",
        utterance.lang
      );

      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
      };

      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
      };

      utterance.onerror = (e) => {
        console.error("Speech Error:", e);
        setSpeaking(false);
        setPaused(false);
      };

      synth.current.speak(utterance);
    },
    [supported]
  );

  const stop = useCallback(() => {
    synth.current.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    synth.current.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    synth.current.resume();
    setPaused(false);
  }, []);

  return {
    supported,
    speaking,
    paused,
    speak,
    stop,
    pause,
    resume,
  };
}