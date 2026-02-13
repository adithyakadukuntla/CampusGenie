import { useEffect, useRef, useState } from 'react';

/**
 * TextToSpeech Component
 * Handles converting text responses to speech using Web Speech API
 */
const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      console.error("Text-to-speech not supported in this browser");
    }

    // Cleanup on unmount
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speak = (text) => {
    if (!synthRef.current || !isEnabled) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    // Remove markdown formatting and improve text for speech
    const cleanText = text
      .replace(/[#*_~`]/g, '') // Remove markdown symbols
      .replace(/\n+/g, '. ') // Replace newlines with pauses
      .replace(/\s+/g, ' ') // Normalize whitespace
      // Fix currency amounts (e.g., ₹1,50,000 or 1,50,000)
      .replace(/₹?\s*(\d{1,3}),(\d{2}),(\d{3})/g, (match, lakh, thousand, hundred) => {
        const amount = parseInt(lakh) * 100000 + parseInt(thousand) * 1000 + parseInt(hundred);
        if (amount >= 100000) {
          const lakhs = Math.floor(amount / 100000);
          const remaining = amount % 100000;
          if (remaining === 0) {
            return `${lakhs} lakh rupees`;
          } else {
            const thousands = Math.floor(remaining / 1000);
            return `${lakhs} lakh ${thousands} thousand rupees`;
          }
        }
        return `${Math.floor(amount / 1000)} thousand rupees`;
      })
      // Fix simple thousands (e.g., 50,000)
      .replace(/₹?\s*(\d+),(\d{3})\b/g, (match, thousands, hundreds) => {
        return `${thousands} thousand ${hundreds} rupees`;
      })
      // Fix common abbreviations for better pronunciation
      .replace(/\bBTech\b/gi, 'Bachelor of Technology')
      .replace(/\bB\.Tech\b/gi, 'Bachelor of Technology')
      .replace(/\bMTech\b/gi, 'Master of Technology')
      .replace(/\bM\.Tech\b/gi, 'Master of Technology')
      .replace(/\bNIRF\b/g, 'N I R F')
      .replace(/\bVNRVJIET\b/g, 'V N R V J I E T')
      .replace(/\bVNR\b/g, 'V N R')
      .trim();

    if (!cleanText) return;

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice settings for better clarity
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.1; // Slightly higher pitch for female-like voice
    utterance.volume = 1.0; // Full volume
    utterance.lang = 'en-US'; // Language

    // Wait for voices to load and select the best female voice
    const setVoice = () => {
      const voices = synthRef.current.getVoices();
      
      // Priority order for female voices
      const preferredVoices = [
        'Google US English Female',
        'Microsoft Zira - English (United States)',
        'Samantha',
        'Victoria',
        'Karen',
        'Moira',
        'Tessa',
        'Fiona'
      ];

      // Try to find a preferred female voice
      let selectedVoice = null;
      for (const preferred of preferredVoices) {
        selectedVoice = voices.find(voice => voice.name.includes(preferred));
        if (selectedVoice) break;
      }

      // Fallback: any female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('woman'))
        );
      }

      // Fallback: any en-US voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'en-US');
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("Using voice:", selectedVoice.name);
      }
    };

    // Set voice immediately if available
    if (synthRef.current.getVoices().length > 0) {
      setVoice();
    } else {
      // Wait for voices to load
      synthRef.current.onvoiceschanged = setVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log("Started speaking");
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log("Finished speaking");
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error("Speech error:", event.error);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const stop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggle = () => {
    setIsEnabled(!isEnabled);
    if (isSpeaking) {
      stop();
    }
  };

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isEnabled,
    isSupported: !!synthRef.current
  };
};

export default useTextToSpeech;
