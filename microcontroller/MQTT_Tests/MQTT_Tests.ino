#include <ArduinoMqttClient.h>
#include <WiFi.h>

WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

const char* wifi = "FES-SuS";
const char* wpass = "SuS-WLAN!Key24";

void connectToMQTT(const char* broker, const int port, const char* user, const char* mqttpass) {
  // Connect to the MQTT broker
  Serial.println("Connecting to MQTT Broker..");
  int attempts = 0;
  while (attempts < 50) {
    mqttClient.setUsernamePassword(user, mqttpass);
    bool mqttstatus = mqttClient.connect(broker, port);
    if (!mqttstatus){
      delay(1000);
      Serial.print(".");
      Serial.println(mqttClient.connectError());
      attempts++;
    } else {
      Serial.println("Connected to broker.");
      delay(1000);
      return;
    }
  }
  Serial.println("Failed to connect to MQTT broker after 50 attempts");
}

void connectToWifi(const char* ssid, const char* pass) {
  Serial.println("Initializing Wi-Fi...");
  WiFi.begin(ssid, pass);

  // Wait for connection with timeout
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 100) {
    Serial.print("Status: ");
    Serial.println(WiFi.status());
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("Connected to Wi-Fi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    delay(500);
  } else {
    Serial.println("Failed to connect to WiFi, retrying.");
    connectToWifi(ssid, pass);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Starting setup...");
  
  const char* broker = "10.93.140.165";
  const char* user = "grp5";
  const char* mqttpass = "grp5123!";

  connectToWifi(wifi, wpass);
  connectToMQTT(broker, 1884, user, mqttpass);
}

void loop() {
  // Keep the MQTT connection alive
  mqttClient.poll();
  
  // Add your main program logic here
  
  delay(1000);
  Serial.print(".");
}