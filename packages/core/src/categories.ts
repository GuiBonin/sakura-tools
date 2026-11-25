import type { ToolCategory } from './types';

export const CATEGORIES: readonly ToolCategory[] = [
  {
    id: 'programming',
    name: { 'pt-BR': 'Programação', en: 'Programming' },
    icon: 'Braces',
    order: 1,
  },
  {
    id: 'converters',
    name: { 'pt-BR': 'Conversores', en: 'Converters' },
    icon: 'ArrowLeftRight',
    order: 2,
  },
  {
    id: 'generators',
    name: { 'pt-BR': 'Geradores', en: 'Generators' },
    icon: 'Sparkles',
    order: 3,
  },
  { id: 'text', name: { 'pt-BR': 'Texto', en: 'Text' }, icon: 'Type', order: 4 },
  { id: 'security', name: { 'pt-BR': 'Segurança', en: 'Security' }, icon: 'ShieldCheck', order: 5 },
  { id: 'network', name: { 'pt-BR': 'Redes', en: 'Network' }, icon: 'Network', order: 6 },
  { id: 'frontend', name: { 'pt-BR': 'Frontend', en: 'Frontend' }, icon: 'Palette', order: 7 },
  { id: 'dates', name: { 'pt-BR': 'Datas', en: 'Dates' }, icon: 'CalendarClock', order: 8 },
  { id: 'brazil', name: { 'pt-BR': 'Brasil', en: 'Brazil' }, icon: 'Flag', order: 9 },
  {
    id: 'fiscal',
    name: { 'pt-BR': 'Documentos fiscais', en: 'Tax documents' },
    icon: 'FileText',
    order: 10,
  },
];
