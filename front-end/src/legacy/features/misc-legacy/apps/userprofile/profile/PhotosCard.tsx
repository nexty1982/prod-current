// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect } from 'react';
import { Typography, ImageList, ImageListItem, Skeleton, Box } from '@mui/material';

import ChildCard from '@/shared/ui/ChildCard';

interface photoType {
  img: string;
  id: number;
}

// Orthodox-themed placeholder images
const orthodoxImages = [
  '/orthodox/avatars/default.svg',
  '/orthodox/banners/default.svg',
  '/orthodox/avatars/default.svg',
  '/orthodox/banners/default.svg',
  '/orthodox/avatars/default.svg',
  '/orthodox/banners/default.svg',
  '/orthodox/avatars/default.svg',
  '/orthodox/banners/default.svg',
  '/orthodox/avatars/default.svg',
];

const photos: photoType[] = orthodoxImages.map((img, index) => ({
  img,
  id: index + 1,
}));

const PhotosCard = () => {

  const [isLoading, setLoading] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ChildCard>
      <Typography variant="h4">Photos</Typography>
      <ImageList cols={3} gap={20}>
        {photos.map((photo) => (
          <Box key={photo.id}>
            {
              isLoading ? (
                <>
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    width="100%"
                    height={93}
                    key={photo.id}
                  ></Skeleton>
                </>
              ) : (
                <ImageListItem key={photo.id}>
                  <img
                    srcSet={`${photo.img} 1x, ${photo.img} 2x`}
                    alt="Orthodox themed image"
                    loading="lazy"
                    style={{ borderRadius: 8 }}
                  />
                </ImageListItem>
              )}
          </Box>
        ))}
      </ImageList>
    </ChildCard >
  )
};

export default PhotosCard;
