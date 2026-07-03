struct DeviceChannel {
  const char* id;
  const char* room;
  const char* type;
  uint8_t statePin;
  uint8_t relayPin;
  uint16_t ratedWatts;
  bool isOn;
  unsigned long lastChangedAt;
};

DeviceChannel devices[] = {
  {"drawing-fan-1", "drawing", "fan", 21, 25, 60, false, 0},
  {"drawing-fan-2", "drawing", "fan", 22, 26, 60, false, 0},
  {"drawing-light-1", "drawing", "light", 23, 27, 15, false, 0},
  {"drawing-light-2", "drawing", "light", 18, 32, 15, false, 0},
  {"drawing-light-3", "drawing", "light", 19, 33, 15, false, 0}
};

const size_t DEVICE_COUNT = sizeof(devices) / sizeof(devices[0]);
unsigned long lastTelemetryAt = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("PowerDown representative room node starting...");

  for (size_t i = 0; i < DEVICE_COUNT; i++) {
    pinMode(devices[i].statePin, INPUT);
    pinMode(devices[i].relayPin, OUTPUT);
    digitalWrite(devices[i].relayPin, LOW);
  }
}

void loop() {
  const unsigned long now = millis();

  for (size_t i = 0; i < DEVICE_COUNT; i++) {
    DeviceChannel &device = devices[i];
    const bool nextState = digitalRead(device.statePin) == LOW;

    if (nextState != device.isOn) {
      device.isOn = nextState;
      device.lastChangedAt = now;
      digitalWrite(device.relayPin, nextState ? HIGH : LOW);
    }
  }

  if (now - lastTelemetryAt >= 1000) {
    lastTelemetryAt = now;
    printTelemetry(now);
  }

  delay(20);
}

void printTelemetry(unsigned long now) {
  uint16_t roomWatts = 0;

  Serial.print("{\"node\":\"drawing-room\",\"uptimeMs\":");
  Serial.print(now);
  Serial.print(",\"devices\":[");

  for (size_t i = 0; i < DEVICE_COUNT; i++) {
    const DeviceChannel &device = devices[i];
    const uint16_t currentWatts = device.isOn ? device.ratedWatts : 0;
    roomWatts += currentWatts;

    if (i > 0) Serial.print(",");
    Serial.print("{\"id\":\"");
    Serial.print(device.id);
    Serial.print("\",\"room\":\"");
    Serial.print(device.room);
    Serial.print("\",\"type\":\"");
    Serial.print(device.type);
    Serial.print("\",\"status\":\"");
    Serial.print(device.isOn ? "on" : "off");
    Serial.print("\",\"powerDraw\":");
    Serial.print(currentWatts);
    Serial.print(",\"lastChangedMs\":");
    Serial.print(device.lastChangedAt);
    Serial.print("}");
  }

  Serial.print("],\"roomWatts\":");
  Serial.print(roomWatts);
  Serial.println("}");
}

