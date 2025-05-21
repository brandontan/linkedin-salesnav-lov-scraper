'use client';

import { useState } from 'react';

interface Prospect {
  full_name: string;
  job_title: string;
  company: string;
  linkedin_url: string;
  keyword_sources: string[];
  signal_score: number;
  company_details?: {
    headcount: string;
    type: string;
    headquarters: string;
    industry: string[];
  };
  personal_details?: {
    location: {
      country: string;
      state: string;
      city: string;
    };
    hasPostedOnLinkedIn: boolean;
  };
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    keywords: '',
    title: '',
    company: '',
    location: '',
    email: '',
    password: '',
    // New Sales Navigator filters
    companyHeadcountMin: '',
    companyHeadcountMax: '',
    companyType: '',
    companyHeadquarters: '',
    currentJobTitle: '',
    country: '',
    state: '',
    city: '',
    postalCode: '',
    industry: '',
    hasPostedOnLinkedIn: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProspects([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: formData.keywords.split(',').map(k => k.trim()),
          title: formData.title,
          company: formData.company,
          location: formData.location,
          email: formData.email,
          password: formData.password,
          // New Sales Navigator filters
          companyHeadcount: {
            min: formData.companyHeadcountMin ? parseInt(formData.companyHeadcountMin) : undefined,
            max: formData.companyHeadcountMax ? parseInt(formData.companyHeadcountMax) : undefined,
          },
          companyType: formData.companyType || undefined,
          companyHeadquarters: formData.companyHeadquarters || undefined,
          currentJobTitle: formData.currentJobTitle || undefined,
          personalGeography: {
            country: formData.country || undefined,
            state: formData.state || undefined,
            city: formData.city || undefined,
            postalCode: formData.postalCode || undefined,
          },
          industry: formData.industry ? formData.industry.split(',').map(i => i.trim()) : undefined,
          hasPostedOnLinkedIn: formData.hasPostedOnLinkedIn,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape LinkedIn');
      }

      const result = await response.json();
      setProspects(result.prospects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Job Title', 'Company', 'LinkedIn URL', 'Signal Score', 'Keyword Sources'];
    const csvContent = [
      headers.join(','),
      ...prospects.map(p => [
        p.full_name,
        p.job_title,
        p.company,
        p.linkedin_url,
        p.signal_score,
        p.keyword_sources.join(';'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospects.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LinkedIn Prospect Finder</h1>
          <p className="mt-2 text-sm text-gray-600">
            Find and analyze potential prospects using LinkedIn Sales Navigator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              id="keywords"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="companyHeadcountMin" className="block text-sm font-medium text-gray-700">
                Min Company Headcount
              </label>
              <input
                type="number"
                id="companyHeadcountMin"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.companyHeadcountMin}
                onChange={(e) => setFormData({ ...formData, companyHeadcountMin: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="companyHeadcountMax" className="block text-sm font-medium text-gray-700">
                Max Company Headcount
              </label>
              <input
                type="number"
                id="companyHeadcountMax"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.companyHeadcountMax}
                onChange={(e) => setFormData({ ...formData, companyHeadcountMax: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="companyType" className="block text-sm font-medium text-gray-700">
              Company Type
            </label>
            <select
              id="companyType"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.companyType}
              onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
            >
              <option value="">Select type</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="non-profit">Non-Profit</option>
              <option value="government">Government</option>
              <option value="educational">Educational</option>
            </select>
          </div>

          <div>
            <label htmlFor="companyHeadquarters" className="block text-sm font-medium text-gray-700">
              Company Headquarters
            </label>
            <input
              type="text"
              id="companyHeadquarters"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.companyHeadquarters}
              onChange={(e) => setFormData({ ...formData, companyHeadquarters: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                id="country"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                id="city"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                type="text"
                id="postalCode"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
              Industry (comma-separated)
            </label>
            <input
              type="text"
              id="industry"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasPostedOnLinkedIn"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.hasPostedOnLinkedIn}
              onChange={(e) => setFormData({ ...formData, hasPostedOnLinkedIn: e.target.checked })}
            />
            <label htmlFor="hasPostedOnLinkedIn" className="ml-2 block text-sm text-gray-700">
              Has Posted on LinkedIn
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                LinkedIn Email
              </label>
              <input
                type="email"
                id="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                LinkedIn Password
              </label>
              <input
                type="password"
                id="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Prospects'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {prospects.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Results ({prospects.length})</h2>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Download CSV
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {prospects.map((prospect, index) => (
                  <li key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-blue-600">
                          <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer">
                            {prospect.full_name}
                          </a>
                        </h3>
                        <p className="text-sm text-gray-500">{prospect.job_title}</p>
                        <p className="text-sm text-gray-500">{prospect.company}</p>
                        {prospect.company_details && (
                          <div className="mt-2 text-sm text-gray-500">
                            <p>Headcount: {prospect.company_details.headcount}</p>
                            <p>Type: {prospect.company_details.type}</p>
                            <p>Headquarters: {prospect.company_details.headquarters}</p>
                            <p>Industry: {prospect.company_details.industry.join(', ')}</p>
                          </div>
                        )}
                        {prospect.personal_details && (
                          <div className="mt-2 text-sm text-gray-500">
                            <p>Location: {prospect.personal_details.location.city}, {prospect.personal_details.location.state}, {prospect.personal_details.location.country}</p>
                            <p>Has Posted: {prospect.personal_details.hasPostedOnLinkedIn ? 'Yes' : 'No'}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Score: {prospect.signal_score}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 