/**
 * Raw Telegram Bot API payload shapes we read (Update / Message and nested
 * objects). Every field is optional because this is external, untrusted JSON -
 * callers must optional-chain. Kept separate from ./parse so the mapping logic
 * stays focused (CLAUDE.md file-length rule); no runtime code lives here.
 */

export interface TelegramUser {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramContact {
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface TelegramFile {
  file_id?: string;
  mime_type?: string;
  file_name?: string;
}

export interface TelegramMessage {
  message_id?: number;
  from?: TelegramUser;
  chat?: { id?: number };
  date?: number;
  text?: string;
  caption?: string;
  contact?: TelegramContact;
  voice?: TelegramFile;
  audio?: TelegramFile;
  photo?: TelegramFile[];
  document?: TelegramFile;
  video?: TelegramFile;
  sticker?: TelegramFile;
  location?: { latitude?: number; longitude?: number };
  venue?: { title?: string };
}

export interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}
