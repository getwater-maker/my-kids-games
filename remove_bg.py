from PIL import Image

def remove_background(img_path, out_path, tolerance=50):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Check if the pixel is close to white
        if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, "PNG")

base_path = r"C:\Users\getwater\.gemini\antigravity\brain\336d3f83-6d11-4f73-86b9-6177df0618be"
out_dir = r"c:\boms\first\assets\cake"

# Find original paths
import glob
import os

files = {
    "strawberry": glob.glob(os.path.join(base_path, "strawberry_topping_*.png"))[0],
    "star": glob.glob(os.path.join(base_path, "star_topping_*.png"))[0],
    "cherry": glob.glob(os.path.join(base_path, "cherry_topping_*.png"))[0]
}

remove_background(files["strawberry"], os.path.join(out_dir, "strawberry_2d.png"), tolerance=40)
remove_background(files["star"], os.path.join(out_dir, "star_2d.png"), tolerance=40)
remove_background(files["cherry"], os.path.join(out_dir, "cherry_2d.png"), tolerance=40)

print("Images processed")
