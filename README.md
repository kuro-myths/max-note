# Max Note

Aplikasi workspace catatan dan prompt AI dengan desain monokrom hitam-putih-abu-abu, dibangun menggunakan Next.js, TypeScript, dan Supabase.

## Fitur
- Autentikasi email/password melalui Supabase Auth (daftar, masuk, keluar).
- Dashboard ringkasan, pencarian, dan aktivitas.
- Catatan dan prompt AI: tambah, edit, hapus, favorit, arsip, kategori, tag.
- Galeri unggahan gambar privat melalui Supabase Storage.
- Layout responsif dengan sidebar lipat dan tema monokrom.

## Setup
1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Jalankan migrasi SQL `supabase/migrations/20261101000000_create_max_note_workspace.sql` pada project Supabase.
4. Jalankan `npm install` lalu `npm run dev`.
5. Daftar dengan email dan password. Untuk memakai password awal yang diminta, gunakan password `123456789` saat membuat akun Supabase Auth pertama kali.

## Deploy Vercel
Hubungkan repository ini ke Vercel dan tambahkan dua environment variable Supabase di atas untuk Production, Preview, dan Development. Vercel akan deploy otomatis setiap push ke branch production.

Semua tabel memakai Row Level Security; setiap pengguna hanya dapat mengakses data miliknya sendiri. Bucket gambar bersifat privat dan path file dibatasi berdasarkan UID pengguna.