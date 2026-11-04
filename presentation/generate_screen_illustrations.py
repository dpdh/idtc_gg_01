from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def draw_screen(filename, title, sub, rows, scene=False):
    w, h = 430, 932
    im = Image.new("RGB", (w, h), "#090f1b")
    d = ImageDraw.Draw(im)
    f = lambda n, b=False: get_font(n, b)
    d.rounded_rectangle((15, 22, 415, 87), 18, fill="#152238", outline="#42566e", width=2)
    d.text((30, 43), "TWINI · IDTC", font=f(17, True), fill="#d9eaff")
    d.text((26, 109), title, font=f(23, True), fill="#f2f7ff")
    d.text((28, 145), sub, font=f(12), fill="#9ab0c8")
    y = 184
    if scene:
        d.rounded_rectangle((18, 178, 412, 590), 20, fill="#183552", outline="#5882a7", width=2)
        for x, yy, ww, hh in [(42, 226, 69, 88), (310, 225, 74, 102), (255, 420, 89, 82), (58, 440, 75, 71)]:
            d.rounded_rectangle((x, yy, x + ww, yy + hh), 8, fill="#4b6576", outline="#83a8bd")
            for wx in range(x + 12, x + ww - 8, 21):
                d.rectangle((wx, yy + 15, wx + 9, yy + 27), fill="#a9d2df")
        d.ellipse((169, 299, 259, 389), fill="#365d77", outline="#84d9ff", width=4)
        d.text((197, 326), "T", font=f(29, True), fill="#ecf8ff")
        d.text((30, 193), "JAKARTA · MONAS", font=f(10, True), fill="#c8e4fa")
        d.text((30, 552), "MINI MAP · LANDMARK · SENSOR IoT", font=f(10, True), fill="#a9cce5")
        d.ellipse((30, 615, 148, 733), fill="#14273c", outline="#6eaee0", width=3)
        d.ellipse((63, 648, 115, 700), fill="#5298d1", outline="#d5eeff", width=2)
        for x, label in [(260, "RUN"), (322, "JUMP"), (370, "ACT")]:
            d.ellipse((x, 650, x + 48, 698), fill="#74b8ef", outline="#d9efff", width=2)
            d.text((x + 4, 706), label, fill="#c5d9ed", font=f(9, True))
        y = 754
    for head, body in rows:
        if y + 76 > 830:
            break
        d.rounded_rectangle((20, y, 410, y + 76), 15, fill="#142338", outline="#344a62")
        d.ellipse((34, y + 22, 63, y + 51), fill="#224a68", outline="#74c6ff", width=2)
        d.text((76, y + 13), head, fill="#edf6ff", font=f(15, True))
        d.text((76, y + 42), body, fill="#9eb3c9", font=f(11))
        y += 87
    d.rounded_rectangle((18, 832, 412, 911), 24, fill="#101c2d", outline="#42566e", width=2)
    labels = ["Home", "Explore", "TWINI", "Simulasi", "Profil"]
    icons = ["⌂", "⌕", "▦", "◉", "●"]
    for i, label in enumerate(labels):
        x = 34 + i * 78
        d.text((x, 850), icons[i], fill="#77baff", font=f(18, True))
        d.text((x - 2, 879), label, fill="#c4d4e5", font=f(9, True))
    d.rectangle((0, 916, w, h), fill="#283748")
    d.text((15, 919), "ILUSTRASI UI · BUKAN SCREENSHOT PERANGKAT", fill="#e2c47d", font=f(8, True))
    im.save(OUT / filename)


SCREENS = [
    ("twini_menu.png", "Digital Twin Survival", "Explore · Survive · Reconnect", [("Mulai Eksplorasi", "Masuk ke dunia Monas Digital Twin"), ("Pilih Karakter GLB", "Twini · Dani-01 · Dani-02")], True),
    ("gameplay.png", "Eksplorasi Monas", "Gerakkan karakter dengan joystick", [("Landmark", "Monas · Gambir · Museum Nasional"), ("Sensor kota", "Aktifkan perangkat IoT simulasi")], True),
    ("characters.png", "Pengaturan Karakter", "Pilih model GLB untuk permainan", [("Twini - IDTC", "Karakter aktif"), ("Dani-01", "Karakter alternatif"), ("Dani-02", "Karakter alternatif")], False),
    ("missions.png", "Mission Center", "Progres misi eksplorasi kota", [("First Arrival", "Mulai dari kawasan Monas"), ("Digital Explorer", "Temukan lima landmark"), ("Energy Hunter", "Kumpulkan Energy Crystal")], False),
    ("inventory.png", "Inventory", "Resource selama eksplorasi", [("Energy Crystal", "Memulihkan digital battery"), ("Battery Pack", "Tambah battery dan energy"), ("Health Kit", "Memulihkan health karakter")], False),
    ("telemetry.png", "Digital Twin Dashboard", "Data sensor yang disimulasikan", [("Suhu · 34°C", "Contoh kondisi panas"), ("Kelembapan · 72%", "Contoh sensor taman"), ("Kualitas udara · AQI 84", "Nilai contoh")], False),
    ("city_builder.png", "Bangun Kota", "Rancang kota pada grid 20 × 20", [("Bangunan", "Tempatkan aset pada petak aman"), ("Perangkat IoT", "Pilih sensor dan kategori"), ("Monitoring", "Lihat status sensor simulasi")], False),
    ("library.png", "GLB Library", "Pilih model untuk pratinjau", [("Twini - IDTC", "Karakter 3D rigged"), ("Aset kota", "Koleksi model digital")], False),
    ("categories.png", "3D Object Categories", "Jelajahi kategori aset digital", [("Buildings", "Gedung dan infrastruktur"), ("Transport", "Kendaraan dan mobilitas"), ("Smart city", "Aset kota dan lingkungan")], False),
    ("viewer.png", "3D Model Viewer", "Pratinjau model digital", [("Model", "Rotasi dan zoom interaktif"), ("Informasi", "Nama dan deskripsi aset")], True),
    ("simulation.png", "Twin Simulations", "Ruang proyek simulasi", [("Proyek", "Buat dan kelola skenario"), ("Parameter", "Atur variabel simulasi")], False),
    ("generator.png", "Imagine it. Make it 3D.", "Meshy AI · Text to 3D / Image to 3D", [("Deskripsi atau gambar", "Input untuk pembuatan model"), ("Hasil 3D", "Buka hasil di viewer")], False),
    ("profile.png", "Profile", "Akun dan ruang kerja", [("My 3D Library", "Model yang disimpan"), ("Account management", "Pengaturan akun")], False),
    ("onboarding.png", "Welcome to TWINI", "Onboarding · Explore · Create · Simulate", [("Digital world", "Kenali fitur dan alur aplikasi"), ("Mulai", "Masuk ke pengalaman TWINI")], False),
    ("auth.png", "Sign in to TWINI", "Login dan pendaftaran akun", [("Email", "Masukkan alamat email"), ("Password", "Masuk atau buat akun")], False),
    ("register.png", "Create your TWINI account", "Pendaftaran pengguna baru", [("Nama lengkap", "Masukkan nama pengguna"), ("Email · Password", "Buat kredensial akun")], False),
    ("splash.png", "TWINI", "Indonesia Digital Twin Community", [("Selamat datang", "Pembuka aplikasi")], False),
]

for item in SCREENS:
    draw_screen(*item)
print(f"Wrote {len(SCREENS)} screen illustrations to {OUT}")
