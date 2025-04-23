#include <ArduinoMqttClient.h>
#include <Ethernet.h>
#include <WiFi.h>

const char broker[] = "10.93.139.247";
int        port     = 1883;
const char topic[]  = "/home/dreh";
char ssid[] = "ssid";  // Eingeben Sie Ihren WLAN-Namensstring hier
char password[] = "password";  // Eingeben Sie Ihr WLAN-Passwort hier
bool useWifi = true;

MqttClient mqttClient(client);


void setup() {
  // No setup required for the buzzer
  Serial.begin(9600);
  pinMode(A0, INPUT);
  if (!useWifi){
    byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
    EthernetClient client;
    Serial.println("Initializing Ethernet...");
    if (Ethernet.begin(mac) == 0) {
      Serial.println("Failed to configure Ethernet using DHCP, retrying...");
      // Try using a static IP
      Ethernet.begin(mac);

    }


    
    // Give the Ethernet shield a moment to initialize
    delay(1000);
    IPAddress assignedIP = Ethernet.localIP();
    if (assignedIP != INADDR_NONE) {
      Serial.print("Ethernet initialized. IP address: ");
      Serial.println(assignedIP);
    } else {
      Serial.println("Failed to initialize Ethernet.");
    }
    delay(5000);
    Serial.println(broker);


  }else{
    Serial.println("Initializing Wifi...");
     WiFi.begin(ssid, password);

      while (WiFi.status() != WL_CONNECTED) {
        Serial.print("Status: ");
        Serial.println(WiFi.status());
        delay(1000);
        Serial.print(".");
        status = WiFi.status();
        Serial.print(status);
      }

      Serial.println("");
      Serial.println("Verbindung hergestellt");
      Serial.println("IP-Adresse: ");
      Serial.println(WiFi.localIP());
    }

    
   if (!mqttClient.connect(broker, port)) {
        Serial.print("MQTT connection failed! Error code = ");
        Serial.println(mqttClient.connectError());

        while (1);
      }

      Serial.println("You're connected to the MQTT broker!");
      Serial.println();
  

}

void loop() {
 int val = analogRead(A0);
  Serial.println(val);
  mqttClient.beginMessage(topic);
  mqttClient.print(val);
  mqttClient.endMessage();
  delay(10);
}
