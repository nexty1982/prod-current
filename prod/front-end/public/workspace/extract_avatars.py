#!/usr/bin/env python3
"""
Avatar Extraction Script

This script extracts 9 individual avatars from a 3x3 grid image and saves them as separate PNG files.
Each avatar is saved as a 200x200 pixel image.
"""

import os
import sys
from PIL import Image

def extract_avatars(input_image_path, output_dir="public/images/profile/"):
    """
    Extract 9 avatars from a 3x3 grid image.
    
    Args:
        input_image_path (str): Path to the input image
        output_dir (str): Directory to save the extracted avatars
    """
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Open the image
        img = Image.open(input_image_path)
        
        # Get image dimensions
        width, height = img.size
        
        # Calculate the size of each avatar
        avatar_width = width // 3
        avatar_height = height // 3
        
        # Extract and save each avatar
        avatar_count = 1
        for row in range(3):
            for col in range(3):
                # Calculate coordinates for cropping
                left = col * avatar_width
                upper = row * avatar_height
                right = left + avatar_width
                lower = upper + avatar_height
                
                # Crop the avatar
                avatar = img.crop((left, upper, right, lower))
                
                # Resize to exactly 200x200 if needed
                if avatar.size != (200, 200):
                    avatar = avatar.resize((200, 200), Image.LANCZOS)
                
                # Save the avatar
                output_path = os.path.join(output_dir, f"avatar_{avatar_count}.png")
                avatar.save(output_path, "PNG")
                print(f"Saved {output_path}")
                
                avatar_count += 1
        
        print(f"Successfully extracted {avatar_count-1} avatars to {output_dir}")
        return True
    
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_avatars.py <path_to_image>")
        sys.exit(1)
    
    input_image = sys.argv[1]
    extract_avatars(input_image)