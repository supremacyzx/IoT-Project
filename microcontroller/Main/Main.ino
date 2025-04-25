// Title:   Main Arduino Code Smarte Gebaeudeueberwachung
// Author:  DD
// Version: 1.1.0

#pragma region :: Lib Imports

#include <ArduinoMqttClient.h>
#include <WiFi.h>
#include <DHT.h>
#include <MFRC522v2.h>
#include <MFRC522DriverSPI.h>
#include <MFRC522DriverPinSimple.h>
#include <MFRC522Debug.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

#pragma endregion

#pragma region :: Constants / Definitions / Config

// File paths for configuration
const char* CONFIG_FILE = "/config.json";
const char* ACCESS_IDS_FILE = "/access_ids.json";

// Helper Vars
bool armed = true;
String* access_ids;
int num_access_ids = 0;

//
struct SensorData {
  float temperature;
  float humidity;
};

// Configuration variables - will be loaded from LittleFS
struct Config {
  // WiFi Config
  char ssid[32];
  char password[64];
  bool useWifi;
  
  // MQTT Config
  char broker[32];
  int port;
  
  // Pin Configuration
  int ledGreenPin;
  int ledRedPin;
  int dhtPin;
  int rfidSSPin;
  int sdaPin;
  int sclPin;
  
  // Sensor Configuration
  int dhtType;
  int lcdAddress;
  int lcdCols;
  int lcdRows;
};

Config config;

// Component objects
WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);
DHT* dht;
MFRC522DriverPinSimple* ss_pin;
MFRC522DriverSPI* driver;
MFRC522* mfrc522;
LiquidCrystal_I2C* lcd;

#pragma endregion

#pragma region :: Configuration Management

bool initFS() {
  if (!LittleFS.begin(true)) { // Format on failure
    Serial.println("Failed to mount LittleFS");
    return false;
  }
  return true;
}

bool loadConfig() {
  File configFile = LittleFS.open(CONFIG_FILE, "r");
  if (!configFile) {
    Serial.println("Failed to open config file, using defaults");
    // Set default values
    strcpy(config.ssid, "FES-SuS");
    strcpy(config.password, "SuS-WLAN!Key24");
    config.useWifi = true;
    strcpy(config.broker, "10.93.136.51");
    config.port = 1883;
    config.ledGreenPin = 22;
    config.ledRedPin = 26;
    config.dhtPin = 25;
    config.dhtType = DHT11;
    config.rfidSSPin = 13;
    config.sdaPin = 15;
    config.sclPin = 14;
    config.lcdAddress = 0x27;
    config.lcdCols = 16;
    config.lcdRows = 2;
    
    // Save default config
    saveConfig();
    return false;
  }

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, configFile);
  configFile.close();
  
  if (error) {
    Serial.println("Failed to parse config file, using defaults");
    return false;
  }

  // Load WiFi settings
  strlcpy(config.ssid, doc["wifi"]["ssid"] | "FES-SuS", sizeof(config.ssid));
  strlcpy(config.password, doc["wifi"]["password"] | "SuS-WLAN!Key24", sizeof(config.password));
  config.useWifi = doc["wifi"]["enabled"] | true;
  
  // Load MQTT settings
  strlcpy(config.broker, doc["mqtt"]["broker"] | "10.93.136.51", sizeof(config.broker));
  config.port = doc["mqtt"]["port"] | 1883;
  
  // Load pin configuration
  config.ledGreenPin = doc["pins"]["ledGreen"] | 22;
  config.ledRedPin = doc["pins"]["ledRed"] | 26;
  config.dhtPin = doc["pins"]["dht"] | 25;
  config.rfidSSPin = doc["pins"]["rfidSS"] | 13;
  config.sdaPin = doc["pins"]["sda"] | 15;
  config.sclPin = doc["pins"]["scl"] | 14;
  
  // Load sensor configuration
  config.dhtType = doc["sensors"]["dhtType"] | DHT11;
  config.lcdAddress = doc["sensors"]["lcdAddress"] | 0x27;
  config.lcdCols = doc["sensors"]["lcdCols"] | 16;
  config.lcdRows = doc["sensors"]["lcdRows"] | 2;
  
  Serial.println("Config loaded successfully");
  return true;
}

bool saveConfig() {
  File configFile = LittleFS.open(CONFIG_FILE, "w");
  if (!configFile) {
    Serial.println("Failed to open config file for writing");
    return false;
  }

  StaticJsonDocument<512> doc;
  
  // WiFi settings
  JsonObject wifi = doc.createNestedObject("wifi");
  wifi["ssid"] = config.ssid;
  wifi["password"] = config.password;
  wifi["enabled"] = config.useWifi;
  
  // MQTT settings
  JsonObject mqtt = doc.createNestedObject("mqtt");
  mqtt["broker"] = config.broker;
  mqtt["port"] = config.port;
  
  // Pin configuration
  JsonObject pins = doc.createNestedObject("pins");
  pins["ledGreen"] = config.ledGreenPin;
  pins["ledRed"] = config.ledRedPin;
  pins["dht"] = config.dhtPin;
  pins["rfidSS"] = config.rfidSSPin;
  pins["sda"] = config.sdaPin;
  pins["scl"] = config.sclPin;
  
  // Sensor configuration
  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["dhtType"] = config.dhtType;
  sensors["lcdAddress"] = config.lcdAddress;
  sensors["lcdCols"] = config.lcdCols;
  sensors["lcdRows"] = config.lcdRows;
  
  // Serialize JSON to file
  if (serializeJson(doc, configFile) == 0) {
    Serial.println("Failed to write to config file");
    return false;
  }

  configFile.close();
  Serial.println("Config saved successfully");
  return true;
}

bool loadAccessIds() {
  File accessFile = LittleFS.open(ACCESS_IDS_FILE, "r");
  if (!accessFile) {
    Serial.println("Failed to open access IDs file, creating default");
    
    // Create a default access file with one ID
    if (access_ids) {
      delete[] access_ids;
    }
    
    num_access_ids = 1;
    access_ids = new String[num_access_ids];
    access_ids[0] = "76759f30";
    
    saveAccessIds();
    return false;
  }

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, accessFile);
  accessFile.close();
  
  if (error) {
    Serial.println("Failed to parse access IDs file");
    return false;
  }

  // Get the array of access IDs
  JsonArray idArray = doc["access_ids"].as<JsonArray>();
  
  // Clean up any existing array
  if (access_ids) {
    delete[] access_ids;
  }
  
  // Allocate new array with correct size
  num_access_ids = idArray.size();
  access_ids = new String[num_access_ids];
  
  // Copy IDs from JSON to array
  int i = 0;
  for (JsonVariant id : idArray) {
    access_ids[i++] = id.as<String>();
  }
  
  Serial.print("Loaded ");
  Serial.print(num_access_ids);
  Serial.println(" access IDs");
  return true;
}

bool saveAccessIds() {
  File accessFile = LittleFS.open(ACCESS_IDS_FILE, "w");
  if (!accessFile) {
    Serial.println("Failed to open access IDs file for writing");
    return false;
  }

  StaticJsonDocument<512> doc;
  
  // Create JSON array for access IDs
  JsonArray idArray = doc.createNestedArray("access_ids");
  for (int i = 0; i < num_access_ids; i++) {
    idArray.add(access_ids[i]);
  }
  
  // Serialize JSON to file
  if (serializeJson(doc, accessFile) == 0) {
    Serial.println("Failed to write to access IDs file");
    return false;
  }

  accessFile.close();
  Serial.println("Access IDs saved successfully");
  return true;
}

#pragma endregion

#pragma region :: Custom Methods


SensorData readDHTSensor() {
  SensorData data;

  data.humidity = dht->readHumidity();
  data.temperature = dht->readTemperature();  

  if (isnan(data.humidity) || isnan(data.temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    data.temperature = NAN;  
    data.humidity = NAN;
  }

  return data;
}

String readCard() {
  MFRC522Debug::PrintUID(Serial, (mfrc522->uid));
  Serial.println();

  // Save the UID on a String variable
  String uidString = "";
  for (byte i = 0; i < mfrc522->uid.size; i++) {
    if (mfrc522->uid.uidByte[i] < 0x10) {
      uidString += "0"; 
    }
    uidString += String(mfrc522->uid.uidByte[i], HEX);
  }
  Serial.println(uidString);
  return uidString;
}

bool checkAccess(String id) {
  Serial.println(id);
  for(int i = 0; i < num_access_ids; i++) {
    if(access_ids[i] == id) {
      Serial.println("Access granted");
      return true; // ID found in the access list
    }
  }
  Serial.println("Access denied");
  return false; // ID not found
}

void connectToMQTT(const char* broker, const int port) {
  // Connect to the MQTT broker
  if (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    return;
  }
  Serial.println("Connected to broker.");
}

void connectToWifi(const char* ssid, const char* pass) {
  Serial.println("Initializing Wi-Fi...");
  Serial.println(ssid, pass);
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
    Serial.println("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Failed to connect to WiFi, retrying.");
    connectToWifi(ssid, pass);
  }
}

void publishMessage(String topic, String msg) {
  mqttClient.beginMessage(topic);  // Start the message with the topic
  mqttClient.print(msg);           // Send the message content
  mqttClient.endMessage();         // End the message and send it
  Serial.println("Sent MQTT msg to " + topic + " Value: " + msg);
}

void initComponents() {
  // Initialize DHT sensor
  dht = new DHT(config.dhtPin, config.dhtType);
  dht->begin();
  
  // Initialize RFID
  ss_pin = new MFRC522DriverPinSimple(config.rfidSSPin);
  driver = new MFRC522DriverSPI(*ss_pin);
  mfrc522 = new MFRC522(*driver);
  mfrc522->PCD_Init();
  
  // Initialize LCD
  lcd = new LiquidCrystal_I2C(config.lcdAddress, config.lcdCols, config.lcdRows);
  lcd->init();
  lcd->backlight();
  
  // Initialize pins
  pinMode(config.ledGreenPin, OUTPUT);          
  pinMode(config.ledRedPin, OUTPUT);
}

#pragma endregion

#pragma region :: Main Methods Setup & Loop

void setup() {
  Serial.begin(9600);
  
  // Initialize file system and load configuration
  if (initFS()) {
    loadConfig();
    loadAccessIds();
  }
  
  // Initialize I2C
  Wire.begin(config.sdaPin, config.sclPin);
  
  // Initialize components with the loaded configuration
  initComponents();
  
  // Display RFID reader details
  MFRC522Debug::PCD_DumpVersionToSerial(*mfrc522, Serial);

  // Connect to WiFi and MQTT if enabled
  if (config.useWifi) {
    connectToWifi(config.ssid, config.password);
    if (WiFi.status() == WL_CONNECTED) {
      connectToMQTT(config.broker, config.port);
    }
  }
}

void loop() {
  SensorData sensorData = readDHTSensor();
  
  lcd->setCursor(0, 0);
  lcd->print("Tmp: " + String(sensorData.temperature) + "C");
  lcd->setCursor(0, 1);
  lcd->print("LF: " + String(sensorData.humidity) + "%");

  if (armed) {
    digitalWrite(config.ledGreenPin, LOW);
    digitalWrite(config.ledRedPin, HIGH);
  } else {
    digitalWrite(config.ledRedPin, LOW);
    digitalWrite(config.ledGreenPin, HIGH);
  }
  
  if (config.useWifi && WiFi.status() == WL_CONNECTED) {
    publishMessage("RZ/data", 
      "{\"tmp\":" + String(sensorData.temperature) + 
      ", \"lf\":" + String(sensorData.humidity) + 
      ", \"locked\":" + String(armed) + "}");
  }

  delay(1000);
  lcd->clear();
  
  if (!mfrc522->PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards.
  if (!mfrc522->PICC_ReadCardSerial()) {
    return;
  }
  
  String cardID = readCard();
  bool accessGranted = checkAccess(cardID);
  if (accessGranted) {
    armed = !armed;
  }
}

#pragma endregion