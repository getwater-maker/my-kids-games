import glob, os, math
from PIL import Image

def recolor_to_red_panda(img_path, out_path):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    
    # Use getdata() to get pixel data
    data = img.getdata()
    new_data = []

    # Red panda colors:
    # White parts -> warm white
    # Black parts -> dark reddish brown
    # Pink parts -> keep pink

    for item in data:
        r, g, b, a = item
        if a > 0:
            # Grayscale intensity
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            
            # Detect black/dark grey
            if r < 80 and g < 80 and b < 80:
                # Turn black to dark red-brown (Red Panda limbs/ears)
                new_data.append((70, 30, 20, a))
            # Detect white/light grey (not pink/red)
            elif luma > 200 and abs(r-g) < 20 and abs(g-b) < 20: 
                # Keep white, maybe slightly warm
                new_data.append((255, 245, 235, a))
            # Detect mid greys (body)
            elif abs(r-g) < 30 and abs(g-b) < 30 and luma >= 80 and luma <= 200:
                # Turn to bright orange-red (Red Panda fur)
                # Map luma [80, 200] to bright orange
                factor = (luma - 80) / 120.0
                nr = int(200 + 55 * factor)
                ng = int(80 + 100 * factor)
                nb = int(40 + 50 * factor)
                new_data.append((nr, ng, nb, a))
            else:
                new_data.append(item)
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(out_path, "PNG")

base_path = r'c:\boms\first\assets\tanghulu'
panda_in = os.path.join(base_path, 'panda.png')
panda_out = os.path.join(base_path, 'red_panda.png')

recolor_to_red_panda(panda_in, panda_out)
print("Panda recolored to Red Panda!")
