
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CatalogSection } from '@/lib/types';
import { getSession } from '@/lib/session';

const catalogFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'catalog-items.json');

async function readCatalog(): Promise<CatalogSection[]> {
  try {
    const data = await fs.promises.readFile(catalogFilePath, 'utf-8');
    const sections: CatalogSection[] = JSON.parse(data);
    sections.sort((a, b) => a.seccion.localeCompare(b.seccion));
    return sections;
  } catch (error) {
    console.error("Error reading catalog file:", error);
     if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeCatalog(sections: CatalogSection[]): Promise<void> {
  await fs.promises.writeFile(catalogFilePath, JSON.stringify(sections, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const sections = await readCatalog();
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read catalog data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    await writeCatalog(body);
    return NextResponse.json({ message: 'Catalog updated successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to update catalog:", error);
    return NextResponse.json({ message: 'Failed to update catalog' }, { status: 500 });
  }
}
