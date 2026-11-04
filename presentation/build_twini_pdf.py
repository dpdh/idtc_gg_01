from pathlib import Path
import re

OUT = Path(__file__).with_name('TWINI_Product_Brief.pdf')
W, H = 960, 540
BG = (0.027, 0.067, 0.122)
PANEL = (0.063, 0.141, 0.227)
PANEL2 = (0.082, 0.19, 0.30)
WHITE = (0.95, 0.975, 1.0)
MUTED = (0.68, 0.76, 0.84)
CYAN = (0.49, 0.83, 0.98)
MINT = (0.48, 0.88, 0.75)
GOLD = (1.0, 0.82, 0.40)
IMG = {
    'home': '/tmp/twini_home.jpg', 'gameplay': '/tmp/twini_gameplay.jpg',
    'characters': '/tmp/twini_characters.jpg', 'city': '/tmp/twini_city_builder.jpg',
    'telemetry': '/tmp/twini_telemetry.jpg', 'inventory': '/tmp/twini_inventory.jpg',
    'missions': '/tmp/twini_missions.jpg'
}

slides = [
    ('cover', 'TWINI', 'Game edukasi Digital Twin untuk eksplorasi, simulasi, dan pembelajaran interaktif.', ['PRODUCT BRIEF', 'DIGITAL TWIN', 'GAME EDUKASI', 'MONAS - JAKARTA']),
    ('cards', 'Mengapa TWINI?', 'TWINI menjembatani konsep Digital Twin yang kompleks dengan pengalaman bermain yang mudah dipahami.', [
        ('Lihat kota sebagai model', 'Landmark, taman, jalan, bangunan, sensor, dan karakter menjadi entitas digital.'),
        ('Belajar lewat aksi', 'Pemain bergerak, menemukan, mengaktifkan sensor, mengelola energi, dan melihat perubahan state.'),
        ('Bangun skenario', 'City Builder membuka ruang untuk menyusun aset kota dan merancang skenario sensor.'),
        ('Refleksi data', 'Dashboard memperkenalkan telemetri, status perangkat, waktu, lokasi, dan kualitas data.'),
    ]),
    ('image', 'Pengalaman produk saat ini', 'home', [
        ('Home', 'Identitas TWINI, carousel model 3D, dan navigasi utama.'), ('Explore', 'Koleksi aset 3D untuk mengenal karakter dan objek kota.'),
        ('TWINI', 'Game survival dan eksplorasi kawasan Monas.'), ('Simulasi', 'Ruang untuk proyek simulasi dan pengembangan model digital.')]),
    ('image', 'Gameplay - belajar melalui eksplorasi', 'gameplay', [
        ('Gerak natural', 'Joystick mengarahkan karakter maju sesuai arah input; kamera dekat memperjelas orientasi.'),
        ('Kontrol transparan', 'Joystick dan action button tidak menutup peta atau area bermain.'),
        ('Aksi karakter', 'Run, Jump, Interact, Dash, dan Back menjadi bahasa interaksi yang mudah dipahami.'),
        ('Dunia Monas', 'Area diperluas dengan pepohonan, kolam, tempat olahraga, landmark, dan jaringan jalan terpilih.')]),
    ('image', 'Karakter, progres, dan motivasi', 'characters', [
        ('Avatar 3D', 'Pilihan model GLB memberi identitas dan variasi karakter.'), ('Misi', 'Eksplorasi landmark, aktivasi sensor, item, dan survival time.'),
        ('Resource', 'Health, energy, stamina, dan battery membentuk trade-off bermain.'), ('Reward', 'XP, coins, item, dan progres membuat eksplorasi terasa bertahap.')]),
    ('flow', 'Dari peta menjadi Digital Twin', [
        ('01 - REPRESENTASI', 'Peta Monas, objek 3D, landmark, jalan, taman, dan bangunan.'),
        ('02 - STATE', 'Posisi avatar, sensor, resource, misi, waktu, dan status perangkat.'),
        ('03 - INTERAKSI', 'Aksi pemain mengubah state dan memberi umpan balik.')]),
    ('image', 'City Builder - ruang untuk merancang skenario', 'city', [
        ('Grid level', 'Susun aset pada area terstruktur untuk membuat skenario eksplorasi.'), ('Aset kota', 'Tempatkan bangunan, fasilitas, pohon, lampu, dan landmark.'),
        ('Sensor IoT', 'Pilih perangkat untuk skenario banjir, kualitas udara, dan energi.'), ('Eksperimen', 'Bandingkan penempatan aset dan sensor dengan dampaknya pada misi.')]),
    ('image', 'Dashboard - data yang bisa dibaca pemain', 'telemetry', [
        ('Telemetri simulasi', 'Suhu, kelembapan, AQI, angin, dan status perangkat menjadi umpan balik.'), ('Konteks lokasi', 'Sensor memerlukan ID, koordinat, satuan, dan waktu pembaruan.'),
        ('Kejujuran data', 'Nilai prototipe diberi label simulasi sampai tersambung ke sumber resmi.'), ('Langkah berikutnya', 'Tambahkan provenance, histori, validasi, dan mode replay.')]),
    ('image', 'Inventory - keputusan kecil yang terasa', 'inventory', [
        ('Pemulihan', 'Energy Crystal, Battery Pack, dan Health Kit mendukung strategi pemain.'), ('Trade-off', 'Pemain memilih kapan berlari, menjelajah, atau menyimpan resource.'),
        ('Peluang belajar', 'Resource game menjadi analogi kapasitas dan konsumsi sistem.')]),
    ('image', 'Misi - progres yang membuat pemain kembali', 'missions', [
        ('First Arrival', 'Memulai perjalanan di kawasan Monas.'), ('Digital Explorer', 'Menemukan landmark dan memahami konteks lokasi.'),
        ('Smart City Guardian', 'Mengaktifkan sensor simulasi dan membaca umpan balik.'), ('Survivor', 'Bertahan, mengelola resource, dan mencapai target waktu.')]),
    ('roadmap', 'Roadmap pengembangan TWINI', [
        ('FASE 1 | 0-3 BULAN', 'Core gameplay', 'Poles kontrol sentuh, collision, kamera, onboarding, save progress, dan performa mobile.'),
        ('FASE 2 | 3-6 BULAN', 'Monas hidup', 'Tambah landmark tervalidasi, POI, kolam, olahraga, event cuaca, dan quest berbasis lokasi.'),
        ('FASE 3 | 6-12 BULAN', 'Data terhubung', 'Integrasi feed resmi, timestamp, histori telemetri, sensor simulator, dan replay skenario.'),
        ('FASE 4 | 12+ BULAN', 'Ekosistem', 'Multiplayer kelas, authoring skenario, SDK aset, analytics, dan deployment institusi.')]),
    ('cards', 'Prioritas teknis dan produk', 'Kualitas pengalaman, kredibilitas data, dan kesiapan platform menjadi tiga fokus pengembangan utama.', [
        ('Kenyamanan mobile', 'Kontrol stabil di web view, Android, dan iOS; FPS terjaga saat scene padat.'), ('Kredibilitas data', 'Pisahkan data simulasi, data referensi, dan data live.'),
        ('Skalabilitas scene', 'Optimasi GLB, LOD, batching, culling, dan streaming area.'), ('KPI pembelajaran', 'Ukur pemahaman entitas-state-event dan kemampuan menyusun skenario sensor.')]),
    ('cover', 'Bangun kota yang bisa dipahami', 'TWINI dimulai sebagai game. Arah berikutnya adalah menjadi laboratorium Digital Twin yang dapat dimainkan, diuji, dan dipercaya.', ['POLES GAMEPLAY', 'PERLUAS MONAS', 'HUBUNGKAN DATA', 'UKUR PEMBELAJARAN'])
]

def esc(s):
    s = s.encode('latin-1', 'replace').decode('latin-1')
    return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

def color(c, stroke=False):
    return f'{c[0]:.3f} {c[1]:.3f} {c[2]:.3f} ' + ('RG' if stroke else 'rg')

def rect(x, y, w, h, c, radius=False):
    if radius:
        return f'{color(c)} {x} {y} {w} {h} re f\n'
    return f'{color(c)} {x} {y} {w} {h} re f\n'

def text(x, y, value, size=16, c=WHITE):
    return f'BT /F1 {size} Tf {color(c)} 1 0 0 1 {x} {y} Tm ({esc(value)}) Tj ET\n'

def wrap(s, width):
    words = s.split(); lines=[]; cur=''
    for word in words:
        if len(cur)+len(word)+1 <= width: cur=(cur+' '+word).strip()
        else: lines.append(cur); cur=word
    if cur: lines.append(cur)
    return lines

def text_block(x, y, s, size=15, c=MUTED, width=54, leading=21):
    out=''
    for line in wrap(s, width): out += text(x, y, line, size, c); y -= leading
    return out

def jpeg_size(path):
    b=Path(path).read_bytes(); i=2
    while i < len(b):
        if b[i] != 0xFF: i += 1; continue
        marker=b[i+1]; i += 2
        if marker in (0xD8,0xD9): continue
        n=int.from_bytes(b[i:i+2],'big')
        if marker in range(0xC0,0xC4): return int.from_bytes(b[i+5:i+7],'big'), int.from_bytes(b[i+3:i+5],'big')
        i += n
    return 1,1

def page_content(kind, title, data, number, image_obj=None):
    s=rect(0,0,W,H,BG)
    s += text(56, 502, 'TWINI / IDTC - PRODUCT BRIEF', 10, CYAN)
    if kind == 'cover':
        lead, chips = data
        s += text(56, 388, 'INDONESIA DIGITAL TWIN COMMUNITY', 12, MINT)
        s += text(56, 300, title, 72, WHITE)
        s += text_block(60, 250, lead, 24, MUTED, 55, 32)
        x=60
        for chip in chips: s += rect(x, 155, 135, 28, PANEL2); s += text(x+10, 165, chip, 10, WHITE); x+=148
    else:
        s += text(56, 452, title, 31, WHITE)
        if kind == 'image':
            s += rect(650, 70, 245, 350, PANEL)
            if image_obj: s += f'q 0.94 0 0 0.94 654 74 cm /Im{image_obj} Do Q\n'
            cards=data[0]; x=56; y=375
            for idx,(h,b) in enumerate(cards):
                if idx and idx%2==0: x=56; y-=128
                if idx%2: x=350
                s += rect(x,y-86,260,100,PANEL)
                s += text(x+14,y-16,h,15,MINT)
                s += text_block(x+14,y-39,b,11,MUTED,35,15)
        elif kind == 'cards':
            lead=data[0]; s += text_block(56, 412, lead, 17, MUTED, 95, 23)
            cards=slides[number][3]
            x1,y=56,330
            for i,(h,b) in enumerate(cards):
                x=56 if i%2==0 else 480; yy=y-(i//2)*116
                s += rect(x,yy-86,385,95,PANEL)
                s += text(x+15,yy-18,h,16,MINT); s += text_block(x+15,yy-41,b,12,MUTED,53,16)
        elif kind == 'flow':
            x=56
            for h,b in data[0]:
                s += rect(x,245,255,135,PANEL); s += text(x+17,345,h,15,GOLD); s += text_block(x+17,315,b,14,MUTED,27,20); x+=290
            s += text_block(56,170,'Nilai utama TWINI adalah membuat hubungan antara ruang, objek, data, aturan, dan tindakan terasa konkret.',16,WHITE,105,23)
        elif kind == 'roadmap':
            x=56
            for tag,h,b in data[0]:
                s += rect(x,160,200,220,PANEL); s += text(x+15,350,tag,10,GOLD); s += text_block(x+15,320,h,18,MINT,20,22); s += text_block(x+15,278,b,12,MUTED,24,17); x+=218
    s += text(56, 28, 'TWINI - IDTC', 9, MUTED); s += text(850,28,f'{number+1:02d} / {len(slides):02d}',9,MUTED)
    return s

objects=[]; pages=[]; images=[]
objects.append('<< /Type /Catalog /Pages 2 0 R >>')
objects.append('')
font_obj=3; objects.append('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
obj_index=4
for idx,slide in enumerate(slides):
    kind,title,*rest=slide; image_obj=None
    if kind=='image':
        image_path=IMG[rest[0]]; raw=Path(image_path).read_bytes(); iw,ih=jpeg_size(image_path)
        image_obj=obj_index; obj_index+=1; images.append((image_obj,raw,iw,ih))
    content=page_content(kind,title,rest[1:] if kind=='image' else rest,idx,image_obj)
    stream_obj=obj_index; obj_index+=1; objects.append(f'<< /Length {len(content.encode())} >>\nstream\n{content}endstream')
    resources=f'<< /Font << /F1 {font_obj} 0 R >>'
    if image_obj: resources += f' /XObject << /Im{image_obj} {image_obj} 0 R >>'
    resources += ' >>'
    page_obj=obj_index; obj_index+=1; objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {W} {H}] /Resources {resources} /Contents {stream_obj} 0 R >>'); pages.append(page_obj)
objects[1]=f'<< /Type /Pages /Kids [{" ".join(f"{p} 0 R" for p in pages)}] /Count {len(pages)} >>'
for image_obj,raw,iw,ih in images:
    objects.insert(image_obj-1, f'<< /Type /XObject /Subtype /Image /Width {iw} /Height {ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(raw)} >>\nstream\n{raw.decode("latin-1")}\nendstream')
    # Insertions shift later references, so rebuild references is avoided by using object ids reserved in sequence.

# Rebuild with stable object ids; images are inserted before content objects in creation order.
all_objs=[]; all_objs.extend(objects[:3]); next_id=4; slide_objs=[]
for idx,slide in enumerate(slides):
    kind,title,*rest=slide; image_obj=None
    if kind=='image':
        image_path=IMG[rest[0]]; raw=Path(image_path).read_bytes(); iw,ih=jpeg_size(image_path); image_obj=next_id; next_id+=1
        all_objs.append(f'<< /Type /XObject /Subtype /Image /Width {iw} /Height {ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(raw)} >>\nstream\n{raw.decode("latin-1")}\nendstream')
    content=page_content(kind,title,rest[1:] if kind=='image' else rest,idx,image_obj)
    c_id=next_id; next_id+=1; all_objs.append(f'<< /Length {len(content.encode("latin-1"))} >>\nstream\n{content}endstream')
    resources=f'<< /Font << /F1 3 0 R >>'
    if image_obj: resources += f' /XObject << /Im{image_obj} {image_obj} 0 R >>'
    resources += ' >>'; p_id=next_id; next_id+=1; all_objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {W} {H}] /Resources {resources} /Contents {c_id} 0 R >>'); slide_objs.append(p_id)
all_objs[0]='<< /Type /Catalog /Pages 2 0 R >>'; all_objs[1]=f'<< /Type /Pages /Kids [{" ".join(f"{p} 0 R" for p in slide_objs)}] /Count {len(slide_objs)} >>'
pdf=bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'); offsets=[0]
for i,obj in enumerate(all_objs,1): offsets.append(len(pdf)); pdf.extend(f'{i} 0 obj\n'.encode()); pdf.extend(obj.encode('latin-1')); pdf.extend(b'\nendobj\n')
xref=len(pdf); pdf.extend(f'xref\n0 {len(all_objs)+1}\n0000000000 65535 f \n'.encode()); pdf.extend(''.join(f'{o:010d} 00000 n \n' for o in offsets[1:]).encode()); pdf.extend(f'trailer\n<< /Size {len(all_objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()); OUT.write_bytes(pdf)
print(OUT)
