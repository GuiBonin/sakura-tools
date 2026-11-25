/**
 * Política de segurança de conteúdo do app público.
 * `connect-src 'self'`: nenhuma ferramenta gratuita faz requisição externa.
 * `style-src 'unsafe-inline'`: a Sakura UI usa framer-motion, que aplica estilos inline.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
