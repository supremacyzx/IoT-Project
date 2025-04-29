// Define Buzzer-Pin
  const int buzzerPin = 23;

// Frequencies for Sounds
  const int accessTone = 950;
  const int denyTone = 300;
  const int denyTone2 = 200;
  const int alarmTone = 1000;
  const int alarmTone2 = 300;

void setup() {
 
// Set Buzzer-Pin as Output
  pinMode(buzzerPin, OUTPUT);
}

// If-Else Function
void loop() {

  if()  {
    accessSound();
  }

  if else() {
    denySound();
  }

  if else() {
    alarmSound();
  }

  else {
    noTone(buzzerPin);  // Kein Ton im Idle-Zustand
  }

// Access Sound
  accessSound();
  delay(2000);  // Warte 2 Sekunden zwischen den Sounds

// Deny Sound
  denySound();
  delay(2000);

// Alarm Sound
  alarmSound();
  delay(2000);

}

// Function for Access-Sound
void accessSound() {
  tone(buzzerPin, accessTone, 300);  // 950 Mhz for 300 ms
  delay(300);
  tone(buzzerPin, accessTone, 300);
  delay(200);
}

// Function for Deny-Sound
void denySound() {
  tone(buzzerPin, denyTone, 300);  // 300 Mhz for 300 ms
  delay(0);
  tone(buzzerPin, denyTone2, 400);  // 200Mhz for 200 ms
  delay(300);
}

// Function for Alarm-Sound
void alarmSound() {
//  for (int i = 0; i < 5; i++) {  // Repeat the sound 5 times
    tone(buzzerPin, alarmTone, 300);  // 1000Mhz for 300 ms
    delay(0);
    tone(buzzerPin, alarmTone2, 300); // 300Mhz for 300ms
    delay(0);
  }
}