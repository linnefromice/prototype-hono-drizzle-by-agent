-- テーブルを全て削除（外部キー制約を考慮した順序）
-- チャット関連テーブル
DROP TABLE IF EXISTS conversation_reads;
DROP TABLE IF EXISTS message_bookmarks;
DROP TABLE IF EXISTS reactions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS conversations;

-- ユーザーテーブル（auth_userへの外部キー参照があるため先に削除）
DROP TABLE IF EXISTS users;

-- 認証関連テーブル（BetterAuth）
DROP TABLE IF EXISTS auth_verification;
DROP TABLE IF EXISTS auth_session;
DROP TABLE IF EXISTS auth_account;
DROP TABLE IF EXISTS auth_user;
