from flask import Flask, render_template, request, redirect, url_for, session
from flask_login import LoginManager, login_user, login_required, logout_user, UserMixin
import threading
import time
import sqlite3
from mqtt_handler import mqtt_client, get_display_data
import json
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# App Configuration from .env
SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'your_secret_key')
FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
CORS_ORIGINS = os.getenv('FLASK_CORS_ORIGINS', '*')
DASHBOARD_DATA_LIMIT = int(os.getenv('DASHBOARD_DATA_LIMIT', 50))
DB_SAVE_INTERVAL = int(os.getenv('DB_SAVE_INTERVAL', 10))  # seconds

# Database setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv('DB_PATH', 'local.db')
DATABASE = os.path.join(BASE_DIR, DB_PATH)

app = Flask(__name__)
app.secret_key = SECRET_KEY

# --- MySQL CONFIG (commented out) ---
# from flask_mysqldb import MySQL
# app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
# app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'root')
# app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', 'your_password')
# app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'your_database')
# mysql = MySQL(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})

# Initialize the SocketIO object with CORS support
socketio = SocketIO(app, cors_allowed_origins=CORS_ORIGINS)

class User(UserMixin):
    def __init__(self, id, username):
        self.id = id
        self.username = username

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()
    conn.close()
    if user:
        return User(user['id'], user['username'])
    return None

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, username, password FROM users WHERE username = ?", (username,))
        user = cur.fetchone()
        conn.close()
        if user and user['password'] == password:
            login_user(User(user['id'], user['username']))
            return redirect(url_for('dashboard'))
        return 'Invalid Credentials'
    return render_template('login.html')

@socketio.on('connect')
def handle_connect():
    # Send the latest data to the client when it connects
    emit('mqtt_data', mqtt_client.latest_data)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()
    cur.execute(f"SELECT timestamp, value FROM dashboard_data ORDER BY id DESC LIMIT {DASHBOARD_DATA_LIMIT}")
    rows = cur.fetchall()
    conn.close()

    # Parse JSON and extract values
    timestamps = []
    tmp_values = []
    lf_values = []

    for row in reversed(rows):
        timestamps.append(row[0])
        try:
            data = json.loads(row[1])
            tmp_values.append(data.get("tmp"))
            lf_values.append(data.get("lf"))
        except json.JSONDecodeError:
            tmp_values.append(None)
            lf_values.append(None)

    return render_template(
        'dashboard.html',
        labels=timestamps,
        tmp_data=tmp_values,
        lf_data=lf_values
    )

def periodic_db_saver():
    while True:
        try:
            mqtt_client.save_to_db()
        except Exception as e:
            print(f"Error in periodic DB saver: {e}")
        time.sleep(DB_SAVE_INTERVAL)

if __name__ == '__main__':
    # Connect the MQTT client to socketio
    mqtt_client.socketio = socketio

    # Start the MQTT client
    mqtt_client.start()
    
    # Start the periodic DB saver thread
    threading.Thread(target=periodic_db_saver, daemon=True).start()
    
    # Run Flask app with socketio
    socketio.run(app, host=FLASK_HOST, debug=FLASK_DEBUG)