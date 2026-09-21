#include <Arduino.h>
#include <DHT.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>

#define HAS_DHT11 1
#define HAS_LM35 1
#define CAPTIVE_PORTAL_ENABLED 1

constexpr uint8_t DHT_PIN = D2;
constexpr uint8_t LM35_PIN = A0;
constexpr uint8_t LM35_SAMPLE_COUNT = 5;
constexpr unsigned long SENSOR_INTERVAL_MS = 2000;

const char *WIFI_SSID = "FeedTest";
const uint8_t MAX_WIFI_CLIENTS = 4;

ESP8266WebServer server(80);
DNSServer dnsServer;
DHT dht(DHT_PIN, DHT11);

struct SensorValues {
  float temp = NAN;
  float hum = NAN;
  float ftemp = NAN;
};

SensorValues sensors;

bool plausible(float value, float minimum, float maximum) {
  return !isnan(value) && value >= minimum && value <= maximum;
}

float readLm35Celsius() {
  unsigned long total = 0;
  for (uint8_t sample = 0; sample < LM35_SAMPLE_COUNT; ++sample) {
    total += analogRead(LM35_PIN);
    delay(5);
  }

  const float voltage = (static_cast<float>(total) / LM35_SAMPLE_COUNT) * 3.3f / 1023.0f;
  return voltage * 100.0f;
}

void updateSensors() {
#if HAS_DHT11
  const float airTemperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  sensors.temp = plausible(airTemperature, -20.0f, 80.0f) ? airTemperature : NAN;
  sensors.hum = plausible(humidity, 0.0f, 100.0f) ? humidity : NAN;
#endif

#if HAS_LM35
  const float feedTemperature = readLm35Celsius();
  sensors.ftemp = plausible(feedTemperature, -20.0f, 150.0f) ? feedTemperature : NAN;
#endif
}

String jsonValue(float value) {
  return isnan(value) ? "null" : String(value, 1);
}

String currentJson() {
  return "{\"ms\":" + String(millis()) +
         ",\"temp\":" + jsonValue(sensors.temp) +
         ",\"hum\":" + jsonValue(sensors.hum) +
         ",\"ftemp\":" + jsonValue(sensors.ftemp) + "}";
}

void addNoCacheHeaders() {
  server.sendHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  server.sendHeader("Access-Control-Allow-Origin", "*");
}

void handleData() {
  addNoCacheHeaders();
  server.send(200, "application/json", currentJson());
}

void handleRoot() {
  File page = LittleFS.open("/index.html", "r");
  if (!page) {
    server.send(500, "text/plain", "index.html is missing from LittleFS");
    return;
  }

  addNoCacheHeaders();
  server.streamFile(page, "text/html; charset=utf-8");
  page.close();
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("FeedTest starting");

#if HAS_DHT11
  dht.begin();
#endif

  if (!LittleFS.begin()) {
    Serial.println("LittleFS mount failed");
  }

  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_SSID, nullptr, 1, false, MAX_WIFI_CLIENTS);

  Serial.print("Hotspot: ");
  Serial.println(WIFI_SSID);
  Serial.print("IP address: ");
  Serial.println(WiFi.softAPIP());

#if CAPTIVE_PORTAL_ENABLED
  dnsServer.start(53, "*", WiFi.softAPIP());
  Serial.println("Captive portal: enabled");
#endif

  server.on("/", HTTP_GET, handleRoot);
  server.on("/data", HTTP_GET, handleData);
  server.onNotFound(handleRoot);
  server.begin();
}

void loop() {
#if CAPTIVE_PORTAL_ENABLED
  dnsServer.processNextRequest();
#endif
  server.handleClient();

  static unsigned long lastSensorMs = 0;
  if (millis() - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = millis();
    updateSensors();
    Serial.println(currentJson());
  }
}
