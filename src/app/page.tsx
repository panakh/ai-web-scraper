'use client';

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { scrapeWebsite } from './actions/scrapeWebsite';
import { ColumnDef } from "@tanstack/react-table";

export default function Home() {
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState('');
  const [scrapedData, setScrapedData] = useState<Record<string, string>[] | null>(null);

  const handleScrape = async () => {
    const fieldArray = fields.split(',').map(field => field.trim());
    const result = await scrapeWebsite(url, fieldArray);
    
    if (result.success && result.extractedData) {
      setScrapedData(result.extractedData);
    } else {
      alert('Failed to scrape website');
      setScrapedData(null);
    }
  };

  const columns = useMemo(() => {
    if (!scrapedData || scrapedData.length === 0) return [];
    return Object.keys(scrapedData[0]).map((key) => ({
      accessorKey: key,
      header: key,
    })) as ColumnDef<Record<string, string>>[];
  }, [scrapedData]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Web Scraper</h1>
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter URL to scrape"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Enter fields to extract (comma-separated)"
          value={fields}
          onChange={(e) => setFields(e.target.value)}
        />
        <Button onClick={handleScrape}>Scrape Website</Button>
      </div>

      {scrapedData && scrapedData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Extracted Data</h2>
          <DataTable columns={columns} data={scrapedData} />
        </div>
      )}
    </div>
  );
}
