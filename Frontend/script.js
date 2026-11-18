
/* ==========================================
   J.A.R.V.I.S - AI BRAIN
   Gemini API + Voice + Chat
========================================== */


/* 1. API CONFIGURATION */

// IMPORTANT:
// This browser-based version is for testing only.
// Never publish your API key in GitHub source code.

let API_KEY = localStorage.getItem("jarvis_key");

function getApiKey() {
    if (!API_KEY) {
        API_KEY = prompt("Enter your Gemini API Key:");

        if (API_KEY) {
            API_KEY = API_KEY.trim();
            localStorage.setItem("jarvis_key", API_KEY);
        }
    }

    if (!API_KEY) {
        throw new Error("Gemini API key is missing.");
    }

    return API_KEY;
}


/* 2. GEMINI MODELS */

const MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash"
];


/* 3. HTML ELEMENTS */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");


/* 4. CHECK HTML ELEMENTS */

if (!chat || !input || !sendBtn) {
    console.error(
        "J.A.R.V.I.S ERROR: Check HTML IDs: chat, msg, send"
    );
}


/* 5. ADD CHAT MESSAGES */

function add(message, type = "ai") {

    if (!chat) return null;

    const div = document.createElement("div");

    div.className = "msg " + type;
    div.textContent = message;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

    return div;
}


/* 6. GEMINI AI CONNECTION */

async function callGemini(promptText) {

    const key = getApiKey();

    let lastError;

    for (const model of MODELS) {

        try {

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        systemInstruction: {
                            parts: [{
                                text: "You are J.A.R.V.I.S., a helpful, intelligent and polite AI assistant. Give clear and concise answers."
                            }]
                        },

                        contents: [{
                            role: "user",
                            parts: [{
                                text: promptText
                            }]
                        }],

                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2048
                        }

                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                const errorMessage =
                    data.error?.message ||
                    `HTTP Error ${response.status}`;

                lastError = new Error(errorMessage);

                // Try another model only for model availability errors.
                if (
                    response.status === 404 ||
                    /unavailable|high demand|temporar/i.test(errorMessage)
                ) {
                    continue;
                }

                throw lastError;
            }

            const answer = data.candidates?.[0]
                ?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

            if (!answer) {
                throw new Error(
                    "Gemini returned an empty response."
                );
            }

            return answer;

        } catch (error) {

            lastError = error;

            // Network failures can try the next model.
            if (error instanceof TypeError) {
                continue;
            }

            if (error.message) {
                throw error;
            }
        }
    }

    throw lastError ||
        new Error("All Gemini models failed.");
}


/* 7. ASK J.A.R.V.I.S */

async function askGemini(promptText) {

    if (!promptText.trim()) return;

    const thinking = add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    if (sendBtn) sendBtn.disabled = true;

    if (micBtn) micBtn.disabled = true;

    try {

        const reply = await callGemini(promptText);

        if (thinking) {
            thinking.textContent =
                "J.A.R.V.I.S: " + reply;
        }

        speak(reply);

    } catch (error) {

        console.error("Gemini Error:", error);

        if (thinking) {
            thinking.textContent =
                "J.A.R.V.I.S ERROR: " + error.message;
        }

    } finally {

        if (sendBtn) sendBtn.disabled = false;

        if (micBtn) micBtn.disabled = false;

        if (chat) {
            chat.scrollTop = chat.scrollHeight;
        }
    }
}


/* 8. SEND BUTTON */

if (sendBtn) {

    sendBtn.addEventListener("click", () => {

        const message = input.value.trim();

        if (!message) return;

        add("YOU: " + message, "user");

        input.value = "";

        askGemini(message);

    });

}


/* 9. ENTER KEY SUPPORT */

if (input) {

    input.addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            if (sendBtn) {
                sendBtn.click();
            }
        }

    });

}


/* 10. SPEECH RECOGNITION */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onstart = () => {

        if (micBtn) {
            micBtn.textContent = "LISTENING...";
            micBtn.disabled = true;
        }

    };

    recognition.onresult = (event) => {

        const transcript =
            event.results[0][0].transcript.trim();

        if (!transcript) return;

        add("YOU: " + transcript, "user");

        askGemini(transcript);

    };

    recognition.onerror = (event) => {

        console.error("Microphone Error:", event.error);

        add(
            "Microphone error: " + event.error,
            "ai"
        );

    };

    recognition.onend = () => {

        if (micBtn) {
            micBtn.textContent = "🎙";
            micBtn.disabled = false;
        }

    };

} else {

    console.warn(
        "Speech recognition is not supported in this browser."
    );

    if (micBtn) {
        micBtn.disabled = true;
        micBtn.title = "Speech recognition not supported";
    }
}


/* 11. MICROPHONE BUTTON */

if (micBtn && recognition) {

    micBtn.addEventListener("click", () => {

        try {

            recognition.start();

        } catch (error) {

            console.error(
                "Microphone could not start:",
                error
            );

        }

    });

}


/* 12. TEXT TO SPEECH */

let voices = [];

function loadVoices() {

    if (!("speechSynthesis" in window)) return;

    voices = speechSynthesis.getVoices();

}

if ("speechSynthesis" in window) {

    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;

}

function speak(text) {

    if (!("speechSynthesis" in window)) {
        console.warn("Text-to-speech is unavailable.");
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;

    utterance.pitch = 0.85;

    utterance.volume = 1;

    const voice = voices.find(
        v => v.lang.toLowerCase().startsWith("en")
    );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);

}


/* 13. J.A.R.V.I.S INITIALIZATION */

console.log(
    "J.A.R.V.I.S SYSTEM INITIALIZED"
);

console.log(
    "AI CORE: READY"
);

console.log(
    "NETWORK: READY"
);
