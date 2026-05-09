export interface Session {
  id?: string;
  userId: string;
  title: string;
  createdAt: any; // ServerTimestamp
  transcript: string;
  refinedTranscript?: string;
  summary?: string;
  summaryType?: string;
  notes?: string;
}
