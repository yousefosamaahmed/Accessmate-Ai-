class LanguageService:
    def detect_language(self, text: str) -> str:
        if not text or not text.strip():
            return "unknown"

        arabic_chars = 0
        english_chars = 0

        for char in text:
            if "\u0600" <= char <= "\u06FF":
                arabic_chars += 1
            elif char.isalpha():
                english_chars += 1

        if arabic_chars > 0 and english_chars > 0:
            return "mixed"

        if arabic_chars > 0:
            return "ar"

        if english_chars > 0:
            return "en"

        return "unknown"

    def choose_response_language(
        self,
        user_preferred_language: str,
        detected_language: str
    ) -> str:
        if user_preferred_language in ["ar", "en"]:
            return user_preferred_language

        if detected_language in ["ar", "en"]:
            return detected_language

        return "ar"

    def normalize_text(self, text: str) -> str:
        return text.strip()