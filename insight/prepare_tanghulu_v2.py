import glob, os, math
from PIL import Image

def is_background(pixel, tolerance=25):
    r, g, b = pixel[:3]
    # Check if pixel is light and grayscale-ish (white or light grey)
    return r > 220 and g > 220 and b > 220 and abs(r-g) < tolerance and abs(r-b) < tolerance

def remove_background_v2(img_path, out_path):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    data = img.getdata()
    
    new_data = []
    for index, item in enumerate(data):
        if is_background(item, tolerance=30):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, 'PNG')

# Helper to recolor green to purple
def hue_shift_to_purple(img_path, out_path):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        if a > 0:
            # simple swap of green and blue, or push red + blue
            # if it is a green grape: G is high.
            # let's turn it into purple: R and B should be high, G should be low.
            # but preserve outline (r,g,b low).
            if g > r + 20 and g > b + 20: # it's green
                # Make it purple: swap g with r+b avg?
                # Just swap G with B, and boost R slightly!
                new_data.append((min(255, g), int((r+b)/2), min(255, g+20), a))
            else:
                new_data.append((r, g, b, a))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, 'PNG')

base_path = r'C:\Users\getwater\.gemini\antigravity\brain\336d3f83-6d11-4f73-86b9-6177df0618be'
out_dir = r'c:\boms\first\assets\tanghulu'

files = {
    'panda': glob.glob(os.path.join(base_path, 'panda_character_*.png'))[0],
    'skewer': glob.glob(os.path.join(base_path, 'skewer_*.png'))[0],
    'strawberry': glob.glob(os.path.join(base_path, 'tang_strawberry_*.png'))[0],
    'grape': glob.glob(os.path.join(base_path, 'tang_grape_*.png'))[0],
}

remove_background_v2(files['panda'], os.path.join(out_dir, 'panda.png'))
remove_background_v2(files['skewer'], os.path.join(out_dir, 'skewer.png'))
remove_background_v2(files['strawberry'], os.path.join(out_dir, 'strawberry.png'))
remove_background_v2(files['grape'], os.path.join(out_dir, 'grape.png'))

hue_shift_to_purple(os.path.join(out_dir, 'grape.png'), os.path.join(out_dir, 'purple_grape.png'))

print('Tanghulu assets processed directly!')
