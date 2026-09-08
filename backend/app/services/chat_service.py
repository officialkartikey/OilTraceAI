"""
Chat service -- explains investigation results in plain language, describes
the detection/drift/attribution methodology, reasons about likely
environmental impact (ocean vs land, using free reverse-geocoding), and
surfaces the latest real-world oil-spill news.

No paid LLM API key is required. Explanations are template-based (built from
the investigation's actual numbers, not generic text), and impact/news
lookups use free, keyless public services:
  - OpenStreetMap Nominatim for reverse geocoding (ocean vs land, place names)
  - Google News RSS for live oil-spill headlines

This keeps the chatbot fully functional for a demo with zero external
account/API-key setup, while still answering from real, current data rather
than a canned script.
"""

import logging
import re
import xml.etree.ElementTree as ET
from typing import Optional
from urllib.parse import quote

import httpx

from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.detection_repository import DetectionRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.attribution_repository import attribution_repo
from app.engines.spatial_engine import spatial_engine

logger = logging.getLogger(__name__)

inv_repo = InvestigationRepository()
obs_repo = ObservationRepository()
det_repo = DetectionRepository()
rec_repo = ReconstructionRepository()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"

# Intents that support a "why / tell me more" style follow-up without the
# user having to repeat context. Maps to which sticky slot (if any) the
# intent depends on.
CONTINUABLE_INTENTS = {"explain", "impact", "vessel_detail", "historical", "recommend"}
CONTINUATION_PHRASES = [
    "why", "more", "explain more", "tell me more", "go on", "details",
    "and?", "and then", "what else", "continue", "elaborate", "why is that",
]

# Curated fallback knowledge -- used when geocoding can't name a specific
# water body, and as the substance of the impact answer once a region is
# identified. Kept short and factual rather than exhaustive, since this is
# meant to orient a user, not replace an environmental assessment.
MARINE_IMPACT = {
    "arabian sea": (
        "The Arabian Sea supports major fishing grounds (pomfret, mackerel, "
        "sardine) and is a key habitat for sea turtles and whale sharks along "
        "the Indian west coast. A slick here typically threatens coastal "
        "fisheries livelihoods first, then intertidal organisms (crabs, "
        "molluscs) if it drifts ashore, and can foul mangrove root systems "
        "in estuaries like those near Mumbai and the Gulf of Kutch."
    ),
    "bay of bengal": (
        "The Bay of Bengal is a major spawning ground for hilsa and other "
        "commercial fish stocks, and its coast hosts the Sundarbans mangrove "
        "ecosystem -- one of the world's largest. Oil reaching mangrove roots "
        "can suffocate them for years, and the bay's fisheries support "
        "millions of livelihoods along the Odisha, West Bengal and "
        "Bangladesh coastline."
    ),
    "indian ocean": (
        "The open Indian Ocean has lower immediate coastal risk, but slicks "
        "here can still affect migratory marine life (sea turtles, cetaceans) "
        "and, if currents carry them toward Lakshadweep or Sri Lankan reef "
        "systems, coral bleaching and reef-fish mortality become a concern."
    ),
    "default_ocean": (
        "Marine oil slicks reduce oxygen exchange at the sea surface, coat "
        "seabird feathers (impairing insulation and flight), and are toxic to "
        "fish eggs and larvae in the upper water column. Impact severity "
        "depends heavily on how close the slick drifts to shore, reefs, or "
        "known fish-spawning grounds."
    ),
}

LAND_IMPACT_TEMPLATE = (
    "If the slick reaches the coastline near {place}, expect: (1) beach and "
    "intertidal contamination requiring manual cleanup, (2) disruption to "
    "local fishing and tourism economies, (3) risk to any mangrove or "
    "wetland habitat in the immediate area, and (4) potential groundwater/"
    "soil contamination if oil persists in coastal sediment. The severity "
    "depends on the slick's oil type and how quickly containment (booms, "
    "skimmers) is deployed."
)


def _detect_intent(message: str) -> str:
    m = message.lower()
    if any(k in m for k in ["news", "latest spill", "recent spill", "headlines"]):
        return "news"
    if any(k in m for k in ["draft", "write a summary", "executive summary",
                              "report summary", "summarize this for", "summary for"]):
        return "draft_summary"
    if any(k in m for k in ["should i do", "recommend", "next step", "what action",
                              "what to do"]):
        return "recommend"
    if any(k in m for k in ["compare", "historical", "previous spill", "past spill",
                              "other spills", "average spill", "how does this compare"]):
        return "historical"
    if any(k in m for k in ["impact", "effect", "affect", "marine life", "ecosystem",
                              "environment", "damage", "harm", "wildlife", "future"]):
        return "impact"
    if any(k in m for k in ["how does", "how it works", "process", "methodology",
                              "pipeline", "algorithm", "how do you", "how did you"]):
        return "process"
    if any(k in m for k in ["explain", "result", "what happened", "summary",
                              "what does this mean", "tell me about", "detect"]):
        return "explain"
    return "help"


def _find_mentioned_vessel(message: str, candidates: list) -> Optional[dict]:
    """Match a candidate vessel by name, MMSI or vessel_id mentioned in the message."""
    m = message.lower()
    for cand in candidates:
        vessel = cand.get("vessel", {})
        name = (vessel.get("name") or "").lower()
        mmsi = str(vessel.get("mmsi") or "")
        vid = (vessel.get("vessel_id") or "").lower()
        if (name and name in m) or (mmsi and mmsi in message) or (vid and vid in m):
            return cand
    return None


def _last_bot_turn(history: Optional[list]) -> dict:
    """Find the most recent bot turn in the conversation history, if any."""
    if not history:
        return {}
    for turn in reversed(history):
        if turn.get("role") == "bot":
            return turn
    return {}


async def handle_chat(investigation_id: Optional[str], message: str, history: Optional[list] = None) -> dict:
    intent = _detect_intent(message)
    last_turn = _last_bot_turn(history)

    # Sticky follow-up: a short continuation phrase ("why", "tell me more")
    # re-runs whatever continuable intent the bot last answered with.
    if intent == "help" and message.strip().lower() in CONTINUATION_PHRASES:
        prior_intent = last_turn.get("type")
        if prior_intent in CONTINUABLE_INTENTS:
            intent = prior_intent

    # Vessel-specific follow-up: if the message names a candidate vessel (or
    # is a continuation of a prior vessel_detail turn), answer about that
    # vessel specifically rather than the whole investigation. This check
    # only overrides the more general/ambiguous intents -- explicit intents
    # like "news" or "process" always win.
    if investigation_id and intent in ("explain", "help", "impact", "vessel_detail"):
        attr_data = await attribution_repo.get_by_investigation(investigation_id)
        candidates = attr_data.get("ranked_candidates", []) if attr_data else []
        mentioned = _find_mentioned_vessel(message, candidates) if candidates else None
        if mentioned or (intent == "vessel_detail"):
            intent = "vessel_detail"

    try:
        if intent == "news":
            return await _answer_news()
        elif intent == "draft_summary":
            return await _answer_draft_summary(investigation_id)
        elif intent == "recommend":
            return await _answer_recommend(investigation_id)
        elif intent == "historical":
            return await _answer_historical(investigation_id)
        elif intent == "vessel_detail":
            return await _answer_vessel_detail(investigation_id, message, last_turn)
        elif intent == "impact":
            return await _answer_impact(investigation_id)
        elif intent == "process":
            return _answer_process()
        elif intent == "explain":
            return await _answer_explain(investigation_id)
        else:
            gk_answer = _match_general_knowledge(message)
            if gk_answer:
                return {"type": "general_knowledge", "reply": gk_answer}
            return _answer_help()
    except Exception as e:
        logger.exception(f"[CHAT] Failed to answer (intent={intent}): {e}")
        return {
            "type": "error",
            "reply": "I ran into an issue answering that. You can ask me to "
                     "\"explain the result\", \"explain the process\", \"what's "
                     "the environmental impact\", \"how does this compare to past "
                     "spills\", \"what should I do\", \"draft a summary\", ask "
                     "about a specific vessel by name, or \"show latest oil "
                     "spill news\"."
        }


# General oil-spill knowledge -- answers common questions that aren't tied
# to any specific investigation (definitions, causes, cleanup methods,
# health/economic effects, prevention, and what the underlying tech terms
# mean). Matched by keyword, same as the rest of the intent system, so it
# needs no LLM key either. Checked as a fallback when no investigation-
# specific intent matches, so general questions get a real answer instead
# of just the help menu.
GENERAL_KNOWLEDGE_QA = [
    {
        "keywords": ["how is attribution score calculated", "attribution formula",
                      "how is the score calculated", "how do you calculate the score",
                      "weighted score", "attribution weight", "how is score computed"],
        "keywords_all": [["attribution", "score", "calculat"], ["attribution", "score", "formula"],
                          ["attribution", "score", "weight"], ["attribution", "how"]],
        "answer": (
            "The attribution score is a weighted sum of 6 evidence factors, each "
            "scored 0-1: Spatial proximity (weight 0.28), Temporal match (0.23), "
            "Drift compatibility (0.18), Trajectory anomaly (0.13), AIS data "
            "quality (0.08), and Dark-vessel/AIS-gap signal (0.10) -- these "
            "weights sum to 1.0. So: score = 0.28*spatial + 0.23*temporal + "
            "0.18*drift + 0.13*trajectory + 0.08*ais_quality + 0.10*ais_gap. "
            "Spatial and temporal proximity carry the most weight because "
            "'was this vessel there, at that time' is the strongest raw "
            "evidence; the AIS-gap factor is weighted lower since a "
            "transmission gap alone is suggestive, not conclusive."
        ),
    },
    {
        "keywords": ["how is spatial", "spatial score formula", "spatial compatibility"],
        "keywords_all": [["spatial", "calculat"], ["spatial", "formula"]],
        "answer": (
            "Spatial compatibility measures how close a vessel's track came to "
            "the estimated source region -- calculated as the minimum "
            "haversine (great-circle) distance from any of the vessel's "
            "recorded positions to the source region's polygon, normalized so "
            "that a very close pass scores near 1.0 and a distant one scores "
            "near 0."
        ),
    },
    {
        "keywords": ["how is temporal", "temporal score formula", "temporal compatibility",
                      "timing score"],
        "keywords_all": [["temporal", "calculat"], ["temporal", "formula"]],
        "answer": (
            "Temporal compatibility checks whether the vessel had AIS pings "
            "inside (or close to) the reconstructed release window -- the "
            "closer in time a vessel's presence was to that window, the "
            "higher the score, decaying toward 0 the further outside the "
            "window it falls."
        ),
    },
    {
        "keywords": ["how is drift score", "drift compatibility formula",
                      "how is drift calculated", "leeway formula", "drift formula"],
        "keywords_all": [["drift", "calculat"], ["leeway"]],
        "answer": (
            "Two different 'drift' calculations exist in the system: (1) the "
            "slick's own drift/hindcast uses the leeway model -- "
            "drift_velocity = ocean_current_velocity + 0.035 x wind_velocity "
            "(the 3.5% wind factor is a standard search-and-rescue/spill-"
            "response constant) -- to trace the slick backward to its origin "
            "and forward to a forecast position. (2) A candidate vessel's "
            "drift-compatibility evidence score checks how close that vessel's "
            "position, projected forward, ends up to the actual detected slick "
            "location -- closer projected distance = higher score."
        ),
    },
    {
        "keywords": ["how is trajectory", "trajectory score formula", "trajectory anomaly"],
        "keywords_all": [["trajectory", "calculat"], ["trajectory", "formula"]],
        "answer": (
            "Trajectory anomaly looks for sudden heading changes and speed "
            "drops in a vessel's track during the release window -- both are "
            "behavioural signatures of operational discharge (a vessel "
            "slowing down and manoeuvring to dump waste). Larger heading "
            "changes and bigger speed drops push this score higher."
        ),
    },
    {
        "keywords": ["how is ais quality", "ais quality formula", "ais data quality"],
        "keywords_all": [["ais", "quality", "calculat"], ["ais", "quality", "formula"]],
        "answer": (
            "AIS quality scores how many AIS pings that vessel actually has "
            "inside the release window -- more pings means a denser, more "
            "trustworthy track to base the other evidence factors on; very "
            "few or zero pings in the window scores low, since there's less "
            "to verify the vessel's presence with."
        ),
    },
    {
        "keywords": ["how is dark vessel", "ais gap formula", "dark vessel score",
                      "ais gap score", "how is the gap calculated"],
        "answer": (
            "The dark-vessel (AIS-gap) score flags a vessel whose transponder "
            "went suspiciously quiet around the release window -- a known "
            "evasion tactic. It compares each vessel's own normal ping "
            "interval (its median gap between pings) against the largest gap "
            "that overlaps the release window: a gap up to 2x that vessel's "
            "normal cadence isn't suspicious (score 0); a gap of 8x or more "
            "scores fully suspicious (1.0), scaling linearly in between. Using "
            "each vessel's own typical cadence (rather than one fixed "
            "threshold) means it adapts fairly to vessels that report more or "
            "less frequently."
        ),
    },
    {
        "keywords": ["how is confidence calculated", "what is iou", "confidence score formula",
                      "how accurate is the model", "model accuracy"],
        "answer": (
            "Detection confidence is the model's own softmax probability for "
            "the oil-spill class at each pixel, averaged over the detected "
            "region -- it reflects how certain the model is about this "
            "specific image, and can vary spill to spill. IoU (Intersection "
            "over Union) is a different number: it's an offline benchmark "
            "score (50.46%, measured with test-time augmentation) showing how "
            "well the model's predicted masks overlapped with ground-truth "
            "masks on a held-out validation set during training -- it "
            "describes overall model quality, not any single live prediction."
        ),
    },
    {
        "keywords": ["what is an oil spill", "what is oil spill", "define oil spill", "meaning of oil spill"],
        "answer": (
            "An oil spill is the release of liquid petroleum hydrocarbons into the "
            "environment, especially marine areas, due to human activity. It "
            "includes crude oil from tankers, offshore platforms, and pipelines, "
            "as well as refined products like diesel or bunker fuel from ships. "
            "Spills range from small operational discharges to major disasters "
            "spanning hundreds of square kilometres."
        ),
    },
    {
        "keywords": ["cause of oil spill", "causes of oil spill", "why do oil spills happen",
                      "how do oil spills happen", "what causes oil spill"],
        "answer": (
            "Common causes include: tanker accidents (collisions, groundings), "
            "pipeline leaks and ruptures, offshore drilling/well blowouts, illegal "
            "operational discharges (ships flushing bilge or ballast tanks at sea "
            "to save disposal costs -- a major and often undetected cause), "
            "equipment failure during loading/unloading, and natural seepage "
            "(a smaller, ongoing background source)."
        ),
    },
    {
        "keywords": ["type of oil", "types of oil", "kind of oil", "crude vs refined",
                      "bunker fuel", "what oils are spilled"],
        "answer": (
            "Spilled oil varies widely in behavior: light crude oil spreads fast "
            "and evaporates significantly within days; heavy crude and bunker "
            "fuel (used by large ships) are thicker, persist far longer, and are "
            "harder to clean up; refined products like diesel are more toxic "
            "short-term but evaporate faster. The oil type strongly affects both "
            "cleanup strategy and how long environmental damage lasts."
        ),
    },
    {
        "keywords": ["clean up", "cleaned up", "cleanup method", "how do you clean",
                      "how is oil removed", "oil removed", "remove oil from water",
                      "how to clean oil spill", "how is oil cleaned"],
        "answer": (
            "Common cleanup methods: (1) containment booms -- floating barriers "
            "that corral the slick, (2) skimmers -- vessels that physically "
            "vacuum or scoop oil off the surface, (3) sorbents -- absorbent "
            "materials that soak up oil, (4) chemical dispersants -- break the "
            "slick into smaller droplets so it disperses in the water column "
            "(controversial due to toxicity trade-offs), (5) in-situ burning -- "
            "controlled burning of thick slicks, and (6) bioremediation -- using "
            "oil-eating microbes for long-term residual cleanup, especially on "
            "shorelines."
        ),
    },
    {
        "keywords": ["health effect", "health impact", "human health", "toxic to human",
                      "is oil spill dangerous to people"],
        "answer": (
            "Direct human health risks include respiratory irritation from "
            "volatile fumes, skin and eye irritation on contact, and, for cleanup "
            "workers, longer-term exposure risks from benzene and other toxic "
            "compounds in crude oil. Indirect effects include contaminated "
            "seafood entering the food supply and economic/psychological stress "
            "on fishing-dependent coastal communities."
        ),
    },
    {
        "keywords": ["economic impact", "economic effect", "cost of oil spill", "financial impact"],
        "answer": (
            "Economic impact typically includes: lost income for fishing and "
            "aquaculture industries (sometimes for years, if breeding grounds "
            "are damaged), tourism revenue loss in affected coastal areas, direct "
            "cleanup costs (often running into hundreds of millions of dollars "
            "for major spills), and legal/regulatory penalties for the "
            "responsible party."
        ),
    },
    {
        "keywords": ["prevent", "regulation", "marpol", "double hull",
                      "how to avoid oil spill"],
        "answer": (
            "Key prevention measures include: mandatory double-hull tanker "
            "designs (reduces rupture risk in collisions/groundings), MARPOL "
            "international regulations restricting operational discharge at sea, "
            "vessel traffic monitoring in busy shipping lanes, mandatory AIS "
            "transponders for large vessels, regular pipeline/platform "
            "inspection requirements, and port state control inspections that "
            "can detain non-compliant vessels."
        ),
    },
    {
        "keywords": ["what is sar", "synthetic aperture radar", "what is sentinel",
                      "how does satellite detect oil", "how satellite detection works"],
        "answer": (
            "SAR (Synthetic Aperture Radar) is a satellite imaging technique that "
            "sends radar pulses down to the ocean surface and measures what "
            "bounces back. Normal wind-roughened water scatters radar strongly "
            "(appears bright); oil dampens surface ripples, so it scatters less "
            "and appears as a dark patch. Unlike optical satellites, SAR works "
            "day or night and through cloud cover, which is why it's the primary "
            "sensor for operational spill monitoring. Sentinel-1 (used in this "
            "system) is a widely used free SAR satellite constellation."
        ),
    },
    {
        "keywords": ["what is ais", "automatic identification system", "how does vessel tracking work",
                      "how ais works", "how does ais work", "how ais work"],
        "answer": (
            "AIS (Automatic Identification System) is a transponder system that "
            "large vessels are required to carry -- it broadcasts the ship's "
            "identity (MMSI, name), position, speed and heading at regular "
            "intervals, picked up by satellites and coastal receivers. It's the "
            "main data source for reconstructing vessel traffic around a spill "
            "site. A known evasion tactic is switching AIS off before an illegal "
            "discharge -- which is why this system also checks for suspicious "
            "AIS transmission gaps."
        ),
    },
    {
        "keywords": ["what should i do if i see", "spot an oil spill", "report oil spill",
                      "who do i contact", "who to report"],
        "answer": (
            "If you spot a suspected oil spill: note the location (coordinates "
            "if possible), time, approximate size, and any nearby vessels, then "
            "report it to your national coast guard or maritime pollution "
            "control authority (in India, this would typically be the Indian "
            "Coast Guard). Avoid direct contact with the oil, and don't attempt "
            "cleanup yourself -- specialized responders need to assess the oil "
            "type first."
        ),
    },
    {
        "keywords": ["famous oil spill", "biggest oil spill", "worst oil spill",
                      "exxon valdez", "deepwater horizon", "history of oil spill"],
        "answer": (
            "Two of the most well-known spills: the Exxon Valdez (1989, Prince "
            "William Sound, Alaska) -- a tanker grounding that released roughly "
            "11 million gallons and became a landmark case for environmental "
            "regulation; and the Deepwater Horizon / BP spill (2010, Gulf of "
            "Mexico) -- an offshore drilling rig blowout, the largest marine oil "
            "spill in US history, releasing oil for about 87 days before the "
            "well was capped."
        ),
    },
]


def _match_general_knowledge(message: str) -> Optional[str]:
    """
    Matches a message against GENERAL_KNOWLEDGE_QA. Entries can use either
    "keywords" (OR match -- any one exact phrase present) or "keywords_all"
    (AND match -- all of these substrings must be present, in any order).
    AND-mode is more robust to natural filler words ("the", "a"...) breaking
    up an exact phrase match, e.g. "how is THE spatial score calculated".
    """
    m = message.lower()
    best_match = None
    best_score = 0
    for entry in GENERAL_KNOWLEDGE_QA:
        for kw in entry.get("keywords", []):
            if kw in m and len(kw) > best_score:
                best_match = entry["answer"]
                best_score = len(kw)
        for kw_group in entry.get("keywords_all", []):
            if all(part in m for part in kw_group):
                score = sum(len(p) for p in kw_group)
                if score > best_score:
                    best_match = entry["answer"]
                    best_score = score
    return best_match


def _answer_help() -> dict:
    return {
        "type": "help",
        "reply": (
            "I can help with:\n"
            "- \"Explain this result\" -- summarize the detection, drift and top suspect\n"
            "- \"How does this work?\" -- explain the detection/drift/attribution pipeline\n"
            "- \"What's the environmental impact?\" -- likely marine/land effects of this spill\n"
            "- \"How does this compare to past spills?\" -- historical size/location comparison\n"
            "- \"What should I do?\" -- actionable next-step recommendation\n"
            "- \"Draft a summary\" -- a copy-ready incident summary paragraph\n"
            "- Ask about a specific vessel by name for its full evidence breakdown\n"
            "- \"Show latest oil spill news\" -- recent real-world spill headlines\n"
            "- General questions too -- e.g. \"what causes oil spills?\", \"how is "
            "oil cleaned up?\", \"what is SAR?\", \"what is AIS?\""
        )
    }


def _answer_process() -> dict:
    reply = (
        "Here's how the analysis works, in three stages:\n\n"
        "1) Detection: a U-Net (ResNet34 encoder) segmentation model scans the "
        "SAR satellite image and outputs a pixel-level mask of where oil is "
        "likely present, along with a confidence score.\n\n"
        "2) Drift Reconstruction: using live ocean current and wind data for "
        "that location and time, a leeway drift model traces the slick "
        "backward to estimate where and when it likely originated (hindcast), "
        "and forward to predict where it will spread (forecast).\n\n"
        "3) Attribution: vessels near the estimated origin during the release "
        "window are scored on six factors -- spatial proximity, timing, drift "
        "compatibility, trajectory anomalies, AIS data quality, and whether "
        "the vessel had a suspicious AIS transmission gap (a known evasion "
        "tactic). The highest-scoring vessel is ranked as the most likely "
        "source, with a plain-language justification for each factor."
    )
    return {"type": "text", "reply": reply}


async def _answer_explain(investigation_id: Optional[str]) -> dict:
    if not investigation_id:
        return {"type": "text", "reply": "Which investigation would you like me to explain? Open one first, then ask again."}

    inv = await inv_repo.get(investigation_id)
    if not inv:
        return {"type": "text", "reply": "I couldn't find that investigation."}

    det = await det_repo.get_by_investigation(investigation_id)
    rec = await rec_repo.get_by_investigation(investigation_id)
    attr_data = await attribution_repo.get_by_investigation(investigation_id)
    candidates = attr_data.get("ranked_candidates", []) if attr_data else []

    parts = []

    if not det or not det.detected:
        parts.append(
            "This investigation did not find a confident oil slick in the "
            "submitted image -- no drift or vessel attribution was run."
        )
        return {"type": "text", "reply": " ".join(parts)}

    area = getattr(det, "area_km2", None)
    area_txt = f"~{area:.2f} km²" if area is not None else "an undetermined area"
    conf_txt = f"{det.confidence*100:.1f}%" if getattr(det, "confidence", None) is not None else "high"
    parts.append(
        f"The model detected an oil slick with {conf_txt} confidence, covering {area_txt}."
    )

    if rec:
        origin_txt = ""
        if getattr(rec, "source_region", None):
            centroid = spatial_engine.get_centroid(rec.source_region, default_lon=None, default_lat=None)
            if centroid and centroid[0] is not None:
                origin_txt = f" around ({centroid[1]:.3f}°, {centroid[0]:.3f}°)"
        window_txt = ""
        if getattr(rec, "release_window", None):
            window_txt = (f", likely released between {rec.release_window.start_time.strftime('%Y-%m-%d %H:%M')} "
                           f"and {rec.release_window.end_time.strftime('%Y-%m-%d %H:%M')} UTC")
        parts.append(f"Tracing the drift backward, the estimated origin is{origin_txt}{window_txt}.")

    if candidates:
        top = candidates[0]
        vessel = top.get("vessel", {})
        score = top.get("attribution_score", 0)
        explanations = top.get("explanations", [])
        name = vessel.get("name") or vessel.get("vessel_id", "an unnamed vessel")
        parts.append(
            f"The top suspect is {name} (MMSI {vessel.get('mmsi', 'unknown')}) "
            f"with an attribution score of {score*100:.0f}%."
        )
        if explanations:
            parts.append("Why: " + " ".join(explanations[:2]))
        if len(candidates) > 1:
            parts.append(f"{len(candidates)-1} other vessel(s) were also ranked as lower-probability candidates.")
    else:
        parts.append("No suspect vessels were identified near the estimated origin and release window.")

    return {"type": "text", "reply": " ".join(parts)}


async def _reverse_geocode(lat: float, lon: float) -> dict:
    """Free OSM Nominatim reverse-geocode. Returns {} on any failure."""
    params = {
        "format": "jsonv2",
        "lat": lat,
        "lon": lon,
        "zoom": 8,
        "addressdetails": 1,
    }
    headers = {"User-Agent": "OilTraceAI-Chatbot/1.0 (SIH prototype)"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.warning(f"[CHAT] Reverse geocode failed for ({lat},{lon}): {e}")
        return {}


def _guess_sea_name(lat: float, lon: float) -> str:
    """Coarse bounding-box fallback when Nominatim returns no water body name."""
    if 8 <= lat <= 25 and 66 <= lon <= 74:
        return "Arabian Sea"
    if 5 <= lat <= 22 and 80 <= lon <= 95:
        return "Bay of Bengal"
    if lat < 8 and 68 <= lon <= 90:
        return "Indian Ocean"
    return "the open ocean"


async def _answer_impact(investigation_id: Optional[str]) -> dict:
    if not investigation_id:
        return {"type": "text", "reply": "Open an investigation first so I know which spill location to assess."}

    det = await det_repo.get_by_investigation(investigation_id)
    rec = await rec_repo.get_by_investigation(investigation_id)

    lat = lon = None
    if rec and getattr(rec, "source_region", None):
        c = spatial_engine.get_centroid(rec.source_region, default_lon=None, default_lat=None)
        if c and c[0] is not None:
            lon, lat = c[0], c[1]
    if lat is None and det and getattr(det, "geometry", None):
        c = spatial_engine.get_centroid(det.geometry, default_lon=None, default_lat=None)
        if c and c[0] is not None:
            lon, lat = c[0], c[1]

    if lat is None:
        return {"type": "text", "reply": "I don't have a location for this spill yet -- run the analysis first."}

    geo = await _reverse_geocode(lat, lon)
    address = geo.get("address", {}) if geo else {}
    is_land = bool(address.get("state") or address.get("city") or address.get("county") or address.get("country"))

    if is_land:
        place = (address.get("city") or address.get("town") or address.get("county")
                  or address.get("state") or "the nearby coast")
        reply = f"This location is near {place}. " + LAND_IMPACT_TEMPLATE.format(place=place)
        return {"type": "text", "reply": reply, "data": {"classification": "land", "place": place, "lat": lat, "lon": lon}}
    else:
        sea_name = None
        if geo:
            display = (geo.get("display_name") or "").lower()
            for key in MARINE_IMPACT:
                if key != "default_ocean" and key in display:
                    sea_name = key
                    break
        if not sea_name:
            sea_name = _guess_sea_name(lat, lon).lower()

        impact_text = MARINE_IMPACT.get(sea_name, MARINE_IMPACT["default_ocean"])
        region_label = sea_name.title() if sea_name in MARINE_IMPACT else _guess_sea_name(lat, lon)
        reply = f"This spill is over open water, in the {region_label}. {impact_text}"
        return {"type": "text", "reply": reply, "data": {"classification": "ocean", "region": region_label, "lat": lat, "lon": lon}}


async def _answer_news() -> dict:
    query = quote("oil spill")
    url = f"{GOOGLE_NEWS_RSS}?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers={"User-Agent": "OilTraceAI-Chatbot/1.0"})
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
    except Exception as e:
        logger.warning(f"[CHAT] News fetch failed: {e}")
        return {"type": "text", "reply": "I couldn't reach the news feed right now -- check your internet connection and try again."}

    items = []
    for item in root.findall(".//item")[:5]:
        title = item.findtext("title") or ""
        link = item.findtext("link") or ""
        pub_date = item.findtext("pubDate") or ""
        title = re.sub(r"\s+-\s+[^-]+$", "", title)  # strip trailing " - Source Name"
        items.append({"title": title, "link": link, "published": pub_date})

    if not items:
        return {"type": "text", "reply": "No recent oil spill news found."}

    lines = [f"{i+1}. {it['title']}" for i, it in enumerate(items)]
    reply = "Here are the latest oil spill news headlines:\n" + "\n".join(lines)
    return {"type": "news", "reply": reply, "data": {"articles": items}}


async def _answer_vessel_detail(investigation_id: Optional[str], message: str, last_turn: dict) -> dict:
    if not investigation_id:
        return {"type": "text", "reply": "Open an investigation first so I know which vessel to look up."}

    attr_data = await attribution_repo.get_by_investigation(investigation_id)
    candidates = attr_data.get("ranked_candidates", []) if attr_data else []
    if not candidates:
        return {"type": "text", "reply": "No candidate vessels are available for this investigation yet."}

    mentioned = _find_mentioned_vessel(message, candidates)
    if not mentioned:
        sticky_id = (last_turn.get("data") or {}).get("vessel_id")
        if sticky_id:
            mentioned = next(
                (c for c in candidates if c.get("vessel", {}).get("vessel_id") == sticky_id), None
            )
    if not mentioned:
        mentioned = candidates[0]  # default to the top-ranked suspect

    vessel = mentioned.get("vessel", {})
    evidence = mentioned.get("evidence", {})
    explanations = mentioned.get("explanations", [])
    rank = mentioned.get("rank")
    score = mentioned.get("attribution_score", 0)

    lines = [
        f"{vessel.get('name', 'Unknown vessel')} (MMSI {vessel.get('mmsi', 'n/a')}) is ranked "
        f"#{rank} with an attribution score of {score*100:.0f}%.",
        "",
        "Evidence breakdown:",
        f"  Spatial proximity: {evidence.get('spatial', 0)*100:.0f}%",
        f"  Timing match: {evidence.get('temporal', 0)*100:.0f}%",
        f"  Drift compatibility: {evidence.get('drift', 0)*100:.0f}%",
        f"  Trajectory anomaly: {evidence.get('trajectory', 0)*100:.0f}%",
        f"  AIS data quality: {evidence.get('ais_quality', 0)*100:.0f}%",
        f"  Dark-vessel (AIS-gap) signal: {evidence.get('ais_gap', 0)*100:.0f}%",
    ]
    if explanations:
        lines.append("")
        lines.append("Reasoning: " + " ".join(explanations))

    return {
        "type": "vessel_detail",
        "reply": "\n".join(lines),
        "data": {"vessel_id": vessel.get("vessel_id")}
    }


async def _answer_historical(investigation_id: Optional[str]) -> dict:
    if not investigation_id:
        return {"type": "text", "reply": "Open an investigation first so I can compare it to past spills."}

    det = await det_repo.get_by_investigation(investigation_id)
    if not det or not det.detected:
        return {"type": "text", "reply": "This investigation has no confirmed detection to compare."}

    current_id = getattr(det, "id", None)
    areas = []
    centroids = []
    cursor = det_repo.collection.find({"detected": True})
    async for doc in cursor:
        if str(doc.get("_id")) == str(current_id):
            continue
        area = doc.get("area_km2")
        if area is None and doc.get("area_pct") is not None:
            area = round(float(doc["area_pct"]) * 0.25, 2)
        if area is not None:
            areas.append(area)
        geom = doc.get("geometry")
        if geom:
            c = spatial_engine.get_centroid(geom, default_lon=None, default_lat=None)
            if c and c[0] is not None:
                centroids.append((c[0], c[1]))

    if not areas:
        return {"type": "historical", "reply": "This appears to be the first analyzed spill on record -- no historical baseline to compare against yet."}

    avg_area = sum(areas) / len(areas)
    current_area = getattr(det, "area_km2", None)
    if current_area is None and getattr(det, "area_pct", None) is not None:
        current_area = round(float(det.area_pct) * 0.25, 2)

    lines = [f"Out of {len(areas)} previously analyzed spill(s), the average detected area was {avg_area:.2f} km²."]
    if current_area is not None:
        if avg_area > 0 and current_area > avg_area * 1.2:
            lines.append(f"This spill ({current_area:.2f} km²) is notably larger than average -- roughly {(current_area/avg_area - 1)*100:.0f}% bigger.")
        elif avg_area > 0 and current_area < avg_area * 0.8:
            lines.append(f"This spill ({current_area:.2f} km²) is smaller than average -- roughly {(1 - current_area/avg_area)*100:.0f}% smaller.")
        else:
            lines.append(f"This spill ({current_area:.2f} km²) is close to the typical size seen so far.")

    my_centroid = None
    rec = await rec_repo.get_by_investigation(investigation_id)
    if rec and getattr(rec, "source_region", None):
        c = spatial_engine.get_centroid(rec.source_region, default_lon=None, default_lat=None)
        if c and c[0] is not None:
            my_centroid = c
    if not my_centroid and getattr(det, "geometry", None):
        c = spatial_engine.get_centroid(det.geometry, default_lon=None, default_lat=None)
        if c and c[0] is not None:
            my_centroid = c

    if my_centroid and centroids:
        nearby = sum(
            1 for (lon, lat) in centroids
            if spatial_engine.haversine(my_centroid[0], my_centroid[1], lon, lat) <= 150
        )
        if nearby > 0:
            lines.append(f"{nearby} prior spill(s) were detected within ~150km of this location -- this may indicate a recurring source or shipping-lane hotspot.")
        else:
            lines.append("No prior spills were recorded within ~150km of this location.")

    return {"type": "historical", "reply": " ".join(lines)}


async def _answer_recommend(investigation_id: Optional[str]) -> dict:
    if not investigation_id:
        return {"type": "text", "reply": "Open an investigation first so I can recommend next steps."}

    det = await det_repo.get_by_investigation(investigation_id)
    if not det or not det.detected:
        return {
            "type": "recommend",
            "reply": "No confirmed slick was detected in this observation. Recommend: re-task a "
                     "follow-up satellite pass, or manually review the image for a low-confidence "
                     "signal the model may have missed."
        }

    inv = await inv_repo.get(investigation_id)
    attr_data = await attribution_repo.get_by_investigation(investigation_id)
    candidates = attr_data.get("ranked_candidates", []) if attr_data else []
    confidence = getattr(det, "confidence", 0) or 0
    ais_source = getattr(inv, "ais_data_source", None) if inv else None

    if confidence < 0.5:
        return {
            "type": "recommend",
            "reply": f"Detection confidence is low ({confidence*100:.0f}%). Recommend a manual "
                     f"analyst review of the SAR image before taking any further action."
        }

    if not candidates:
        coverage_note = ("attribution used simulated traffic as a stand-in" if ais_source == "simulated"
                          else "no AIS coverage was found at all" if ais_source is None
                          else "attribution found a mix of real and simulated traffic")
        return {
            "type": "recommend",
            "reply": f"Detection confidence is solid ({confidence*100:.0f}%), but no suspect vessels "
                     f"were identified near the estimated origin. Recommend widening the AIS search "
                     f"radius, or checking real AIS feed coverage for this region -- currently {coverage_note}."
        }

    top = candidates[0]
    score = top.get("attribution_score", 0)
    vessel = top.get("vessel", {})
    name = vessel.get("name", "the top-ranked vessel")

    if score >= 0.7 and ais_source == "real":
        reply = (
            f"High-confidence detection ({confidence*100:.0f}%) with a strong, real-AIS-verified "
            f"match to {name} ({score*100:.0f}%). Recommend: formally flag {name} to enforcement "
            f"authorities and preserve this report as supporting evidence."
        )
    elif score >= 0.7:
        reply = (
            f"High-confidence detection ({confidence*100:.0f}%) with a strong match to {name} "
            f"({score*100:.0f}%), but attribution relied on simulated AIS traffic (no real feed "
            f"coverage for this region/window). Recommend corroborating with an independent AIS "
            f"provider or satellite-tracking service before taking formal action against {name}."
        )
    else:
        reply = (
            f"Detection confidence is solid ({confidence*100:.0f}%), but the top candidate ({name}) "
            f"only scored {score*100:.0f}% -- a moderate, not conclusive, match. Recommend treating "
            f"this as a lead requiring further investigation rather than a confirmed attribution."
        )

    return {"type": "recommend", "reply": reply}


async def _answer_draft_summary(investigation_id: Optional[str]) -> dict:
    if not investigation_id:
        return {"type": "text", "reply": "Open an investigation first so I can draft a summary for it."}

    det = await det_repo.get_by_investigation(investigation_id)
    rec = await rec_repo.get_by_investigation(investigation_id)
    attr_data = await attribution_repo.get_by_investigation(investigation_id)
    candidates = attr_data.get("ranked_candidates", []) if attr_data else []

    if not det or not det.detected:
        return {
            "type": "draft_summary",
            "reply": f"INCIDENT SUMMARY -- Investigation {investigation_id}\n\nSAR observation "
                     f"analyzed; no oil slick detected with sufficient confidence. No further "
                     f"action required."
        }

    area = getattr(det, "area_km2", None)
    area_txt = f"{area:.2f} km²" if area is not None else "an undetermined area"
    conf = getattr(det, "confidence", 0) or 0

    origin_txt = "an undetermined location"
    window_txt = ""
    if rec and getattr(rec, "source_region", None):
        c = spatial_engine.get_centroid(rec.source_region, default_lon=None, default_lat=None)
        if c and c[0] is not None:
            origin_txt = f"approximately {c[1]:.3f}°, {c[0]:.3f}°"
    if rec and getattr(rec, "release_window", None):
        window_txt = (f", within the window {rec.release_window.start_time.strftime('%Y-%m-%d %H:%M')}"
                       f"-{rec.release_window.end_time.strftime('%H:%M')} UTC")

    suspect_txt = "No suspect vessel could be attributed with the available AIS data."
    if candidates:
        top = candidates[0]
        vessel = top.get("vessel", {})
        score = top.get("attribution_score", 0)
        suspect_txt = (
            f"The top suspect vessel is {vessel.get('name', 'an unidentified vessel')} "
            f"(MMSI {vessel.get('mmsi', 'unknown')}), attributed with {score*100:.0f}% confidence "
            f"based on spatial, temporal, drift, trajectory and AIS-behaviour evidence."
        )

    summary = (
        f"INCIDENT SUMMARY -- Investigation {investigation_id}\n\n"
        f"A satellite SAR observation identified an oil slick covering {area_txt} with "
        f"{conf*100:.0f}% model confidence. Backward drift reconstruction traces the likely "
        f"release origin to {origin_txt}{window_txt}. {suspect_txt} This assessment is generated "
        f"by an automated detection, drift-hindcast and AIS-attribution pipeline and is intended "
        f"to support, not replace, human investigative review."
    )
    return {"type": "draft_summary", "reply": summary}
