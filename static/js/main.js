document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chat-container");
    const input = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const cameraBtn = document.getElementById("cameraBtn");
    const cameraStream = document.getElementById("cameraStream");
    const captureBtn = document.getElementById("captureBtn");
    const canvas = document.getElementById("canvas");
    const voiceBtn = document.getElementById("voiceBtn");

    // Chat history
    let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

    function addMessage(text, className, allowActions=true) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${className}`;
        msgDiv.innerText = text;

        if (allowActions && className === "bot-msg") {
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "actions";

            const copyBtn = document.createElement("button");
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = "Copy";
            copyBtn.onclick = () => navigator.clipboard.writeText(text);

            const editBtn = document.createElement("button");
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = "Edit";
            editBtn.onclick = () => input.value = text;

            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(editBtn);
            msgDiv.appendChild(actionsDiv);
        }

        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Save to localStorage
        chatHistory.push({ text, type: className, allowActions });
        localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    }

    function renderChat(messages) {
        chatBox.innerHTML = "";
        messages.forEach(msg => addMessage(msg.text, msg.type, msg.allowActions));
    }

    // Load saved history
    if (chatHistory.length > 0) renderChat(chatHistory);

    // Send message
    sendBtn.addEventListener("click", () => {
        const message = input.value.trim();
        if (!message) return;
        addMessage(message, "user-msg");
        input.value = "";

        fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `message=${encodeURIComponent(message)}`
        })
        .then(res => res.json())
        .then(data => addMessage(data.reply, "bot-msg"));
    });

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendBtn.click();
    });

    // New Chat
    document.querySelector(".newchat-btn").addEventListener("click", () => {
        chatBox.innerHTML = "";
        chatHistory = [];
        localStorage.removeItem("chatHistory");
    });

    // History
    document.querySelector(".history-btn").addEventListener("click", () => {
        if (chatHistory.length === 0) alert("No past chats available.");
        else renderChat(chatHistory);
    });

    // Voice input
    voiceBtn.addEventListener("click", () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Use Chrome for voice recognition."); return; }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => addMessage("🎤 Listening...", "bot-msg", false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            sendBtn.click();
        };

        recognition.onerror = (event) => alert("Voice error: " + event.error);
        recognition.start();
    });

    // Logout functionality
const logoutBtn = document.querySelector(".logout-btn");
logoutBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent default #
    window.location.href = "/logout"; // Redirect to Flask logout route
});


    // Camera capture
    if (cameraBtn && cameraStream && captureBtn && canvas) {
        cameraBtn.addEventListener("click", async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraStream.srcObject = stream;
                cameraStream.style.display = "block";
                captureBtn.style.display = "block";
            } catch (err) {
                alert("Cannot access camera: " + err);
            }
        });

        captureBtn.addEventListener("click", () => {
            canvas.width = cameraStream.videoWidth;
            canvas.height = cameraStream.videoHeight;
            canvas.getContext("2d").drawImage(cameraStream, 0, 0);

            canvas.toBlob(blob => {
                const formData = new FormData();
                formData.append("file", blob, "camera.png");

                fetch("/upload", { method: "POST", body: formData })
                    .then(res => res.json())
                    .then(() => addMessage("📷 Image captured and uploaded", "user-msg", false));
            });

            cameraStream.srcObject.getTracks().forEach(t => t.stop());
            cameraStream.style.display = "none";
            captureBtn.style.display = "none";
        });
    }
});
