import paho.mqtt.client as mqtt
from datetime import datetime
import sqlite3
import os
import json
import time
import dotenv
from dotenv import load_dotenv
import uuid
import requests

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
    _instances = []  # Class variable to track instances

    def __init__(self, socketio=None):
        MQTTClient._instances.append(self)
        print(f"Creating MQTT client instance #{len(MQTTClient._instances)}")
        self.configData = ""
        self.health = ""
        self.display_data = []
        self.hidden_data = []
        self.client_id = f"python-backend-{uuid.uuid4()}"  # Create a unique ID
         
        self.client = mqtt.Client(client_id=self.client_id)
        self.client.username_pw_set(MQTT_USER, MQTT_PASS)
       
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.lastMsgTime = None
        self.socketio = socketio  # Store the socketio instance
        self.lastData = None
        self.clients = None
        self.ws_bridge = None
        self.latest_data = {
            "tmp": None,
            "lf": None,
            "last_insert": 0
        }

    def on_connect(self, client, userdata, flags, rc):
        print(f"Subscribing to topics from client #{MQTTClient._instances.index(self) + 1}")
        client.subscribe(MQTT_TOPIC_DATA)
        client.subscribe(MQTT_TOPIC_INCIDENTS)
        client.subscribe(MQTT_TOPIC_CONFIG)

    def send_ntfy_notification(self, topic, message):
        url = f"http://10.93.140.165:90/{topic}"
        response = requests.post(url, data=message.encode("utf-8"))
        print(response.status_code, response.text)

    # Example usage
    


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
                print(msg)
                data = json.loads(msg.payload.decode())
                data_updated = False
                print("Data", data)

                if self.lastData != data:
                    data_updated = True
                else:
                    data_updated = False
                # Emit the updated data to all connected clients
                self.lastData = data
                if data_updated:
                   
                    print("Data was updated: ", data_updated, data, self.lastData)
                    print(time.time())
                    self._insert_into_db(data) #only insert if data is different
                    print(f"Received data: {data}")
                    try:
                        message = f"Real data: {data}"
                        for ws in self.clients[:]:
                            try:
                                ws.send(data)
                            except:
                                self.clients.remove(ws)
                            
                    except Exception as e:
                        print(f"Error sending message to clients: {e}")
                
                self.latest_data["last_insert"] = time.time()
                
            except Exception as e:
                print(f"Error processing MQTT message: {e}")
        elif msg.topic == MQTT_TOPIC_CONFIG:
            print("Received data on config topic")
            try:
                data = json.loads(msg.payload.decode())
                print("Command received: ",data["command"])
                if data["command"] == "configSend":
                    self.configData = data
                if data["command"] == "healthStatus":
                    self.health = data
            except Exception as e:
                print("Error parsing config: ", e)
        elif msg.topic == MQTT_TOPIC_INCIDENTS:
            
            try:
        # Parse the JSON payload
                payload = json.loads(msg.payload.decode('utf-8'))
                try:
                    for ws in self.clients[:]:
                        try:
                            ws.send(payload)
                        except:
                            self.clients.remove(ws)
                except Exception as e:
                    print(f"Error sending message to clients: {e}")
                
                alarm_type = payload.get("type", "unknown")
                value_json = json.dumps(payload)
                timestamp = datetime.now()
                if payload["type"] == "alarm":
                    self.send_ntfy_notification("RZ", str(payload))
                print(timestamp)
                print(value_json)

                conn = sqlite3.connect(DATABASE)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO incidents (timestamp, type, value)
                    VALUES (?, ?, ?)
                ''', (timestamp, alarm_type, value_json))
                conn.commit()
                source = payload.get("source", "unknown")
                status = payload.get("status", "unknown")
                print(f"Incident recorded: {alarm_type} - {source} {status}")

            except json.JSONDecodeError:
               print(f"Failed to parse incident JSON: {msg.payload}")
            except Exception as e:
               print(f"Error processing incident: {str(e)}")    
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

    def start(self, shared_clients):
        try:
            self.clients = shared_clients
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

