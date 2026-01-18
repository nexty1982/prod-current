#!/usr/bin/env python3
from PIL import Image
import os

# Dark indigo blue color: #1a1a2e
BACKGROUND_COLOR = (26, 26, 46)

input_image = 'public/images/about.png'
output_image = 'public/images/about.png'  # Overwrite original

try:
    print(f'Loading image: {input_image}')
    
    # Load the image
    img = Image.open(input_image)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    print(f'Image dimensions: {img.width} x {img.height}')
    print(f'Image mode: {img.mode}')
    
    # Create a new image with the background color
    background = Image.new('RGBA', img.size, BACKGROUND_COLOR + (255,))
    
    # Composite the original image over the background
    # This replaces transparent areas with the background color
    result = Image.alpha_composite(background, img)
    
    # Also replace white/light pixels with the background color
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            r, g, b, a = pixels[x, y]
            # If pixel is white or very light (and not transparent), replace with background
            if a > 0 and r > 240 and g > 240 and b > 240:
                pixels[x, y] = BACKGROUND_COLOR + (a,)
    
    # Save the modified image
    result.save(output_image, 'PNG')
    
    print('Image modified successfully!')
    print(f'Output saved to: {output_image}')
    
except Exception as error:
    print(f'Error modifying image: {error}')
    import traceback
    traceback.print_exc()
    exit(1)

