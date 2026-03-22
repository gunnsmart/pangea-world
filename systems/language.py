# systems/language.py
import random
from dataclasses import dataclass
from typing import List, Dict, Optional

RAW_SIGNALS = {
    "hunger": ["ugh","mm!","grrr"],
    "fear": ["!!!","aaa!","RUN!"],
    "cold": ["brr","shiver","cold!"],
    "tired": ["zzz","....","sleep"],
    "lonely": ["?","hello?","here!"],
    "fire": ["hot!","bright!","ooo!"],
    "food": ["mmm!","good!","eat!"],
    "danger": ["NO!","away!","bad!"],
    "mate": ["you","here","stay"],
    "child": ["small","weak","help"],
}

@dataclass
class Word:
    form: str
    meaning: str
    strength: float = 1.0
    invented_by: str = ""
    invented_day: int = 0
    uses: int = 0

    def use(self):
        self.uses += 1
        self.strength = min(10.0, self.strength + 0.1)

@dataclass
class Utterance:
    speaker: str
    words: List[str]
    meaning: str
    day: int
    context: str
    heard_by: str = ""

class ProtoLanguage:
    def __init__(self, speaker_name: str):
        self.name = speaker_name
        self.lexicon: Dict[str, Word] = {}
        self.utterances: List[Utterance] = []
        self.day = 0
        self.total_words_invented = 0
        self.total_utterances = 0
        self.last_utterance_str = ""

    def _coin_word(self, meaning: str, day: int) -> str:
        consonants = ["m","n","t","k","p","b","d","g","r","l","w","h"]
        vowels = ["a","i","u","e","o","aa","ii","uu"]
        if day < 30 and meaning in RAW_SIGNALS:
            return random.choice(RAW_SIGNALS[meaning])
        syllables = random.randint(1,2)
        word = ""
        for _ in range(syllables):
            word += random.choice(consonants) + random.choice(vowels)
        return word

    def invent_word(self, meaning: str, day: int) -> Word:
        form = self._coin_word(meaning, day)
        while form in self.lexicon:
            form = self._coin_word(meaning, day)
        word = Word(form=form, meaning=meaning, invented_by=self.name, invented_day=day)
        self.lexicon[form] = word
        self.total_words_invented += 1
        return word

    def find_word(self, meaning: str) -> Optional[Word]:
        for w in self.lexicon.values():
            if w.meaning == meaning:
                return w
        return None

    def learn_word(self, word: Word):
        if word.form not in self.lexicon:
            learned = Word(form=word.form, meaning=word.meaning,
                           strength=word.strength*0.7,
                           invented_by=word.invented_by,
                           invented_day=word.invented_day)
            self.lexicon[word.form] = learned

    def speak(self, intent: str, context: str, day: int, partner_dist: int = 99) -> Optional[Utterance]:
        self.day = day
        if partner_dist > 15:
            return None
        word = self.find_word(intent)
        if not word:
            if random.random() < 0.3:
                word = self.invent_word(intent, day)
            else:
                signals = RAW_SIGNALS.get(intent, ["..."])
                raw = random.choice(signals)
                word = Word(form=raw, meaning=intent, invented_by=self.name, invented_day=day)
        word.use()
        words = [word.form]
        if len(self.lexicon) >= 3 and random.random() < 0.4:
            secondary_intents = {"hunger":["food","fire"], "danger":["fear","flee"],
                                 "fire":["warmth","food"], "mate":["lonely","you"]}
            secondary = secondary_intents.get(intent, [])
            for sec_intent in secondary:
                sec_word = self.find_word(sec_intent)
                if sec_word:
                    words.append(sec_word.form)
                    break
        utterance = Utterance(self.name, words, intent, day, context)
        self.utterances.append(utterance)
        if len(self.utterances) > 200:
            self.utterances.pop(0)
        self.total_utterances += 1
        self.last_utterance_str = " ".join(words)
        return utterance

    def hear(self, utterance: Utterance, context: str) -> List[str]:
        learned = []
        for form in utterance.words:
            if form in self.lexicon:
                self.lexicon[form].use()
            else:
                if random.random() < self._context_match_prob(utterance.meaning, context):
                    new_word = Word(form=form, meaning=utterance.meaning, strength=0.5,
                                    invented_by=utterance.speaker, invented_day=utterance.day)
                    self.lexicon[form] = new_word
                    learned.append(form)
        return learned

    def _context_match_prob(self, meaning: str, context: str) -> float:
        context_map = {
            "hunger": ["food","eat","hungry"],
            "danger": ["predator","fear","flee"],
            "fire": ["fire","warm","cook"],
            "mate": ["partner","close","together"],
        }
        keywords = context_map.get(meaning, [])
        if any(k in context.lower() for k in keywords):
            return 0.7
        return 0.2

    def teach_child(self, child_lang: "ProtoLanguage"):
        for word in self.lexicon.values():
            if word.strength >= 2.0:
                child_lang.learn_word(word)

    @property
    def vocab_size(self) -> int:
        return len(self.lexicon)

    @property
    def recent_speech(self) -> List[str]:
        recent = sorted(self.utterances, key=lambda u: u.day, reverse=True)[:5]
        return [f"Day {u.day}: [{' '.join(u.words)}] ({u.meaning})" for u in recent]

    @property
    def summary(self) -> dict:
        top_words = sorted(self.lexicon.values(), key=lambda w: w.uses, reverse=True)[:5]
        return {
            "vocab_size": self.vocab_size,
            "total_invented": self.total_words_invented,
            "total_utterances": self.total_utterances,
            "top_words": [{"form": w.form, "meaning": w.meaning, "uses": w.uses} for w in top_words],
            "recent_speech": self.recent_speech,
        }