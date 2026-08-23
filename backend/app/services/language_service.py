class LanguageService:
    def detect_language(self, text: str) -> str:
        if not text or not text.strip():
            return "unknown"

        arabic_chars = 0
        english_chars = 0

        for char in text:
            if "\u0600" <= char <= "\u06FF":
                arabic_chars += 1
            elif "A" <= char <= "Z" or "a" <= char <= "z":
                english_chars += 1

        if arabic_chars == 0 and english_chars == 0:
            return "unknown"

        # For mixed Arabic/English messages, follow the dominant script.
        # This handles common messages such as:
        # "اشرح AI ببساطة" -> Arabic
        # "Explain الذكاء الاصطناعي simply" -> English when English dominates.
        return "ar" if arabic_chars >= english_chars else "en"

    def choose_response_language(
        self,
        user_preferred_language: str,
        detected_language: str
    ) -> str:
        # The current message language has priority over the UI/profile language.
        if detected_language in ["ar", "en"]:
            return detected_language

        if user_preferred_language in ["ar", "en"]:
            return user_preferred_language

        return "en"

    def normalize_text(self, text: str) -> str:
        return text.strip()
