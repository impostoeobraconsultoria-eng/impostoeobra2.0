export type TelegramUser = {
  id: number;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
};

export type TelegramMessage = {
  message_id: number;
  text?: string;
  from?: TelegramUser;
  chat: TelegramChat;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramReplyMarkup = {
  inline_keyboard: Array<
    Array<{ text: string; callback_data?: string; url?: string }>
  >;
};
