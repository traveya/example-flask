from flask import Flask, flash, redirect, render_template, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash
from cs50 import SQL
import random
import secrets

# Configure App 
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
db = SQL("sqlite:///campusguessr.db")

# Prevent Browser Caching
@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

@app.route('/')
def home():

    # Get Each Unique Player's High Score
    results = db.execute("SELECT username, MAX(score) as max_score FROM leaderboard GROUP BY username")
    sortedScores = sorted(results, key=lambda x: x['max_score'], reverse=True)

    # Render Page
    return render_template("home.html", scores=sortedScores)

# Game Player
@app.route('/play', methods=["GET"])
def play():

    # List of All Photos in the Database
    numPhotos = db.execute("SELECT COUNT(*) FROM photos")[0]['COUNT(*)']
    numbers = list(range(1, numPhotos + 1))

    # Randomly Shuffle Photos
    random.shuffle(numbers)
    selectedPhotos = numbers

    # Initialize Variables
    photosPerGame = 5
    data = []

    # Get Images
    for i in range(photosPerGame):
        selectedPhoto = selectedPhotos[i + 1]
        photo_data = db.execute("SELECT latitude, longitude FROM photos WHERE filename = :filename", filename=f"{selectedPhoto}.jpg")
        if photo_data:
            realLat = photo_data[0]['latitude']
            realLng = photo_data[0]['longitude']
            data.append({'realLat' : realLat, 'realLng' : realLng, 'selectedPhoto' : selectedPhoto})

    # Render Page
    firstPhoto = data[0]['selectedPhoto']
    return render_template("play.html", selected_photo=firstPhoto, data=data, photosPerGame=photosPerGame)

# Register
@app.route('/register', methods=["GET", "POST"])
def register():
    if request.method == "POST":

        # Get and Validate Username
        username = request.form.get("username")
        if not username:
            error = "You must enter a username!"
            return render_template("register.html", error=error)
        if db.execute(
            "SELECT * FROM users WHERE username = :username", username=username
        ):
            error = "Username taken!"
            return render_template("register.html", error=error)

        # Get Password
        password = request.form.get("password")
        if not password:
            error = "You must enter a password!"
            return render_template("register.html", error=error)

        # Confirm Password
        if password != request.form.get("confirmation"):
            error = "Passwords do not match!"
            return render_template("register.html", error=error)

        # Registration Passes All Checks, Register User
        else:
            hashed_password = generate_password_hash(password)
            db.execute(
                "INSERT INTO users (username, hash) VALUES (:username, :password)",
                username=username,
                password=hashed_password,
            )
            return render_template("login.html")

    # Else : GET Method, Render Page
    else:
        return render_template("register.html")

# Login
@app.route('/login', methods=["GET", "POST"])
def login():
    session.clear()
    if request.method == "POST":

        # Check for Username
        if not request.form.get("username"):
            error = "You must enter a username!"
            return render_template("login.html", error=error)

        # Check for Password
        elif not request.form.get("password"):
            error = "You must enter a password!"
            return render_template("login.html", error=error)

        # Validate Username and Password
        rows = db.execute(
            "SELECT * FROM users WHERE username = ?", request.form.get("username")
        )
        if len(rows) != 1 or not check_password_hash(
            rows[0]["hash"], request.form.get("password")
        ):
            error = "Username and password do not match!"
            return render_template("login.html", error=error)
        session["user_id"] = rows[0]["id"]
        return redirect("/")

    # Else : GET Method, Render Page
    else:
        return render_template("login.html")

# Logout
@app.route("/logout")
def logout():

    # Clear Session
    session.clear()
    return redirect("/")

# Upload
@app.route("/upload", methods=['POST'])
def upload():
    try:
        # Gather Score and Username
        data = request.get_json()
        score = data['score']
        username  = db.execute("SELECT username FROM users WHERE id = ?", session["user_id"])[0]['username']

        # Database Insert
        db.execute("INSERT INTO leaderboard (username, score) VALUES (?, ?)", username, score)
        return jsonify({'success': True, 'message': 'Score received successfully'})

    # Error Debugging
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
