import os
import json
import time
import google.generativeai as genai

# ==========================================
# BURAYA KENDİ GEMİNİ API ANAHTARINIZI YAZIN
# ==========================================
API_KEY = "AIzaSyAiJ6uTwKv_m2FVah1c4-5B64tzbB6rkKI"

def setup_gemini():
    genai.configure(api_key=API_KEY)
    
    # Sistemin döndüreceği formatı garanti altına almak için sistem talimatı
    system_instruction = """
    Sen bir doğal gaz mevzuatı uzmanısın. Sana gönderilen metinden zorlayıcı, kaliteli ve mevzuata %100 uygun çoktan seçmeli sorular üretmekle görevlisin.
    Kurallar:
    1. Ürettiğin her sorunun en az 5 şıkkı (A, B, C, D, E) olmalı.
    2. Sorular doğrudan verdiğim metne dayanmalıdır, metin dışına çıkma.
    3. Dönüş formatı SADECE ve kesinlikle aşağıdaki gibi bir JSON dizisi (array) olmalıdır:
    [
      {
        "soru": "Soru metni burada",
        "secenekler": {
          "A": "Şık A",
          "B": "Şık B",
          "C": "Şık C",
          "D": "Şık D",
          "E": "Şık E"
        },
        "cevap": "Doğru şıkkın harfi (A, B, C, D veya E)"
      }
    ]
    JSON formatı dışında hiçbir açıklama, markdown işareti (```json gibi) veya merhaba gibi metinler ekleme. Sadece saf JSON döndür.
    """
    
    model = genai.GenerativeModel(
        model_name="gemini-3.1-pro-preview",
        system_instruction=system_instruction,
        generation_config={
            "temperature": 0.2, # Daha deterministik yanıtlar için
        }
    )
    return model

def get_text_chunks(file_path, chunk_size=3000):
    """Büyük metin dosyalarını API'nin daha iyi sindirebileceği parçalara böler."""
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Kelimelere böl
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        
    return chunks

def generate_questions_for_chunk(model, chunk, chunk_index, total_chunks, document_name, target_q_count):
    prompt = f"Aşağıdaki mevzuat metin parçasını oku ve bu metinden tam olarak {target_q_count} adet soru üret. Şıklar mutlaka A, B, C, D ve E olmalıdır.\n\nMetin:\n{chunk}"
    
    print(f"  -> {document_name} için parça {chunk_index}/{total_chunks} işleniyor... Hedef soru sayısı: {target_q_count}")
    
    try:
        response = model.generate_content(prompt)
        # Markdown bloklarını temizle (eğer API yinede markdown koyarsa)
        result_text = response.text.replace("```json", "").replace("```", "").strip()
        
        parsed_data = json.loads(result_text)
        if isinstance(parsed_data, list):
            return parsed_data
        else:
            print("     Uyarı: JSON bir dizi olarak dönmedi.")
            return []
    except Exception as e:
        print(f"     Hata oluştu (Parça işlenemedi): {e}")
        return []

def main():
    if API_KEY == "BURAYA_API_ANAHTARINIZI_YAPISTIRIN":
        print("LÜTFEN ÖNCE SCRIPT İÇERİSİNDEKİ API_KEY DEĞİŞKENİNİ KENDİ ANAHTARINIZ İLE DEĞİŞTİRİN!")
        return

    model = setup_gemini()
    
    mevzuat_klasoru = r"C:\Users\RIFAT\Desktop\AksaQuiz\Mevzuat"
    output_file = r"C:\Users\RIFAT\Desktop\AksaQuiz\mevzuat_sorulari.json"
    
    hedef_soru_sayisi = 500
    
    # .txt dosyalarını bul
    txt_files = [f for f in os.listdir(mevzuat_klasoru) if f.endswith(".txt")]
    
    if not txt_files:
        print("Mevzuat klasöründe .txt dosyası bulunamadı.")
        return
        
    # Her bir dosyadan ne kadar soru üretileceğini kabaca belirle
    soru_per_dosya = hedef_soru_sayisi // len(txt_files)
    
    final_output = {
        "sorular": [],
        "cevaplar": {} # Mevcut formattaki gibi ID -> Cevap olarak ayrılacak
    }
    
    global_question_id = 1
    
    for file_name in txt_files:
        doc_path = os.path.join(mevzuat_klasoru, file_name)
        
        # Dosya adını başlık yap (uzantıları temizle)
        baslik = file_name.replace(".docx.txt", "").replace(".doc.txt", "").replace(".txt", "").strip()
        print(f"\n[{baslik}] işlenmeye başlanıyor...")
        
        chunks = get_text_chunks(doc_path, chunk_size=2000)
        
        if not chunks:
            continue
            
        # Parça başına düşen soru sayısı
        soru_per_chunk = max(1, soru_per_dosya // len(chunks))
        # Kalan soruları ilk parçalara dağıtabiliriz, ama API bazen eksik bazen fazla üretir
        
        doc_questions = []
        for i, chunk in enumerate(chunks, 1):
            q_list = generate_questions_for_chunk(model, chunk, i, len(chunks), baslik, soru_per_chunk)
            
            for q_data in q_list:
                q_obj = {
                    "id": global_question_id,
                    "mevzuat_basligi": baslik,
                    "soru": q_data.get("soru", ""),
                    "secenekler": q_data.get("secenekler", {})
                }
                final_output["sorular"].append(q_obj)
                
                # Cevabı ayır
                final_output["cevaplar"][str(global_question_id)] = q_data.get("cevap", "A")
                global_question_id += 1
                
            # API rate limitlerine takılmamak için kısa bir bekleme
            time.sleep(4)
            
    # JSON Dosyasını kaydet
    print("\nÜretim tamamlandı! Toplam üretilen soru sayısı:", len(final_output["sorular"]))
    print("mevzuat_sorulari_yeni.json dosyasına yazılıyor...")
    
    with open("mevzuat_sorulari_yeni.json", "w", encoding="utf-8") as out_f:
        json.dump(final_output, out_f, ensure_ascii=False, indent=2)
        
    print("İşlem Başarılı! Dosya kaydedildi: mevzuat_sorulari_yeni.json")

if __name__ == "__main__":
    main()
