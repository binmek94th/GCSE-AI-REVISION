export interface StudyMaterial {
  id: string;
  title: string;
  content: string;
  subject: string;
  exam_board: string;
  study_pack_id: string;
  created_at: any;
  updated_at: any;
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'deleted';
  moderated_at?: any;
  moderation_notes?: string;
}

export interface Question {
  id: string;
  question_text: string;
  options: string[] | { [key: string]: string };
  correct_answer: string;
  explanation?: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'quiz' | 'mock_test';
  marks?: number;
  created_at: any;
  updated_at: any;
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'deleted';
  moderated_at?: any;
  moderation_notes?: string;
}

export interface ModerationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}