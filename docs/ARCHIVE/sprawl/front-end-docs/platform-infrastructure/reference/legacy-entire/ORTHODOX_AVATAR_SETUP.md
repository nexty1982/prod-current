# Orthodox Character Avatar Setup Guide

## Avatar Image Files Needed

Place the following avatar images in your `front-end/public/assets/avatars/` directory:

### Clergy Avatars
- `orthodox-priest-1.png` - Traditional Orthodox priest in black robes
- `orthodox-nun-1.png` - Orthodox nun in traditional habit
- `orthodox-monk-1.png` - Orthodox monk with beard and black robes
- `orthodox-deacon-1.png` - Orthodox deacon in traditional vestments
- `orthodox-bishop-1.png` - Orthodox bishop with ceremonial vestments and miter
- `orthodox-elder-1.png` - Elderly Orthodox priest or elder

### Laity Avatars
- `orthodox-man-1.png` - Middle-aged Orthodox man
- `orthodox-woman-1.png` - Orthodox woman (possibly with head covering)
- `orthodox-man-2.png` - Younger Orthodox man
- `orthodox-woman-2.png` - Orthodox woman (different style/age)
- `orthodox-young-man.png` - Young Orthodox faithful
- `orthodox-father.png` - Orthodox family father

## Image Specifications
- **Format**: PNG with transparent background preferred
- **Size**: 200x200 pixels minimum, square aspect ratio
- **Style**: Should reflect Orthodox Christian traditions and dress
- **Quality**: High resolution for crisp display at various sizes

## Fallback System
The current implementation includes emoji fallbacks if images are not found:
- Clergy roles use church/religious emojis (⛪, 📿, ✝️, 👑)
- Laity roles use people emojis (👨, 👩, 🧑, 👨‍👩‍👧‍👦)

## Customization
You can easily add more avatars by:
1. Adding new entries to the `orthodoxAvatars` array in `ProfileBanner.tsx`
2. Creating corresponding image files in the assets directory
3. Following the naming convention: `orthodox-[role]-[number].png`

## Cultural Considerations
- Ensure avatars are respectful of Orthodox traditions
- Consider different ethnic backgrounds within Orthodoxy
- Include both traditional and modern Orthodox dress styles
- Maintain appropriate modesty in all avatar designs
