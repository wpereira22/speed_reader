export interface WordData {
  word: string;
  orpIndex: number;
}

export interface DocumentMeta {
  type: 'pdf' | 'epub' | 'txt';
  title?: string | null;
  creator?: string | null;
  language?: string | null;
}

export interface UploadResponse {
  words: WordData[];
  fullText?: string;
  meta?: DocumentMeta;
  fileName?: string;
}

