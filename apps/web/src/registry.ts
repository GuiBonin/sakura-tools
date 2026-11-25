import { ToolRegistry } from '@sakura-tools/core';
import { CATALOG } from '@sakura-tools/tools/catalog';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const registry = new ToolRegistry(CATALOG);

/**
 * Cada ferramenta é um chunk separado, carregado só quando aberto.
 * A chave é o ID da ferramenta no catálogo. Um teste garante que toda
 * ferramenta disponível tem componente e vice-versa.
 */
export const TOOL_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  'json-formatter': lazy(() => import('./tools/JsonFormatter')),
  'xml-formatter': lazy(() => import('./tools/XmlFormatter')),
  base64: lazy(() => import('./tools/Base64Tool')),
  'url-encoder': lazy(() => import('./tools/UrlEncoder')),
  'uuid-generator': lazy(() => import('./tools/UuidGenerator')),
  'password-generator': lazy(() => import('./tools/PasswordGenerator')),
  'color-converter': lazy(() => import('./tools/ColorConverter')),
  'regex-tester': lazy(() => import('./tools/RegexTester')),
  'text-diff': lazy(() => import('./tools/TextDiff')),
  'unix-timestamp': lazy(() => import('./tools/UnixTimestamp')),
  'qr-code': lazy(() => import('./tools/QrCodeGenerator')),
  'hash-generator': lazy(() => import('./tools/HashGenerator')),
  'jwt-decoder': lazy(() => import('./tools/JwtDecoder')),
  'cpf-validator': lazy(() => import('./tools/CpfValidator')),
  'cnpj-validator': lazy(() => import('./tools/CnpjValidator')),
};
