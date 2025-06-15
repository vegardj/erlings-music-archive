
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
  titleLink?: string;
  composer?: string;
  composerLink?: string;
  composerLifespan?: string;
  lyricist?: string;
  lyricistLink?: string;
  lyricistLifespan?: string;
  compositionYear?: number;
  category: string;
  key?: string;
  form?: string;
  publisher?: string;
  notes?: string;
}

// Import the local CSV files directly from the links_latest directory
import AllsangerCSV from '../../innholdsfortegnelse_csv_links_latest/Allsanger.csv?raw';
import PerLassonCSV from '../../innholdsfortegnelse_csv_links_latest/Per_Lasson.csv?raw';
import UtenlandskCSV from '../../innholdsfortegnelse_csv_links_latest/Utenlandsk_populærmusikk.csv?raw';
import ForskjelligCSV from '../../innholdsfortegnelse_csv_links_latest/Forskjellig.csv?raw';
import NotesPP1905CSV from '../../innholdsfortegnelse_csv_links_latest/1905-noter.csv?raw';
import ForskjelligeNoterCSV from '../../innholdsfortegnelse_csv_links_latest/Forskjellige_noter.csv?raw';
import PoscaCSV from '../../innholdsfortegnelse_csv_links_latest/Posca.csv?raw';
import HefterCSV from '../../innholdsfortegnelse_csv_links_latest/Hefter.csv?raw';

const LOCAL_CSV_FILES = {
  'Allsanger.csv': AllsangerCSV,
  'Per_Lasson.csv': PerLassonCSV,
  'Utenlandsk_populærmusikk.csv': UtenlandskCSV,
  'Forskjellig.csv': ForskjelligCSV,
  '1905-noter.csv': NotesPP1905CSV,
  'Forskjellige_noter.csv': ForskjelligeNoterCSV,
  'Posca.csv': PoscaCSV,
  'Hefter.csv': HefterCSV
};

export const csvImportService = {
  async fetchCSV(filename: string): Promise<string> {
    const csvContent = LOCAL_CSV_FILES[filename as keyof typeof LOCAL_CSV_FILES];
    if (!csvContent) {
      throw new Error(`CSV file ${filename} not found`);
    }
    return csvContent;
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

  cleanText(text: string | undefined): string | undefined {
    if (!text) return undefined;
    const cleaned = text.replace(/['"]/g, '').trim();
    return cleaned === '' ? undefined : cleaned;
  },

  extractLifespan(text: string): { birthYear?: number; deathYear?: number } | null {
    if (!text || text.trim() === '') return null;
    
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

  extractYear(text: string | undefined): number | undefined {
    if (!text || text.trim() === '') return undefined;
    const match = text.match(/\d{4}/);
    return match ? parseInt(match[0]) : undefined;
  },

  parseAllsanger(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Tittel))
      .map(row => ({
        title: this.cleanText(row.Tittel) || '',
        titleLink: this.cleanText(row.Tittel_link),
        key: this.cleanText(row.Toneart),
        composer: this.cleanText(row.Komponist),
        composerLink: this.cleanText(row.Komponist_link),
        composerLifespan: this.cleanText(row['Unnamed: 9']),
        lyricist: this.cleanText(row.Tekstforfatter),
        lyricistLink: this.cleanText(row.Tekstforfatter_link),
        lyricistLifespan: this.cleanText(row['Unnamed: 12']),
        category: 'Allsanger',
        notes: `Pages: ${row.Antall_sider || 'Unknown'}`
      }));
  },

  parsePerLasson(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Melodi))
      .map(row => ({
        title: this.cleanText(row.Melodi) || '',
        composer: this.cleanText(row.Komponist),
        composerLink: this.cleanText(row.Komponist_link),
        composerLifespan: this.cleanText(row.Levde_når),
        lyricist: this.cleanText(row.Lyrikk),
        lyricistLink: this.cleanText(row.Lyrikk_link),
        lyricistLifespan: this.cleanText(row.Unnamed_7),
        compositionYear: this.extractYear(row.Når_komponert),
        category: 'Per Lasson',
        notes: `No: ${row.Unnamed_2 || ''}`
      }));
  },

  parseUtenlandskPopular(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Melodi))
      .map(row => ({
        title: this.cleanText(row.Melodi) || '',
        titleLink: this.cleanText(row.Melodi_link),
        composer: this.cleanText(row.Komponist),
        composerLink: this.cleanText(row.Komponist_link),
        composerLifespan: this.cleanText(row.Levde_når),
        lyricist: this.cleanText(row.Lyrikk),
        lyricistLink: this.cleanText(row.Lyrikk_link),
        lyricistLifespan: this.cleanText(row.Levde_når_2),
        compositionYear: this.extractYear(row.Når_komponert),
        category: 'Utenlandsk populærmusikk',
        notes: this.cleanText(row.Sanginfo)
      }));
  },

  parseForskjellig(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Unnamed_1))
      .map(row => ({
        title: this.cleanText(row.Unnamed_1) || '',
        titleLink: this.cleanText(row.Unnamed_2_link),
        composer: this.cleanText(row.Komponist),
        composerLink: this.cleanText(row.Komponist_link),
        composerLifespan: this.cleanText(row.Unnamed_4),
        lyricist: this.cleanText(row.Evt__Tekstforfatter),
        lyricistLink: this.cleanText(row.Evt__Tekstforfatter_link),
        lyricistLifespan: this.cleanText(row.Unnamed_6),
        compositionYear: this.extractYear(row.Komponert),
        category: 'Forskjellig',
        notes: this.cleanText(row.Kilde)
      }));
  },

  parse1905Noter(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row['1905-noter_']))
      .map(row => ({
        title: this.cleanText(row.Unnamed_2) || '',
        composer: this.cleanText(row['1905-noter_']),
        publisher: this.cleanText(row.Unnamed_3),
        category: '1905-noter',
        notes: this.cleanText(row.Unnamed_5)
      }));
  },

  parseForskjelligeNoter(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Tittel))
      .map(row => ({
        title: this.cleanText(row.Tittel) || '',
        titleLink: this.cleanText(row.Tittel_link),
        form: this.cleanText(row.Unnamed_3),
        key: this.cleanText(row.Unnamed_4),
        composer: this.cleanText(row.Komponist),
        composerLink: this.cleanText(row.Komponist_link),
        composerLifespan: this.cleanText(row.Unnamed_6),
        lyricist: this.cleanText(row.Tekstforfatter),
        lyricistLink: this.cleanText(row.Tekstforfatter_link),
        lyricistLifespan: this.cleanText(row.Unnamed_9),
        compositionYear: this.extractYear(row.Unnamed_10),
        category: 'Forskjellige noter'
      }));
  },

  parsePosca(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Unnamed_2))
      .map(row => ({
        title: this.cleanText(row.Unnamed_2) || '',
        titleLink: this.cleanText(row.Unnamed_3_link),
        composer: this.cleanText(row.Unnamed_3),
        composerLink: this.cleanText(row.Unnamed_3_link),
        composerLifespan: this.cleanText(row.Unnamed_4),
        lyricist: this.cleanText(row.Unnamed_5),
        lyricistLink: this.cleanText(row.Unnamed_6_link),
        lyricistLifespan: this.cleanText(row.Unnamed_6),
        compositionYear: this.extractYear(row.Unnamed_7),
        publisher: this.cleanText(row.Unnamed_12),
        category: 'Posca'
      }));
  },

  parseHefter(rows: CSVRow[]): ParsedWork[] {
    return rows
      .filter(row => this.cleanText(row.Unnamed_2))
      .map(row => ({
        title: this.cleanText(row.Unnamed_2) || '',
        titleLink: this.cleanText(row.Unnamed_2_link),
        composer: this.cleanText(row.Unnamed_3),
        composerLink: this.cleanText(row.Unnamed_3_link),
        composerLifespan: this.cleanText(row.Unnamed_4),
        category: 'Hefter',
        notes: this.cleanText(row.Unnamed_9)
      }));
  }
};
