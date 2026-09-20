#include <Arduino.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>

#define HAS_DHT11 0
#define HAS_LM35 0
#define CAPTIVE_PORTAL_ENABLED 1

const char *WIFI_SSID = "FeedTest";
const uint8_t MAX_WIFI_CLIENTS = 4;

ESP8266WebServer server(80);
DNSServer dnsServer;

String currentJson() {
  return "{\"ms\":" + String(millis()) +
         ",\"temp\":null,\"hum\":null,\"ftemp\":null}";
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

  static unsigned long lastSerialMs = 0;
  if (millis() - lastSerialMs >= 1000) {
    lastSerialMs = millis();
    Serial.println(currentJson());
  }
}
