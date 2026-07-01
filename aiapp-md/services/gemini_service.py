from google import genai
import os

try:
    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def generate(self, prompt: str, *, temperature: float = 0.3) -> str:
        """Gemini API 호출. API 키 없으면 None 반환."""
        if self.client is None:
            return None

        try:
            response = self.client.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                contents=prompt,
            )
            return response.text
        except Exception:
            return None
