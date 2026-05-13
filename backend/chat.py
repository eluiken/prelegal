import json
import logging
from datetime import date
from typing import AsyncGenerator, Literal, Optional

from litellm import acompletion
from pydantic import BaseModel

logger = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class NDAFields(BaseModel):
    party1Name: Optional[str] = None
    party1Title: Optional[str] = None
    party1Company: Optional[str] = None
    party1Address: Optional[str] = None
    party2Name: Optional[str] = None
    party2Title: Optional[str] = None
    party2Company: Optional[str] = None
    party2Address: Optional[str] = None
    purpose: Optional[str] = None
    effectiveDate: Optional[str] = None
    mndaTermType: Optional[Literal["years", "until_terminated"]] = None
    mndaTermYears: Optional[str] = None
    confidentialityTermType: Optional[Literal["years", "perpetual"]] = None
    confidentialityTermYears: Optional[str] = None
    governingLaw: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None


EXTRACTION_SYSTEM_PROMPT = """You are an NDA data extractor. Given a conversation about a Mutual NDA, extract any field values that were clearly stated.

Only populate fields explicitly mentioned in the conversation. Use null for everything else.
For mndaTermType use "years" or "until_terminated". For confidentialityTermType use "years" or "perpetual".
For effectiveDate use ISO format YYYY-MM-DD."""


async def _extract_fields(messages: list[dict], assistant_reply: str) -> NDAFields:
    extraction_messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        *messages,
        {"role": "assistant", "content": assistant_reply},
        {"role": "user", "content": "Extract all NDA field values from this conversation."},
    ]
    try:
        response = await acompletion(
            model=MODEL,
            messages=extraction_messages,
            response_format=NDAFields,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        msg = response.choices[0].message
        # LiteLLM may place parsed result in message.parsed (structured output) or message.content (JSON string)
        if getattr(msg, "parsed", None) is not None:
            return msg.parsed
        return NDAFields.model_validate_json(msg.content)
    except Exception:
        logger.exception("Field extraction failed")
        return NDAFields()


async def stream_chat(messages: list[dict]) -> AsyncGenerator[str, None]:
    today = date.today().isoformat()
    system_prompt = f"""You are a friendly legal assistant helping users fill out a Mutual Non-Disclosure Agreement (NDA).

Your job:
- Have a natural, brief conversation to collect the required information
- Ask for 1-2 pieces of information at a time — don't overwhelm the user
- Acknowledge what they tell you and ask for the next missing field
- Keep replies concise — 2-4 sentences max
- Never output JSON, field names, or technical terms directly — speak naturally

Today's date is {today}. Use ISO format (YYYY-MM-DD) for any dates.

If this is the opening message (no prior conversation), greet the user warmly and ask which two companies are signing the NDA.

Fields to collect: party names, titles, companies, notice addresses for both parties; the purpose of the NDA; effective date; MNDA term (years or until terminated); confidentiality term (years or perpetual); governing law (US state); jurisdiction (city/county and state); any modifications to standard terms."""

    chat_messages = [{"role": "system", "content": system_prompt}, *messages]

    full_reply = ""

    try:
        stream = await acompletion(
            model=MODEL,
            messages=chat_messages,
            stream=True,
            extra_body=EXTRA_BODY,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_reply += delta
                yield f"event: token\ndata: {json.dumps({'text': delta})}\n\n"

        # Extract fields from the completed conversation + reply
        fields = await _extract_fields(messages, full_reply)
        fields_dict = {k: v for k, v in fields.model_dump().items() if v is not None}
        if fields_dict:
            yield f"event: fields\ndata: {json.dumps(fields_dict)}\n\n"

    except Exception:
        logger.exception("Chat stream failed")
        yield f"event: error\ndata: {json.dumps({'text': 'Sorry, something went wrong. Please try again.'})}\n\n"

    yield "event: done\ndata: {}\n\n"
