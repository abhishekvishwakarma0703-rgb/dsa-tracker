"""
Unified Async AI Provider
=========================
Routes all LLM calls. gemini-2.5-flash-lite is the default (free tier).
Anthropic is an optional paid override — same interface, one line to switch.

Gemini uses Google's OpenAI-compatible endpoint so we reuse the `openai`
package already in requirements.txt — ZERO new dependencies.

Get a free Gemini key: https://aistudio.google.com/apikey
"""

import logging

logger = logging.getLogger(__name__)

# ── Model registry ─────────────────────────────────────────────────────────────
MODELS: dict = {
    # ── Free ──────────────────────────────────────────────────────────────────
    "gemini-2.5-flash-lite": {
        "provider":    "gemini",
        "api_model":   "gemini-2.5-flash-lite",
        "daily_limit": 1500,
        "rpm_limit":   30,
        "label":       "Gemini 2.5 Flash Lite",
        "badge":       "FREE",
    },
    "gemini-2.0-flash": {
        "provider":    "gemini",
        "api_model":   "gemini-2.0-flash",
        "daily_limit": 1500,
        "rpm_limit":   15,
        "label":       "Gemini 2.0 Flash",
        "badge":       "FREE",
    },
    "gemini-1.5-flash": {
        "provider":    "gemini",
        "api_model":   "gemini-1.5-flash",
        "daily_limit": 1500,
        "rpm_limit":   15,
        "label":       "Gemini 1.5 Flash",
        "badge":       "FREE",
    },
    # ── Paid override ──────────────────────────────────────────────────────────
    "claude-opus-4-6": {
        "provider":    "anthropic",
        "api_model":   "claude-opus-4-6",
        "daily_limit": None,
        "rpm_limit":   None,
        "label":       "Claude Opus 4",
        "badge":       "PAID",
    },
    "claude-sonnet-4-6": {
        "provider":    "anthropic",
        "api_model":   "claude-sonnet-4-6",
        "daily_limit": None,
        "rpm_limit":   None,
        "label":       "Claude Sonnet 4",
        "badge":       "PAID",
    },
}

DEFAULT_MODEL = "gemini-2.5-flash-lite"


async def _call_gemini(api_model: str, system: str, messages: list, max_tokens: int) -> str:
    """
    Call Gemini via Google's OpenAI-compatible REST endpoint.
    Uses the async openai client — no google-generativeai package needed.
    """
    from openai import AsyncOpenAI
    from app.core.config import settings

    key = settings.GEMINI_API_KEY
    if not key:
        raise ValueError(
            "GEMINI_API_KEY is not set. "
            "Get a FREE key at https://aistudio.google.com/apikey and add it to your .env file."
        )

    logger.debug("Calling Gemini  model=%s", api_model)

    client = AsyncOpenAI(
        api_key=key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    response = await client.chat.completions.create(
        model=api_model,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}] + messages,
    )
    return response.choices[0].message.content


async def _call_anthropic(api_model: str, system: str, messages: list, max_tokens: int) -> str:
    """Call Anthropic Claude via the official async client."""
    from anthropic import AsyncAnthropic
    from app.core.config import settings
    print("Anthropic API Key:", settings.ANTHROPIC_API_KEY)  # Debug print to verify key is loaded
    key = settings.ANTHROPIC_API_KEY
    if not key:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. "
            "This model requires a paid Anthropic API key."
        )

    logger.debug("Calling Anthropic  model=%s", api_model)

    client   = AsyncAnthropic(api_key=key)
    response = await client.messages.create(
        model=api_model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return response.content[0].text


async def call_ai(
    model: str,
    system: str,
    messages: list,
    max_tokens: int = 1200,
) -> str:
    """
    Route an AI call to the appropriate provider.
    Falls back to DEFAULT_MODEL if the requested model is unknown.
    """
    meta = MODELS.get(model)
    if not meta:
        logger.warning("Unknown model '%s', falling back to %s", model, DEFAULT_MODEL)
        meta  = MODELS[DEFAULT_MODEL]
        model = DEFAULT_MODEL

    provider  = meta["provider"]
    api_model = meta["api_model"]
    logger.info("AI call  model=%s  provider=%s  api_model=%s", model, provider, api_model)

    if provider == "gemini":
        return await _call_gemini(api_model, system, messages, max_tokens)
    elif provider == "anthropic":
        return await _call_anthropic(api_model, system, messages, max_tokens)
    else:
        raise ValueError(f"Unknown provider: {provider}")


def get_models_list() -> list:
    return [
        {
            "id":          mid,
            "label":       m["label"],
            "provider":    m["provider"],
            "badge":       m["badge"],
            "daily_limit": m["daily_limit"],
        }
        for mid, m in MODELS.items()
    ]
