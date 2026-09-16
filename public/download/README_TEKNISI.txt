================================================================================
   PANDUAN CBT EXAMBROWSER STANDALONE (.EXE) - KHUSUS LAB KOMPUTER
================================================================================

Aplikasi ini sudah dikompilasi menjadi STANDALONE EXECUTABLE (.EXE).
Komputer client di laboratorium TIDAK PERLU menginstall Python atau aplikasi
tambahan apapun. Langsung klik dan jalan!

1. CARA PENGGUNAAN DI PC LAB:
   - Cukup salin 2 file ini ke PC Lab (misal di Desktop):
     1. CBT_EXAMBROWSER.exe
     2. config.json
   - Klik 2x pada 'CBT_EXAMBROWSER.exe'.
   - Layar akan langsung terkunci Fullscreen Borderless (menutupi seluruh layar
     dan taskbar Windows).

2. KEAMANAN KIOSK TINGKAT TINGGI:
   - Memblokir tombol curang: Alt+Tab, Alt+Esc, Ctrl+Esc, Windows Key, F11, F12.
   - Memblokir Alt+F4: Jika ditekan, aplikasi TIDAK AKAN keluar, melainkan
     langsung mengarahkan ke Menu Password Proktor.
   - Mematikan klik kanan (Context Menu) dan inspect element.
   - Otomatis menutup Task Manager jika ada siswa yang mencoba membukanya.

3. CARA KELUAR (KHUSUS PROKTOR & TEKNISI):
   - Tekan tombol kombinasi: Ctrl + Shift + Q
   - Masukkan Password Proktor (Default: admin).
   - Klik 'KELUAR UJIAN' -> Jendela tertutup dan kunci desktop dilepas normal.

4. CARA MENGUBAH PASSWORD PROKTOR:
   - Cara 1: Tekan Ctrl + Shift + Q -> Masukkan password saat ini -> Klik 'Ubah Password'.
   - Cara 2: Buka file 'config.json' dengan Notepad, lalu ubah baris 'exit_password'.

5. CARA MENGGANTI ALAMAT SERVER CBT:
   - Buka file 'config.json' dengan Notepad.
   - Ubah baris 'server_url', contoh: 'http://172.16.0.210'.
   - Simpan file (Ctrl + S).

6. FITUR AUTO-RECONNECT (SELF-HEALING) - HEMAT ENERGI TEKNISI:
   - Jika kabel LAN lepas, switch restart, atau jaringan terputus:
     Layar menampilkan animasi: 'KONEKSI TERPUTUS - MENCOBA TERHUBUNG KEMBALI'.
     Sistem akan mencoba ping otomatis ke server setiap 3 detik.
   - Begitu jaringan lab kembali menyala:
     Halaman ujian otomatis dimuat ulang tanpa teknisi harus keliling meja
     menekan tombol F5! Jawaban siswa tetap aman tersimpan di server.

7. SISWA PKL & SUSULAN (BYPASS EXAMBROWSER):
   - Siswa PKL atau susulan di rumah TIDAK PERLU memakai Exambrowser ini.
   - Proktor cukup mencentang tombol 'Bypass Exambro' pada siswa tersebut
     di Panel Admin Server CBT (http://172.16.0.210/admin/students).
   - Siswa yang di-bypass bisa langsung mengerjakan ujian lewat Google Chrome,
     Edge, atau HP Android/iOS tanpa diblokir server.

================================================================================
