import { en } from './en';
import { th } from './th';

export const TRANSLATIONS: Record<Language, typeof en> = {
  en,
  th
};

export type Language = 'en' | 'th';
