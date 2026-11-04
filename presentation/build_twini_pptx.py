from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

ROOT = Path(__file__).parent
OUT = ROOT / 'TWINI_Product_Brief.pptx'
ASSETS = ROOT / 'screenshots'
EMU_W, EMU_H = 12192000, 6858000
NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
DRAW = 'http://schemas.openxmlformats.org/drawingml/2006/main'
PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'

slides = [
 ('TWINI', 'Game edukasi Digital Twin untuk eksplorasi, simulasi, dan pembelajaran interaktif.', [], None),
 ('Mengapa TWINI?', 'TWINI menjembatani konsep Digital Twin yang kompleks dengan pengalaman bermain yang mudah dipahami.', ['Lihat kota sebagai model: landmark, taman, jalan, bangunan, sensor, dan karakter menjadi entitas digital.', 'Belajar lewat aksi: bergerak, menemukan, mengaktifkan sensor, mengelola energi, dan melihat perubahan state.', 'Bangun skenario: City Builder membantu menyusun aset kota dan merancang skenario sensor.', 'Refleksi data: dashboard memperkenalkan telemetri, status perangkat, waktu, lokasi, dan kualitas data.'], None),
 ('Pengalaman produk saat ini', 'Identitas TWINI, carousel model 3D, dan navigasi utama menjadi pintu masuk pengalaman digital twin.', ['Home - identitas TWINI dan model 3D.', 'Explore - koleksi aset 3D.', 'TWINI - game survival dan eksplorasi kawasan Monas.', 'Simulasi - ruang proyek simulasi dan pengembangan model digital.'], 'home_dashboard_actual.png'),
 ('Gameplay - belajar melalui eksplorasi', 'Pemain menjelajah, membaca peta, mengelola resource, dan berinteraksi dengan lingkungan.', ['Gerak natural - joystick mengarahkan karakter maju sesuai arah input.', 'Kontrol transparan - joystick dan action button tidak menutup peta.', 'Aksi karakter - Run, Jump, Interact, Dash, dan Back.', 'Dunia Monas - pepohonan, kolam, fasilitas olahraga, landmark, dan jaringan jalan terpilih.'], 'gameplay.png'),
 ('Karakter, progres, dan motivasi', 'Avatar dan reward membuat pembelajaran terasa seperti perjalanan yang bertahap.', ['Avatar 3D - pilihan model GLB memberi identitas dan variasi.', 'Misi - eksplorasi landmark, aktivasi sensor, item, dan survival time.', 'Resource - health, energy, stamina, dan battery membentuk trade-off.', 'Reward - XP, coins, item, dan progres membuat pemain kembali.'], 'characters.png'),
 ('Dari peta menjadi Digital Twin', 'TWINI menghubungkan ruang, objek, data, aturan, dan tindakan dalam satu pengalaman.', ['01 - Representasi: peta Monas, objek 3D, landmark, jalan, taman, dan bangunan.', '02 - State: posisi avatar, sensor, resource, misi, waktu, dan status perangkat.', '03 - Interaksi: aksi pemain mengubah state dan memberi umpan balik.'], None),
 ('City Builder - ruang untuk merancang skenario', 'Pemain dapat menyusun aset dan sensor untuk membuat variasi skenario kota.', ['Grid level - susun aset pada area terstruktur.', 'Aset kota - bangunan, fasilitas, pohon, lampu, dan landmark.', 'Sensor IoT - skenario banjir, kualitas udara, dan energi.', 'Eksperimen - bandingkan penempatan aset dengan dampaknya pada misi.'], 'city_builder.png'),
 ('Dashboard - data yang bisa dibaca pemain', 'Telemetri membuat perubahan kondisi kota terasa terlihat dan dapat didiskusikan.', ['Telemetri simulasi - suhu, kelembapan, AQI, angin, dan status perangkat.', 'Konteks lokasi - setiap sensor memerlukan ID, koordinat, satuan, dan waktu.', 'Kejujuran data - tandai nilai prototipe sebagai simulasi sampai terhubung sumber resmi.', 'Langkah berikutnya - provenance, histori, validasi, dan replay skenario.'], 'telemetry.png'),
 ('Inventory - keputusan kecil yang terasa', 'Resource game memperkenalkan konsep kapasitas, pemulihan, dan prioritas.', ['Energy Crystal, Battery Pack, dan Health Kit mendukung strategi pemain.', 'Pemain memilih kapan berlari, menjelajah, atau menyimpan resource.', 'Resource game menjadi analogi sederhana untuk kapasitas dan konsumsi sistem.'], 'inventory.png'),
 ('Misi - progres yang membuat pemain kembali', 'Misi menerjemahkan tujuan pembelajaran menjadi target yang dapat diselesaikan.', ['First Arrival - memulai perjalanan di kawasan Monas.', 'Digital Explorer - menemukan landmark dan memahami konteks lokasi.', 'Smart City Guardian - mengaktifkan sensor dan membaca umpan balik.', 'Survivor - bertahan, mengelola resource, dan mencapai target waktu.'], 'missions.png'),
 ('Roadmap pengembangan TWINI', 'Roadmap disusun bertahap: mulai dari kenyamanan bermain, lalu menuju data terhubung dan ekosistem.', ['FASE 1 | 0-3 BULAN - Core gameplay: kontrol sentuh, collision, kamera, onboarding, save progress, dan performa mobile.', 'FASE 2 | 3-6 BULAN - Monas hidup: landmark tervalidasi, POI, kolam, olahraga, event cuaca, dan quest lokasi.', 'FASE 3 | 6-12 BULAN - Data terhubung: feed resmi, timestamp, histori telemetri, sensor simulator, dan replay.', 'FASE 4 | 12+ BULAN - Ekosistem: multiplayer kelas, authoring skenario, SDK aset, analytics, dan deployment institusi.'], None),
 ('Prioritas teknis dan produk', 'Fokus pengembangan adalah kualitas pengalaman, kredibilitas data, dan kesiapan lintas platform.', ['Kenyamanan mobile - kontrol stabil di web view, Android, dan iOS.', 'Kredibilitas data - pisahkan data simulasi, referensi, dan live.', 'Skalabilitas scene - optimasi GLB, LOD, batching, culling, dan streaming area.', 'KPI pembelajaran - ukur pemahaman entitas-state-event dan kemampuan menyusun skenario sensor.'], None),
 ('Bangun kota yang bisa dipahami', 'TWINI dimulai sebagai game. Arah berikutnya adalah laboratorium Digital Twin yang dapat dimainkan, diuji, dan dipercaya.', ['POLES GAMEPLAY', 'PERLUAS MONAS', 'HUBUNGKAN DATA', 'UKUR PEMBELAJARAN'], None),
]

def xml_header(body):
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + body

def shape(spid, name, x, y, w, h, text=None, size=22, color='F3F8FF', bold=False, fill=None):
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln>' if fill else '<a:noFill/>'
    tx = ''
    if text is not None:
        lines = text.split('\n')
        paras = ''.join(f'<a:p><a:r><a:rPr lang="id-ID" sz="{size*100}" b="{str(bold).lower()}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:rPr><a:t>{escape(line)}</a:t></a:r><a:endParaRPr lang="id-ID"/></a:p>' for line in lines)
        tx = f'<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>{paras}</p:txBody>'
    return f'<p:sp><p:nvSpPr><p:cNvPr id="{spid}" name="{escape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>{fill_xml}</p:spPr>{tx}</p:sp>'

def picture(spid, name, x, y, w, h, rel_id):
    return f'<p:pic><p:nvPicPr><p:cNvPr id="{spid}" name="{escape(name)}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rel_id}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'

def slide_xml(title, subtitle, bullets, image, idx):
    slide_sp = [shape(2,'Background',0,0,EMU_W,EMU_H,fill='07111F')]
    slide_sp.append(shape(3,'Brand',508000,330000,6000000,250000,'TWINI / IDTC - PRODUCT BRIEF',1200,'7DD3FC',True))
    slide_sp.append(shape(4,'Title',508000,760000,7000000,700000,title,3200,'F3F8FF',True))
    slide_sp.append(shape(5,'Subtitle',508000,1500000,6500000,650000,subtitle,1600,'AFC2D7'))
    if image:
        slide_sp.append(shape(6,'ImagePanel',8060000,1500000,2600000,3800000,fill='10243A'))
        slide_sp.append(picture(7,'Screenshot',8270000,1700000,2200000,3400000,'rId2'))
        x=508000; y=2450000
    else:
        x=508000; y=2500000
    for i,b in enumerate(bullets):
        yy=y+i*690000
        slide_sp.append(shape(20+i,'Bullet',x,yy,7200000,520000,('• '+b),1550,'DDEBFA'))
    slide_sp.append(shape(90,'Footer',508000,6450000,3000000,180000,'TWINI - IDTC',900,'7891A8'))
    slide_sp.append(shape(91,'Page',10700000,6450000,700000,180000,f'{idx+1:02d} / {len(slides):02d}',900,'7891A8'))
    tree = f'<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{"".join(slide_sp)}</p:spTree>'
    return xml_header(f'<p:sld xmlns:a="{DRAW}" xmlns:r="{R}" xmlns:p="{NS}"><p:cSld>{tree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>')

def rels(slide, has_image):
    body = f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
    if has_image: body += f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{slide[3]}"/>'
    if has_image: body = body.replace('Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"','Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"')
    return xml_header(f'<Relationships xmlns="{PKG}">{body}</Relationships>')

def content_types():
    overrides=''.join(f'<Override PartName="/ppt/slides/slide{i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for i in range(len(slides)))
    media=''.join(f'<Default Extension="jpg" ContentType="image/jpeg"/>' for _ in [0])
    return xml_header(f'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>{media}<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>{overrides}</Types>')

def write_pptx():
    with ZipFile(OUT,'w',ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types())
        z.writestr('_rels/.rels', xml_header(f'<Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'))
        sids=''.join(f'<p:sldId id="{255+i}" r:id="rId{i+1}"/>' for i in range(len(slides)))
        z.writestr('ppt/presentation.xml', xml_header(f'<p:presentation xmlns:a="{DRAW}" xmlns:r="{R}" xmlns:p="{NS}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId{len(slides)+1}"/></p:sldMasterIdLst><p:sldIdLst>{sids}</p:sldIdLst><p:sldSz cx="{EMU_W}" cy="{EMU_H}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>'))
        prs_rels=''.join(f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i+1}.xml"/>' for i in range(len(slides)))
        prs_rels += f'<Relationship Id="rId{len(slides)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
        z.writestr('ppt/_rels/presentation.xml.rels', xml_header(f'<Relationships xmlns="{PKG}">{prs_rels}</Relationships>'))
        z.writestr('ppt/slideMasters/slideMaster1.xml', xml_header(f'<p:sldMaster xmlns:a="{DRAW}" xmlns:r="{R}" xmlns:p="{NS}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles/><p:clrMap accent1="7DD3FC" accent2="7BE0C0" bg1="07111F" bg2="10243A" folHlink="7DD3FC" hlink="7DD3FC" tx1="F3F8FF" tx2="AFC2D7"/></p:sldMaster>'))
        z.writestr('ppt/slideMasters/_rels/slideMaster1.xml.rels', xml_header(f'<Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'))
        z.writestr('ppt/slideLayouts/slideLayout1.xml', xml_header(f'<p:sldLayout xmlns:a="{DRAW}" xmlns:r="{R}" xmlns:p="{NS}" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'))
        z.writestr('ppt/slideLayouts/_rels/slideLayout1.xml.rels', xml_header(f'<Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>'))
        z.writestr('ppt/theme/theme1.xml', xml_header(f'<a:theme xmlns:a="{DRAW}" name="TWINI"><a:themeElements><a:clrScheme name="TWINI"><a:dk1><a:srgbClr val="07111F"/></a:dk1><a:lt1><a:srgbClr val="F3F8FF"/></a:lt1><a:dk2><a:srgbClr val="10243A"/></a:dk2><a:lt2><a:srgbClr val="AFC2D7"/></a:lt2><a:accent1><a:srgbClr val="7DD3FC"/></a:accent1><a:accent2><a:srgbClr val="7BE0C0"/></a:accent2><a:accent3><a:srgbClr val="FFD166"/></a:accent3><a:accent4><a:srgbClr val="15314D"/></a:accent4><a:accent5><a:srgbClr val="DDEBFA"/></a:accent5><a:accent6><a:srgbClr val="7891A8"/></a:accent6><a:hlink><a:srgbClr val="7DD3FC"/></a:hlink><a:folHlink><a:srgbClr val="7BE0C0"/></a:folHlink></a:clrScheme><a:fontScheme name="TWINI"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="TWINI"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>'))
        for i,slide in enumerate(slides):
            has=bool(slide[3]); z.writestr(f'ppt/slides/slide{i+1}.xml',slide_xml(slide[0],slide[1],slide[2],slide[3],i))
            rel_body=f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
            if has: rel_body += f'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{slide[3]}"/>'
            z.writestr(f'ppt/slides/_rels/slide{i+1}.xml.rels',xml_header(f'<Relationships xmlns="{PKG}">{rel_body}</Relationships>'))
            if has: z.write(ASSETS/slide[3],f'ppt/media/{slide[3]}')

write_pptx(); print(OUT)
