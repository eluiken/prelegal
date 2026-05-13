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


# NDA-specific fields (for the Mutual NDA flow)
_NDA_FIELD_NAMES = [
    "party1Name", "party1Title", "party1Company", "party1Address",
    "party2Name", "party2Title", "party2Company", "party2Address",
    "purpose", "effectiveDate", "mndaTermType", "mndaTermYears",
    "confidentialityTermType", "confidentialityTermYears",
    "governingLaw", "jurisdiction", "modifications",
]

_NDA_EXTRACTION_PROMPT = (
    "Extract NDA field values mentioned in this conversation. "
    "Reply with ONLY a JSON object — no markdown fences, no explanation. "
    "Use null for any field not yet mentioned in the conversation. "
    'mndaTermType must be "years" or "until_terminated". '
    'confidentialityTermType must be "years" or "perpetual". '
    "effectiveDate must be ISO YYYY-MM-DD format.\n\n"
    "Return exactly this structure:\n"
    + json.dumps({k: None for k in _NDA_FIELD_NAMES}, indent=2)
)

# Common fields shared by all generic (non-NDA) document types
_GENERIC_COMMON_FIELDS = [
    "party1Name", "party1Title", "party1Company", "party1Address",
    "party2Name", "party2Title", "party2Company", "party2Address",
    "effectiveDate", "governingLaw", "jurisdiction",
]

# Per-document additional fields and configuration (keyed by catalog filename)
_DOC_CONFIGS: dict[str, dict] = {
    "Mutual-NDA-coverpage.md": {
        "party1_role": "Party 1", "party2_role": "Party 2",
        "extra_fields": [],
        "field_hints": "party names, titles, companies, and notice addresses for both parties; purpose of the NDA; effective date; MNDA term; confidentiality term; governing law (US state); jurisdiction",
    },
    "CSA.md": {
        "party1_role": "Provider", "party2_role": "Customer",
        "extra_fields": ["productDescription", "subscriptionPeriod"],
        "field_hints": "Provider and Customer company names, signer names and titles, notice addresses, effective date, description of the cloud service, subscription period, governing law, jurisdiction",
    },
    "design-partner-agreement.md": {
        "party1_role": "Vendor", "party2_role": "Design Partner",
        "extra_fields": ["productDescription", "feedbackObligations"],
        "field_hints": "Vendor and Design Partner company names, signer names and titles, notice addresses, effective date, description of the product being designed, feedback obligations, governing law",
    },
    "sla.md": {
        "party1_role": "Provider", "party2_role": "Customer",
        "extra_fields": ["targetUptime", "supportChannel", "responseTime"],
        "field_hints": "Provider and Customer company names, signer names, effective date, target uptime percentage, support channel (e.g. email), target response time for support requests",
    },
    "psa.md": {
        "party1_role": "Provider", "party2_role": "Customer",
        "extra_fields": ["servicesDescription", "paymentTerms"],
        "field_hints": "Provider and Customer company names, signer names and titles, notice addresses, effective date, description of professional services, payment terms, governing law, jurisdiction",
    },
    "DPA.md": {
        "party1_role": "Controller", "party2_role": "Processor",
        "extra_fields": ["dataCategories", "processingPurpose"],
        "field_hints": "Controller and Processor company names, signer names and titles, notice addresses, effective date, categories of personal data processed, purpose of data processing, governing law",
    },
    "Software-License-Agreement.md": {
        "party1_role": "Licensor", "party2_role": "Licensee",
        "extra_fields": ["softwareName", "licenseScope"],
        "field_hints": "Licensor and Licensee company names, signer names and titles, notice addresses, effective date, software name, license scope and restrictions, governing law, jurisdiction",
    },
    "Partnership-Agreement.md": {
        "party1_role": "Party 1", "party2_role": "Party 2",
        "extra_fields": ["partnershipScope", "revenueShare"],
        "field_hints": "both party company names, signer names and titles, notice addresses, effective date, partnership scope and go-to-market activities, revenue share arrangement, governing law, jurisdiction",
    },
    "Pilot-Agreement.md": {
        "party1_role": "Provider", "party2_role": "Customer",
        "extra_fields": ["productDescription", "pilotDuration"],
        "field_hints": "Provider and Customer company names, signer names and titles, notice addresses, effective date, description of the product or service being piloted, pilot duration, governing law",
    },
    "BAA.md": {
        "party1_role": "Covered Entity", "party2_role": "Business Associate",
        "extra_fields": ["servicesDescription", "phiCategories"],
        "field_hints": "Covered Entity and Business Associate company names, signer names and titles, notice addresses, effective date, description of services involving PHI, categories of PHI handled",
    },
    "AI-Addendum.md": {
        "party1_role": "Provider", "party2_role": "Customer",
        "extra_fields": ["aiUsageScope", "dataTrainingRestriction"],
        "field_hints": "Provider and Customer company names, signer names and titles, effective date, AI features or usage scope covered by this addendum, restrictions on using data for AI model training",
    },
}

# Supported document names for the "unsupported document" handling
_SUPPORTED_DOC_NAMES = [
    "Mutual Non-Disclosure Agreement (NDA)",
    "Mutual NDA Cover Page",
    "Cloud Service Agreement (CSA)",
    "Design Partner Agreement",
    "Service Level Agreement (SLA)",
    "Professional Services Agreement (PSA)",
    "Data Processing Agreement (DPA)",
    "Software License Agreement",
    "Partnership Agreement",
    "Pilot Agreement",
    "Business Associate Agreement (BAA)",
    "AI Addendum",
]


def _get_generic_field_names(doc_type: str) -> list[str]:
    config = _DOC_CONFIGS.get(doc_type, {})
    return _GENERIC_COMMON_FIELDS + config.get("extra_fields", [])


async def _extract_fields(messages: list[dict], assistant_reply: str, doc_type: str) -> dict:
    """Return non-null field values extracted from the conversation, scoped to the document type."""
    if doc_type == "Mutual-NDA.md":
        field_names = _NDA_FIELD_NAMES
        extraction_prompt = _NDA_EXTRACTION_PROMPT
    else:
        field_names = _get_generic_field_names(doc_type)
        extraction_prompt = (
            "Extract document field values mentioned in this conversation. "
            "Reply with ONLY a JSON object — no markdown fences, no explanation. "
            "Use null for any field not yet mentioned. "
            "effectiveDate must be ISO YYYY-MM-DD format.\n\n"
            "Return exactly this structure:\n"
            + json.dumps({k: None for k in field_names}, indent=2)
        )

    extraction_messages = [
        *messages,
        {"role": "assistant", "content": assistant_reply},
        {"role": "user", "content": extraction_prompt},
    ]
    try:
        response = await _completion(extraction_messages, max_tokens=500)
        content = response.choices[0].message.content or ""
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            return {}
        data = json.loads(match.group())
        return {k: v for k, v in data.items() if v is not None and k in field_names}
    except Exception:
        logger.exception("Field extraction failed")
        return {}


def _build_system_prompt(doc_type: str) -> str:
    today = date.today().isoformat()
    supported_list = "\n".join(f"  - {name}" for name in _SUPPORTED_DOC_NAMES)

    if doc_type == "Mutual-NDA.md":
        return (
            f"You are a friendly legal assistant helping users fill out a Mutual Non-Disclosure Agreement (NDA).\n\n"
            f"Your job:\n"
            f"- Have a natural, brief conversation to collect the required information\n"
            f"- Ask for 1-2 pieces of information at a time — don't overwhelm the user\n"
            f"- Acknowledge what they tell you and ask for the next missing field\n"
            f"- Keep replies concise — 2-4 sentences max\n"
            f"- Never output JSON, field names, or technical terms — speak naturally\n\n"
            f"Today's date is {today}. Use ISO format (YYYY-MM-DD) for dates.\n\n"
            f"If this is the opening message (no prior conversation), greet the user warmly "
            f"and ask which two companies are signing the NDA.\n\n"
            f"Fields to collect: party names, titles, companies, and notice addresses for both parties; "
            f"the purpose of the NDA; effective date; MNDA term (expires after N years, or until terminated); "
            f"confidentiality term (N years, or perpetual); governing law (US state); "
            f"jurisdiction (city/county and state); any modifications to standard terms."
        )

    config = _DOC_CONFIGS.get(doc_type, {})
    doc_name = next(
        (s["name"] for s in [{"name": k.replace(".md", "").replace("-", " "), "file": k} for k in _DOC_CONFIGS] if s["file"] == doc_type),
        doc_type.replace(".md", "").replace("-", " "),
    )
    party1_role = config.get("party1_role", "Party 1")
    party2_role = config.get("party2_role", "Party 2")
    field_hints = config.get("field_hints", "both parties' names, companies, effective date, and governing law")

    return (
        f"You are a friendly legal assistant helping users fill out a {doc_name}.\n\n"
        f"Your job:\n"
        f"- Have a natural, brief conversation to collect the required information\n"
        f"- Ask for 1-2 pieces of information at a time — don't overwhelm the user\n"
        f"- Acknowledge what they tell you and ask for the next missing field\n"
        f"- Keep replies concise — 2-4 sentences max\n"
        f"- Never output JSON, field names, or technical terms — speak naturally\n"
        f"- In this document, Party 1 is called the '{party1_role}' and Party 2 is called the '{party2_role}'\n\n"
        f"Today's date is {today}. Use ISO format (YYYY-MM-DD) for dates.\n\n"
        f"If this is the opening message (no prior conversation), greet the user warmly, "
        f"briefly explain you'll help them fill out a {doc_name}, "
        f"and ask for the {party1_role} and {party2_role} company names to get started.\n\n"
        f"Fields to collect: {field_hints}\n\n"
        f"If the user asks about a document type you are not helping with right now, "
        f"let them know you are currently helping with the {doc_name}. "
        f"If they ask for a document type not supported by this platform, "
        f"explain politely that it isn't available and suggest the closest alternative from this list:\n"
        f"{supported_list}"
    )


async def stream_chat(messages: list[dict], doc_type: str = "Mutual-NDA.md") -> AsyncGenerator[str, None]:
    chat_messages = [{"role": "system", "content": _build_system_prompt(doc_type)}, *messages]
    full_reply = ""

    try:
        stream = await _completion(chat_messages, stream=True)
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_reply += delta
                yield f"event: token\ndata: {json.dumps({'text': delta})}\n\n"

        fields = await _extract_fields(messages, full_reply, doc_type)
        if fields:
            yield f"event: fields\ndata: {json.dumps(fields)}\n\n"

    except Exception:
        logger.exception("Chat stream failed")
        yield f"event: error\ndata: {json.dumps({'text': 'Sorry, something went wrong. Please try again.'})}\n\n"

    yield "event: done\ndata: {}\n\n"
