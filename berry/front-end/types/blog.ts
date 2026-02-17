import { ChipProps } from '@mui/material/Chip';

export type DraftItem = {
  title: string;
  subTitle: string;
  label: string;
  color: ChipProps['color'];
  date: string;
};

export type Article = {
  title: string;
  subTitle: string;
  name: string;
  label: string;
  color: ChipProps['color'];
  avatar: string;
  link: string;
  comments: string;
  status: string;
};
