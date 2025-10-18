import { storage } from '../server/storage';

async function run() {
  try {
    const sample = await storage.createDocumentation({
      url: 'https://example.com',
      title: 'Test Doc',
      content: JSON.stringify({ test: true }),
    } as any);
    console.log('Inserted:', sample);

    const all = await storage.getAllDocumentations();
    console.log('All docs count:', all.length);

    const fetched = await storage.getDocumentation((sample as any).id);
    console.log('Fetched:', fetched ? fetched.title : 'not found');
  } catch (err) {
    console.error('DB test error:', err);
    process.exit(1);
  }
}

run();
