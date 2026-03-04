export const he = {
  // App
  "app.name": "צ'אטלוט",
  "app.tagline": "המשחק של הקבוצה שלכם",
  "app.description": "הפכו את הצ'אט של הקבוצה למשחק מטורף עם החברים",

  // Landing
  "landing.hero.title": "הצ'אט שלכם.\nהמשחק שלכם.",
  "landing.hero.subtitle": "העלו את היסטוריית הוואטסאפ וצרו ערב משחקים בלתי נשכח",
  "landing.cta": "בואו נתחיל!",
  "landing.how.title": "איך זה עובד?",
  "landing.how.step1": "מישהו מייצא את הצ'אט מוואטסאפ",
  "landing.how.step2": "מעלים את הקובץ ומזהים את החברים",
  "landing.how.step3": "הבינה המלאכותית מוצאת את הרגעים הכי מצחיקים",
  "landing.how.step4": "החברים מצטרפים מהטלפון ומתחילים לשחק!",

  // Upload
  "upload.title": "העלאת צ'אט",
  "upload.dropzone": "גררו לכאן את קובץ הצ'אט",
  "upload.dropzone.or": "או",
  "upload.dropzone.browse": "בחרו קובץ",
  "upload.dropzone.hint": "קובץ .txt מיוצא מוואטסאפ + תיקיית מדיה (אופציונלי)",
  "upload.parsing": "מנתח את הצ'אט...",
  "upload.success": "הצ'אט נוסף בהצלחה!",
  "upload.error": "שגיאה בניתוח הקובץ",

  // Setup - Members
  "setup.members.title": "מי בקבוצה?",
  "setup.members.subtitle": "זהו את החברים, הוסיפו תמונות וכינויים",
  "setup.members.photo": "הוסף תמונה",
  "setup.members.nickname": "כינוי (אופציונלי)",
  "setup.members.merge": "מזג עם חבר אחר",
  "setup.members.messages": "הודעות",
  "setup.members.continue": "המשך לשלב הבא",

  // Setup - Highlights
  "setup.highlights.title": "הרגעים הכי שווים",
  "setup.highlights.subtitle": "הבינה המלאכותית מצאה את ההודעות הכי מצחיקות. בדקו ואשרו!",
  "setup.highlights.approve": "אישור",
  "setup.highlights.reject": "הסרה",
  "setup.highlights.add_note": "הוסף הערה",
  "setup.highlights.category.funny": "מצחיק",
  "setup.highlights.category.iconic": "אייקוני",
  "setup.highlights.category.cringe": "קרינג׳",
  "setup.highlights.category.emotional": "רגשי",

  // Game modes
  "mode.who_said_it": "מי אמר?",
  "mode.who_said_it.desc": "נחשו מי שלח את ההודעה",
  "mode.chat_awards": "פרסי הקבוצה",
  "mode.chat_awards.desc": "טקס פרסים מבוסס על הצ'אט",
  "mode.time_machine": "מכונת הזמן",
  "mode.time_machine.desc": "נחשו מתי ובאיזה הקשר",
  "mode.caption_wars": "קרב כיתובים",
  "mode.caption_wars.desc": "כתבו כיתוב מצחיק לתמונה",
  "mode.hot_seat": "הכיסא החם",
  "mode.hot_seat.desc": "כמה אתם באמת מכירים את החבר?",

  // Lobby
  "lobby.title": "ממתין לשחקנים",
  "lobby.join_code": "קוד הצטרפות",
  "lobby.players": "שחקנים מחוברים",
  "lobby.start": "התחל משחק!",
  "lobby.waiting": "ממתין שהמנחה יתחיל...",
  "lobby.join_url": "הצטרפו דרך הטלפון:",

  // Game
  "game.round": "סיבוב",
  "game.score": "ניקוד",
  "game.time_left": "זמן נותר",
  "game.correct": "נכון!",
  "game.wrong": "לא נכון",
  "game.waiting_answers": "ממתין לתשובות...",
  "game.reveal": "התשובה היא...",
  "game.next_round": "סיבוב הבא",
  "game.final_scores": "תוצאות סופיות",

  // Player
  "player.join.title": "הצטרפות למשחק",
  "player.join.code_placeholder": "הכניסו קוד",
  "player.join.name_placeholder": "השם שלכם",
  "player.join.button": "הצטרף!",
  "player.waiting": "ממתין לשאלה הבאה...",

  // Stats
  "stats.total_messages": "סה״כ הודעות",
  "stats.members": "חברי קבוצה",
  "stats.date_range": "תקופה",
  "stats.media": "קבצי מדיה",
  "stats.most_active": "הכי פעיל",
  "stats.night_owl": "ינשוף לילה",
  "stats.emoji_king": "מלך האימוג׳י",

  // AI Analysis
  "ai.analyzing": "הבינה המלאכותית קוראת את הצ׳אט...",
  "ai.analyzing.subtitle": "מחפשת את ההודעות הכי שוות למשחק",
  "ai.done": "מצאתי את הרגעים הכי טובים!",
  "ai.failed": "לא הצלחתי לנתח. נשתמש בבחירה רנדומלית",
  "ai.skip": "דלגו ושחקו עם בחירה רנדומלית",
  "ai.enhanced": "שאלות מבוססות AI",

  // Common
  "common.loading": "טוען...",
  "common.error": "שגיאה",
  "common.retry": "נסו שוב",
  "common.back": "חזרה",
  "common.next": "הבא",
  "common.save": "שמירה",
  "common.cancel": "ביטול",
  "common.close": "סגירה",
  "common.of": "מתוך",
} as const;

export type HebrewKey = keyof typeof he;

export function t(key: HebrewKey): string {
  return he[key];
}
