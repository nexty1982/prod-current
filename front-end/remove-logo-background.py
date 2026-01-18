#!/usr/bin/env python3
"""
Unified script to remove backgrounds from logo images.
Supports two methods:
1. Brightness-based: Removes white/light colored pixels (simple method)
2. Circle-based: Detects circular logo boundaries and removes everything outside (advanced method)
"""
from PIL import Image, ImageDraw
import os
import math
import sys

def remove_background_brightness(image_path, output_path=None, threshold_high=240, threshold_medium=200):
    """
    Remove background by making white/light colored pixels transparent.
    This is a simple method that works well for logos with white/light backgrounds.
    
    Args:
        image_path: Path to input image
        output_path: Path to save output (defaults to overwriting input)
        threshold_high: Brightness threshold for fully transparent pixels (default 240)
        threshold_medium: Brightness threshold for semi-transparent pixels (default 200)
    """
    if output_path is None:
        output_path = image_path  # Overwrite original
    
    try:
        print(f'Loading image: {image_path}')
        
        # Load the image
        img = Image.open(image_path)
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        print(f'Image dimensions: {img.width} x {img.height}')
        print(f'Image mode: {img.mode}')
        
        # Get pixel data
        pixels = img.load()
        width, height = img.size
        
        # Make white/light colored pixels transparent
        # This will remove the background while keeping the logo content
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # If pixel is white or very light (likely background), make it transparent
                # Adjust threshold as needed - background is usually very bright
                if r > threshold_high and g > threshold_high and b > threshold_high:
                    pixels[x, y] = (r, g, b, 0)  # Make transparent
                # Also handle medium-bright pixels that might be part of background
                elif r > threshold_medium and g > threshold_medium and b > threshold_medium:
                    # Make semi-transparent or fully transparent based on brightness
                    brightness = (r + g + b) / 3
                    if brightness > (threshold_high - 20):
                        pixels[x, y] = (r, g, b, 0)  # Fully transparent
                    else:
                        # Reduce opacity for medium-bright pixels
                        new_alpha = int(255 * (1 - (brightness - threshold_medium) / 20))
                        pixels[x, y] = (r, g, b, new_alpha)
        
        # Save the modified image
        img.save(output_path, 'PNG')
        
        print('Background removed successfully!')
        print(f'Output saved to: {output_path}')
        return True
        
    except Exception as error:
        print(f'Error modifying image: {error}')
        import traceback
        traceback.print_exc()
        return False

def detect_circle_boundary(img):
    """
    Detect the circle boundary by finding the outermost edge of the logo.
    Uses multiple strategies to accurately detect the silver-grey border edge.
    Returns center (x, y) and radius.
    """
    width, height = img.size
    pixels = img.load()
    
    center_x = width / 2
    center_y = height / 2
    max_radius = min(width, height) / 2
    
    # Strategy 1: Find the outermost non-background pixel by scanning from edge inward
    # Check many angles for better coverage (every 15 degrees = 24 angles)
    angles = list(range(0, 360, 15))
    radii = []
    
    for angle in angles:
        rad = math.radians(angle)
        found_logo_pixel = False
        last_logo_radius = None
        
        # Scan from outside (98%) inward to find where logo content starts
        for r in range(int(max_radius * 0.98), int(max_radius * 0.15), -1):
            x = int(center_x + r * math.cos(rad))
            y = int(center_y + r * math.sin(rad))
            
            if 0 <= x < width and 0 <= y < height:
                r_val, g_val, b_val, a_val = pixels[x, y]
                brightness = (r_val + g_val + b_val) / 3
                
                # Determine if this is background or logo
                # Background characteristics:
                # - Very bright white/cream (brightness > 250)
                # - Very dark (black background, brightness < 20)
                # - Pure white RGB values (all > 250)
                
                # Logo characteristics (silver border, colored content):
                # - Medium brightness (20-250) with some color variation
                # - Silver/grey tones (similar R, G, B values in medium range)
                # - Gold tones (higher R, G than B)
                # - Blue tones (higher B than R, G)
                
                is_background = False
                
                # Very bright white/cream background
                if brightness > 250 or (r_val > 250 and g_val > 250 and b_val > 250):
                    is_background = True
                # Very dark black background
                elif brightness < 20:
                    is_background = True
                # Check for uniform very light colors (off-white backgrounds)
                elif brightness > 240 and abs(r_val - g_val) < 10 and abs(g_val - b_val) < 10:
                    is_background = True
                
                # If not background, this is part of the logo
                if not is_background:
                    if not found_logo_pixel:
                        # First logo pixel found from outside - this is the outer edge
                        last_logo_radius = r
                        found_logo_pixel = True
                    # Continue tracking the outermost logo pixel
                    if r > last_logo_radius:
                        last_logo_radius = r
        
        if found_logo_pixel and last_logo_radius is not None:
            # Add buffer to ensure we don't cut off the edge
            radii.append(last_logo_radius + 5)
        else:
            # Fallback: use 96% of max radius if we can't detect
            radii.append(int(max_radius * 0.96))
    
    # Strategy 2: Also check for edge transitions (where brightness changes significantly)
    # This helps catch the metallic border edges
    edge_radii = []
    for angle in range(0, 360, 30):  # Every 30 degrees
        rad = math.radians(angle)
        prev_brightness = None
        
        for r in range(int(max_radius * 0.98), int(max_radius * 0.2), -1):
            x = int(center_x + r * math.cos(rad))
            y = int(center_y + r * math.sin(rad))
            
            if 0 <= x < width and 0 <= y < height:
                r_val, g_val, b_val, a_val = pixels[x, y]
                brightness = (r_val + g_val + b_val) / 3
                
                if prev_brightness is not None:
                    # Check for significant brightness change (edge detection)
                    brightness_diff = abs(brightness - prev_brightness)
                    if brightness_diff > 30:  # Significant change indicates an edge
                        edge_radii.append(r + 3)
                        break
                
                prev_brightness = brightness
    
    # Combine results from both strategies
    all_radii = radii + edge_radii
    
    if all_radii:
        # Use the maximum radius found to ensure we capture everything
        detected_radius = max(all_radii)
        # Add extra safety margin for jagged/serrated edges
        detected_radius = min(detected_radius + 8, max_radius * 0.99)
    else:
        # Ultimate fallback: use 97% of the smaller dimension
        detected_radius = min(width, height) / 2 * 0.97
    
    return center_x, center_y, detected_radius

def remove_background_circle(image_path, output_path=None):
    """
    Make the background transparent, keeping only the content inside the circle.
    Uses improved circle detection and background removal.
    Best for circular logos with defined boundaries.
    """
    if output_path is None:
        output_path = image_path  # Overwrite original
    
    try:
        print(f'\nLoading image: {image_path}')
        
        # Load the image
        img = Image.open(image_path)
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        print(f'Image dimensions: {img.width} x {img.height}')
        print(f'Image mode: {img.mode}')
        
        # Get pixel data
        pixels = img.load()
        width, height = img.size
        
        # Detect the circle boundary
        center_x, center_y, radius = detect_circle_boundary(img)
        print(f'Detected circle center: ({center_x:.1f}, {center_y:.1f}), radius: {radius:.1f}')
        
        # Create a new image with transparency
        result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        result_pixels = result.load()
        
        # Process each pixel
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # Calculate distance from center
                distance = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
                
                # Check if pixel is inside the circle
                if distance <= radius:
                    # Inside circle - keep the pixel
                    result_pixels[x, y] = (r, g, b, a)
                else:
                    # Outside circle - make transparent (all backgrounds should be removed)
                    result_pixels[x, y] = (r, g, b, 0)
        
        # Save the modified image
        result.save(output_path, 'PNG')
        
        print('Background made transparent successfully!')
        print(f'Output saved to: {output_path}')
        return True
        
    except Exception as error:
        print(f'Error modifying image: {error}')
        import traceback
        traceback.print_exc()
        return False

def find_image_path(relative_path):
    """
    Find the full path to an image by searching in common locations.
    Returns the full path if found, None otherwise.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    possible_base_paths = [
        script_dir,
        os.path.join(script_dir, '..'),
        os.getcwd(),
    ]
    
    for base_path in possible_base_paths:
        full_path = os.path.join(base_path, relative_path)
        if os.path.exists(full_path):
            return full_path
    
    return None

def process_images(image_list, method='circle', output_paths=None):
    """
    Process a list of images using the specified method.
    
    Args:
        image_list: List of image paths (relative or absolute)
        method: 'circle' for circle-based removal, 'brightness' for brightness-based removal
        output_paths: Optional dict mapping input paths to output paths
    """
    if output_paths is None:
        output_paths = {}
    
    success_count = 0
    failed_count = 0
    
    for image_path in image_list:
        print(f'\n{"="*60}')
        print(f'Processing: {image_path}')
        print(f'Method: {method}')
        print(f'{"="*60}')
        
        # Try to find the image if it's a relative path
        full_path = find_image_path(image_path) if not os.path.isabs(image_path) else image_path
        
        if full_path is None:
            print(f'Warning: Could not find {image_path}')
            failed_count += 1
            continue
        
        # Determine output path
        output_path = output_paths.get(image_path, None)
        
        # Process based on method
        if method == 'circle':
            success = remove_background_circle(full_path, output_path)
        elif method == 'brightness':
            success = remove_background_brightness(full_path, output_path)
        else:
            print(f'Error: Unknown method "{method}". Use "circle" or "brightness".')
            failed_count += 1
            continue
        
        if success:
            success_count += 1
        else:
            failed_count += 1
    
    print(f'\n{"="*60}')
    print(f'Processing complete!')
    print(f'Success: {success_count}, Failed: {failed_count}')
    print(f'{"="*60}')
    
    return success_count, failed_count

# Default configuration: Process all known logo images
if __name__ == '__main__':
    # All logo images from both original scripts
    logo_images = [
        'public/images/logo-new.png',  # From remove-logo-background.py
        'public/images/header/new-logo.png',  # From remove-logo-backgrounds.py
        'public/images/header/new-logo3.png',
        'public/images/header/new-logo4.png',
        'public/images/header/new-logo5.png',
    ]
    
    # Default method: 'circle' for circular logos, 'brightness' for simple white backgrounds
    # You can change this or make it configurable via command line arguments
    default_method = 'circle'
    
    # Check for command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] in ['circle', 'brightness']:
            default_method = sys.argv[1]
        elif sys.argv[1] in ['-h', '--help']:
            print("Usage: python remove-logo-background.py [method]")
            print("  method: 'circle' (default) or 'brightness'")
            print("  'circle': Detects circular boundaries and removes everything outside")
            print("  'brightness': Removes white/light colored pixels")
            sys.exit(0)
        else:
            print(f"Unknown argument: {sys.argv[1]}")
            print("Use 'circle' or 'brightness' as method, or -h/--help for help")
            sys.exit(1)
    
    # Process all images
    process_images(logo_images, method=default_method)
