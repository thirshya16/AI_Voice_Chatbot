from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import uuid
from google import genai
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document
from PIL import Image
import pytesseract


# -------------------------------
# Load environment variables
# -------------------------------
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

# -------------------------------
# Initialize Gemini client
# -------------------------------
client = genai.Client(api_key=API_KEY)

available_models = [m.name for m in client.models.list()]
DEFAULT_MODEL = "models/gemini-1.5-flash-001"
model_to_use = DEFAULT_MODEL if DEFAULT_MODEL in available_models else available_models[0]

print(f"Using model: {model_to_use}")

# -------------------------------
# Flask setup
# -------------------------------
app = Flask(__name__)
app.secret_key = "super_secret_key"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# -------------------------------
# Routes
# -------------------------------
@app.route("/")
def index():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_msg = request.form.get("message")
    if not user_msg:
        return jsonify({"reply": "Please type something!"})

    try:
        response = client.models.generate_content(
            model=model_to_use,
            contents=user_msg
        )
        reply = response.text
    except Exception as e:
        reply = f"Error: {str(e)}"

    return jsonify({"reply": reply})

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if not file:
        return jsonify({"status": "error", "message": "No file uploaded"})

    filepath = os.path.join("uploads", file.filename)
    file.save(filepath)

    ext = file.filename.split('.')[-1].lower()
    text = ""

    try:
        if ext == "pdf":
            reader = PdfReader(filepath)
            for page in reader.pages:
                text += page.extract_text()
        elif ext in ["txt", "py", "html", "css", "js", "json"]:
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read()
        elif ext == "docx":
            doc = Document(filepath)
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif ext == "csv":
            df = pd.read_csv(filepath)
            text = df.to_string()
        elif ext in ["xlsx", "xls"]:
            df = pd.read_excel(filepath)
            text = df.to_string()
        elif ext in ["png", "jpg", "jpeg"]:
            img = Image.open(filepath)
            text = pytesseract.image_to_string(img)
        else:
            text = "Unsupported file type, but file received."

        session['file_text'] = text
        return jsonify({"status": "success"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        # Add your verification logic here
        if username == "test" and password == "123":
            session["username"] = username
            return redirect(url_for("index"))
        else:
            return render_template("login.html", error="Invalid credentials")
    return render_template("login.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        session["username"] = username
        return redirect(url_for("index"))
    return render_template("signup.html")


@app.route('/get_history')
def get_history():
    return jsonify(session.get('history', []))

@app.route('/clear_history')
def clear_history():
    session['history'] = []
    return "", 204

@app.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("login"))

# -------------------------------
# Run Flask app
# -------------------------------
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
