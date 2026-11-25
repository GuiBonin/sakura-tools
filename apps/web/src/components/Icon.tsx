import {
  ArrowLeftRight,
  Binary,
  BookOpen,
  Braces,
  Building2,
  CalendarClock,
  CaseSensitive,
  Clock,
  Code,
  Contrast,
  Database,
  FileCode,
  FileText,
  Fingerprint,
  Flag,
  GitCompare,
  Hash,
  IdCard,
  KeyRound,
  KeySquare,
  Link,
  Network,
  Palette,
  Pipette,
  QrCode,
  Regex,
  ShieldCheck,
  Sparkles,
  Table,
  Type,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/**
 * Mapa explícito em vez de importar o pacote inteiro: mantém o bundle
 * pequeno. O catálogo guarda o nome; aqui ele vira componente.
 */
const ICONS: Record<string, LucideIcon> = {
  ArrowLeftRight,
  Binary,
  BookOpen,
  Braces,
  Building2,
  CalendarClock,
  CaseSensitive,
  Clock,
  Code,
  Contrast,
  Database,
  FileCode,
  FileText,
  Fingerprint,
  Flag,
  GitCompare,
  Hash,
  IdCard,
  KeyRound,
  KeySquare,
  Link,
  Network,
  Palette,
  Pipette,
  QrCode,
  Regex,
  ShieldCheck,
  Sparkles,
  Table,
  Type,
};

export function hasIcon(name: string): boolean {
  return name in ICONS;
}

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = ICONS[name] ?? Wrench;
  return <Cmp aria-hidden="true" {...props} />;
}
