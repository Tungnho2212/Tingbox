
#include <WiFi.h>
#include <WebServer.h>
#include <EEPROM.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "Audio.h" 
#include <TFT_eSPI.h>  
#include <SPI.h>
#include "maqr.c"



#define I2S_DOUT 25  // GPIO kết nối với DIN của MAX98357A
#define I2S_BCLK 27  // GPIO kết nối với BCLK của MAX98357A
#define I2S_LRC  26  // GPIO kết nối với LRC của MAX98357A

#define EEPROM_SIZE 96
#define SSID_ADDR 0
#define PASS_ADDR 32
#define MAX_LENGTH 32
#define LED_PIN 13  // Chân LED
TFT_eSPI tft = TFT_eSPI();
Audio audio;
String googleTTSBaseURL = "http://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=";
String googleTTSLang = "&tl=vi";

WebServer server(80);
bool configMode = false;

String serverURL = "http://192.168.0.106:4000/transaction/save-transaction";
String lastTransactionID = "";

// Lưu WiFi vào EEPROM
void saveWiFiConfig(const char* ssid, const char* pass) {
    EEPROM.begin(EEPROM_SIZE);
    EEPROM.writeBytes(SSID_ADDR, ssid, MAX_LENGTH);
    EEPROM.writeBytes(PASS_ADDR, pass, MAX_LENGTH);
    EEPROM.commit();
    EEPROM.end();
}

// Đọc WiFi từ EEPROM
void loadWiFiConfig(char* ssid, char* pass) {
    EEPROM.begin(EEPROM_SIZE);
    EEPROM.readBytes(SSID_ADDR, ssid, MAX_LENGTH);
    EEPROM.readBytes(PASS_ADDR, pass, MAX_LENGTH);
    EEPROM.end();
    ssid[MAX_LENGTH - 1] = '\0';
    pass[MAX_LENGTH - 1] = '\0';
}

// HTML nhập WiFi
String getHTML() {
    return "<!DOCTYPE html>"
           "<html><head><meta charset='UTF-8'><title>Cấu hình WiFi</title></head>"
           "<body><h2>Cấu hình WiFi</h2>"
           "<form action='/save' method='POST'>"
           "SSID: <input type='text' name='ssid'><br>"
           "Password: <input type='password' name='pass'><br>"
           "<input type='submit' value='Lưu WiFi'>"
           "</form>"
           "<br><a href='/clear'><button>Xóa WiFi</button></a>"
           "</body></html>";
}

// Xử lý lưu WiFi
void handleSaveWiFi() {
    if (server.hasArg("ssid") && server.hasArg("pass")) {
        String ssid = server.arg("ssid");
        String pass = server.arg("pass");
        saveWiFiConfig(ssid.c_str(), pass.c_str());

        server.send(200, "text/html", "<h3>Đã lưu! ESP sẽ khởi động lại...</h3>");
        delay(2000);
        ESP.restart();
    } else {
        server.send(400, "text/html", "<h3>Thiếu thông tin!</h3>");
    }
}

// Xóa WiFi
void clearWiFiConfig() {
    EEPROM.begin(EEPROM_SIZE);
    for (int i = 0; i < EEPROM_SIZE; i++) {
        EEPROM.write(i, 0);
    }
    EEPROM.commit();
    EEPROM.end();
    server.send(200, "text/html", "<h3>Đã xóa WiFi! ESP sẽ khởi động lại...</h3>");
    delay(2000);
    ESP.restart();
}

// Portal cấu hình WiFi
void startWiFiConfigPortal() {
    Serial.println("Đang phát WiFi cấu hình...");
    WiFi.softAP("ESP32_Setup");
    server.on("/", []() { server.send(200, "text/html", getHTML()); });
    server.on("/save", HTTP_POST, handleSaveWiFi);
    server.on("/clear", HTTP_GET, clearWiFiConfig);
    server.begin();

    configMode = true;
    Serial.println("Truy cập 192.168.4.1 để cài đặt WiFi");

    unsigned long startTime = millis();
    while (millis() - startTime < 180000) {
        server.handleClient();
    }

    Serial.println("Hết thời gian cấu hình, khởi động lại!");
    ESP.restart();
}

unsigned long displayStartTime = 0; // Lưu thời gian bắt đầu hiển thị
bool displayingAmount = false;      // Trạng thái đang hiển thị số tiền
bool audioPlaying = false;          // Trạng thái âm thanh đang phát
unsigned long audioEndTime = 0;  // Lưu thời gian âm thanh kết thúc
void playAudioFromGoogleTTS(String text) {
    text.replace(" ", "%20");
    if (text.length() > 100) {
        text = text.substring(0, 100);  // Giới hạn độ dài chuỗi
    }
    String audioURL = googleTTSBaseURL + text + googleTTSLang;
    
    Serial.println("🔊 Phát âm thanh từ: " + audioURL);
    
    audio.connecttohost(audioURL.c_str());
    audioPlaying = true;  // Đánh dấu trạng thái đang phát âm thanh
}

void setup() {
    Serial.begin(115200);
    audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
    audio.setVolume(100);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);  // Tắt LED lúc đầu
     tft.init();
    tft.setRotation(2);
    tft.fillScreen(TFT_BLACK);

    tft.invertDisplay(false);
    tft.setSwapBytes(true);

    // Kích thước màn hình
    int screen_width = 240;
    int screen_height = 320;

    // Kích thước ảnh
    int image_width = 240;
    int image_height = 240;

    // Tính toán vị trí căn giữa
    int x = (screen_width - image_width) / 2;
    int y = 0;

    // Vẽ ảnh tại vị trí căn giữa
    tft.pushImage(x, y, image_width, image_height, (uint16_t*)gImage_maqr);

    char savedSSID[MAX_LENGTH] = "";
    char savedPass[MAX_LENGTH] = "";
    loadWiFiConfig(savedSSID, savedPass);

    WiFi.begin(savedSSID, savedPass);
    Serial.print("Đang kết nối WiFi...");
    int count = 0;

    while (WiFi.status() != WL_CONNECTED && count < 15) {
        digitalWrite(LED_PIN, count % 2);  // Nháy LED
        delay(500);
        Serial.print(".");
        count++;
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nKhông kết nối được, vào chế độ cấu hình WiFi!");
        startWiFiConfigPortal();
    } else {
        Serial.println("\nKết nối WiFi thành công!");
        Serial.print("Địa chỉ IP: ");
        Serial.println(WiFi.localIP());
        digitalWrite(LED_PIN, HIGH);  // Bật LED khi kết nối thành công
    }
}

// Gửi dữ liệu giao dịch lên MongoDB
void sendToMongoDB(String id, String transaction_date, String account_number, double amount_in, double amount_out, String bank_brand_name, String transaction_content) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverURL);
        http.addHeader("Content-Type", "application/json");

        // Tạo JSON để gửi
        DynamicJsonDocument doc(512);
        doc["id"] = id;
        doc["transaction_date"] = transaction_date;
        doc["account_number"] = account_number;
        doc["amount_in"] = amount_in;
        doc["amount_out"] = amount_out;
        doc["bank_brand_name"] = bank_brand_name;
        doc["transaction_content"] = transaction_content;

        String postData;
        serializeJson(doc, postData);

        Serial.println("Dữ liệu gửi lên server:");
        Serial.println(postData);

        int httpResponseCode = http.POST(postData);
        Serial.print("Phản hồi từ server: ");  
        Serial.println(httpResponseCode);
        Serial.println(http.getString());
        http.end();
    } else {
        Serial.println("WiFi chưa kết nối!");
    }
}

void checkForNewTransaction() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String apiURL = "https://my.sepay.vn/userapi/transactions/list?account_number=10112003888&limit=1";
        http.begin(apiURL);
        http.addHeader("Authorization", "Bearer C7FEA2GUIRCJEMA9LQABUKTYQH8HNW44MGRDDVMLWIDJGSXA7PLUUXBTSXFZ3OIT");

        int httpResponseCode = http.GET();
        
        if (httpResponseCode > 0) {
            String response = http.getString();

            DynamicJsonDocument doc(2048);
            DeserializationError error = deserializeJson(doc, response);
            if (error) {
                return;
            }

            JsonArray transactions = doc["transactions"];
            if (transactions.size() > 0) {
                JsonObject transaction = transactions[0];
                String id = transaction["id"].as<String>();
                
                double amountIn = transaction["amount_in"].as<const char*>() ? atof(transaction["amount_in"].as<const char*>()) : 0;

                if (id != lastTransactionID) {
                    lastTransactionID = id;

                    sendToMongoDB(
                        id,
                        transaction["transaction_date"].as<String>(),
                        transaction["account_number"].as<String>(),
                        amountIn,
                        transaction["amount_out"].as<double>(),
                        transaction["bank_brand_name"].as<String>(),
                        transaction["transaction_content"].as<String>()
                    );

                    if (amountIn > 0) {
                        String ttsMessage = "%C4%90%C3%A3+nh%E1%BA%ADn+%C4%91%C6%B0%E1%BB%A3c" + String(amountIn, 0) + "%C4%90%E1%BB%93ng";
                        playAudioFromGoogleTTS(ttsMessage);

                        // Hiển thị số tiền trên màn hình TFT
                        tft.fillRect(0, 250, 240, 70, TFT_BLACK);
                        tft.setTextColor(TFT_WHITE, TFT_BLACK);
                        tft.setTextSize(3);
                        String amountText = "+" + String(amountIn, 0) + " VND";
                        int textWidth = tft.textWidth(amountText); 
                        int xPos = (240 - textWidth) / 2;
                        int yPos = 270;  
                        tft.setCursor(xPos, yPos);
                        tft.print(amountText);

                        // Lưu thời gian bắt đầu hiển thị
                        displayStartTime = millis();
                        displayingAmount = true;
                    }
                } else {
                    delay(10000);
                    Serial.println("⚠️ Giao dịch đã tồn tại, không phát âm thanh.");
                    audio.stopSong();
                    tft.fillRect(0, 250, 240, 70, TFT_BLACK);
                }
            }
        } else {
            Serial.print("Lỗi kết nối API: ");
            Serial.println(httpResponseCode);
        }
        http.end();
    }
}

// Kiểm tra trạng thái âm thanh
void audio_eof_mp3(const char *info) {
    Serial.println("🔊 Âm thanh đã kết thúc");
    audioPlaying = false; // Đánh dấu âm thanh đã kết thúc
}
void loop() {
    static unsigned long lastCheckTime = 0;
    const int reconnectTimeout = 10000;
    
    if (millis() - lastCheckTime > reconnectTimeout) {
        lastCheckTime = millis();
        checkForNewTransaction();
    }
    
    // Kiểm tra xem âm thanh còn đang phát không
    if (audioPlaying && !audio.isRunning()) {
        Serial.println("🔊 Âm thanh đã phát xong!");
        audioPlaying = false;
        audioEndTime = millis();  // Lưu thời gian kết thúc phát âm
    }
    // Xóa số tiền chỉ khi đã đủ 15 giây và âm thanh đã phát xong ít nhất 3 giây
    if (displayingAmount && millis() - displayStartTime > 10000 && millis() - audioEndTime > 2000) {
        Serial.println("🖥️ Xóa hiển thị số tiền...");
        tft.fillRect(0, 250, 240, 70, TFT_BLACK);
        displayingAmount = false;
    }

    audio.loop(); // Tiếp tục phát âm thanh
}
