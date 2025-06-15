
export interface CSVRow {
  [key: string]: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}

export interface ParsedWork {
  title: string;
  composer?: string;
  composerLifespan?: string;
  lyricist?: string;
  lyricistLifespan?: string;
  compositionYear?: number;
  category: string;
  key?: string;
  form?: string;
  publisher?: string;
  notes?: string;
}

const CSV_BASE_URL = 'https://raw.githubusercontent.com/vegardj/erlings-music-archive/main/innholdsfortegnelse_csv/';

export const csvImportService = {
  async fetchCSV(filename: string): Promise<string> {
    const response = await fetch(`${CSV_BASE_URL}${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
    }
    return response.text();
  },

  parseCSV(csvText: string): CSVRow[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Get headers from first line
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length > 0) {
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }
    }
    
    return rows;
  },

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  },

  extractLifespan(text: string): { birthYear?: number; deathYear?: number } | null {
    if (!text) return null;
    
    // Look for patterns like "1859 - 1883" or "(1905 - 1977)"
    const match = text.match(/(\d{4})\s*-\s*(\d{4})/);
    if (match) {
      return {
        birthYear: parseInt(match[1]),
        deathYear: parseInt(match[2])
      };
    }
    
    // Look for birth year only like "1859 -"
    const birthMatch = text.match(/(\d{4})\s*-\s*$/);
    if (birthMatch) {
      return {
        birthYear: parseInt(birthMatch[1])
      };
    }
    
    return null;
  },

  extractYear(text: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(/\d{4}/);
    return match ? parseInt(match[0]) : undefined;
  },

  parseAllsanger(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row.Tittel || '',
      key: row.Toneart || undefined,
      composer: row.Komponist || undefined,
      composerLifespan: row['Unnamed: 8'] || undefined,
      lyricist: row.Tekstforfatter || undefined,
      lyricistLifespan: row['Unnamed: 11'] || undefined,
      category: 'Allsanger',
      notes: `Pages: ${row['Antall sider'] || 'Unknown'}`
    }));
  },

  parsePerLasson(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row.Melodi || '',
      composer: row.Komponist || undefined,
      composerLifespan: row['Levde når'] || undefined,
      lyricist: row.Lyrikk || undefined,
      lyricistLifespan: row['Unnamed: 6'] || undefined,
      compositionYear: this.extractYear(row['Når komponert']),
      category: 'Per Lasson',
      notes: `No: ${row['Unnamed: 1'] || ''}`
    }));
  },

  parseUtenlandskPopular(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row.Melodi || '',
      composer: row.Komponist || undefined,
      composerLifespan: row['Levde når'] || undefined,
      lyricist: row.Lyrikk || undefined,
      lyricistLifespan: row['Levde når.1'] || undefined,
      compositionYear: this.extractYear(row['Når komponert']),
      category: 'Utenlandsk populærmusikk',
      notes: row.Sanginfo || undefined
    }));
  },

  parseForskjellig(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row['Unnamed: 1'] || '',
      composer: row.Komponist || undefined,
      composerLifespan: row['Unnamed: 3'] || undefined,
      lyricist: row['Evt. Tekstforfatter'] || undefined,
      lyricistLifespan: row['Unnamed: 5'] || undefined,
      compositionYear: this.extractYear(row.Komponert),
      category: 'Forskjellig',
      notes: row.Kilde || undefined
    }));
  },

  parse1905Noter(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row['Unnamed: 1'] || '',
      composer: row['1905-noter. '] || undefined,
      publisher: row['Unnamed: 2'] || undefined,
      category: '1905-noter',
      notes: row['Unnamed: 4'] || undefined
    }));
  },

  parseForskjelligeNoter(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row.Tittel || '',
      form: row['Unnamed: 2'] || undefined,
      key: row['Unnamed: 3'] || undefined,
      composer: row.Komponist || undefined,
      composerLifespan: row['Unnamed: 5'] || undefined,
      lyricist: row.Tekstforfatter || undefined,
      lyricistLifespan: row['Unnamed: 8'] || undefined,
      compositionYear: this.extractYear(row['Unnamed: 9']),
      category: 'Forskjellige noter'
    }));
  },

  parsePosca(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row['Unnamed: 2'] || '',
      composer: row['Unnamed: 3'] || undefined,
      composerLifespan: row['Unnamed: 4'] || undefined,
      lyricist: row['Unnamed: 5'] || undefined,
      lyricistLifespan: row['Unnamed: 6'] || undefined,
      compositionYear: this.extractYear(row['Unnamed: 7']),
      publisher: row['Unnamed: 12'] || undefined,
      category: 'Posca'
    }));
  },

  parseHefter(rows: CSVRow[]): ParsedWork[] {
    return rows.map(row => ({
      title: row['Unnamed: 1'] || '',
      composer: row['Unnamed: 2'] || undefined,
      composerLifespan: row['Unnamed: 3'] || undefined,
      category: 'Hefter',
      notes: row['Unnamed: 4'] || undefined
    }));
  }
};
