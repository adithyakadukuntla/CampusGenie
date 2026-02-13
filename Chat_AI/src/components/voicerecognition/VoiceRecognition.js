import { useState, useEffect, useRef } from "react";

const VoiceRecognition = ({ onResult, onEnd, isListening }) => {
  const [recognition, setRecognition] = useState(null);
  const transcriptRef = useRef("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser");
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
      );
      return;
    }

    // Initialize recognition object
    const recognitionInstance = new SpeechRecognition();

    // CRITICAL: Set to true for continuous listening
    recognitionInstance.continuous = true;

    // CRITICAL: Set to true to get interim results (words as they're spoken)
    recognitionInstance.interimResults = true;

    // Language setting
    recognitionInstance.lang = "en-US";

    // Maximum alternatives
    recognitionInstance.maxAlternatives = 1;

    // Event handlers
    recognitionInstance.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Update full transcript
      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
        onResult(transcriptRef.current);
      }

      if (interimTranscript) {
        // Show interim results in real-time joined with existing final transcript
        onResult(transcriptRef.current + interimTranscript);
      }
    };

    recognitionInstance.onstart = () => {
      console.log("Voice recognition started - speak now!");
    };

    recognitionInstance.onend = () => {
      console.log("Voice recognition ended");
      // Don't automatically restart - let user control it
      onEnd();
    };

    recognitionInstance.onerror = (event) => {
      console.error("Voice recognition error:", event.error);

      // Handle specific errors
      if (event.error === "no-speech") {
        console.log("No speech detected, continuing to listen...");
        // Don't end on no-speech, just continue
        return;
      }

      if (event.error === "aborted") {
        console.log("Recognition aborted");
        return;
      }

      // For other errors, end recognition
      onEnd();
    };

    recognitionRef.current = recognitionInstance;
    setRecognition(recognitionInstance);

    // Cleanup function
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.abort();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [onResult, onEnd]); // Removed fullTranscript dependency

  // Start or stop recognition based on isListening prop
  useEffect(() => {
    if (!recognition) return;

    if (isListening) {
      try {
        // Reset transcript when starting new recording
        transcriptRef.current = "";
        recognition.start();
        console.log("Voice recognition started - continuous mode");
      } catch (error) {
        // If already started, ignore the error
        if (error.message.includes("already started")) {
          console.log("Recognition already running");
        } else {
          console.error("Error starting recognition:", error);
        }
      }
    } else {
      try {
        recognition.stop();
        console.log("Voice recognition stopped");
      } catch (error) {
        // Ignore errors when stopping
        console.log("Error stopping recognition (might not be running)");
      }
    }
  }, [isListening, recognition]);

  return null; // This is a non-visual component
};

export default VoiceRecognition;
