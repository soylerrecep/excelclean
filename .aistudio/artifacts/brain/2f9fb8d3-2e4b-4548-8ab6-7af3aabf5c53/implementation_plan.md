# Excel Ürün & Fiyat Ayrıştırıcı ve Mutabakat Aracı

Karmaşık, çok katmanlı ERP sipariş/fatura Excel dosyalarından ürün satırlarını (**Stok Adı**, **Miktarı**, **Birimi**, **KDV Hariç Fiyatı** ve **KDV Oranı**) otomatik olarak ayıklayan, D sütunundaki dip genel toplam ile kuruşu kuruşuna mutabakat sağlayan ve temiz Excel (XLSX) / CSV formatında indirme imkanı sunan modern web uygulaması.

> [!IMPORTANT]
> **Kullanıcı Kararları & Mutabakat Kriteri**:
> - **Çıktı Formatı**: Kullanıcı tercihine göre temiz **Excel (XLSX)** ve **CSV** dosyası olarak doğrudan indirme + panoya kopyalama.
> - **Kolon Kapsamı**: Yalnızca saf ürün bilgileri listelenecek (**Stok Kodu**, **Stok Adı**, **Miktarı**, **Birimi**, **KDV Hariç Fiyatı**, **KDV Oranı**, **KDV Hariç Tutar**, **KDV Tutarı**, **KDV Dahil Toplam**).
> - **Kritik Doğrulama Şartı**: Excel'in D sütununda en altta yer alan genel dip toplam tutar otomatik tespit edilecek ve ayıklanan ürünlerin toplam tutarı ile karşılaştırılarak birebir mutabakat (Fark: 0,00 TL) kartı sunulacaktır.

---

## 1. Genel Bakış ve Temel İşlevler

- **Ne Yapar?**: ERP sistemlerinden (Logo, Netsis, Mikro vb.) dışa aktarılan, sipariş başlıkları, alt başlıklar, boşluklar ve ara toplamlarla dolu karmaşık Excel tablolarını anında ayrıştırır. Her ürün satırını temizler, sayısal değerleri düzeltir ve mutabakat kontrolü yapar.
- **Hedef Kitle**: Muhasebe sorumluları, satın alma uzmanları, depo ve stok yöneticileri.
- **Sağlanan Değer**: Saatler süren manuel Excel temizleme, filtreleme ve kopyala-yapıştır işlerini 2 saniyelik otomatik bir işleme dönüştürür; dip toplam eşleştirmesiyle insan hatasını sıfıra indirir.

---

## 2. Kullanıcı Deneyimi ve Tasarım Kurgusu

### A. Kullanıcı Akışı
1. **Dosya Yükleme & Örnek Veri**:
   - Geniş ve belirgin sürükle-bırak (drag & drop) alanı veya dosya seçici (`.xlsx`, `.xls`).
   - Tek tıkla denemek için **"Görseldeki Örnek Excel'i Yükle"** hazır deneme butonu.
2. **Akıllı Ayrıştırma & Mutabakat Ekranı**:
   - Yükleme anında çalışan hızlı ayrıştırıcı motor.
   - **Genel Mutabakat Kartı**:
     - *Excel D Sütunu Dip Toplamı* (Dosyadaki beyan edilen genel toplam).
     - *Ayıklanan Ürünlerin Toplamı* (Satırların matematiksel sağlama toplamı).
     - *Mutabakat Durumu*: Yeşil "Birebir Eşleşti (Fark: 0,00 ₺)" güven rozeti veya fark uyarısı.
   - **Özet Metrikler**: Toplam Ayıklanan Kalem Sayısı, Toplam Miktar, Toplam KDV Tutarı, KDV Hariç Matrah.
3. **Temiz Tablo & Arama/Filtre**:
   - Tablo üzerinde anlık arama (Stok adı veya koduna göre filtreleme).
   - KDV oranına göre hızlı filtreleme (%20, %10, %1).
   - Sayısal kolonlarda `tabular-nums` ile kusursuz hizalama.
4. **Dışa Aktarma & Paylaşım**:
   - **"Temiz Excel (XLSX) İndir"**: Biçimlendirilmiş başlıklar ve doğru sayı formatlarıyla hazır dosya.
   - **"CSV İndir"**: Türkçe karakter destekli (UTF-8 BOM) CSV.
   - **"Panoya Kopyala"**: Excel veya Google Sheets'e doğrudan yapıştırmak için sekme (TSV) kopyalama.

### B. Görsel Kimlik ve Tipografi
- **Tasarım Dili**: Kurumsal B2B finans & veri aracı, modern ve temiz SaaS gösterge paneli (SaaS Dashboard yönergelerine uygun).
- **Renk Paleti**:
  - Zemin: Arı nötr açık gri/beyaz (`#F8FAFC` / `#FFFFFF`), koyu mod desteği (`#0F172A`).
  - Vurgu: Güven veren zümrüt yeşili (`#059669` / `#10B981` mutabakat için) ve profesyonel çivit mavisi (`#2563EB` birincil eylemler).
  - Kenarlıklar: İnce 1px saç çizgileri (`border-slate-200`).
- **Tipografi**:
  - Başlıklar ve Etiketler: `Plus Jakarta Sans`
  - Sayısal Veriler, Tutarlar, Para Birimleri: `tabular-nums font-mono`

---

## 3. Ürün Kararları & Mimari Tercihler

- **Karar 1: İstemci Taraflı Güvenli Ayrıştırma (Client-side SheetJS / xlsx)**:
  - *Seçilen Yöntem*: Dosya sunucuya gönderilmeden kullanıcının tarayıcısında anında okunur ve ayrıştırılır.
  - *Neden*: Maksimum gizlilik (şirket mali verileri dışarı çıkmaz), sıfır bekleme süresi ve çevrimdışı çalışma kabiliyeti.
- **Karar 2: Akıllı Çok Katmanlı Satır Tanıma Algoritması**:
  - *Seçilen Yöntem*: Satırın bir ürün satırı olup olmadığını tespit etmek için kolon imzaları taranır. "Stok Adı", "Miktar", "KDV Hrc.Fiyat" gibi kolonlar dinamik olarak haritalanır; sipariş başlık satırları ("Yurtiçi İd Alınan...", "Sipariş No", "Ticari Unvanı") ve alt başlıklar elenir.
  - *Neden*: Farklı şablonlarda kolonların yeri 1-2 sütun kaysa bile algoritmik esneklik sağlar.
- **Karar 3: D Sütunu Dip Toplam Yakalama & Kuruş Mutabakatı**:
  - *Seçilen Yöntem*: Tablonun son satırlarında "Genel Toplam", "Dip Toplam" veya D sütunundaki en son sayısal toplam hücre tespit edilir. Ayıklanan kalemlerin matrah + KDV toplamı ile D sütunu toplamı karşılaştırılır.

---

## 4. Teknik Mimari & Veri Modeli

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kullanıcı Arayüzü                        │
│  ┌───────────────────────┐ ┌──────────────────────────────────┐  │
│  │   Excel Dosya Yükle   │ │    "Örnek Görsel Verisini Yükle" │  │
│  └───────────┬───────────┘ └─────────────────┬────────────────┘  │
└──────────────┼───────────────────────────────┼──────────────────┘
               │ File (.xlsx / .xls)           │ Önceden Ayrıştırılmış
               ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Ayrıştırma & Doğrulama Motoru                  │
│  1. SheetJS ile ham matrisin okunması                           │
│  2. Başlık ve ürün satırlarının ayrıştırılması                 │
│  3. D Sütunu dip toplamının tespiti                             │
│  4. Satır toplamlarının hesaplanması ve mutabakat kontrolü     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Sonuçlar & Çıktı Katmanı                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Mutabakat Sağlama Kartı (Excel Dip Toplam vs Satır Toplamı)│ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Canlı Filtrelenebilir & Aranabilir Temiz Ürün Tablosu      │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Dışa Aktar: [Temiz XLSX İndir] [CSV İndir] [Panoya Kopyala]│ │
└────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Veri Modeli (`ExtractedProductItem`)
- `id`: Benzersiz satır kimliği
- `stokKodu`: Ürün stok kodu (örn. "KS8", "7588200150M")
- `stokAdi`: Ürün adı (örn. "SERAMİK YAPIŞTIRICI 25 KG")
- `miktar`: Sayısal miktar (örn. 12.0)
- `birim`: Birim (örn. "TORBA", "METRE", "ADET")
- `kdvHaricFiyat`: Birim KDV hariç fiyatı (örn. 187.50 ₺)
- `kdvOrani`: KDV oranı yüzde (örn. 20, 10)
- `kdvHaricTutar`: Miktar × KDV Hariç Fiyat (örn. 2.250,00 ₺)
- `kdvTutari`: KDV Hariç Tutar × (KDV Oranı / 100) (örn. 450,00 ₺)
- `toplamTutar`: KDV Dahil Toplam Tutar (örn. 2.700,00 ₺)

---

## 5. Doğrulama ve Test Adımları
1. Kullanıcının paylaştığı ekran görüntüsündeki gerçek siparişler (S744, S741, S737, ASP8588 vb.) ve ürünler ile test.
2. D sütunu dip toplamının kuruş hassasiyetinde tuttuğunun doğrulanması.
3. İndirilen XLSX ve CSV dosyalarının Microsoft Excel'de hatasız ve Türkçe karakter sorunu olmadan açılmasının kontrolü.
