import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PackagesService } from '../../modules/packages/packages.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try { console.log(JSON.stringify(await app.get(PackagesService).prepareCatalog())); }
  finally { await app.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
