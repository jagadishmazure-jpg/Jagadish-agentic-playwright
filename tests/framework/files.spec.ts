import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from '../../framework/utils/data';
import { expect, test } from '../../framework/fixtures';

test.describe('file upload and download', () => {
  test('upload from a file on disk and from an in-memory buffer', async ({ returnsPage }) => {
    await returnsPage.goto();
    await returnsPage.photo.setInputFiles(path.join(__dirname, '..', 'fixtures', 'damaged-seam.txt'));
    await expect(returnsPage.photoInfo).toHaveText(/Uploaded damaged-seam\.txt \(\d+ bytes\)/);
    await returnsPage.photo.setInputFiles({ name: 'zip.txt', mimeType: 'text/plain', buffer: Buffer.from('broken zip pull') });
    await expect(returnsPage.photoInfo).toHaveText('Uploaded zip.txt (15 bytes)');
  });

  test('download the return label and validate its contents @cross', async ({ returnsPage }) => {
    await returnsPage.goto();
    await returnsPage.submit('LK-1003', 'Too small');
    await expect(returnsPage.result).toHaveText(/Return RMA-\d{4} created for LK-1003/);
    const download = await returnsPage.downloadLabel();
    expect(download.suggestedFilename()).toMatch(/^RMA-\d{4}-label\.csv$/);
    const file = test.info().outputPath(download.suggestedFilename());
    await download.saveAs(file);
    const [row] = parseCsv(await readFile(file, 'utf8'));
    expect(row).toMatchObject({ order_id: 'LK-1003', reason: 'too-small', carrier: 'Parcelwise' });
  });
});
