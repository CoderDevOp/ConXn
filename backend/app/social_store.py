"""JSON-backed platform connections and 1:1 chats (LinkedIn-style on ConXn)."""
from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

_lock = threading.Lock()


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def pair_key(a: str, b: str) -> str:
    x, y = sorted((str(a).strip(), str(b).strip()))
    return f"{x}|{y}"


def _default_state() -> dict:
    return {
        "connections": [],
        "thread_labels": {},
        "messages": {},
        "mentor_seen": {},
    }


# Demo student requests (mentor hub + chats) — idempotent per (alumni_id, key).
DEMO_STUDENT_THREADS: list[tuple[str, str, str]] = [
    (
        "student:req-1",
        "Aditi K.",
        "Would you be open to a 15-min chat about how you transitioned from campus to your current ML team? I am especially curious about take-home expectations.",
    ),
    (
        "student:req-2",
        "Rahul S.",
        "Thanks again for the AMA last week. I had one more question about how your team evaluates research vs product impact in performance reviews.",
    ),
    (
        "student:req-3",
        "Meera V.",
        "Hi — I saw your path through payments and risk. I am applying for summer internships and would value 10 minutes of advice on how to position my CV.",
    ),
    (
        "student:req-4",
        "Campus chapter (ConXn)",
        "Invitation: we are running a 24h fintech hackathon on April 28 and would love a mentor judge for the finals (remote, ~2h).",
    ),
    (
        "student:req-5",
        "Kiran P.",
        "I'm preparing for system design rounds — any tips from how your team runs architecture reviews?",
    ),
    (
        "student:req-6",
        "Sana A.",
        "Could you look at my portfolio site (link in profile) and suggest 2–3 improvements before I apply?",
    ),
    (
        "student:req-7",
        "Arjun M.",
        "Our club is hosting a fireside on careers in quant — would you be open to joining as a panelist?",
    ),
    (
        "student:req-8",
        "Neha R.",
        "I'm weighing startup vs big tech for my first role — any framework you used when you decided?",
    ),
    (
        "student:req-9",
        "Dev N.",
        "I'm pivoting from backend to ML — could you suggest one project that would look credible on my resume?",
    ),
    (
        "student:req-10",
        "Isha L.",
        "Would you be willing to review my cold email to a hiring manager (draft below) before I send it?",
    ),
    (
        "student:req-11",
        "Rohan T.",
        "Our team is building a small RAG demo for a college fest — any pitfall you wish you'd avoided early on?",
    ),
    (
        "student:req-12",
        "Priya G.",
        "I'm trying to choose between two offers (similar TC). What did you optimize for in your last move?",
    ),
    (
        "student:req-13",
        "Aman F.",
        "Could you share how you prep for stakeholder reviews when the project timeline slips?",
    ),
    (
        "student:req-14",
        "Tanya K.",
        "I'm a first-gen student navigating referrals — what's a respectful way to follow up after no response for 10 days?",
    ),
]


class SocialStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> dict:
        with _lock:
            if not self.path.is_file():
                return _default_state()
            try:
                raw = self.path.read_text(encoding="utf-8")
                data = json.loads(raw) if raw.strip() else _default_state()
            except (json.JSONDecodeError, OSError):
                return _default_state()
            data.setdefault("connections", [])
            data.setdefault("thread_labels", {})
            data.setdefault("messages", {})
            if not isinstance(data["connections"], list):
                data["connections"] = []
            if not isinstance(data["thread_labels"], dict):
                data["thread_labels"] = {}
            if not isinstance(data["messages"], dict):
                data["messages"] = {}
            data.setdefault("mentor_seen", {})
            if not isinstance(data["mentor_seen"], dict):
                data["mentor_seen"] = {}
            return data

    def save(self, data: dict) -> None:
        with _lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            tmp.replace(self.path)

    def seed_demo_connections(self, alumni_count: int) -> None:
        """Deprecated: use ensure_rich_demo. Kept for compatibility."""
        self.ensure_rich_demo(alumni_count)

    def _msg(self, from_id: str, body: str) -> dict:
        return {
            "id": str(uuid.uuid4()),
            "from": str(from_id).strip(),
            "body": body.strip(),
            "at": _utc_iso(),
        }

    def _push_msg(self, data: dict, key: str, from_id: str, body: str) -> None:
        if key not in data["messages"]:
            data["messages"][key] = []
        data["messages"][key].append(self._msg(from_id, body))

    def _ensure_student_in_data(
        self,
        data: dict,
        alumni_id: str,
        student_key: str,
        student_name: str,
        initial_message: str,
    ) -> bool:
        key = pair_key(alumni_id, student_key)
        if data["messages"].get(key):
            return False
        if key not in data["messages"]:
            data["messages"][key] = []
        data["messages"][key].append(self._msg(student_key, initial_message))
        data["thread_labels"][key] = {
            "virtual_peer": student_key,
            "label": student_name,
        }
        return True

    def ensure_rich_demo(self, alumni_count: int) -> dict:
        """
        Idempotent alumni-area demo: many connections for row 0, sample peer chats,
        extra student request threads, and a few alumni follow-ups.
        """
        stats = {
            "connections_added": 0,
            "peer_chats_seeded": 0,
            "student_threads_added": 0,
            "followups_added": 0,
        }
        data = self.load()
        n = max(0, alumni_count)

        def add_conn(a: str, b: str) -> None:
            if a == b:
                return
            k = pair_key(a, b)
            if k not in data["connections"]:
                data["connections"].append(k)
                stats["connections_added"] += 1

        # Hub "0": connect to many peers (Discover / Chats demo)
        for j in range(1, min(16, n)):
            add_conn("0", str(j))

        # Second persona "1": smaller ring
        if n > 3:
            for j in (2, 3, 4, 5, 6, 7, 8):
                if j < n:
                    add_conn("1", str(j))

        # Alumni–alumni chat transcripts (only if thread empty)
        peer_scripts: list[tuple[str, str, list[tuple[str, str]]]] = [
            (
                "0",
                "1",
                [
                    (
                        "1",
                        "Hey — saw you're active on ConXn. Would love to swap notes on ML hiring this season.",
                    ),
                    (
                        "0",
                        "Hi! Happy to compare notes. Are you free for a quick call this week?",
                    ),
                    ("1", "Tuesday evening works on my side."),
                    ("0", "Great — I'll send a calendar placeholder."),
                ],
            ),
            (
                "0",
                "2",
                [
                    (
                        "2",
                        "Quick question: does your team still take interns via the campus program?",
                    ),
                    (
                        "0",
                        "We do — postings should be on the portal next week. I can ping you when live.",
                    ),
                ],
            ),
            (
                "0",
                "3",
                [
                    (
                        "3",
                        "Thanks for accepting my connection — I'm exploring product roles in fintech.",
                    ),
                    (
                        "0",
                        "Welcome! Happy to share how we structure PM interviews if useful.",
                    ),
                    ("3", "That would be amazing."),
                ],
            ),
            (
                "0",
                "4",
                [
                    (
                        "4",
                        "Are you joining the alumni meetup in Bangalore next month?",
                    ),
                    (
                        "0",
                        "Planning to — let's grab coffee there if you're in town.",
                    ),
                ],
            ),
            (
                "1",
                "2",
                [
                    ("2", "Hi — could you intro me to someone on the payments team?"),
                    (
                        "1",
                        "Yes — I'll intro over email. Give me a one-liner on what you're solving.",
                    ),
                ],
            ),
        ]

        for a, b, lines in peer_scripts:
            if int(a) >= n or int(b) >= n:
                continue
            key = pair_key(a, b)
            if key not in data["messages"]:
                data["messages"][key] = []
            if len(data["messages"][key]) == 0:
                for fid, body in lines:
                    self._push_msg(data, key, fid, body)
                stats["peer_chats_seeded"] += 1

        hub = "0"
        if n > 0:
            for sk, name, initial in DEMO_STUDENT_THREADS:
                if self._ensure_student_in_data(data, hub, sk, name, initial):
                    stats["student_threads_added"] += 1

        # Lighter student inbox for alumni row "1" (if present)
        if n > 1:
            for sk, name, initial in DEMO_STUDENT_THREADS[:4]:
                if self._ensure_student_in_data(data, "1", sk, name, initial):
                    stats["student_threads_added"] += 1

        # Sample alumni follow-ups (so some threads look active)
        followups: list[tuple[str, str, str]] = [
            (
                "student:req-1",
                "0",
                "Thanks for reaching out, Aditi — happy to do 15 minutes. I'll share a few time options in our next message.",
            ),
            (
                "student:req-2",
                "0",
                "Great question — we weight product impact slightly higher in promo cycles, but research still matters for ML roles. Happy to elaborate on a call.",
            ),
        ]
        for sk, from_alumni, body in followups:
            key = pair_key(hub, sk)
            msgs = data["messages"].get(key, [])
            if len(msgs) == 1 and msgs[0].get("from", "").startswith("student:"):
                self._push_msg(data, key, from_alumni, body)
                stats["followups_added"] += 1

        # Demo: some requests show as already "seen" in mentor hub (opened)
        data.setdefault("mentor_seen", {})
        seen_demo_keys = [
            "student:req-3",
            "student:req-4",
            "student:req-6",
            "student:req-8",
            "student:req-10",
            "student:req-12",
            "student:req-14",
        ]
        for sk in seen_demo_keys:
            k = pair_key(hub, sk)
            if data["messages"].get(k):
                data["mentor_seen"][k] = True

        self.save(data)
        return stats

    def set_mentor_seen(self, alumni_id: str, peer_id: str, seen: bool = True) -> None:
        data = self.load()
        key = pair_key(alumni_id, peer_id)
        data.setdefault("mentor_seen", {})
        data["mentor_seen"][key] = bool(seen)
        self.save(data)

    def connect(self, viewer: str, peer: str) -> bool:
        v, p = str(viewer).strip(), str(peer).strip()
        if not v or not p or v == p:
            return False
        k = pair_key(v, p)
        data = self.load()
        if k in data["connections"]:
            return False
        data["connections"].append(k)
        self.save(data)
        return True

    def list_connection_peer_ids(self, viewer: str) -> list[str]:
        v = str(viewer).strip()
        out: list[str] = []
        data = self.load()
        for k in data["connections"]:
            parts = k.split("|", 1)
            if len(parts) != 2:
                continue
            a, b = parts[0], parts[1]
            if a == v:
                out.append(b)
            elif b == v:
                out.append(a)
        return out

    def _messages_for(self, data: dict, viewer: str, peer: str) -> list[dict]:
        key = pair_key(viewer, peer)
        return list(data["messages"].get(key, []))

    def get_thread_messages(self, viewer: str, peer: str) -> tuple[str, list[dict]]:
        data = self.load()
        key = pair_key(viewer, peer)
        return key, self._messages_for(data, viewer, peer)

    def append_message(
        self,
        viewer: str,
        peer: str,
        from_id: str,
        body: str,
        peer_label: str | None = None,
    ) -> tuple[str, list[dict]]:
        data = self.load()
        key = pair_key(viewer, peer)
        msg = {
            "id": str(uuid.uuid4()),
            "from": str(from_id).strip(),
            "body": (body or "").strip(),
            "at": _utc_iso(),
        }
        if key not in data["messages"]:
            data["messages"][key] = []
        data["messages"][key].append(msg)
        if peer_label and peer.startswith("student:"):
            data["thread_labels"][key] = {
                "virtual_peer": peer,
                "label": peer_label,
            }
        if peer.startswith("student:") and str(from_id) == str(viewer).strip():
            data.setdefault("mentor_seen", {})
            data["mentor_seen"][key] = True
        self.save(data)
        return key, data["messages"][key]

    def ensure_student_thread(
        self,
        alumni_id: str,
        student_key: str,
        student_name: str,
        initial_message: str,
    ) -> tuple[str, list[dict]]:
        """Idempotent: create thread with one inbound student message if empty."""
        data = self.load()
        key = pair_key(alumni_id, student_key)
        existing = data["messages"].get(key, [])
        if existing:
            return key, existing
        if key not in data["messages"]:
            data["messages"][key] = []
        data["messages"][key].append(
            {
                "id": str(uuid.uuid4()),
                "from": student_key,
                "body": (initial_message or "").strip(),
                "at": _utc_iso(),
            }
        )
        data["thread_labels"][key] = {
            "virtual_peer": student_key,
            "label": student_name,
        }
        self.save(data)
        return key, data["messages"][key]

    def peer_display_name(
        self,
        data: dict,
        thread_key: str,
        viewer: str,
        peer: str,
        alumni_by_id: dict[str, dict],
    ) -> str:
        if peer in alumni_by_id:
            return str(alumni_by_id[peer].get("name") or peer)
        meta = data["thread_labels"].get(thread_key) or {}
        if meta.get("virtual_peer") == peer:
            return str(meta.get("label") or peer)
        return peer

    @staticmethod
    def _first_message_from_peer(msgs: list, peer_id: str) -> str:
        """Original ask / first inbound from the other participant (not viewer)."""
        if not msgs:
            return ""
        pid = str(peer_id)
        for m in msgs:
            if str(m.get("from", "")) == pid:
                return (m.get("body") or "").strip()
        for m in msgs:
            fid = str(m.get("from", ""))
            if fid.startswith("student:") and pid.startswith("student:"):
                return (m.get("body") or "").strip()
        return (msgs[0].get("body") or "").strip()

    def list_thread_summaries(
        self, viewer: str, alumni_by_id: dict[str, dict]
    ) -> list[dict]:
        v = str(viewer).strip()
        data = self.load()
        summaries: list[dict] = []
        for key, msgs in data["messages"].items():
            if "|" not in key:
                continue
            a, b = key.split("|", 1)
            if a != v and b != v:
                continue
            peer = b if a == v else a
            last = msgs[-1] if msgs else None
            request_body = self._first_message_from_peer(msgs, peer)
            mentor_seen = bool(data.get("mentor_seen", {}).get(key))
            summaries.append(
                {
                    "thread_key": key,
                    "peer_id": peer,
                    "peer_name": self.peer_display_name(
                        data, key, v, peer, alumni_by_id
                    ),
                    "request_body": request_body,
                    "last_body": (last or {}).get("body", ""),
                    "last_at": (last or {}).get("at", ""),
                    "last_from": (last or {}).get("from", ""),
                    "message_count": len(msgs),
                    "mentor_seen": mentor_seen,
                }
            )
        summaries.sort(key=lambda x: x.get("last_at") or "", reverse=True)
        return summaries

    def get_thread_detail(
        self, viewer: str, peer: str, alumni_by_id: dict[str, dict]
    ) -> dict:
        data = self.load()
        key = pair_key(viewer, peer)
        msgs = list(data["messages"].get(key, []))
        name = self.peer_display_name(data, key, viewer, peer, alumni_by_id)
        return {
            "thread_key": key,
            "peer_id": peer,
            "peer_name": name,
            "messages": msgs,
        }

    def seed_mentor_inbox_demo(self, alumni_id: str) -> int:
        """Create demo student request threads if missing (idempotent)."""
        data = self.load()
        added = 0
        for sk, name, initial in DEMO_STUDENT_THREADS:
            if self._ensure_student_in_data(data, alumni_id, sk, name, initial):
                added += 1
        if added:
            self.save(data)
        return added
