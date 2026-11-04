"""Reconstruct the missing full-width rolled metal base in original demo cans.

Preserves every pixel of the printed label above the metal seam.
Output is a single transparent PNG per product, without pedestals or masking.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

ROOT=Path(__file__).resolve().parents[1]/"public/assets/cans"
CUT={"bloom":1160,"aura":1231,"rush":1139,"vivi":1211}

for name,cut in CUT.items():
    original=Image.open(ROOT/(name+".png")).convert("RGBA")
    w,h=original.size
    band_h=76
    # Keep the original packaging exactly as designed above the can's metal seam.
    out=Image.new("RGBA",(w,max(h,cut+band_h+9)),(0,0,0,0))
    out.paste(original.crop((0,0,w,cut)),(0,0))
    pix=original.load()
    limits=[x for x in range(w) if pix[x,cut-2][3]>180]
    left0,right0=min(limits)+1,max(limits)-1
    center=(left0+right0)/2
    width=(right0-left0)

    metal=Image.new("RGBA",out.size,(0,0,0,0))
    mask=Image.new("L",out.size,0)
    mdraw=ImageDraw.Draw(mask)
    # Wide and symmetrical can bottom, narrowing naturally toward the rolled foot.
    for j in range(band_h):
        t=j/(band_h-1)
        inset=width*(.002+.056*t+.033*max(0,(t-.75)/.25)**2)
        le=left0+inset
        ri=right0-inset
        mdraw.line((round(le),cut+j,round(ri),cut+j),fill=255,width=1)
    # Small antialias at edges, not across the metal texture.
    mask=mask.filter(ImageFilter.GaussianBlur(.65))
    maskpx=mask.load()
    mp=metal.load()
    for j in range(band_h):
        t=j/(band_h-1)
        for x in range(w):
            a=maskpx[x,cut+j]
            if not a:continue
            u=(x-left0)/max(1,width)
            # Curved specular lighting and brushed silver tones.
            spec=48*math.exp(-((u-.20)/.09)**2)+29*math.exp(-((u-.79)/.095)**2)
            curvature=-33*(abs(u-.5)/.5)**1.8
            row=(
              22*math.exp(-((t-.07)/.050)**2)
             -44*math.exp(-((t-.30)/.085)**2)
             +28*math.exp(-((t-.53)/.105)**2)
             -41*math.exp(-((t-.78)/.09)**2)
             +11*math.exp(-((t-.95)/.08)**2)
            )
            shimmer=7*math.sin(u*22+1.5)+4*math.sin(u*75+.5)
            bright=min(230,max(47,144+spec+curvature+row+shimmer))
            mp[x,cut+j]=(int(bright),int(bright+1),min(255,int(bright+6)),a)
    out=Image.alpha_composite(out,metal)
    highlights=Image.new("RGBA",out.size,(0,0,0,0))
    d=ImageDraw.Draw(highlights,"RGBA")
    # Single unbroken top seam, following a subtle convex metallic arc.
    for offset,col,thickness in [
        (0,(228,233,235,238),3),
        (5,(103,111,122,225),3),
        (11,(198,207,212,190),2),
        (50,(70,77,86,150),2),
        (59,(208,215,219,215),3),
        (68,(63,71,81,200),2)]:
        points=[]
        for x in range(round(left0)+3,round(right0)-2,2):
            u=(x-center)/(width/2)
            sag=(1-u*u)*2.8
            points.append((x,cut+offset+sag))
        d.line(points, fill=col,width=thickness)
    # Composite translucent highlights without punching holes into the metal alpha.
    out=Image.alpha_composite(out,highlights)
    # Preserve the original printed label and its anti-aliased outline.
    # Alpha compositing can otherwise round anti-aliased boundary pixels.
    # Restore the untouched source region byte-for-byte.
    out.paste(original.crop((0,0,w,cut)),(0,0))
    original_alpha=out.getchannel("A")
    alpha_bbox=original_alpha.getbbox()
    assert alpha_bbox and alpha_bbox[3]>=cut+band_h-1
    out.save(ROOT/(name+"-full.png"), optimize=True)
    print(f"{name} original {w}x{h}, seam={cut}, new can={out.size}, width={width:.0f}, saved {name}-full.png")
