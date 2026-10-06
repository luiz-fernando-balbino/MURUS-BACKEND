import { randomUUID } from 'crypto';
import {
  MONTH_REGEX,
  STORED_FILENAME_REGEX,
  YEAR_REGEX,
  getMediaKind,
  isPlausibleMimeType,
  matchesSignature,
} from './media.utils';

const padded = (...bytes: number[]) =>
  Buffer.from(bytes.concat(new Array<number>(16).fill(0)));
const ftyp = (brand: string) =>
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from(`ftyp${brand}`)]);

describe('media.utils', () => {
  describe('matchesSignature', () => {
    it('aceita JPEG e PNG legítimos', () => {
      expect(matchesSignature('.JPG', padded(0xff, 0xd8, 0xff, 0xe0))).toBe(
        true,
      );
      expect(
        matchesSignature(
          '.png',
          padded(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        ),
      ).toBe(true);
    });

    it('rejeita script renomeado como imagem', () => {
      expect(
        matchesSignature('.jpg', Buffer.from('<?php echo 1; ?>......')),
      ).toBe(false);
    });

    it('rejeita extensão divergente do conteúdo', () => {
      expect(matchesSignature('.png', padded(0xff, 0xd8, 0xff))).toBe(false);
    });

    it('aceita vídeos e HEIC (ISO-BMFF) e WebP', () => {
      expect(matchesSignature('.mp4', ftyp('mp42'))).toBe(true);
      expect(matchesSignature('.mov', ftyp('qt  '))).toBe(true);
      expect(matchesSignature('.heic', ftyp('heic'))).toBe(true);
      expect(
        matchesSignature(
          '.webp',
          Buffer.concat([
            Buffer.from('RIFF'),
            Buffer.from([1, 2, 3, 4]),
            Buffer.from('WEBP'),
          ]),
        ),
      ).toBe(true);
    });

    it('rejeita RIFF que não é WebP, extensões desconhecidas e arquivo vazio', () => {
      expect(
        matchesSignature(
          '.webp',
          Buffer.concat([
            Buffer.from('RIFF'),
            Buffer.from([1, 2, 3, 4]),
            Buffer.from('WAVE'),
          ]),
        ),
      ).toBe(false);
      expect(matchesSignature('.exe', padded(0x4d, 0x5a))).toBe(false);
      expect(matchesSignature('.jpg', Buffer.alloc(0))).toBe(false);
    });
  });

  describe('getMediaKind', () => {
    it('classifica extensões e ignora o resto', () => {
      expect(getMediaKind('.MOV')).toBe('video');
      expect(getMediaKind('.png')).toBe('image');
      expect(getMediaKind('.php')).toBeUndefined();
      expect(getMediaKind('.constructor')).toBeUndefined();
    });
  });

  describe('isPlausibleMimeType', () => {
    it('aceita image/*, video/* e octet-stream; rejeita o resto', () => {
      expect(isPlausibleMimeType('image/jpeg')).toBe(true);
      expect(isPlausibleMimeType('application/octet-stream')).toBe(true);
      expect(isPlausibleMimeType('text/html')).toBe(false);
    });
  });

  describe('validadores de caminho', () => {
    it('aceita ano/mês/nome válidos', () => {
      expect(YEAR_REGEX.test('2026')).toBe(true);
      expect(MONTH_REGEX.test('05')).toBe(true);
      expect(STORED_FILENAME_REGEX.test(`${randomUUID()}.jpg`)).toBe(true);
    });

    it('bloqueia tentativas de path traversal', () => {
      expect(YEAR_REGEX.test('..')).toBe(false);
      expect(MONTH_REGEX.test('13')).toBe(false);
      expect(STORED_FILENAME_REGEX.test('../../etc/passwd')).toBe(false);
      expect(STORED_FILENAME_REGEX.test(`${randomUUID()}.jpg/../x`)).toBe(
        false,
      );
    });
  });
});
