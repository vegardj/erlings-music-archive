
import { supabase } from "@/integrations/supabase/client";

export interface Publisher {
  id: number;
  name: string;
  created_at: string;
}

export interface SimilarPublisher {
  id: number;
  name: string;
  suggestions: Publisher[];
  confidence: number;
}

export const publisherService = {
  async getAllPublishers(): Promise<Publisher[]> {
    const { data, error } = await supabase
      .from('publisher')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async updatePublisherName(id: number, newName: string): Promise<void> {
    const { error } = await supabase
      .from('publisher')
      .update({ name: newName })
      .eq('id', id);
    
    if (error) throw error;
  },

  async mergePublishers(sourceId: number, targetId: number): Promise<void> {
    // Update all publications to use the target publisher
    const { error: updateError } = await supabase
      .from('publication')
      .update({ publisher_id: targetId })
      .eq('publisher_id', sourceId);
    
    if (updateError) throw updateError;

    // Delete the source publisher
    const { error: deleteError } = await supabase
      .from('publisher')
      .delete()
      .eq('id', sourceId);
    
    if (deleteError) throw deleteError;
  },

  calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const editDistance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (editDistance / maxLength);
  },

  levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  },

  async findSimilarPublishers(threshold: number = 0.8): Promise<SimilarPublisher[]> {
    const publishers = await this.getAllPublishers();
    const similarGroups: SimilarPublisher[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < publishers.length; i++) {
      if (processed.has(publishers[i].id)) continue;

      const current = publishers[i];
      const suggestions: Publisher[] = [];

      for (let j = i + 1; j < publishers.length; j++) {
        if (processed.has(publishers[j].id)) continue;

        const similarity = this.calculateSimilarity(current.name, publishers[j].name);
        if (similarity >= threshold) {
          suggestions.push(publishers[j]);
          processed.add(publishers[j].id);
        }
      }

      if (suggestions.length > 0) {
        similarGroups.push({
          id: current.id,
          name: current.name,
          suggestions,
          confidence: Math.max(...suggestions.map(s => this.calculateSimilarity(current.name, s.name)))
        });
        processed.add(current.id);
      }
    }

    return similarGroups.sort((a, b) => b.confidence - a.confidence);
  }
};
