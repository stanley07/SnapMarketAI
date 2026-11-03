import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarProducts } from '@/lib/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { embedding, tags = [], colors = [], category } = body;

    const results = await searchSimilarProducts(embedding, tags, colors, category);

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute visual search', details: String(error) },
      { status: 500 }
    );
  }
}
