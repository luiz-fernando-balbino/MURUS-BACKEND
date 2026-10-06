/**
 * Utilitários puros (sem dependência do Nest) para validação de mídia.
 * Mantidos isolados para serem fáceis de testar.
 */

export type MediaKind = 'image' | 'video';

/** Extensões aceitas e o tipo de mídia correspondente. */
export const ALLOWED_EXTENSIONS: Readonly<Record<string, MediaKind>> = {
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.heic': 'image',
  '.heif': 'image',
  '.mp4': 'video',
  '.m4v': 'video',
  '.mov': 'video',
  '.webm': 'video',
};

/** Ano no formato YYYY. */
export const YEAR_REGEX = /^\d{4}$/;
/** Mês no formato MM (01-12). */
export const MONTH_REGEX = /^(0[1-9]|1[0-2])$/;
/** Nome gerado pelo servidor: UUID v4 + extensão. */
export const STORED_FILENAME_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;

/** Retorna o tipo de mídia para uma extensão (com ponto) ou undefined. */
export function getMediaKind(extension: string): MediaKind | undefined {
  return ALLOWED_EXTENSIONS[extension.toLowerCase()];
}

/**
 * O Content-Type enviado pelo cliente é só uma dica (qualquer um pode
 * mentir). Celulares costumam enviar application/octet-stream, então
 * aceitamos também esse valor; a verificação real é a extensão + assinatura.
 */
export function isPlausibleMimeType(mimetype: string): boolean {
  const mime = (mimetype ?? '').toLowerCase();
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime === 'application/octet-stream'
  );
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

/**
 * Confere se os primeiros bytes do arquivo (magic bytes) são compatíveis
 * com a extensão declarada. Impede, por exemplo, um script renomeado .jpg.
 */
export function matchesSignature(extension: string, head: Buffer): boolean {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case '.png':
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case '.gif':
      return startsWith(head, [0x47, 0x49, 0x46, 0x38]); // "GIF8"
    case '.webp':
      // "RIFF" .... "WEBP"
      return (
        startsWith(head, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)
      );
    case '.mp4':
    case '.m4v':
    case '.mov':
    case '.heic':
    case '.heif':
      // Família ISO-BMFF: bytes 4..7 = "ftyp"
      return startsWith(head, [0x66, 0x74, 0x79, 0x70], 4);
    case '.webm':
      return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]); // EBML
    default:
      return false;
  }
}

/** Quantidade de bytes iniciais necessária para `matchesSignature`. */
export const SIGNATURE_BYTES = 16;
