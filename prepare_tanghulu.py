import glob, os;
from PIL import Image;
def remove_background(img_path, out_path, tolerance=50):
    img = Image.open(img_path).convert('RGBA')
    data = img.getdata()
    new_data = []
    for item in data:
        if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(out_path, 'PNG')

base_path = r'C:\Users\getwater\.gemini\antigravity\brain\336d3f83-6d11-4f73-86b9-6177df0618be'
out_dir = r'c:\boms\first\assets\tanghulu'

files = {
    'panda': glob.glob(os.path.join(base_path, 'panda_character_*.png'))[0],
    'skewer': glob.glob(os.path.join(base_path, 'skewer_*.png'))[0],
    'farm': glob.glob(os.path.join(base_path, 'farm_bg_*.png'))[0],
    'kitchen': glob.glob(os.path.join(base_path, 'kitchen_bg_*.png'))[0],
    'strawberry': glob.glob(os.path.join(base_path, 'tang_strawberry_*.png'))[0],
    'grape': glob.glob(os.path.join(base_path, 'tang_grape_*.png'))[0],
}

remove_background(files['panda'], os.path.join(out_dir, 'panda.png'), 40)
remove_background(files['skewer'], os.path.join(out_dir, 'skewer.png'), 40)
remove_background(files['strawberry'], os.path.join(out_dir, 'strawberry.png'), 40)
remove_background(files['grape'], os.path.join(out_dir, 'grape.png'), 40)
# backgrounds don't need transparency removal, just copy
import shutil
shutil.copy(files['farm'], os.path.join(out_dir, 'farm.png'))
shutil.copy(files['kitchen'], os.path.join(out_dir, 'kitchen.png'))
print('Tanghulu assets processed!')
