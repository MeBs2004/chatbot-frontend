import { useEffect, useRef, useState } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function useSpeechRecognition(
  language = "en-US",
  onSpeechEnd = () => {}
) {
  const recognitionRef = useRef(null);

  const finalTranscriptRef = useRef("");

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);

  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = language;

    // Continuous recording
    recognition.continuous = true;

    // Live transcript
    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setTranscript("");
      finalTranscriptRef.current = "";
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = finalText;

      setTranscript((finalText + interim).trim());
    };

    // Automatically stop after silence
    recognition.onspeechend = () => {
      recognition.stop();
    };

    recognition.onend = () => {
      setListening(false);

      const finalText = finalTranscriptRef.current.trim();

      if (finalText.length > 0) {
        onSpeechEnd(finalText);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);

      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  const startListening = () => {
    if (!recognitionRef.current) return;

    if (listening) return;

    setTranscript("");
    finalTranscriptRef.current = "";

    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  return {
    transcript,
    listening,
    supported,
    startListening,
    stopListening,
    setTranscript,
  };
}