"""Build approved Smart Retail AI favicon, home-screen icons, and social thumbnail."""
import hashlib
import io
import math
import os
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SOURCE = "https://d2ol7oe51mr4n9.cloudfront.net/user_2vj4jy5DUb75jIsb3okPXuDoySx/74b9ce59-8f5f-4058-a5d5-c80165d51c52.png"
CHECKSUM = "82d34484a0c2c99b18f63938bee2a3779bb86b74ab3a5c3ebf114d337b286637"
OUT = Path("app/public/assets")
OUT.mkdir(parents=True, exist_ok=True)
with urlopen(Request(SOURCE, headers={"User-Agent":"SmartRetailAI-BrandBuild/1.0"}), timeout=35) as resp:
    source_bytes = resp.read()
assert hashlib.sha256(source_bytes).hexdigest() == CHECKSUM, "Approved logo source checksum mismatch"
# The user supplied a finished, edited 110x110 pixel-art master.
# Never crop it from a collage or re-create it: preserve the exact PNG bytes.
icon = Image.open(io.BytesIO(source_bytes)).convert("RGBA")
assert icon.size == (110,110), "Unexpected approved logo dimensions"
assert icon.getpixel((0,0))[3] == 0, "The icon should have transparent corners"
(OUT/"srai-app-icon.png").write_bytes(source_bytes)
for size in (32,180,192,512):
    # Small favicons require a proper reduction; larger formats keep hard pixel edges.
    method = Image.Resampling.LANCZOS if size < 110 else Image.Resampling.NEAREST
    icon.resize((size,size),method).save(OUT/f"srai-app-icon-{size}.png", optimize=True)
icon.save(Path("app/public/favicon.ico"), format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64)])
# Social card: branded graphic and only the four ORIGINAL approved cans.
W,H=1200,630
image=Image.new("RGBA",(W,H),(8,11,32,255))
px=image.load()
for y in range(H):
    for x in range(W):
        rx=x/W;ry=y/H
        left=max(0.0,1.0-math.hypot((rx-.12)/.85,(ry-.18)/.72))
        right=max(0.0,1.0-math.hypot((rx-.98)/.75,(ry-.94)/.65))
        px[x,y]=(int(8+5*left+16*right),int(11+5*left+2*right),int(33+22*left+24*right),255)
d=ImageDraw.Draw(image)
for y in range(35,H,28):
    for x in range(35,W,28):
        d.ellipse((x,y,x+1,y+1), fill=(95,111,168,40))
image.alpha_composite(icon.resize((220,220),Image.Resampling.NEAREST),(64,137))
def font(size,bold=False):
    path="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path,size)
d=ImageDraw.Draw(image)
d.text((310,118),"INTERACTIVE RETAIL EXPERIENCE",fill=(147,169,218,255),font=font(15,True))
d.text((304,173),"SMART",fill=(246,249,255,255),font=font(69,True))
d.text((304,254),"RETAIL",fill=(246,249,255,255),font=font(69,True))
d.text((304,337),"AI",fill=(187,138,255,255),font=font(72,True))
d.text((71,450),"Intelligent Fridge  ·  Live Ads  ·  Analytics",fill=(189,205,237,255),font=font(21))
d.rounded_rectangle((70,516,248,561),radius=21,fill=(37,39,91,255),outline=(89,73,157,255),width=2)
d.ellipse((88,531,99,542),fill=(83,230,192,255))
d.text((111,526),"LIVE WEB DEMO",fill=(225,232,255,255),font=font(15,True))
d.rounded_rectangle((704,91,1151,546),radius=27,fill=(15,22,53,255),outline=(54,69,124,255),width=2)
d.text((744,119),"THE FOUR ORIGINAL CAMPAIGNS",font=font(13,True),fill=(148,168,222,255))
colors=((229,106,189),(132,215,173),(240,187,85),(116,172,250))
for i,(slug,label) in enumerate(zip(("bloom","aura","rush","vivi"),("BLOOM","AURA+","RUSH ZERO","VIVI POP"))):
    src=OUT/"cans"/f"{slug}-full.png"
    assert src.exists(), f"Original product missing: {src}"
    can=Image.open(src).convert("RGBA")
    w,h=can.size
    scale=min(84/w,290/h)
    can=can.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
    bx=731+i*105
    spot=Image.new("RGBA",(118,47),(0,0,0,0))
    ImageDraw.Draw(spot).ellipse((12,15,106,27),fill=(*colors[i],105))
    image.alpha_composite(spot.filter(ImageFilter.GaussianBlur(11)),(bx-15,463))
    image.alpha_composite(can,(bx+(86-can.width)//2,470-can.height))
    d=ImageDraw.Draw(image)
    d.line((bx-2,481,bx+84,481),fill=(*colors[i],220),width=4)
    bbox=d.textbbox((0,0),label,font=font(11,True))
    d.text((bx+(86-(bbox[2]-bbox[0]))//2,497),label,font=font(11,True),fill=(227,230,245,255))
d=ImageDraw.Draw(image)
d.text((74,585),"SMART RETAIL AI     /     PROOF OF CONCEPT",fill=(107,126,173,255),font=font(12,True))
d.text((982,585),"SRAI  ·  2026",fill=(107,126,173,255),font=font(12,True))
image.convert("RGB").save(OUT/"srai-share-preview.jpg",quality=91,optimize=True,subsampling=0)
for file in (OUT/"srai-app-icon.png",OUT/"srai-share-preview.jpg",Path("app/public/favicon.ico")):
    assert file.stat().st_size > 1000
print("Logo and share card successfully generated from the approved image.")
