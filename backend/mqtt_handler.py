import paho.mqtt.client as mqtt
from datetime import datetime
import sqlite3
import os
import json
import time
import dotenv
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from .env file
MQTT_BROKER = os.getenv('MQTT_BROKER', '10.93.140.165')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1884))
MQTT_USER = os.getenv('MQTT_USER', 'grp5')
MQTT_PASS = os.getenv('MQTT_PASS', "grp5123!")
MQTT_KEEPALIVE = int(os.getenv('MQTT_KEEPALIVE', 60))
MQTT_TOPIC_DATA = os.getenv('MQTT_TOPIC_DATA', 'RZ/data')
MQTT_TOPIC_INCIDENTS = os.getenv('MQTT_TOPIC_INCIDENTS', 'RZ/incidents')
MQTT_TOPIC_CONFIG = os.getenv('MQTT_TOPIC_CONFIG', 'RZ/config')
DB_PATH = os.getenv('DB_PATH', 'local.db')
DB_INSERT_INTERVAL = int(os.getenv('DB_INSERT_INTERVAL', 30))  # seconds

# Database setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, DB_PATH)


class MQTTClient:
    def __init__(self, socketio=None):
        self.configData = ""
        self.display_data = []
        self.hidden_data = []
        self.client = mqtt.Client()
        self.client.username_pw_set(MQTT_USER, MQTT_PASS)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.socketio = socketio  # Store the socketio instance
        self.lastData = None
        self.ws_bridge = None
        self.latest_data = {
            "tmp": None,
            "lf": None,
            "last_insert": 0
        }

    def on_connect(self, client, userdata, flags, rc):
        client.subscribe(MQTT_TOPIC_DATA)
        client.subscribe(MQTT_TOPIC_INCIDENTS)
        client.subscribe(MQTT_TOPIC_CONFIG)

    def send_message(self, topic, msg):
        try:
            result = self.client.publish(topic, msg, qos=0, retain=False)
            result.wait_for_publish()
            print("Sent msg: " + msg + " to " + topic)
            return True
        except Exception as e:
            return False
        

    def on_message(self, client, userdata, msg):
        if msg.topic == MQTT_TOPIC_DATA:
            try:
                data = json.loads(msg.payload.decode())
                data_updated = False
                if data != self.lastData:
                    self._insert_into_db(data) #only insert if data is different
                    print(f"Received data: {data}")

                if "tmp" in data:
                    self.latest_data["tmp"] = data["tmp"]
                    data_updated = True
                if "lf" in data:
                    self.latest_data["lf"] = data["lf"]
                    data_updated = True
                if "locked" in data:
                    self.latest_data["locked"] = data["locked"]
                    data_updated = True
                
                # Emit the updated data to all connected clients
                if data_updated:
                     if hasattr(self, 'ws_bridge') and self.ws_bridge is not None:
                        self.ws_bridge.broadcast_message({
                            "topic": msg.topic,
                            "payload": data,
                            "timestamp": time.time()
                        })
                
                self.lastData = data
                self.latest_data["last_insert"] = time.time()
            except Exception as e:
                print(f"Error processing MQTT message: {e}")
        elif msg.topic == MQTT_TOPIC_CONFIG:
            try:
                data = json.loads(msg.payload.decode())
                if data["command"] == "sendConfig":
                    self.configData = data
            except Exception as e:
                print("Error parsing config: ", e)
        elif msg.topic == MQTT_TOPIC_INCIDENTS:
            return None
        else:
            return None

    def _insert_into_db(self, data):
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

    def start(self):
        try:
            self.client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
            self.client.loop_start()
            print(f"Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        except Exception as e:
            print(f"MQTT connection error: {e}")

    def save_to_db(self):
        conn = sqlite3.connect(DATABASE)
        cur = conn.cursor()
        for t, d in self.display_data:
            cur.execute("INSERT INTO dashboard_data (timestamp, value) VALUES (?, ?)", (t, d))
        for t, d in self.hidden_data:
            cur.execute("INSERT INTO incidents (timestamp, value) VALUES (?, ?)", (t, d))
        conn.commit()
        conn.close()
        self.display_data.clear()
        self.hidden_data.clear()

    def get_display_data(self):
        return self.display_data[-10:]


# Create the client instance
mqtt_client = MQTTClient()
get_display_data = mqtt_client.get_display_data