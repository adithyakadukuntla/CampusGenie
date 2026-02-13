import React, { useState, useRef, useEffect } from "react";
import "./chatbot.css";
import axios from "axios";
import { RiRobot2Fill } from "react-icons/ri";
import { FaMicrophone, FaRegStopCircle } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { ImCross } from "react-icons/im";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { FiMaximize, FiMinimize } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VoiceRecognition from "../voicerecognition/VoiceRecognition";
import useTextToSpeech from "../voicerecognition/useTextToSpeech";
import chatCache from "../../utils/chatCache";
// import Campus3DMap from "./Campus3DMap";
import CampusMap from "./CampusMap";
const API_URL = process.env.REACT_APP_BE_URL || "http://localhost:6230";
console.log("Chatbot API URL:", API_URL || "Using relative path (same server)");
// Initial suggested questions
const INITIAL_SUGGESTIONS = [
  "What are the BTech CSE placements?",
  "Show me BTech AI&DS syllabus",
  "What are the fees for BTech?",
  "Tell me about ECE department",
  "How to reach KS Auditorium?",
  "What is the NIRF ranking?",
];

// Context-aware follow-up suggestions based on collection
const FOLLOW_UP_SUGGESTIONS = {
  placements: [
    "Which companies visit for placements?",
    "What is the average package?",
    "Show placement statistics by department",
  ],
  syllabus: [
    "What subjects are in 1st year?",
    "Show me lab subjects",
    "What is the exam pattern?",
  ],
  fees: [
    "Are there any scholarships available?",
    "What are the hostel fees?",
    "Is there an installment option?",
  ],
  departments: [
    "What is the intake for this department?",
    "Show me the faculty list",
    "What specializations are available?",
  ],
  campus_navigation: [
    "Where is the library?",
    "How to reach the canteen?",
    "Show me all blocks",
  ],
  rankings: [
    "What is the NIRF rank trend?",
    "How does it compare to other colleges?",
    "What are the department-wise rankings?",
  ],
  admissions: [
    "What is the cutoff for CSE?",
    "How to apply for admission?",
    "What entrance exams are accepted?",
  ],
  faculty: [
    "Who is the HOD?",
    "Show me faculty qualifications",
    "What are the research areas?",
  ],
  general: [
    "Tell me about campus facilities",
    "What clubs are available?",
    "Show me the college history",
  ],
};

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { type: "incoming", content: "Hi 👋\nHow can I help you today?" },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [showChatbot, setShowChatbot] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] =
    useState(INITIAL_SUGGESTIONS);
  const [elapsedTime, setElapsedTime] = useState(0); // Timer state

  const chatboxRef = useRef(null);
  const textareaRef = useRef(null);

  // Text-to-speech hook
  const {
    speak,
    stop,
    toggle: toggleVoice,
    isSpeaking,
    isEnabled: isVoiceEnabled,
    isSupported,
  } = useTextToSpeech();

  useEffect(() => {
    if (chatboxRef.current)
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
  }, [messages, isLoading, elapsedTime]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [inputMessage]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (isLoading) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 0.1);
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage;
    if (isLoading || !textToSend.trim()) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { type: "outgoing", content: textToSend }]);
    setInputMessage("");

    const startTime = performance.now();

    // Check frontend cache first
    const cachedResponse = chatCache.get(textToSend);
    if (cachedResponse) {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      setMessages((prev) => [
        ...prev,
        {
          type: "incoming",
          content: cachedResponse.answer,
          navigation: cachedResponse.navigation,
          responseTime: duration,
        },
      ]);

      // Speak cached response if voice is enabled
      if (isVoiceEnabled && cachedResponse.answer) {
        speak(cachedResponse.answer);
      }

      // Update suggestions based on cached collection
      if (
        cachedResponse.collection &&
        FOLLOW_UP_SUGGESTIONS[cachedResponse.collection]
      ) {
        setCurrentSuggestions(FOLLOW_UP_SUGGESTIONS[cachedResponse.collection]);
      } else {
        setCurrentSuggestions(FOLLOW_UP_SUGGESTIONS.general);
      }

      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/query`, { query: textToSend });

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // Cache the response
      chatCache.set(textToSend, res.data);

      // Update messages with the response
      setMessages((prev) => [
        ...prev,
        {
          type: "incoming",
          content: res.data.answer,
          navigation: res.data.navigation,
          responseTime: duration,
        },
      ]);

      // Speak the response if voice is enabled
      if (isVoiceEnabled && res.data.answer) {
        speak(res.data.answer);
      }

      // Update suggestions based on the collection returned
      if (res.data.collection && FOLLOW_UP_SUGGESTIONS[res.data.collection]) {
        setCurrentSuggestions(FOLLOW_UP_SUGGESTIONS[res.data.collection]);
      } else {
        // Fallback to general suggestions if collection not recognized
        setCurrentSuggestions(FOLLOW_UP_SUGGESTIONS.general);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          type: "incoming",
          content: "Something went wrong!! Please try again later....",
        },
      ]);
      // Keep current suggestions on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceRecognition = () => {
    setIsListening(!isListening);
  };

  const handleSuggestionClick = (question) => {
    sendMessage(question);
  };

  const handleVoiceToggle = () => {
    toggleVoice();
    if (isSpeaking) {
      stop();
    }
  };

  // Show suggestions if it's the initial state OR after bot responds
  const shouldShowSuggestions =
    !isLoading &&
    (messages.length === 1 ||
      (messages.length > 1 &&
        messages[messages.length - 1].type === "incoming"));

  // Voice recognition handlers wrapped in useCallback to prevent re-initialization loop
  const handleVoiceResult = React.useCallback((text) => {
    setInputMessage(text);
  }, []);

  const handleVoiceEnd = React.useCallback(() => {
    setIsListening(false);
  }, []);

  return (
    <div className="cc">
      {isListening && (
        <VoiceRecognition
          onResult={handleVoiceResult}
          onEnd={handleVoiceEnd}
          isListening={isListening}
        />
      )}

      <button
        className={`chatbot-toggler ${showChatbot && isMaximized ? "hidden" : ""}`}
        onClick={() => setShowChatbot(!showChatbot)}
      >
        <RiRobot2Fill />
      </button>

      <div
        className={`chatbot ${showChatbot ? "show" : ""} ${isMaximized ? "maximized" : ""}`}
      >
        <header>
          <div className="header-left">
            <h2>CampusGenie AI</h2>
            <a
              href="https://forms.gle/hp8jhXmD2GGqZ4RBA"
              target="_blank"
              rel="noopener noreferrer"
              className="feedback-link"
            >
              Report Question
            </a>
          </div>
          <div className="header-actions">
            {isSupported && (
              <button
                className={`voice-toggle ${isVoiceEnabled ? "active" : ""}`}
                onClick={handleVoiceToggle}
                title={
                  isVoiceEnabled
                    ? "Disable voice output"
                    : "Enable voice output"
                }
              >
                {isVoiceEnabled ? <HiSpeakerWave /> : <HiSpeakerXMark />}
              </button>
            )}
            <button
              className="maximize-toggle"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Minimize window" : "Maximize window"}
            >
              {isMaximized ? <FiMinimize /> : <FiMaximize />}
            </button>
            <span onClick={() => setShowChatbot(false)}>
              <ImCross />
            </span>
          </div>
        </header>

        <div className="chatbox" ref={chatboxRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.type}`}>
              {msg.type === "incoming" && (
                <div className="bot-avatar">
                  <RiRobot2Fill />
                </div>
              )}
              <div className="message-bubble">
                {msg.responseTime && (
                  <div className="message-header">
                    <span className="time-badge">⏱️ {msg.responseTime}s</span>
                  </div>
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p style={{ marginBottom: "0.5em", lineHeight: "1.6" }}>
                        {children}
                      </p>
                    ),
                    ol: ({ children }) => (
                      <ol
                        style={{ marginLeft: "1.2em", marginBottom: "0.5em" }}
                      >
                        {children}
                      </ol>
                    ),
                    ul: ({ children }) => (
                      <ul
                        style={{ marginLeft: "1.2em", marginBottom: "0.5em" }}
                      >
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => (
                      <li style={{ marginBottom: "0.3em" }}>{children}</li>
                    ),
                  }}
                >
                  {msg.content.replace(/\\n/g, "  \\n")}
                </ReactMarkdown>

                {/* {msg.navigation && <Campus3DMap navigation={msg.navigation} />} */}
                {msg.navigation && <CampusMap navigation={msg.navigation} />}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="message-row incoming">
              <div className="bot-avatar">
                <RiRobot2Fill />
              </div>
              <div className="message-bubble typing">
                Typing... ({elapsedTime.toFixed(1)}s)
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {shouldShowSuggestions && (
            <div className="suggestions-container">
              <p className="suggestions-title">
                {messages.length === 1
                  ? "Try asking:"
                  : "You might also want to know:"}
              </p>
              <div className="suggestions-grid">
                {currentSuggestions.map((question, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unified Input Bar */}
        <div
          style={{ display: "flex", gap: "10px", padding: "0 15px 10px 15px" }}
        ></div>
        <div className="input-bar">
          <button
            onClick={toggleVoiceRecognition}
            className={isListening ? "recording" : ""}
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? <FaRegStopCircle /> : <FaMicrophone />}
          </button>

          <textarea
            ref={textareaRef}
            value={inputMessage}
            placeholder="For better results, mention: BTech/MTech, Department (CSE, ECE, AI&DS, etc.)"
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <button
            onClick={() => sendMessage()}
            title="Send message"
            disabled={isLoading || !inputMessage.trim()}
          >
            <IoSend />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
