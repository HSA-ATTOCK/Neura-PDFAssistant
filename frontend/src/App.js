import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FiUpload, FiSend, FiFile, FiLoader, FiX } from "react-icons/fi";
import { BsRobot, BsPerson, BsArrowLeft } from "react-icons/bs";
import { MdOutlineAttachFile } from "react-icons/md";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState({
    upload: false,
    question: false,
  });
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading((prev) => ({ ...prev, upload: true }));
      await axios.post("https://haidersajjad-pdf-assistant-backend.hf.space/upload", formData);
      setPdfUploaded(true);
      addMessage("PDF uploaded and ready for questions!", "system");
    } catch (err) {
      addMessage("Failed to upload PDF. Please try again.", "error");
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }));
    }
  };

  const sendQuestion = async () => {
    if (!question.trim() || loading.question) return;

    const userMessage = { type: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading((prev) => ({ ...prev, question: true }));

    try {
      const res = await axios.post("https://haidersajjad-pdf-assistant-backend.hf.space/ask", { question });
      const aiMessage = { type: "ai", text: res.data.answer };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMsg = {
        type: "ai",
        text: "Sorry, I encountered an error. Please try again later.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading((prev) => ({ ...prev, question: false }));
    }
  };

  const addMessage = (text, type = "ai") => {
    setMessages((prev) => [...prev, { type, text }]);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      addMessage("Please upload a valid PDF file", "error");
    }
  };

  const resetFile = () => {
    setFile(null);
    setPdfUploaded(false);
    setMessages([]);
    // Create a new file input element to reset it
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleNewFile = () => {
    resetFile();
  };

  return (
    <div className="app-container">
      {/* Hidden file input that's always present */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden-input"
      />

      <div className="app-header">
        <div className="logo">
          <BsRobot className="robot-icon" />
          <h1>PDF AI Assistant</h1>
        </div>
        <p className="subtitle">
          Upload a PDF and ask anything about its content
        </p>
      </div>

      <div className="main-content">
        {!pdfUploaded ? (
          <div className="upload-container">
            <div
              className="upload-area"
              onClick={() => fileInputRef.current.click()}
            >
              {file ? (
                <div className="file-preview">
                  <FiFile className="file-icon" />
                  <span>{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFile();
                    }}
                    className="clear-file"
                  >
                    <FiX />
                  </button>
                </div>
              ) : (
                <>
                  <FiUpload className="upload-icon" />
                  <p>Click to upload PDF</p>
                </>
              )}
            </div>

            {file && (
              <button
                onClick={handleUpload}
                disabled={loading.upload}
                className="upload-button"
              >
                {loading.upload ? <FiLoader className="spin" /> : "Process PDF"}
              </button>
            )}
          </div>
        ) : (
          <div className="chat-container">
            <div className="chat-header">
              <button onClick={handleNewFile} className="new-file-button">
                <BsArrowLeft /> New File
              </button>
              <div className="current-file">
                <FiFile /> {file.name}
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.type} ${
                    msg.type === "error" ? "error" : ""
                  }`}
                >
                  <div className="message-header">
                    {msg.type === "user" ? (
                      <BsPerson className="icon" />
                    ) : msg.type === "ai" ? (
                      <BsRobot className="icon" />
                    ) : (
                      <FiFile className="icon" />
                    )}
                    <span className="sender">
                      {msg.type === "user"
                        ? "You"
                        : msg.type === "ai"
                        ? "AI Assistant"
                        : "System"}
                    </span>
                  </div>
                  <div className="message-content">{msg.text}</div>
                </div>
              ))}
              {loading.question && (
                <div className="message ai thinking">
                  <div className="message-header">
                    <BsRobot className="icon" />
                    <span className="sender">AI Assistant</span>
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input">
              <div className="input-wrapper">
                <MdOutlineAttachFile
                  className="attach-icon"
                  onClick={() => fileInputRef.current.click()}
                />
                <input
                  type="text"
                  placeholder="Ask a question about your PDF..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
                  disabled={loading.question}
                />
                <button
                  onClick={sendQuestion}
                  disabled={loading.question || !question.trim()}
                  className="send-button"
                >
                  {loading.question ? (
                    <FiLoader className="spin" />
                  ) : (
                    <FiSend />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
