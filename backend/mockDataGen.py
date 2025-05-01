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
            
            # Ausführlicheres Logging der Datenbank-Schreibvorgänge
            print(f"[DB WRITE] {timestamp} - Inserting data: {json.dumps(data)}")
            print(f"[DB WRITE] Database path: {DATABASE}")
            
            cur.execute("INSERT INTO dashboard_data (timestamp, value) VALUES (?, ?)",
                        (timestamp, json.dumps(data)))
            conn.commit()
            
            # Log nach erfolgreichem Commit
            print(f"[DB WRITE] Successfully committed data with ID: {cur.lastrowid}")
            
            conn.close()
        except Exception as e:
            print(f"[DB ERROR] Database insertion error: {e}")

# Global variables to keep state between function calls
current_tmp = random.uniform(22.0, 25.0)
current_lf = random.uniform(40.0, 50.0)

def generate_mock_data():
    global current_tmp, current_lf

    # Introduce realistic drift with occasional jumps
    tmp_change = random.uniform(-0.3, 0.3)
    lf_change = random.uniform(-1.0, 1.0)

    # 10% chance to simulate a sudden environmental shift
    if random.random() < 0.1:
        tmp_change += random.uniform(-2.0, 2.0)
        lf_change += random.uniform(-5.0, 5.0)

    # Apply the change and clamp values to a realistic range
    current_tmp = min(max(current_tmp + tmp_change, 15.0), 35.0)
    current_lf = min(max(current_lf + lf_change, 10.0), 90.0)

    data = {
        'tmp': round(current_tmp, 2),
        'lf': round(current_lf, 2),
        'locked': random.choice([True, False]),
    }

    _insert_into_db(data)
    print(f"[MOCK DATA] Generated and stored: {data}")

    return data


def send_to_clients():
    while True:
        time.sleep(0.5)  # Sleep for 0.5 seconds to avoid overwhelming the clients
        if clients is None:
            continue
        data = generate_mock_data()
        message = json.dumps(data)  # Konvertiere Daten in JSON-Format
        
        # Logging der Client-Übertragungen
        client_count = len(clients)
        print(f"[WEBSOCKET] Sending to {client_count} client(s): {message}")
        
        for i, ws in enumerate(clients[:]):
            try:
                ws.send(message)
                print(f"[WEBSOCKET] Successfully sent to client #{i+1}")
            except Exception as e:
                print(f"[WEBSOCKET ERROR] Failed to send to client #{i+1}: {e}")
                clients.remove(ws)

def start_mock_sender(shared_clients):
    global clients
    clients = shared_clients
    print(f"[MOCK SENDER] Starting mock data sender thread with {len(shared_clients) if shared_clients else 0} client(s)")
    thread = threading.Thread(target=send_to_clients, daemon=True)
    thread.start()
