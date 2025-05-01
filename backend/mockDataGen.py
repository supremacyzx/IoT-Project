import random
import time
import threading
import os
import json
import sqlite3
from datetime import datetime


DB_PATH = os.getenv('DB_PATH', 'local.db')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, DB_PATH)
clients = None


def _insert_into_db(data):
        try:
            conn = sqlite3.connect(DATABASE)
            cur = conn.cursor()
            timestamp = datetime.now()
            print(f"Inserting data at {timestamp}")
            cur.execute("INSERT INTO dashboard_data (timestamp, value) VALUES (?, ?)",
                        (timestamp, json.dumps(data)))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Database insertion error: {e}")

def generate_mock_data():
    return {
        'tmp': round(random.uniform(20.0, 30.0), 2),
        'lf': round(random.uniform(20.0, 60.0), 2),
        'locked': random.choice([True, False]),
    }

def send_to_clients():
    while True:
        time.sleep(10)
        if clients is None:
            continue
        data = generate_mock_data()
        _insert_into_db(data)
        for ws in clients[:]:
            try:
                ws.send(data)
            except:
                clients.remove(ws)

def start_mock_sender(shared_clients):
    global clients
    clients = shared_clients
    thread = threading.Thread(target=send_to_clients, daemon=True)
    thread.start()
