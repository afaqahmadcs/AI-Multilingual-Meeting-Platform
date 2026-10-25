export type SupportedLanguage = 'en' | 'ur';

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  preferredLanguage: SupportedLanguage;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile | null;
  accessToken?: string;
}
