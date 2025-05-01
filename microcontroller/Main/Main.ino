// Title:   Main Arduino Code Smarte Gebaeudeueberwachung
// Author:  DD
// Version: 1.1.0

#pragma region :: Lib Imports

#include <ArduinoMqttClient.h> //Had to adjust the cpp of this lib to allow bigger mqtt msgs
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

struct SensorData {
  float temperature;
  float humidity;
};

// File paths for configuration
const char* CONFIG_FILE = "/config.json";
const char* ACCESS_IDS_FILE = "/access_ids.json";

// Helper Vars
bool armed = true;
String* access_ids;
int num_access_ids = 0;
SensorData lastSensorData;
bool lastarmed;
bool alarming = false;



// Configuration variables - will be loaded from LittleFS
struct Config {
  // WiFi Config
  char ssid[32];
  char password[64];
  bool useWifi;
  
  // MQTT Config
  char broker[32];
  int port;
  char mqttUser[32];
  char mqttPass[64];
  char mqttID[32];
  
  // Pin Configuration
  int ledGreenPin;
  int ledRedPin;
  int dhtPin;
  int rfidSSPin;
  int sdaPin;
  int sclPin;
  int buzzerpin;
  
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
  if (configFile) {
    Serial.println("Failed to open config file, using defaults");
    // Set default values
    strcpy(config.ssid, "FES-SuS");
    strcpy(config.password, "SuS-WLAN!Key24");
    config.useWifi = true;
    strcpy(config.broker, "10.93.140.165");
    strcpy(config.mqttUser, "grp5");
    strcpy(config.mqttPass, "grp5123!");
    config.port = 1884;
    config.ledGreenPin = 22;
    config.ledRedPin = 26;
    config.dhtPin = 25;
    config.buzzerpin = 27;
    config.dhtType = DHT11;
    config.rfidSSPin = 13;
    config.sdaPin = 15;
    config.sclPin = 14;
    config.lcdAddress = 0x27;
    config.lcdCols = 16;
    config.lcdRows = 2;
    strcpy(config.mqttID, "Arduino--001");
    
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
  strlcpy(config.broker, doc["mqtt"]["broker"] | "10.93.140.165", sizeof(config.broker));
  config.port = doc["mqtt"]["port"] | 1884;
  strlcpy(config.mqttUser, doc["mqtt"]["mqttUser"] | "grp5", sizeof(config.mqttUser));
  strlcpy(config.mqttPass, doc["mqtt"]["mqttPass"] | "grp5123!", sizeof(config.mqttPass));
  strlcpy(config.mqttID, doc["mqtt"]["mqttID"] | "Arduino-001", sizeof(config.mqttID));
  // Load pin configuration
  config.ledGreenPin = doc["pins"]["ledGreen"] | 22;
  config.ledRedPin = doc["pins"]["ledRed"] | 26;
  config.dhtPin = doc["pins"]["dht"] | 25;
  config.rfidSSPin = doc["pins"]["rfidSS"] | 13;
  config.sdaPin = doc["pins"]["sda"] | 15;
  config.sclPin = doc["pins"]["scl"] | 14;
  config.buzzerpin = doc["pins"]["buzzerpin"] | 27;
  
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
  mqtt["mqttUser"] = config.mqttUser;
  mqtt["mqttPass"] = config.mqttPass;
  mqtt["mqttID"] = config.mqttID;
  // Pin configuration
  JsonObject pins = doc.createNestedObject("pins");
  pins["ledGreen"] = config.ledGreenPin;
  pins["ledRed"] = config.ledRedPin;
  pins["dht"] = config.dhtPin;
  pins["rfidSS"] = config.rfidSSPin;
  pins["sda"] = config.sdaPin;
  pins["scl"] = config.sclPin;
  pins["buzzerpin"] = config.buzzerpin;
  
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

String getConfigAsString() {

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
  mqtt["mqttUser"] = config.mqttUser;
  mqtt["mqttPass"] = config.mqttPass;
  mqtt["mqttID"] = config.mqttID;
  // Pin configuration
  JsonObject pins = doc.createNestedObject("pins");
  pins["ledGreen"] = config.ledGreenPin;
  pins["ledRed"] = config.ledRedPin;
  pins["dht"] = config.dhtPin;
  pins["rfidSS"] = config.rfidSSPin;
  pins["sda"] = config.sdaPin;
  pins["scl"] = config.sclPin;
  pins["buzzerpin"] = config.buzzerpin;
  
  // Sensor configuration
  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["dhtType"] = config.dhtType;
  sensors["lcdAddress"] = config.lcdAddress;
  sensors["lcdCols"] = config.lcdCols;
  sensors["lcdRows"] = config.lcdRows;
  
  // Serialize JSON to file
  String configString;
  serializeJson(doc, configString);
  return configString;
}

void updateConfigFromJson(const String& jsonString) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonString);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }

  // WiFi settings
  if (doc.containsKey("wifi")) {
    JsonObject wifi = doc["wifi"];
    if (wifi.containsKey("ssid")) config.ssid = wifi["ssid"].as<String>();
    if (wifi.containsKey("password")) config.password = wifi["password"].as<String>();
    if (wifi.containsKey("enabled")) config.useWifi = wifi["enabled"];
  }

  // MQTT settings
  if (doc.containsKey("mqtt")) {
    JsonObject mqtt = doc["mqtt"];
    if (mqtt.containsKey("broker")) config.broker = mqtt["broker"].as<String>();
    if (mqtt.containsKey("port")) config.port = mqtt["port"];
    if (mqtt.containsKey("mqttUser")) config.mqttUser = mqtt["mqttUser"].as<String>();
    if (mqtt.containsKey("mqttPass")) config.mqttPass = mqtt["mqttPass"].as<String>();
    if (mqtt.containsKey("mqttID")) config.mqttID = mqtt["mqttID"].as<String>();
  }

  // Pin configuration
  if (doc.containsKey("pins")) {
    JsonObject pins = doc["pins"];
    if (pins.containsKey("ledGreen")) config.ledGreenPin = pins["ledGreen"];
    if (pins.containsKey("ledRed")) config.ledRedPin = pins["ledRed"];
    if (pins.containsKey("dht")) config.dhtPin = pins["dht"];
    if (pins.containsKey("rfidSS")) config.rfidSSPin = pins["rfidSS"];
    if (pins.containsKey("sda")) config.sdaPin = pins["sda"];
    if (pins.containsKey("scl")) config.sclPin = pins["scl"];
    if (pins.containsKey("buzzerpin")) config.buzzerpin = pins["buzzerpin"];
  }

  // Sensor configuration
  if (doc.containsKey("sensors")) {
    JsonObject sensors = doc["sensors"];
    if (sensors.containsKey("dhtType")) config.dhtType = sensors["dhtType"];
    if (sensors.containsKey("lcdAddress")) config.lcdAddress = sensors["lcdAddress"];
    if (sensors.containsKey("lcdCols")) config.lcdCols = sensors["lcdCols"];
    if (sensors.containsKey("lcdRows")) config.lcdRows = sensors["lcdRows"];
  }
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

bool addNewAccessId() {
  Serial.println("Waiting for new card to add to access list...");
  
  // Wait for a card to be scanned
  String newCardId = "";
  unsigned long startTime = millis();
  const unsigned long timeout = 30000; // 30 seconds timeout
  
  while (millis() - startTime < timeout) {
    // Check if there's a new card ID available
    // This part depends on how you're reading your RFID cards
    // Replace this with your actual RFID reading code
    if (mfrc522->PICC_IsNewCardPresent() && mfrc522->PICC_ReadCardSerial()) {
      // Convert UID to hex string
      newCardId = readCard();
      
      Serial.print("Card read: ");
      Serial.println(newCardId);
      break;
    }
    
    delay(50); // Small delay to prevent overwhelming the CPU
  }
  
  if (newCardId.length() == 0) {
    Serial.println("Timeout: No card read");
    return false;
  }
  
  // Check if this card is already in the access list
  for (int i = 0; i < num_access_ids; i++) {
    if (access_ids[i].equalsIgnoreCase(newCardId)) {
      Serial.println("Card already in access list");
      return false;
    }
  }
  
  // Create a new array with increased size
  String* new_access_ids = new String[num_access_ids + 1];
  
  // Copy existing IDs
  for (int i = 0; i < num_access_ids; i++) {
    new_access_ids[i] = access_ids[i];
  }
  
  // Add the new ID
  new_access_ids[num_access_ids] = newCardId;
  
  // Clean up old array and replace with new one
  delete[] access_ids;
  access_ids = new_access_ids;
  num_access_ids++;
  
  Serial.print("Added new card to access list: ");
  Serial.println(newCardId);
  
  // Save the updated list to the file
  return saveAccessIds();
}


#pragma endregion

#pragma region :: Custom Methods


// Function for Access-Sound
void accessSound(int buzzerPin) {
  tone(buzzerPin, 600, 300);  // 950 Mhz for 300 ms
  delay(300);
  tone(buzzerPin, 800, 300);
  delay(200);
}

// Function for Deny-Sound
void denySound(int buzzerPin) {
  tone(buzzerPin, 300, 300);  // 300 Mhz for 300 ms
  delay(0);
  tone(buzzerPin, 200, 400);  // 200Mhz for 200 ms
  delay(300);
}


// Function for Alarm-Sound
void alarmSound(int buzzerPin) {
    tone(buzzerPin, 1000, 300);  // 1000Mhz for 300 ms
    tone(buzzerPin, 300, 300); // 300Mhz for 300ms
  }


  
// Function to listen for incoming MQTT messages
void listenForMessages() {
  // Check if a message has arrived
  int messageSize = mqttClient.parseMessage();
  
  if (messageSize > 0) {
    // Message received
    Serial.print("Received message on topic: ");
    Serial.println(mqttClient.messageTopic());
    
    Serial.print("Message size: ");
    Serial.println(messageSize);
    
    // Read and print the message content
    Serial.print("Message content: ");
    String msg = "";
    while (mqttClient.available()) {
      msg += (char)mqttClient.read();

    }
    Serial.println(msg);
    StaticJsonDocument<200> docmessage;
    DeserializationError error = deserializeJson(docmessage, msg);
    
    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      return;
    }

    if (docmessage.containsKey("command") && docmessage.containsKey("msgID")) {
      String command = docmessage["command"];
      Serial.print("Received command: ");
      Serial.println(command);

      // Specific command handling
      if (command == "getConfig"){
        String configString = getConfigAsString();
        Serial.println(configString);
        String mqttMsg = "";
        DynamicJsonDocument mqttdoc(512);
        mqttdoc["msgID"] = docmessage["msgID"];
        mqttdoc["command"] = "configSend";
        mqttdoc["value"] = configString;
        serializeJson(mqttdoc, mqttMsg);
        Serial.println(mqttMsg);
        publishMessage("RZ/config", mqttMsg);
        Serial.println("Sent config to RZ/config");
      }elif (command == "setConfig"){
        String configString = docmessage["value"];
        updateConfigFromJson(configString);
        Serial.println("Updated config from MQTT message");
        saveConfig();
        Serial.println("Saved config to file system");
      }elif (command == "addAccessId"){
        Serial.println("Adding new access ID...");
        if (addNewAccessId()) {
          Serial.println("New access ID added successfully");
        } else {
          Serial.println("Failed to add new access ID");
        }
    }
  }
}


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

bool checkAccess(String id, bool armed) {
  Serial.println(id);
  for(int i = 0; i < num_access_ids; i++) {
    if(access_ids[i] == id) {
      if (!armed) {
        digitalWrite(config.ledGreenPin, LOW);
        digitalWrite(config.ledRedPin, HIGH);
      } else {
        digitalWrite(config.ledRedPin, LOW);
        digitalWrite(config.ledGreenPin, HIGH);
      }
      lcd->clear();
      lcd->print("Access granted");
      accessSound(config.buzzerpin);
      delay(1000);
      lcd->clear();
      Serial.println("Access granted");
      return true; // ID found in the access list
    }
  }
  Serial.println("Access denied");
  lcd->clear();
  lcd->print("Access denied");
  denySound(config.buzzerpin);
  delay(1000);
  lcd->clear();
  return false; // ID not found
}

void connectToMQTT(const char* broker, const int port, const char* mqttuser, const char* mqttpass) {
  // Connect to the MQTT broker
  Serial.println("Connecting to MQTT Broker..");
  mqttClient.setUsernamePassword(mqttuser, mqttpass);
  lcd->clear();
  lcd->print("Init MQTT..");
  lcd->setCursor(0, 1);
  lcd->print(String(broker));
  lcd->setCursor(0, 0);
  Serial.println("Connecting MQTT to: " + String(mqttuser) + "@" + String(broker) + ":" + String(port));
  int attempts = 0;
  while (attempts < 50) {
    int mqttstatus = mqttClient.connect(broker, port);
    if (!mqttstatus){
      delay(1000);
      Serial.print(".");
      Serial.println(String(mqttstatus));
      attempts++;
    }else{
      Serial.println(String(mqttstatus));
      Serial.println("Connected to broker.");
      Serial.print("Subscribing to topic: ");
      Serial.println("RZ/config");
      mqttClient.subscribe("RZ/config");
      lcd->clear();
      lcd->print("MQTT successful");
      delay(1000);
      return;
    }
    
  }
  
}

void connectToWifi(const char* ssid, const char* pass) {
  Serial.println("Initializing Wi-Fi...");
  //Serial.println(ssid, pass);
  lcd->clear();
  lcd->print("Init Wifi..");
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
    lcd->clear();
    lcd->print("Connected to Wifi");
    delay(500);
    lcd->clear();
  } else {
    Serial.println("Failed to connect to WiFi, retrying.");
    connectToWifi(ssid, pass);
  }
}

void publishMessage(String topic, String msg) {
  mqttClient.beginMessage(topic);  // Start the message with the topic
  mqttClient.print(msg);           // Send the message content
  mqttClient.endMessage();         // End the message and send it
  //Serial.println("Sent MQTT msg to " + topic + " Value: " + msg);
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
  pinMode(config.buzzerpin, OUTPUT);
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
      connectToMQTT(config.broker, config.port, config.mqttUser, config.mqttPass);
    }
  }
}

void loop() {

  // Do main loop tasks
  listenForMessages();
  //poll mqtt to stay alive
  mqttClient.poll();
  if(mqttClient.connected()==0){
    Serial.println("MQTT Con lost, reinitiating MQTT");
    connectToMQTT(config.broker, config.port, config.mqttUser, config.mqttPass);
  }
  
  // Check if WiFi is connected and poll mqtt to stay connected !TODO needs a check for mqtt connection status
  if (config.useWifi && WiFi.status() != WL_CONNECTED) {
    connectToWifi(config.ssid, config.password);
    if (WiFi.status() == WL_CONNECTED) {
      
    }
  }

  //Gather Sensor Data
  SensorData sensorData = readDHTSensor();
  
  

  // Publish Sensor Data to MQTT only if data has changed 
  if ((sensorData.temperature != lastSensorData.temperature || sensorData.humidity != lastSensorData.humidity) || armed != lastarmed) {
      publishMessage("RZ/data", 
        "{\"tmp\":" + String(sensorData.temperature) + 
        ", \"lf\":" + String(sensorData.humidity) + 
        ", \"locked\":" + String(armed) + "}");

      //clear screen for new loop
      lcd->clear();
      lcd->setCursor(0, 0);
      lcd->print("Tmp: " + String(sensorData.temperature) + "C");
      lcd->setCursor(0, 1);
      lcd->print("LF: " + String(sensorData.humidity) + "%");

    }
  if (alarming){
    alarmSound(config.buzzerpin);
  }
  
  //reset / set last data 
  lastSensorData = sensorData;
  lastarmed = armed;
  //Print Sensor Data to LCD
  

  //check armed status and set Status LED 

  if (armed) {
    digitalWrite(config.ledGreenPin, LOW);
    digitalWrite(config.ledRedPin, HIGH);
  } else {
    digitalWrite(config.ledRedPin, LOW);
    digitalWrite(config.ledGreenPin, HIGH);
  }

  

  //check rfid card presence and return early if no card is present
  if (!mfrc522->PICC_IsNewCardPresent()) {
    return;
  }

  // select card if card is present, return if unreadable
  if (!mfrc522->PICC_ReadCardSerial()) {
    return;
  }
  
  //read card and check access, adjust armed status
  String cardID = readCard();
  bool accessGranted = checkAccess(cardID, armed);
  if (accessGranted) {
    armed = !armed;
  }
  lcd->clear();
  lcd->setCursor(0, 0);
  lcd->print("Tmp: " + String(sensorData.temperature) + "C");
  lcd->setCursor(0, 1);
  lcd->print("LF: " + String(sensorData.humidity) + "%");
  
}

#pragma endregion