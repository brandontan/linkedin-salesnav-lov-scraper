import { NextResponse } from 'next/server';
import { LinkedInScraper } from '@/lib/linkedin-scraper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      keywords,
      title,
      company,
      location,
      linkedinEmail,
      linkedinPassword,
    } = body;

    const scraper = new LinkedInScraper();
    await scraper.initialize();
    await scraper.login(linkedinEmail, linkedinPassword);

    const prospects = await scraper.searchProspects({
      keywords,
      title,
      company,
      location,
    });

    await scraper.close();

    return NextResponse.json({ prospects });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape LinkedIn' },
      { status: 500 }
    );
  }
} 