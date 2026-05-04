export type SubView = 'main' | 'settings' | 'edit-profile' | 'chats' | 'notifications' | 'language';

export interface ChatMessage {
  id: string;
  senderUid: string;
  text?: string;
  timestamp: any;
  isMe: boolean;
  time: string;
  image?: string;
  video?: string;
  videoMessage?: string;
  audio?: string;
  location?: { lat: number; lng: number };
  post?: any;
  replyTo?: string;
  reactions?: string[];
  deleted?: boolean;
}
