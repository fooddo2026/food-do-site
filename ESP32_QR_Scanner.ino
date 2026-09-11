/*
 ====================================================================================================
   FOOD-DO : SMART MESS ATTENDANCE & DINING SYSTEM
   ESP32-CAM AI-THINKER HARDWARE SCANNER (FINAL PRODUCTION SKETCH)
 ====================================================================================================

 📌 HARDWARE WIRING GUIDE:
 ----------------------------------------------------------------------------------------------------
 | Component              | ESP32-CAM Pin     | Description / Notes |
 |------------------------|-------------------|-----------------------------------------------------|
 | I2C LCD (16x2) SDA     | GPIO 14           | Serial Data for LiquidCrystal
 I2C                  | | I2C LCD (16x2) SCL     | GPIO 15           | Serial
 Clock for LiquidCrystal I2C                 | | LCD VCC                | 5V |
 Power for LCD Module (5V recommended)               | | LCD GND | GND | Ground
 (Common GND)                                 | | Buzzer (+)             | GPIO
 12           | Active Buzzer (+) pin                               | | Buzzer
 (-)             | GND               | Common Ground | | Green LED (+) | GPIO 13
 | Access Granted LED (via 220Ω - 330Ω resistor)       | | Green LED (-) | GND
 | Common Ground                                       | | Red LED (+) | GPIO 2
 | Access Denied LED (via 220Ω - 330Ω resistor)         | | Red LED (-) | GND |
 Common Ground                                       | | Flash LED (Onboard) |
 GPIO 4            | Kept LOW to avoid overheating                       |
 ----------------------------------------------------------------------------------------------------

 ⚠️ FLASHING INSTRUCTIONS (ARDUINO IDE):
 1. Connect FTDI Programmer:
    - FTDI 5V  -> ESP32-CAM 5V
    - FTDI GND -> ESP32-CAM GND
    - FTDI TX  -> ESP32-CAM U0RX (GPIO 3)
    - FTDI RX  -> ESP32-CAM U0TX (GPIO 1)
 2. Connect GPIO 0 to GND (Jumper wire).
 3. Press the onboard RST button once to put ESP32-CAM in Flash / Download mode.
 4. In Arduino IDE:
    - Board: "AI Thinker ESP32-CAM"
    - CPU Frequency: "240MHz (WiFi/BT)"
    - Flash Frequency: "40MHz"
    - Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"   <--- CRITICAL!
    - PSRAM: "Enabled"
    - Upload Speed: "115200" or "921600"
 5. Click Upload.
 6. Once upload finishes: DISCONNECT GPIO 0 from GND, then press RST button
 once!
 ====================================================================================================
*/

#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h" // Disables Brownout detector during camera/wifi bursts
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <ESP32QRCodeReader.h>

// ======================== 👇 CONFIGURATION SETTINGS 👇
// ========================
// 1. WiFi Credentials
const char *WIFI_SSID = "vivo Y300 5G";
const char *WIFI_PASSWORD = "shaurya123";

// 2. Backend Server Endpoint (Cloud Render Production URL):
const char *API_URL = "https://food-do-backend.onrender.com/api/meals/hardware-scan";
const char *API_KEY = "food-do-esp32-secret";

// 3. Hardware Pins
const int BUZZER_PIN = 12; // Buzzer Pin
const int GREEN_LED = 13;  // Success Indicator LED
const int RED_LED = 2;     // Error Indicator LED
const int FLASH_LED =
    4; // Onboard high-power White LED (keep OFF to save power)

const int I2C_SDA_PIN = 14;
const int I2C_SCL_PIN = 15;
// ==============================================================================

// QR Reader & LCD Display Instances
ESP32QRCodeReader qrReader(CAMERA_MODEL_AI_THINKER);
LiquidCrystal_I2C lcd(0x27, 16, 2); // Default I2C Address 0x27 (or 0x3F)

// Offline Queue Buffer for when Wi-Fi is temporarily disconnected
#define MAX_OFFLINE_SCANS 30
String offlineQueue[MAX_OFFLINE_SCANS];
int offlineCount = 0;
bool wasOffline = false;

// Double Scan Debounce Protection (Avoid accidental consecutive scans of same
// QR)
String lastScannedPayload = "";
unsigned long lastScanTime = 0;
const unsigned long RESCAN_DEBOUNCE_MS = 4000; // 4 seconds debounce for same QR

// --- Custom 5x8 LCD Pixel Characters ---
byte checkMark[8] = {0x00, 0x01, 0x03, 0x16,
                     0x1C, 0x08, 0x00, 0x00}; // Index 1: ✅
byte crossMark[8] = {0x00, 0x1B, 0x0E, 0x04,
                     0x0E, 0x1B, 0x00, 0x00}; // Index 2: ❌
byte wifiIcon[8] = {0x00, 0x0E, 0x11, 0x00,
                    0x04, 0x0A, 0x00, 0x04}; // Index 3: 📶

// Sound & Visual Feedback Functions
void playSuccessSound() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(GREEN_LED, LOW);
    delay(70);
  }
  digitalWrite(GREEN_LED,
               HIGH); // Keep green illuminated during message display
}

void playErrorSound() {
  digitalWrite(RED_LED, HIGH);
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(350);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

void showReadyScreen() {
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Scanner Ready :");
  lcd.setCursor(0, 1);
  if (WiFi.status() == WL_CONNECTED) {
    lcd.print("Place your QR   ");
  } else {
    lcd.print("Offline Mode ON ");
  }
}

void setup() {
  // 1. Disable brownout detector to prevent sudden resets during RF & camera power spikes
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n==========================================");
  Serial.println("  FOOD-DO ESP32-CAM SCANNER BOOTING...   ");
  Serial.println("==========================================");

  // 2. Setup GPIO Pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(FLASH_LED, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(FLASH_LED, LOW); // Keep high-power flash LED off

  // 3. Camera Init (MUST BE FIRST FOR ESP32-CAM TO AVOID I2C BUS CONFLICT)
  Serial.println("[CAMERA] Initializing AI-Thinker Camera module...");
  qrReader.setup();
  qrReader.beginOnCore(1);
  Serial.println("[CAMERA] Camera setup completed!");

  // 4. Initialize I2C LCD (SDA=14, SCL=15) - AFTER CAMERA INIT
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.createChar(1, checkMark);
  lcd.createChar(2, crossMark);
  lcd.createChar(3, wifiIcon);

  // --- PREMIUM STARTUP SCREEN ---
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" FOOD-DO SYSTEM ");
  lcd.setCursor(0, 1);
  lcd.print("BY : ANNAPURNA  ");

  // Startup light & sound sequence
  for (int i = 0; i < 3; i++) {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(120);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(GREEN_LED, LOW);
    delay(120);
  }
  delay(1500); // Hold the startup screen for 1.5 seconds

  // 5. Connect to WiFi Network
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 30) {
    delay(400);
    lcd.setCursor(15, 1);
    if (attempt % 2 == 0)
      lcd.write(3); // Blink WiFi icon
    else
      lcd.print(" ");
    attempt++;
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected Successfully!");
    Serial.printf("[WIFI] ESP32-CAM IP: %s\n",
                  WiFi.localIP().toString().c_str());
    Serial.printf("[API] Target Endpoint: %s\n", API_URL);

    // Beep once for WiFi success
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
  } else {
    Serial.println("\n[WIFI] Connection Timeout! Entering Offline Mode.");
    wasOffline = true;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Disconnect");
    lcd.setCursor(0, 1);
    lcd.print("Offline Mode ON");
    delay(1500);
  }

  showReadyScreen();
}

void loop() {
  // Check Wi-Fi state & sync pending offline scans when reconnected
  if (WiFi.status() == WL_CONNECTED) {
    if (wasOffline) {
      wasOffline = false;
      Serial.println("[WIFI] Reconnected to Network!");
      showReadyScreen();
    }
    if (offlineCount > 0) {
      syncOfflineQueue();
    }
  } else {
    if (!wasOffline) {
      wasOffline = true;
      Serial.println("[WIFI] Connection Lost! Switched to Offline Scan Mode.");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.write(3);
      lcd.print(" WIFI LOST!");
      lcd.setCursor(0, 1);
      lcd.print("Offline Mode ON");
      delay(1500);
      showReadyScreen();
    }
  }

  // Check for scanned QR Code frame from Core 1
  struct QRCodeData qrCodeData;
  if (qrReader.receiveQrCode(&qrCodeData, 100)) {
    if (qrCodeData.valid) {
      String payload = String((const char *)qrCodeData.payload);
      payload.trim();

      // Debounce Check: Prevent double-reading the exact same QR code within 4
      // seconds
      if (payload == lastScannedPayload &&
          (millis() - lastScanTime < RESCAN_DEBOUNCE_MS)) {
        // Ignored accidental duplicate read
        return;
      }

      lastScannedPayload = payload;
      lastScanTime = millis();

      // Single prompt click/beep
      digitalWrite(BUZZER_PIN, HIGH);
      delay(60);
      digitalWrite(BUZZER_PIN, LOW);

      Serial.println("\n------------------------------------------");
      Serial.print("[SCAN] QR Code Detected: ");
      Serial.println(payload);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(" QR DETECTED!   ");
      lcd.setCursor(0, 1);
      lcd.print("  Verifying...  ");

      verifyQR(payload);

      delay(2200); // Display result for 2.2 seconds before resetting screen
      showReadyScreen();
    }
  }
}

// -----------------------------------------------------------------------------
// VERIFY QR CODE VIA REST API OR STORE IN OFFLINE QUEUE
// -----------------------------------------------------------------------------
void verifyQR(String qrData) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Required for HTTPS connection to Render without hardcoded SSL certs

    HTTPClient http;
    http.begin(client, API_URL);
    http.setTimeout(8000); // 8 second timeout for cloud API response
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);

    // Build Request Payload (Compatible with ArduinoJson v6 and v7)
#if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
#else
    StaticJsonDocument<256> doc;
#endif
    doc["qrData"] = qrData;
    doc["gateType"] = "ENTRY";

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    Serial.printf("[HTTP] POST Response Code: %d\n", httpResponseCode);

    lcd.clear();
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("[HTTP] Server Response: ");
      Serial.println(response);

#if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument resDoc;
#else
      StaticJsonDocument<1024> resDoc;
#endif
      DeserializationError err = deserializeJson(resDoc, response);

      if (httpResponseCode == 200 && !err) {
        // ================= SUCCESS RESPONSE =================
        playSuccessSound();

        String fullName = resDoc["studentName"].as<String>();
        if (fullName.length() == 0 || fullName == "null")
          fullName = "Student";

        int spaceIdx = fullName.indexOf(' ');
        String firstName =
            (spaceIdx != -1) ? fullName.substring(0, spaceIdx) : fullName;

        String foodPref = resDoc["foodPreference"].as<String>();
        if (foodPref == "Non-Veg" || foodPref == "NON_VEG")
          foodPref = "N-VEG";
        else if (foodPref == "Veg" || foodPref == "VEG")
          foodPref = "VEG";
        else if (foodPref == "Skipped" || foodPref == "SKIPPED")
          foodPref = "SKIP";
        else
          foodPref = "OK";

        // Display Header: "✅ AMAN (VEG)"
        lcd.setCursor(0, 0);
        lcd.write(1); // ✅ Checkmark
        lcd.print(" ");
        String line1 = firstName + " (" + foodPref + ")";
        lcd.print(line1.substring(0, 14));

        lcd.setCursor(0, 1);
        lcd.print("ACCESS GRANTED ");
      } else {
        // ================= ACCESS DENIED =================
        playErrorSound();

        String errorMsg = "Denied";
        if (!err && resDoc.containsKey("error")) {
          errorMsg = resDoc["error"].as<String>();
        }

        // Friendly error messages mapped to 16-char LCD
        if (errorMsg == "ALREADY_IN")
          errorMsg = "Already In!";
        else if (errorMsg == "ALREADY_EATEN")
          errorMsg = "Already Eaten!";
        else if (errorMsg == "NO_MENU_FOUND")
          errorMsg = "No Active Menu";
        else if (errorMsg == "INVALID_TOKEN")
          errorMsg = "Invalid Token";
        else if (errorMsg == "EXPIRED_TOKEN")
          errorMsg = "Expired Token";
        else if (errorMsg == "Invalid QR code signature")
          errorMsg = "Invalid QR";
        else if (errorMsg == "Student not found")
          errorMsg = "Not Registered";

        lcd.setCursor(0, 0);
        lcd.write(2); // ❌ Cross
        lcd.print(" ACCESS DENIED");

        lcd.setCursor(0, 1);
        lcd.print("> ");
        lcd.print(errorMsg.substring(0, 14));
      }
    } else {
      // ================= NETWORK ERROR =================
      playErrorSound();
      Serial.printf("[HTTP] Network Error: %s\n",
                    http.errorToString(httpResponseCode).c_str());

      lcd.setCursor(0, 0);
      lcd.write(2); // ❌
      lcd.print(" NETWORK ERROR");
      lcd.setCursor(0, 1);
      lcd.print("Err: ");
      lcd.print(httpResponseCode);
    }
    http.end();
  } else {
    // ================= OFFLINE MODE SCAN =================
    if (offlineCount < MAX_OFFLINE_SCANS) {
      offlineQueue[offlineCount] = qrData;
      offlineCount++;
      playSuccessSound();

      Serial.printf("[OFFLINE] Stored scan (%d/%d) in memory\n", offlineCount,
                    MAX_OFFLINE_SCANS);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.write(1); // ✅
      lcd.print(" OFFLINE SCAN ");

      if (qrData.indexOf('|') != -1) {
        int firstPipe = qrData.indexOf('|');
        int secondPipe = qrData.indexOf('|', firstPipe + 1);
        int thirdPipe = qrData.indexOf('|', secondPipe + 1);
        if (firstPipe != -1 && secondPipe != -1) {
          String name = qrData.substring(firstPipe + 1, secondPipe);
          String foodPref = (thirdPipe != -1)
                                ? qrData.substring(secondPipe + 1, thirdPipe)
                                : qrData.substring(secondPipe + 1);
          if (foodPref == "Non-Veg" || foodPref == "NON_VEG")
            foodPref = "N-VEG";
          else if (foodPref == "Veg" || foodPref == "VEG")
            foodPref = "VEG";

          lcd.setCursor(0, 1);
          lcd.print((name + " (" + foodPref + ")").substring(0, 16));
        } else {
          lcd.setCursor(0, 1);
          lcd.print("SAVED IN QUEUE ");
        }
      } else if (qrData.startsWith("TOKEN:")) {
        lcd.setCursor(0, 1);
        lcd.print("SURPLUS TOKEN  ");
      } else {
        lcd.setCursor(0, 1);
        lcd.print("SAVED IN QUEUE ");
      }
    } else {
      playErrorSound();
      Serial.println("[OFFLINE] Queue full! Connect to WiFi to flush.");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.write(2); // ❌
      lcd.print(" QUEUE FULL!  ");
      lcd.setCursor(0, 1);
      lcd.print("CONNECT TO WIFI");
    }
  }
}

// -----------------------------------------------------------------------------
// SYNC OFFLINE QUEUE SCANS ONCE WIFI IS RESTORED
// -----------------------------------------------------------------------------
void syncOfflineQueue() {
  Serial.printf("[SYNC] Syncing %d offline scans to server...\n", offlineCount);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Syncing Offline");
  lcd.setCursor(0, 1);
  lcd.print(String(offlineCount) + " scans...");

  String syncUrl = String(API_URL);
  syncUrl.replace("hardware-scan", "hardware-sync");

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, syncUrl);
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<2048> doc;
#endif
  JsonArray scans = doc["scans"].to<JsonArray>();
  for (int i = 0; i < offlineCount; i++) {
    scans.add(offlineQueue[i]);
  }

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  Serial.printf("[SYNC] Server Response Code: %d\n", httpResponseCode);

  if (httpResponseCode == 200) {
    offlineCount = 0; // Clear successfully synced scans
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(1);
    lcd.print(" SYNC COMPLETE!");
    Serial.println("[SYNC] All offline scans synced successfully!");
    delay(1500);
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(2);
    lcd.print(" SYNC FAILED   ");
    Serial.println(
        "[SYNC] Failed to sync offline scans. Will retry next cycle.");
    delay(1500);
  }
  http.end();
  showReadyScreen();
}
