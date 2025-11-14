
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Post } from '@/lib/types';

const postsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'posts.json');

async function readPosts(): Promise<Post[]> {
  try {
    const data = await fs.promises.readFile(postsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function GET() {
  try {
    const posts = await readPosts();
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read posts data' }, { status: 500 });
  }
}
