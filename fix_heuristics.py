import json
import re
import random

with open("mevzuat_sorulari.json", "r", encoding="utf-8") as f:
    data = json.load(f)

sorular = data.get("sorular", [])

kurumlar = [
    "Ulaştırma ve Altyapı Bakanlığı", "İçişleri Bakanlığı", "Sanayi ve Teknoloji Bakanlığı",
    "TSE", "Belediye Encümeni", "İl Özel İdaresi", "Rekabet Kurumu"
]

zamanlar = ["15 gün", "30 gün", "45 gün", "6 ay", "1 yıl", "5 yıl", "10 yıl", "48 saat", "72 saat"]
yuzdeler = ["%5", "%10", "%20", "%30", "%50", "%100"]

for q in sorular:
    secenekler = q.get("secenekler", {})
    mevcut_cevaplar = " ".join([v for k,v in secenekler.items() if k != 'E'])
    
    # Yeni bir E şıkkı belirle
    yeni_e = ""
    
    # 1. Yüzde kontrolü
    if re.search(r"%\s*[0-9]+", mevcut_cevaplar):
        yeni_e = random.choice([y for y in yuzdeler if y not in mevcut_cevaplar])
    
    # 2. Sayı / Süre kontrolü
    elif re.search(r"\b[0-9]+\s*(yıl|ay|gün|saat)\b", mevcut_cevaplar):
        yeni_e = random.choice([z for z in zamanlar if z not in mevcut_cevaplar])
        
    # 3. Bakanlık / Kurum kontrolü
    elif any(k in mevcut_cevaplar for k in ["Bakanlık", "Belediye", "Kurum", "BOTAŞ", "EPDK", "Valilik"]):
        yeni_e = random.choice([k for k in kurumlar if k not in mevcut_cevaplar])
        
    # 4. Evet/Hayır/Sadece tipli cevaplar
    elif any(k in mevcut_cevaplar for k in ["Sadece", "Yalnızca", "Evet", "Hayır"]):
        yeni_e = "Duruma göre kısmen uygulanır"
        
    # 5. Genel Şıklar
    else:
        # Eğer çok uzun cevaplı bir soruysa (kavramsal)
        if len(mevcut_cevaplar) > 80:
            yeni_e = "Yukarıdakilerin hepsi" if "hepsi" not in mevcut_cevaplar.lower() else "Hiçbiri"
        else:
            yeni_e = "Mevzuatta belirtilmemiştir"

    # E şıkkını güncelle
    secenekler["E"] = yeni_e
    q["secenekler"] = secenekler

with open("mevzuat_sorulari.json", "w", encoding="utf-8") as f:
    json.dump({"sorular": sorular}, f, ensure_ascii=False, indent=2)

print("Tüm E şıkları mantıksal kurallarla (Heuristics) güncellendi!")
