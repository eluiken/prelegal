import asyncio
import json
import logging
import re
from datetime import date
from typing import AsyncGenerator

from litellm import acompletion

logger = logging.getLogger(__name__)

# Free model fallback chain — tried in priority order.
# All verified to support streaming and JSON output via OpenRouter.
FREE_MODELS = [
    "openrouter/openai/gpt-oss-120b:free",
    "openrouter/openai/gpt-oss-20b:free",
    "openrouter/google/gemma-4-31b-it:free",
    "openrouter/google/gemma-4-26b-a4b-it:free",
]

# Delay (seconds) between retries for the same model on rate-limit errors
_RETRY_DELAYS = [1.5, 3.0]


def _is_rate_limit(exc: Exception) -> bool:
    msg = str(exc)
    return "429" in msg or "rate" in msg.lower() or "quota" in msg.lower()


async def _completion(messages: list[dict], stream: bool = False, max_tokens: int | None = None) -> object:
    """Try each free model in sequence, retrying rate limits with backoff before moving on."""
    last_exc: Exception = RuntimeError("No models available")

    for model in FREE_MODELS:
        delays = [0] + list(_RETRY_DELAYS)
        for attempt, delay in enumerate(delays):
            if delay:
                await asyncio.sleep(delay)
            try:
                kwargs: dict = {"model": model, "messages": messages, "stream": stream}
                if max_tokens is not None:
                    kwargs["max_tokens"] = max_tokens
                return await acompletion(**kwargs)
            except Exception as exc:
                last_exc = exc
                if _is_rate_limit(exc) and attempt < len(_RETRY_DELAYS):
                    logger.warning("Rate limit on %s (attempt %d/%d), retrying in %.1fs",
                                   model, attempt + 1, len(_RETRY_DELAYS), _RETRY_DELAYS[attempt])
                    continue
                logger.warning("Model %s unavailable: %s", model, str(exc)[:120])
                break  # move to next model

    raise last_exc


_FIELD_NAMES = [
    "party1Name", "party1Title", "party1Company", "party1Address",
    "party2Name", "party2Title", "party2Company", "party2Address",
    "purpose", "effectiveDate", "mndaTermType", "mndaTermYears",
    "confidentialityTermType", "confidentialityTermYears",
    "governingLaw", "jurisdiction", "modifications",
]

_EXTRACTION_PROMPT = (
    "Extract NDA field values mentioned in this conversation. "
    "Reply with ONLY a JSON object — no markdown fences, no explanation. "
    "Use null for any field not yet mentioned in the conversation. "
    'mndaTermType must be "years" or "until_terminated". '
    'confidentialityTermType must be "years" or "perpetual". '
    "effectiveDate must be ISO YYYY-MM-DD format.\n\n"
    "Return exactly this structure:\n"
    + json.dumps({k: None for k in _FIELD_NAMES}, indent=2)
)


async def _extract_fields(messages: list[dict], assistant_reply: str) -> dict:
    """Return non-null NDA field values extracted from the conversation."""
    extraction_messages = [
        *messages,
        {"role": "assistant", "content": assistant_reply},
        {"role": "user", "content": _EXTRACTION_PROMPT},
    ]
    try:
        response = await _completion(extraction_messages, max_tokens=500)
        content = response.choices[0].message.content or ""
        # Strip markdown code fences some models add around JSON
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            return {}
        data = json.loads(match.group())
        return {k: v for k, v in data.items() if v is not None and k in _FIELD_NAMES}
    except Exception:
        logger.exception("Field extraction failed")
        return {}


def _build_system_prompt() -> str:
    return (
        f"You are a friendly legal assistant helping users fill out a Mutual Non-Disclosure Agreement (NDA).\n\n"
        f"Your job:\n"
        f"- Have a natural, brief conversation to collect the required information\n"
        f"- Ask for 1-2 pieces of information at a time — don't overwhelm the user\n"
        f"- Acknowledge what they tell you and ask for the next missing field\n"
        f"- Keep replies concise — 2-4 sentences max\n"
        f"- Never output JSON, field names, or technical terms — speak naturally\n\n"
        f"Today's date is {date.today().isoformat()}. Use ISO format (YYYY-MM-DD) for dates.\n\n"
        f"If this is the opening message (no prior conversation), greet the user warmly "
        f"and ask which two companies are signing the NDA.\n\n"
        f"Fields to collect: party names, titles, companies, and notice addresses for both parties; "
        f"the purpose of the NDA; effective date; MNDA term (expires after N years, or until terminated); "
        f"confidentiality term (N years, or perpetual); governing law (US state); "
        f"jurisdiction (city/county and state); any modifications to standard terms."
    )


async def stream_chat(messages: list[dict]) -> AsyncGenerator[str, None]:
    chat_messages = [{"role": "system", "content": _build_system_prompt()}, *messages]
    full_reply = ""

    try:
        stream = await _completion(chat_messages, stream=True)
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_reply += delta
                yield f"event: token\ndata: {json.dumps({'text': delta})}\n\n"

        fields = await _extract_fields(messages, full_reply)
        if fields:
            yield f"event: fields\ndata: {json.dumps(fields)}\n\n"

    except Exception:
        logger.exception("Chat stream failed")
        yield f"event: error\ndata: {json.dumps({'text': 'Sorry, something went wrong. Please try again.'})}\n\n"

    yield "event: done\ndata: {}\n\n"
