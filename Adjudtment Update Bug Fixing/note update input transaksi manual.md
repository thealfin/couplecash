Lakukan adjustment, update, dan bug fixing pada modul TRANSAKSI / CATAT TRANSAKSI pada aplikasi CoupleCash.

Gunakan screenshot UI "Catat Transaksi" yang diberikan sebagai referensi visual utama.

JANGAN mengubah konsep utama UI yang sudah ada.
Pertahankan struktur, visual language, warna, typography, spacing, card style, segmented control Pengeluaran/Pemasukan, input nominal, rincian transaksi, financial account selector, owner/source selector, dan tombol Simpan Transaksi.

Tujuan utama update:

1. Menambahkan kemampuan AI / OCR / receipt parsing untuk mendeteksi data transaksi.
2. Menambahkan field pajak (tax_amount).
3. Menambahkan metode pembayaran (payment_method).
4. Menghubungkan transaksi dengan financial_accounts secara konsisten.
5. Memastikan data hasil AI tetap dapat dikoreksi secara manual sebelum disimpan.
6. Menjaga backward compatibility terhadap transaksi lama.
7. Jangan membuat field atau tabel baru yang sebenarnya sudah direpresentasikan oleh kolom existing.
8. Jangan mengubah scope fitur pembagian harta bersama yang sebelumnya telah ditentukan.

==================================================
A. DATA YANG HARUS DAPAT DIDETEKSI
==================================================

Ketika user memasukkan transaksi melalui receipt / kamera / OCR / AI extraction, sistem harus mencoba mendeteksi:

✓ Merchant
→ database field: transactions.merchant_name

✓ Tanggal transaksi
→ database field: transactions.transaction_date

✓ Item / detail transaksi
→ database field: transactions.note

✓ Total transaksi
→ database field: transactions.amount

✓ Pajak
→ database field BARU: transactions.tax_amount

✓ Metode pembayaran
→ database field BARU: transactions.payment_method

✓ Pos akun finansial yang digunakan
→ gunakan field existing:
   transactions.account_id
→ relasikan ke:
   financial_accounts.id

Jangan membuat kolom financial_account_id baru karena database sudah memiliki:
transactions.account_id

Jangan membuat tabel financial_accounts baru.

==================================================
B. DEFINISI AMOUNT DAN TAX_AMOUNT
==================================================

Gunakan definisi berikut secara konsisten:

transactions.amount
= TOTAL AKHIR transaksi / grand total yang benar-benar dibayar.

transactions.tax_amount
= nominal pajak yang termasuk di dalam total transaksi.

Contoh:

Subtotal      Rp100.000
Pajak         Rp11.000
Grand Total   Rp111.000

Maka:

amount     = 111000
tax_amount = 11000

Jangan menganggap amount sebagai subtotal.

Jika receipt hanya memberikan:
Subtotal + Tax + Total

maka:
amount = Total
tax_amount = Tax

Jika receipt tidak memiliki pajak:
tax_amount = 0

Jika AI tidak yakin terhadap nominal pajak:
tax_amount = 0 atau null sesuai implementation pattern existing,
dan UI harus tetap memungkinkan user mengisinya secara manual.

Untuk menjaga konsistensi database, prioritaskan:
tax_amount NOT NULL DEFAULT 0

==================================================
C. UPDATE DATABASE
==================================================

Tambahkan kolom berikut ke public.transactions:

1. tax_amount
2. payment_method

Gunakan numeric untuk tax_amount.

Gunakan enum untuk payment_method dengan nilai:

QRIS
DEBIT_CARD
CREDIT_CARD
BANK_TRANSFER
VIRTUAL_ACCOUNT

Nama enum boleh mengikuti convention enum yang sudah digunakan project, tetapi jangan membuat duplicate enum apabila enum tersebut sudah tersedia.

Jika enum belum tersedia, buat:

CREATE TYPE public.payment_method AS ENUM (
  'QRIS',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'VIRTUAL_ACCOUNT'
);

Kemudian tambahkan:

ALTER TABLE public.transactions
ADD COLUMN tax_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.transactions
ADD COLUMN payment_method public.payment_method;

Tambahkan validasi:

tax_amount >= 0

dan:

tax_amount <= amount

Jika database convention menggunakan CHECK constraint, gunakan:

CHECK (tax_amount >= 0 AND tax_amount <= amount)

Pastikan transaksi lama tetap valid.

Transaksi existing harus otomatis mendapatkan:

tax_amount = 0

payment_method = NULL

Jangan melakukan destructive migration.

Jangan menghapus atau rename column existing.

==================================================
D. PAYMENT METHOD RULE
==================================================

payment_method hanya digunakan untuk metode pembayaran NON-CASH / NON-TUNAI dan NON-CRYPTO.

Pilihan enum:

QRIS
DEBIT_CARD
CREDIT_CARD
BANK_TRANSFER
VIRTUAL_ACCOUNT

Jangan memasukkan:

CASH
TUNAI
CRYPTO

ke enum tersebut.

Untuk CASH/TUNAI:
payment_method = NULL

Untuk CRYPTO:
payment_method = NULL

Karena metode tersebut bukan bagian dari pilihan payment_method yang baru.

Sumber utama untuk mengetahui jenis pembayaran tetap financial_accounts.

Gunakan:

transactions.account_id
→ financial_accounts.id

Kemudian periksa account_type dari financial_accounts.

Jangan membuat duplicate payment/account classification jika sistem existing sudah memiliki account_type.

==================================================
E. LOGIC PAYMENT METHOD DI UI
==================================================

Pada form Catat Transaksi:

Financial Account / Dompet / Rekening tetap menjadi selector utama.

Contoh:

DOMPET / REKENING
[ GoPay Bersama ▼ ]

Setelah financial account dipilih:

Jika account tersebut merupakan cash/tunai:
→ jangan tampilkan field Metode Pembayaran
→ payment_method = NULL

Jika account tersebut merupakan crypto:
→ jangan tampilkan field Metode Pembayaran
→ payment_method = NULL

Jika account tersebut merupakan metode non-cash/non-crypto:
→ tampilkan field:

METODE PEMBAYARAN

[ QRIS ▼ ]

Pilihan:

QRIS
Kartu Debit
Kartu Kredit
Transfer Bank
Virtual Account

Mapping database:

QRIS → QRIS
Kartu Debit → DEBIT_CARD
Kartu Kredit → CREDIT_CARD
Transfer Bank → BANK_TRANSFER
Virtual Account → VIRTUAL_ACCOUNT

Field ini bersifat conditional.

Jangan membuat UI payment method muncul secara permanen untuk semua transaksi.

==================================================
F. INPUT TAX DI UI
==================================================

Tambahkan input:

PAJAK

[ Rp 0 ]

atau format currency sesuai design system existing.

Letakkan secara natural di bagian "Rincian Transaksi".

Prioritas layout:

Nama Transaksi / Merchant
Kategori + Dompet/Rekening
Tanggal + Metode Pembayaran
Pajak + Catatan

Jika layar terlalu sempit, gunakan responsive stacking.

Untuk mobile:
field tetap nyaman disentuh.

Jangan membuat UI menjadi terlalu padat.

Gunakan visual language existing CoupleCash.

Tax input harus tersedia untuk:

Pengeluaran
dan
Pemasukan

Bukan hanya Pengeluaran.

==================================================
G. VALIDASI TAX
==================================================

Validasi client-side:

tax_amount >= 0

tax_amount <= amount

Contoh valid:

Amount:
Rp100.000

Tax:
Rp11.000

Contoh invalid:

Amount:
Rp100.000

Tax:
Rp110.000

Tampilkan error:

"Pajak tidak boleh lebih besar dari total transaksi."

Jangan memperbolehkan user menyimpan transaksi invalid.

Backend juga WAJIB melakukan validasi yang sama.

Jangan hanya mengandalkan frontend validation.

==================================================
H. AI / OCR TRANSACTION EXTRACTION
==================================================

Update pipeline AI/OCR transaction extraction agar output terstruktur menjadi:

{
  "merchant_name": "...",
  "transaction_date": "...",
  "note": "...",
  "amount": 0,
  "tax_amount": 0,
  "payment_method": null,
  "account_id": null,
  "category_id": null
}

Jangan mengarang data yang tidak ditemukan.

Jika field tidak terdeteksi:

merchant_name = null
transaction_date = null
note = null
tax_amount = 0
payment_method = null
account_id = null

AI harus membedakan:

subtotal
tax
grand total

Jika receipt memiliki:

Subtotal: Rp100.000
PPN: Rp11.000
Total: Rp111.000

hasil:

amount = 111000
tax_amount = 11000

BUKAN:

amount = 100000
tax_amount = 11000

==================================================
I. PAYMENT METHOD DETECTION
==================================================

AI/OCR boleh mendeteksi metode pembayaran jika terdapat indikasi jelas.

Contoh:

QRIS
→ QRIS

VISA / Debit
→ DEBIT_CARD atau CREDIT_CARD hanya jika receipt memberikan indikasi yang cukup jelas.

Transfer Bank
→ BANK_TRANSFER

Virtual Account
→ VIRTUAL_ACCOUNT

Jika tidak yakin:

payment_method = null

Jangan melakukan hallucination.

Jika financial account yang dipilih adalah cash/tunai atau crypto:
selalu override:

payment_method = null

meskipun AI membaca informasi payment method dari receipt.

==================================================
J. FINANCIAL ACCOUNT DETECTION
==================================================

transactions.account_id harus tetap mengarah ke:

financial_accounts.id

AI boleh memberikan candidate account berdasarkan informasi receipt.

Namun AI TIDAK BOLEH membuat financial account baru secara otomatis.

Contoh:

Receipt menunjukkan:
QRIS
GoPay

Jika terdapat financial account:

GoPay Bersama

maka sistem boleh memberikan suggestion:

"GoPay Bersama"

Tetapi user tetap memiliki kontrol untuk memilih account.

Jika tidak ada matching financial account:
account_id = null

dan user harus memilih account sebelum transaksi dapat disimpan.

Jangan membuat akun baru secara otomatis.

==================================================
K. AI CONFIDENCE
==================================================

Gunakan existing field:

transactions.ai_confidence

untuk menyimpan confidence keseluruhan hasil extraction.

Jika architecture existing mendukung confidence per-field, boleh tambahkan metadata internal.

Namun jangan mengubah schema secara berlebihan hanya untuk kebutuhan ini.

Minimal confidence dapat digunakan untuk menentukan apakah field perlu dikonfirmasi user.

Contoh:

confidence tinggi:
→ isi field otomatis

confidence rendah:
→ isi field tetapi berikan visual indication agar user memeriksa.

User harus selalu dapat mengedit hasil AI sebelum save.

==================================================
L. UI AI EXTRACTION
==================================================

Setelah receipt berhasil diproses:

Tampilkan hasil extraction ke form transaksi yang sama.

Contoh:

Merchant
[ Starbucks                 ]

Tanggal
[ 05 Sep 2026              ]

Nominal
Rp
111.000

Pajak
Rp
11.000

Kategori
[ Makanan & Minuman ▼ ]

Dompet/Rekening
[ GoPay Bersama ▼ ]

Metode Pembayaran
[ QRIS ▼ ]

Catatan
[ Latte + pastry           ]

User dapat melakukan koreksi.

Jangan langsung menyimpan hasil AI tanpa confirmation.

==================================================
M. MANUAL TRANSACTION FLOW
==================================================

Untuk input manual tanpa receipt:

User tetap dapat mengisi:

1. Tipe transaksi
   Pengeluaran / Pemasukan

2. Nominal

3. Nama transaksi / merchant

4. Kategori

5. Dompet/Rekening

6. Tanggal

7. Pajak

8. Metode pembayaran
   hanya jika applicable

9. Catatan

10. Penanggung jawab / sumber

Kemudian:

[Simpan Transaksi]

==================================================
N. OWNER / PENANGGUNG JAWAB
==================================================

Pertahankan behavior existing:

Penanggung Jawab / Sumber

[ Suami ]
[ Bersama ]

Jangan mengubah logic ownership hanya karena adanya payment_method atau tax_amount.

tax_amount dan payment_method adalah atribut transaksi,
bukan ownership.

==================================================
O. API / BACKEND
==================================================

Update seluruh endpoint transaksi yang relevan.

Minimal:

CREATE transaction
GET transaction
GET transaction detail
UPDATE transaction
LIST transactions
AI transaction extraction / OCR endpoint
receipt parsing endpoint jika tersedia

Payload create/update harus mendukung:

{
  "account_id": "uuid",
  "category_id": "uuid",
  "recorded_by_user_id": "uuid",
  "owner_type": "...",
  "type": "...",
  "amount": 111000,
  "tax_amount": 11000,
  "transaction_date": "2026-09-05",
  "transaction_time": "...",
  "merchant_name": "Example Merchant",
  "note": "Example item",
  "payment_method": "QRIS"
}

Jika cash/tunai:

"payment_method": null

Jika crypto:

"payment_method": null

Backend wajib memvalidasi:

1. account_id valid
2. account_id berasal dari household yang sama
3. category_id valid jika diberikan
4. tax_amount >= 0
5. tax_amount <= amount
6. payment_method hanya boleh digunakan untuk account type yang applicable
7. payment_method harus NULL untuk cash/tunai/crypto
8. user memiliki akses terhadap household tersebut

Jangan mempercayai validation dari client.

==================================================
P. DATABASE CONSISTENCY
==================================================

Pastikan:

transactions.household_id
harus konsisten dengan:

financial_accounts.household_id

Jangan sampai user dari household A dapat menyimpan transaction menggunakan account household B.

Jika category digunakan:
category.household_id juga harus sesuai.

Jika recorded_by_user_id digunakan:
pastikan user merupakan member dari household transaksi.

==================================================
Q. TRANSACTION RESPONSE
==================================================

GET transaction sebaiknya mengembalikan informasi:

{
  "id": "...",
  "amount": 111000,
  "tax_amount": 11000,
  "merchant_name": "...",
  "transaction_date": "...",
  "payment_method": "QRIS",
  "account": {
    "id": "...",
    "name": "GoPay Bersama"
  },
  "category": {
    "id": "...",
    "name": "Makanan & Minuman"
  }
}

Jangan memaksa frontend melakukan query tambahan jika API existing sudah menggunakan relational response pattern.

Ikuti architecture API yang sudah digunakan project.

==================================================
R. TRANSACTION DETAIL UI
==================================================

Pada detail transaksi, tampilkan:

Total
Rp111.000

Pajak
Rp11.000

Merchant
Example Merchant

Tanggal
05 Sep 2026

Dompet/Rekening
GoPay Bersama

Metode Pembayaran
QRIS

Kategori
Makanan & Minuman

Catatan
Latte + pastry

Jika tax_amount = 0:
boleh tampilkan:

Pajak
Tidak ada

atau sembunyikan baris pajak sesuai design system existing.

Jika payment_method = null karena CASH/TUNAI/CRYPTO:
jangan tampilkan:
"Metode Pembayaran: -"

Lebih baik hide row tersebut.

==================================================
S. TRANSACTION LIST
==================================================

Pastikan transaksi lama tetap dapat ditampilkan.

Jika:

tax_amount = 0
payment_method = null

tidak boleh menyebabkan UI error.

Transaction list existing tidak perlu diubah secara drastis.

Jika terdapat detail preview:
boleh menampilkan indikator kecil seperti:

PPN
QRIS

tetapi jangan membuat list terlalu ramai.

==================================================
T. MIGRATION SAFETY
==================================================

Migration harus backward compatible.

Existing transaction:

amount = 50000

akan menjadi:

amount = 50000
tax_amount = 0
payment_method = NULL

Tidak boleh ada data existing yang hilang.

Jangan mengubah:

merchant_name
note
amount
transaction_date
account_id
category_id
owner_type
type

kecuali memang diperlukan untuk compatibility.

==================================================
U. IMPORTANT: SCOPE PEMBAGIAN HARTA BERSAMA
==================================================

Jangan mengubah scope fitur pembagian harta bersama yang telah ditentukan sebelumnya.

Fitur pembagian hanya berlaku terhadap:

- harta/transaksi yang memang masuk scope pembagian
- data yang berasal dari Pos Akun & Goals
- data yang memiliki atas nama bersama
- item yang user pilih "mau dibagi"

Aset dan data di luar scope tidak boleh otomatis masuk ke pembagian.

Untuk semua element table lain yang bukan termasuk item yang secara eksplisit ditandai sebagai data bersama yang dibagi, tetap mengikuti logic sebelumnya:

data individual harus menjadi dua data terpisah untuk masing-masing pasangan.

Termasuk:

- kategori pengeluaran
- kategori pemasukan
- pos budget
- tagihan
- kewajiban/hutang

Jangan mencampurkan logic payment_method/tax dengan logic pembagian harta.

==================================================
V. UI PRESERVATION
==================================================

Gunakan screenshot yang diberikan sebagai visual reference.

Pertahankan:

- header CoupleCash
- avatar pasangan
- back button
- segmented Pengeluaran/Pemasukan
- section Bayar Tagihan Tertunda
- card Nominal Pengeluaran
- quick amount buttons
- card Rincian Transaksi
- input merchant
- kategori
- dompet/rekening
- tanggal
- catatan
- Penanggung Jawab/Sumber
- tombol Simpan Transaksi

Jangan melakukan redesign besar.

Tambahkan field baru secara harmonis.

Recommended structure:

RINCIAN TRANSAKSI

Nama Transaksi / Merchant
[ ... ]

Kategori
[ ... ]

Dompet / Rekening
[ ... ]

Tanggal Transaksi
[ ... ]

Pajak
[ Rp 0 ]

Metode Pembayaran
[ QRIS ▼ ]

Catatan
[ ... ]

Metode Pembayaran hanya muncul jika financial account yang dipilih membutuhkan field tersebut.

==================================================
W. UX PRIORITY
==================================================

Prioritaskan:

1. Cepat diinput
2. Tidak membuat form terlalu panjang
3. Field conditional
4. AI membantu, bukan mengambil alih
5. User tetap dapat mengoreksi
6. Validasi jelas
7. Tidak ada data hallucination
8. Existing transaction tetap aman

Tax dan payment method merupakan informasi tambahan,
bukan informasi yang boleh mengganggu primary flow pencatatan transaksi.

==================================================
X. TESTING
==================================================

Buat / update test untuk minimal skenario berikut:

CASE 1:
Pengeluaran cash
amount = 100000
tax_amount = 0
payment_method = NULL

CASE 2:
Pengeluaran QRIS
amount = 111000
tax_amount = 11000
payment_method = QRIS

CASE 3:
Pengeluaran kartu debit
amount = 111000
tax_amount = 11000
payment_method = DEBIT_CARD

CASE 4:
Pengeluaran transfer bank
amount = 111000
tax_amount = 11000
payment_method = BANK_TRANSFER

CASE 5:
Tax lebih besar dari amount
→ reject

CASE 6:
Tax negatif
→ reject

CASE 7:
Crypto account
→ payment_method harus NULL

CASE 8:
Receipt tanpa tax
→ tax_amount = 0

CASE 9:
Receipt dengan subtotal + tax + total
→ amount = grand total
→ tax_amount = tax

CASE 10:
Receipt tidak memiliki payment method
→ payment_method = NULL

CASE 11:
AI salah mendeteksi
→ user dapat mengubah sebelum save

CASE 12:
Existing transaction lama
→ tetap dapat dibuka dan diedit

CASE 13:
Account dari household berbeda
→ reject

CASE 14:
Category dari household berbeda
→ reject

==================================================
Y. ACCEPTANCE CRITERIA
==================================================

Feature dianggap selesai hanya jika:

✓ Database memiliki transactions.tax_amount
✓ Database memiliki transactions.payment_method
✓ Existing transaction tetap aman
✓ API CREATE mendukung kedua field
✓ API UPDATE mendukung kedua field
✓ API GET mengembalikan kedua field
✓ AI extraction mendeteksi tax
✓ AI extraction mendeteksi payment method jika tersedia
✓ AI extraction mendeteksi merchant
✓ AI extraction mendeteksi tanggal
✓ AI extraction mendeteksi item/note
✓ AI extraction mendeteksi total
✓ AI/account matching menggunakan transactions.account_id
✓ Tidak membuat financial_accounts baru otomatis
✓ Payment method hanya muncul untuk account yang applicable
✓ Cash/tunai tidak menggunakan payment_method
✓ Crypto tidak menggunakan payment_method
✓ Tax dapat diinput manual
✓ Tax berlaku untuk Pengeluaran dan Pemasukan
✓ Tax tidak boleh > amount
✓ User dapat mengoreksi hasil AI
✓ Backend melakukan validation
✓ Frontend melakukan validation
✓ UI tetap mengikuti design CoupleCash existing
✓ Tidak merusak flow transaksi existing
✓ Tidak merusak logic pembagian harta bersama
✓ Tidak mengubah scope aset di luar pembagian harta bersama
✓ Tidak membuat duplicate financial account
✓ Tidak membuat duplicate field account_id

==================================================
Z. IMPLEMENTATION PRINCIPLE
==================================================

Sebelum melakukan perubahan:

1. Audit schema existing.
2. Audit enum existing.
3. Audit API transaksi.
4. Audit service/repository transaksi.
5. Audit AI/OCR extraction.
6. Audit form Catat Transaksi.
7. Audit financial account type mapping.
8. Audit transaction detail/list.
9. Audit test existing.

Jangan mengasumsikan nama enum atau API yang tidak ada.

Jika enum payment method belum tersedia:
buat enum baru.

Jika enum sudah tersedia:
gunakan enum existing.

Jika API sudah memiliki DTO/schema:
extend DTO tersebut, jangan membuat endpoint duplicate.

Jika service transaksi sudah memiliki validation:
tambahkan validation pada service existing.

Jika form menggunakan schema validation seperti Zod/Yup/Valibot:
extend schema existing.

Jika backend menggunakan generated database types:
regenerate/update type definitions setelah migration.

Setelah implementasi, lakukan full type-check, lint, test, dan build.

Jangan berhenti hanya setelah UI terlihat benar.

Pastikan seluruh stack:

DATABASE
↓
MODEL / TYPES
↓
API
↓
SERVICE
↓
AI EXTRACTION
↓
STATE MANAGEMENT
↓
FORM VALIDATION
↓
UI
↓
TRANSACTION DETAIL/LIST

konsisten menggunakan:

tax_amount
payment_method
account_id

Jangan ada naming mismatch seperti:

tax
taxAmount
paymentMethodId
financial_account_id

di layer database/API jika convention project menggunakan snake_case.

Frontend boleh menggunakan camelCase sesuai convention project, tetapi mapping harus eksplisit dan konsisten.

==================================================
FINAL REQUIREMENT
==================================================

Implementasikan fitur ini sebagai production-ready enhancement pada modul transaksi CoupleCash.

Jangan hanya membuat mockup.

Jangan hanya mengubah UI.

Jangan hanya mengubah database.

Seluruh perubahan harus terintegrasi end-to-end.

Pertahankan existing architecture dan design system.

Jika menemukan bug existing yang secara langsung berkaitan dengan transaksi, perbaiki tanpa melakukan refactor besar yang tidak diperlukan.

Setelah selesai, berikan ringkasan:

1. Database migration yang dibuat
2. Enum yang ditambahkan/diubah
3. API yang diubah
4. AI extraction yang diubah
5. UI yang diubah
6. Validation yang ditambahkan
7. Test yang ditambahkan
8. File yang diubah
9. Potensi breaking change, jika ada