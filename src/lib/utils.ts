export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

export function humanizeBehavior(page: any) {
  // Add random mouse movements
  page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  // Randomize user agent
  page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
}

export const generateCSV = (prospects: any[]): string => {
  const headers = [
    'full_name',
    'first',
    'last',
    'job_title',
    'domain',
    'company',
    'email',
    'linkedin_url',
    'company_city',
    'company_region',
    'company_country',
    'city',
    'region',
    'country',
    'employee_count_range',
    'industries',
    'linkedin_company_url',
    'keyword_sources',
    'signal_score'
  ];

  const rows = prospects.map(prospect => [
    prospect.full_name,
    prospect.first,
    prospect.last,
    prospect.job_title,
    prospect.domain,
    prospect.company,
    prospect.email,
    prospect.linkedin_url,
    prospect.company_city,
    prospect.company_region,
    prospect.company_country,
    prospect.city,
    prospect.region,
    prospect.country,
    prospect.employee_count_range,
    prospect.industries.join(';'),
    prospect.linkedin_company_url,
    prospect.keyword_sources.join(';'),
    prospect.signal_score
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}; 