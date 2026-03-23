# truthlens-fake-news-quiz
TruthLens is a full-stack digital literacy web application that gamifies the process of identifying misinformation. Players are presented with 10 carefully researched headlines and must decide whether each one is Real or Fake.
The app provides:
✅ Instant feedback with detailed explanations
📊 Live score tracking and progress bar
🏆 Leaderboard to compete with others
🧠 Tips to improve critical thinking skills
🗂️ Repository Structure
digital-literacy-quiz/
│
├── README.md                          ← You are here
│
├── frontend/
│   ├── index.html                     ← Main app (4 screens)
│   ├── style.css                      ← Editorial newspaper design
│   ├── config.js                      ← API base URL setting
│   └── script.js                      ← Game logic + API calls
│
├── backend/
│   ├── app.py                         ← Flask REST API
│   ├── questions.py                   ← 12 real/fake headlines
│   ├── score_tracker.py               ← Leaderboard & statistics
   └── requirements.txt

   ⚙️ How to Run
Step 1 — Install Dependencies
pip install flask flask-cors
Step 2 — Start the Backend
cd backend
python app.py
Backend runs at: http://localhost:5000
Step 3 — Open the Frontend
cd frontend
# Open index.html in your browser
# OR right-click → Open with Live Server (VS Code)
⚠️ Make sure the backend is running before opening the frontend.
