#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os
import sys

# Try multiple possible paths for the image
script_path = os.path.abspath(__file__) if '__file__' in globals() else os.path.abspath(sys.argv[0])
script_dir = os.path.dirname(script_path)

possible_paths = [
    os.path.join(script_dir, 'public', 'images', 'about.png'),
    'public/images/about.png',
    os.path.join(os.getcwd(), 'public', 'images', 'about.png'),
    '/mnt/z/front-end/public/images/about.png',
    os.path.expanduser('~/front-end/public/images/about.png'),
]

input_image = None
for path in possible_paths:
    if os.path.exists(path):
        input_image = path
        print(f"Found image at: {path}")
        break

if not input_image:
    print("Error: Could not find about.png")
    print(f"Current directory: {os.getcwd()}")
    print(f"Script directory: {script_dir}")
    print("Tried paths:")
    for p in possible_paths:
        print(f"  - {p} (exists: {os.path.exists(p)})")
    sys.exit(1)

output_image = input_image  # Overwrite original

# Dark indigo blue color: #1a1a2e
BACKGROUND_COLOR = (26, 26, 46)

try:
    print(f'Loading image: {input_image}')
    
    # Load the image
    img = Image.open(input_image)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    print(f'Image dimensions: {img.width} x {img.height}')
    print(f'Image mode: {img.mode}')
    
    # Create a drawing context
    draw = ImageDraw.Draw(img)
    
    # Estimate where "About Us" text might be (typically on the left side)
    # We'll create a rectangle to cover the text area and fill it with background color
    # Adjust these coordinates based on where the text appears in your image
    # Common positions: left side, top-left, or center-left
    
    # Try to detect and remove text by looking for light-colored areas (text is usually light)
    # We'll scan for areas with high brightness and replace them with background
    
    pixels = img.load()
    width, height = img.size
    
    # Scan the image for light-colored pixels (likely text) and replace with background
    # Text is typically white or light colored
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # If pixel is very light (likely text) and not transparent
            # Adjust threshold as needed - text is usually very bright (R, G, B > 200)
            if a > 200 and r > 200 and g > 200 and b > 200:
                # Replace with background color, keeping some transparency for blending
                pixels[x, y] = BACKGROUND_COLOR + (255,)
            # Also handle medium-bright pixels that might be part of text
            elif a > 150 and r > 180 and g > 180 and b > 180:
                # Blend with background
                blend_ratio = 0.7
                new_r = int(r * (1 - blend_ratio) + BACKGROUND_COLOR[0] * blend_ratio)
                new_g = int(g * (1 - blend_ratio) + BACKGROUND_COLOR[1] * blend_ratio)
                new_b = int(b * (1 - blend_ratio) + BACKGROUND_COLOR[2] * blend_ratio)
                pixels[x, y] = (new_r, new_g, new_b, a)
    
    # Alternative approach: Draw a rectangle over the text area if we know its position
    # Uncomment and adjust coordinates if you know where the text is:
    # text_area_left = 0
    # text_area_top = 0
    # text_area_right = width // 3  # Adjust based on text width
    # text_area_bottom = height // 2  # Adjust based on text height
    # draw.rectangle(
    #     [(text_area_left, text_area_top), (text_area_right, text_area_bottom)],
    #     fill=BACKGROUND_COLOR + (255,)
    # )
    
    # Save the modified image
    img.save(output_image, 'PNG')
    
    print('Text removed from image successfully!')
    print(f'Output saved to: {output_image}')
    
except Exception as error:
    print(f'Error modifying image: {error}')
    import traceback
    traceback.print_exc()
    exit(1)

