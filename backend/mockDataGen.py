import random
import time
import threading

clients = None

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
        message = f"Mock data: {data}"
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
