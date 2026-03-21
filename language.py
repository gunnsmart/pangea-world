"""
language.py — Proto-language System
═════════════════════════════════════════════════════════════
ภาษาเกิดจากความต้องการ ไม่มีใครสอน — สร้างเองจากศูนย์

กลไก:
  1. Drive สูง → ส่ง signal ดิบ (grunt/cry)
  2. Signal ซ้ำในบริบทเดิม → กลายเป็น proto-word
  3. Partner เรียนรู้คำจากบริบทที่เห็นร่วมกัน
  4. คำสะสม → ประโยคง่าย
  5. ลูกรับคำจากพ่อแม่ → ภาษาถ่ายทอดข้ามรุ่น
"""

import random
import math
from dataclasses import dataclass, field

# ── สัญลักษณ์ดิบ (ก่อนมีคำ) ────────────────────────────────────────────
RAW_SIGNALS = {
    "hunger":  ["ugh", "mm!", "grrr"],
    "fear":    ["!!!", "aaa!", "RUN!"],
    "cold":    ["brr", "shiver", "cold!"],
    "tired":   ["zzz", "....", "sleep"],
    "lonely":  ["?", "hello?", "here!"],
    "fire":    ["hot!", "bright!", "ooo!"],
    "food":    ["mmm!", "good!", "eat!"],
    "danger":  ["NO!", "away!", "bad!"],
    "mate":    ["you", "here", "stay"],
    "child":   ["small", "weak", "help"],
}

# ── โครงสร้างคำ ─────────────────────────────────────────────────────────
@dataclass
class Word:
    """คำ 1 คำในภาษา"""
    form:       str          # เสียง/สัญลักษณ์ เช่น "taka", "mm!"
    meaning:    str          # ความหมาย เช่น "fire", "food"
    strength:   float = 1.0  # ความแข็งแกร่ง — ยิ่งใช้บ่อยยิ่งแข็ง
    invented_by:str   = ""   # Adam หรือ Eve
    invented_day:int  = 0
    uses:       int   = 0

    def use(self):
        self.uses     += 1
        self.strength  = min(10.0, self.strength + 0.1)


@dataclass
class Utterance:
    """การพูด 1 ครั้ง"""
    speaker:   str
    words:     list[str]     # list ของ word forms
    meaning:   str           # ความหมายโดยรวม
    day:       int
    context:   str           # บริบทขณะพูด
    heard_by:  str = ""      # ใครได้ยิน


class ProtoLanguage:
    """
    ภาษาดั้งเดิมของ Adam/Eve
    เริ่มจาก signal ดิบ → สะสมเป็นคำ → เป็นประโยค
    """

    def __init__(self, speaker_name: str):
        self.name      = speaker_name
        self.lexicon   : dict[str, Word] = {}   # form → Word
        self.utterances: list[Utterance] = []
        self.day       = 0

        # สถิติ
        self.total_words_invented = 0
        self.total_utterances     = 0

    # ════════════════════════════════════════════════════════
    # สร้างคำใหม่จากบริบท
    # ════════════════════════════════════════════════════════
    def _coin_word(self, meaning: str, day: int) -> str:
        """
        สร้างเสียงสุ่มที่ฟังดูเหมือนภาษาดึกดำบรรพ์
        อิง phonological universals — CV syllables
        """
        consonants = ["m","n","t","k","p","b","d","g","r","l","w","h"]
        vowels     = ["a","i","u","e","o","aa","ii","uu"]

        # สัญลักษณ์ดิบตอนแรก (day < 30)
        if day < 30 and meaning in RAW_SIGNALS:
            return random.choice(RAW_SIGNALS[meaning])

        # Proto-word (1-2 syllables)
        syllables = random.randint(1, 2)
        word = ""
        for _ in range(syllables):
            word += random.choice(consonants) + random.choice(vowels)
        return word

    def invent_word(self, meaning: str, day: int) -> Word:
        """สร้างคำใหม่สำหรับ meaning นี้"""
        form = self._coin_word(meaning, day)
        # ตรวจไม่ให้ซ้ำ
        while form in self.lexicon:
            form = self._coin_word(meaning, day)

        word = Word(form=form, meaning=meaning,
                    invented_by=self.name, invented_day=day)
        self.lexicon[form] = word
        self.total_words_invented += 1
        return word

    def find_word(self, meaning: str) -> Word | None:
        """หาคำที่มีความหมายนี้"""
        for w in self.lexicon.values():
            if w.meaning == meaning:
                return w
        return None

    def learn_word(self, word: Word):
        """เรียนรู้คำจากคนอื่น"""
        if word.form not in self.lexicon:
            learned = Word(
                form=word.form, meaning=word.meaning,
                strength=word.strength * 0.7,   # เรียนจากคนอื่นแข็งแกร่งน้อยกว่า
                invented_by=word.invented_by,
                invented_day=word.invented_day
            )
            self.lexicon[word.form] = learned

    # ════════════════════════════════════════════════════════
    # พูด — สร้าง utterance จาก drive/context
    # ════════════════════════════════════════════════════════
    def speak(self, intent: str, context: str, day: int,
              partner_dist: int = 99) -> Utterance | None:
        """
        พูดตาม intent — ถ้าไม่มีคำ สร้างคำใหม่
        intent: ความต้องการ เช่น "hunger", "danger", "fire"
        คืน Utterance หรือ None ถ้าไม่มีอะไรจะพูด
        """
        self.day = day

        # ต้องอยู่ใกล้พอถึงจะพูด
        if partner_dist > 15:
            return None

        # หาหรือสร้างคำ
        word = self.find_word(intent)
        if not word:
            # สร้างคำใหม่ด้วยโอกาสสัมพันธ์กับ drive intensity
            if random.random() < 0.3:
                word = self.invent_word(intent, day)
            else:
                # ใช้ raw signal ก่อน
                signals = RAW_SIGNALS.get(intent, ["..."])
                raw     = random.choice(signals)
                word    = Word(form=raw, meaning=intent,
                               invented_by=self.name, invented_day=day)

        word.use()

        # สร้าง utterance (อาจมีหลายคำ)
        words = [word.form]

        # เพิ่มคำที่ 2 ถ้ามี lexicon พอ (ประโยคง่าย)
        if len(self.lexicon) >= 3 and random.random() < 0.4:
            secondary_intents = {
                "hunger":  ["food", "fire"],
                "danger":  ["fear", "flee"],
                "fire":    ["warmth", "food"],
                "mate":    ["lonely", "you"],
            }
            secondary = secondary_intents.get(intent, [])
            for sec_intent in secondary:
                sec_word = self.find_word(sec_intent)
                if sec_word:
                    words.append(sec_word.form)
                    break

        utterance = Utterance(
            speaker=self.name,
            words=words,
            meaning=intent,
            day=day,
            context=context,
        )
        self.utterances.append(utterance)
        if len(self.utterances) > 200:
            self.utterances.pop(0)
        self.total_utterances += 1
        return utterance

    # ════════════════════════════════════════════════════════
    # ได้ยิน — เรียนรู้จาก utterance ของคนอื่น
    # ════════════════════════════════════════════════════════
    def hear(self, utterance: Utterance, context: str) -> list[str]:
        """
        ได้ยิน utterance — เรียนรู้คำ context matching
        คืน list ของคำที่เพิ่งเรียนรู้
        """
        learned = []
        for form in utterance.words:
            if form in self.lexicon:
                # รู้จักแล้ว — เสริมความแข็งแกร่ง
                self.lexicon[form].use()
            else:
                # ไม่รู้จัก — เรียนรู้จาก context
                # ถ้า context ตรงกับ meaning → เรียนรู้ได้
                if random.random() < self._context_match_prob(utterance.meaning, context):
                    new_word = Word(
                        form=form,
                        meaning=utterance.meaning,
                        strength=0.5,
                        invented_by=utterance.speaker,
                        invented_day=utterance.day,
                    )
                    self.lexicon[form] = new_word
                    learned.append(form)
        return learned

    def _context_match_prob(self, meaning: str, context: str) -> float:
        """โอกาสเรียนรู้คำจาก context"""
        context_map = {
            "hunger": ["food", "eat", "hungry"],
            "danger": ["predator", "fear", "flee"],
            "fire":   ["fire", "warm", "cook"],
            "mate":   ["partner", "close", "together"],
        }
        keywords = context_map.get(meaning, [])
        if any(k in context.lower() for k in keywords):
            return 0.7   # context ตรง → เรียนรู้ง่าย
        return 0.2        # ไม่ตรง → เรียนรู้ยาก

    # ════════════════════════════════════════════════════════
    # สอนลูก
    # ════════════════════════════════════════════════════════
    def teach_child(self, child_lang: "ProtoLanguage"):
        """ถ่ายทอดคำศัพท์ให้ลูก"""
        # ถ่ายเฉพาะคำที่แข็งแกร่งพอ
        for word in self.lexicon.values():
            if word.strength >= 2.0:
                child_lang.learn_word(word)

    # ════════════════════════════════════════════════════════
    # สรุป
    # ════════════════════════════════════════════════════════
    @property
    def vocab_size(self) -> int:
        return len(self.lexicon)

    @property
    def recent_speech(self) -> list[str]:
        """การพูด 5 ครั้งล่าสุด"""
        recent = sorted(self.utterances, key=lambda u: u.day, reverse=True)[:5]
        return [f"Day {u.day}: [{' '.join(u.words)}] ({u.meaning})"
                for u in recent]

    @property
    def shared_words_with(self) -> int:
        """นับคำที่มีในทั้งสองคน — ต้องส่งจากภายนอก"""
        return 0   # คำนวณใน server.py

    @property
    def summary(self) -> dict:
        top_words = sorted(self.lexicon.values(),
                           key=lambda w: w.uses, reverse=True)[:5]
        return {
            "vocab_size":      self.vocab_size,
            "total_invented":  self.total_words_invented,
            "total_utterances":self.total_utterances,
            "top_words": [
                {"form": w.form, "meaning": w.meaning, "uses": w.uses}
                for w in top_words
            ],
            "recent_speech": self.recent_speech,
        }
