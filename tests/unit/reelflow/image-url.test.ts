import { describe, expect, test } from 'vitest';
import { ossThumb } from '../../../apps/tanstack-app/src/lib/image-url';

describe('ossThumb', () => {
  const OSS = 'https://reelflow.oss-cn-hangzhou.aliyuncs.com/reelflow/images/a.png';

  test('appends OSS resize+quality params for OSS image URLs', () => {
    expect(ossThumb(OSS, 480)).toBe(`${OSS}?x-oss-process=image/resize,w_480/quality,q_80`);
  });

  test('respects an existing query string with &', () => {
    expect(ossThumb(`${OSS}?v=2`, 640, 70)).toBe(`${OSS}?v=2&x-oss-process=image/resize,w_640/quality,q_70`);
  });

  test('does not double-process when a process param already exists', () => {
    const already = `${OSS}?x-oss-process=image/resize,w_200`;
    expect(ossThumb(already, 480)).toBe(already);
  });

  test('rounds non-integer width/quality', () => {
    expect(ossThumb(OSS, 480.6, 79.4)).toBe(`${OSS}?x-oss-process=image/resize,w_481/quality,q_79`);
  });

  test('returns non-OSS http URLs unchanged', () => {
    const other = 'https://cdn.example.com/x.png';
    expect(ossThumb(other, 480)).toBe(other);
  });

  test('returns data: URLs unchanged', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    expect(ossThumb(data, 480)).toBe(data);
  });

  test('returns empty string for null/undefined/empty', () => {
    expect(ossThumb(null)).toBe('');
    expect(ossThumb(undefined)).toBe('');
    expect(ossThumb('')).toBe('');
  });
});
