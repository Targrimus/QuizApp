import json
import urllib.request
import urllib.error
import time

API_KEY = "AIzaSyAiJ6uTwKv_m2FVah1c4-5B64tzbB6rkKI"

def call_gemini(questions_chunk):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key={API_KEY}"
    
    prompt = """
Aşağıda Türkçe Doğal Gaz Mevzuatı ile ilgili bir JSON soru dizisi verilmiştir.
Şu anda bu sorulardaki "E" şıkları rastgele atanmış olup (Örn: sayılar sorulurken 'Danıştay', kurum sorulurken 'Hiçbiri' gibi) tamamen MANTIKSIZ görünmektedir.

GÖREVİN:
Her bir soruyu incele ve sadece mantıksız duran "E" şıklarını, ANLAMSAL OLARAK (bağlama uygun) ÇOK MANTIKLI ancak yanlış olan yeni bir çeldirici ile Değiştir. Başka hiçbir şıkkı, soruyu veya IDsini değiştirme. "cevap" anahtarını koru.

Eğer soru sayı veya yüzde soruyorsa, E şıkkı da sayı/yüzde olmalı.
Eğer soru süre soruyorsa, E şıkkı süre olmalı.
Eğer soru bir bakanlık veya kurum soruyorsa, E şıkkı benzer başka bir kurum olmalı.
LÜTFEN SADECE VE SADECE DÜZELTİLMİŞ JSON DİZİSİNİ (ARRAY) DÖNDÜR. Markdown kullanma, düz metin JSON olsun.
"""
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"text": json.dumps(questions_chunk, ensure_ascii=False)}
            ]
        }],
        "generationConfig": {
            "temperature": 0.2
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        
        text = result['candidates'][0]['content']['parts'][0]['text']
        
        text = text.replace("```json", "").replace("```", "").strip()
        print("API yanıtı alındı ve temizlendi.")
        
        return json.loads(text)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"HTTP Hatası: {e.code} - {body}")
        return questions_chunk
    except Exception as e:
        print(f"Hata: {e}")
        return questions_chunk

def main():
    try:
        with open('mevzuat_sorulari.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Dosya okuma hatasi: {e}")
        return

    sorular = data.get('sorular', [])
    updated_sorular = []
    
    chunk_size = 25
    total = len(sorular)
    
    print(f"Toplam {total} soru islenecek...")
    
    for i in range(0, total, chunk_size):
        chunk = sorular[i:i+chunk_size]
        print(f"Isneniyor: {i} ile {i+len(chunk)} arasi...")
        
        fixed_chunk = call_gemini(chunk)
        
        if fixed_chunk and isinstance(fixed_chunk, list):
            updated_sorular.extend(fixed_chunk)
        else:
            print("API geçerli bir JSON array dönmedi. Orijinal chunk kullanılıyor.")
            updated_sorular.extend(chunk)
            
        time.sleep(3) # Rate limit'e takilmamak icin
        
    # Her ihtimale karsi boyut kontrolu
    if len(updated_sorular) > 0:
        with open('mevzuat_sorulari_fixed.json', 'w', encoding='utf-8') as f:
            json.dump({"sorular": updated_sorular}, f, ensure_ascii=False, indent=2)
        print("Islem bitti. mevzuat_sorulari_fixed.json kaydedildi.")
    else:
        print("Hata! Sorular bos dondu.")

if __name__ == "__main__":
    main()
