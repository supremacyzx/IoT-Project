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

def generate_mock_data():
    data = {
        'tmp': round(random.uniform(20.0, 30.0), 2),
        'lf': round(random.uniform(20.0, 60.0), 2),
        'locked': random.choice([True, False]),
    }
    
    # Speichere die generierten Daten in der Datenbank
    _insert_into_db(data)
    print(f"[MOCK DATA] Generated and stored: {data}")
    
    return data

def send_to_clients():
    while True:
        time.sleep(10)
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
