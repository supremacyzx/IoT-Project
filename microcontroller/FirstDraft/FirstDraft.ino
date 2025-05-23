#include <ArduinoMqttClient.h>
#include <WiFi.h>
#include <DHT.h>  // Include the DHT library
#include <MFRC522v2.h>
#include <MFRC522DriverSPI.h>
//#include <MFRC522DriverI2C.h>
#include <MFRC522DriverPinSimple.h>
#include <MFRC522Debug.h>


const char broker[] = "10.93.136.51";
int        port     = 1883;
const char topic[]  = "/home/dreh";
char ssid[] = "FES-SuS";  // Enter your Wi-Fi SSID here
char password[] = "SuS-WLAN!Key24";  // Enter your Wi-Fi password here
bool useWifi = false;

//RFID Setup
MFRC522DriverPinSimple ss_pin(13);
MFRC522DriverSPI driver{ss_pin}; // Create SPI driver
//MFRC522DriverI2C driver{};     // Create I2C driver
MFRC522 mfrc522{driver};         // Create MFRC522 instance


// DHT11 Setup
#define DHTPIN 25       // Pin connected to the DHT11 sensor
#define DHTTYPE DHT11   // DHT 11 type sensor


WiFiClient wifiClient;  // Wi-Fi client
MqttClient mqttClient(wifiClient);  // Initialize MQTT client with Wi-Fi client
DHT dht(DHTPIN, DHTTYPE);  // Initialize DHT sensor

// Define a struct to hold the temperature and humidity values
struct SensorData {
  float temperature;
  float humidity;
};

SensorData readDHTSensor() {
  SensorData data;

  data.humidity = dht.readHumidity();
  data.temperature = dht.readTemperature();  

  if (isnan(data.humidity) || isnan(data.temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    data.temperature = NAN;  
    data.humidity = NAN;
  }

  return data;
}


void setup() {
  Serial.begin(9600);


  mfrc522.PCD_Init();    // Init MFRC522 board.
  MFRC522Debug::PCD_DumpVersionToSerial(mfrc522, Serial);	// Show details of PCD - MFRC522 Card Reader details.

  if (useWifi) {
    connectToWifi(ssid, password);
   // connectToMQTT(broker, port);
  }

  dht.begin();


}




void loop() {

  
  SensorData sensorData = readDHTSensor();

  publishMessage("RZ/Temperatur", String(sensorData.temperature));
  publishMessage("RZ/Feuchtigkeit", String(sensorData.humidity));
  delay(1000);

  if (!mfrc522.PICC_IsNewCardPresent()) {
      return;
    }

  // Select one of the cards.
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  readCard();
  Serial.println("Checking for card");
 

  

}

String readCard(){
  MFRC522Debug::PrintUID(Serial, (mfrc522.uid));
  Serial.println();

  // Save the UID on a String variable
  String uidString = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uidString += "0"; 
    }
    uidString += String(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println(uidString);
  return uidString;
}

void connectToMQTT(const char* broker, const int port){
    // Connect to the MQTT broker
  if (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    while (1);
  }
  Serial.println("Connected to broker.");

 // Serial.println("You're connected to the MQTT broker!");
}

void connectToWifi(const char* ssid, const char* pass){
   Serial.println("Initializing Wi-Fi...");
    WiFi.begin(ssid, pass);

    while (WiFi.status() != WL_CONNECTED) {
      Serial.print("Status: ");
      Serial.println(WiFi.status());
      delay(1000);
      Serial.print(".");
    }

    Serial.println("");
    Serial.println("Connected to Wi-Fi");
    Serial.println("IP Address: ");
    Serial.println(WiFi.localIP());
}

void publishMessage(String topic, String msg) {
  mqttClient.beginMessage(topic);  // Start the message with the topic
  mqttClient.print(msg);           // Send the message content
  mqttClient.endMessage();         // End the message and send it
  Serial.println("Sent MQTT msg to " + topic + " Value: " + msg);
}
