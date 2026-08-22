import { HumanState, WorldSnapshot, AnimalAction } from '../sim/types';
import { KNOWLEDGE_GRAPH } from '../data/knowledgeGraph';
import { LORE_ENTRIES } from '../data/lore';

export async function generateHumanThought(human: HumanState, snapshot: WorldSnapshot): Promise<string | null> {
  const isEve = human.name === 'Eve';
  const character = isEve ? 'Eve' : 'Adam';
  
  // 1. Handle Dreaming
  if (human.action === AnimalAction.SLEEP) {
    const dreamArchetypes = [
      "งูสีทองเลื้อยผ่านสายน้ำแห่งกาลเวลา",
      "ดวงดาราเต้นระบำรอบกองไฟที่ไม่มีวันดับ",
      "เสียงกระซิบจากบรรพบุรุษในสายลมหนาว",
      "ต้นไม้ใหญ่ที่แผ่กิ่งก้านครอบคลุมทั้งโลก",
      "การล่าที่ไม่มีวันสิ้นสุดในทุ่งหญ้าสีเงิน",
      "เงาของหมีใหญ่ที่ปกป้องถ้ำผาแดง",
      "เสียงหัวใจของแผ่นดินที่เต้นเป็นจังหวะ"
    ];
    const seed = human.age * 1000 + snapshot.day * 24 + snapshot.time;
    const relevantLore = LORE_ENTRIES.filter(e => e.character === character);
    let dreamContent = "";
    if (relevantLore.length > 0) {
      const loreIdx = Math.floor(seed) % relevantLore.length;
      const randomLore = relevantLore[loreIdx];
      const contentIdx = Math.floor(seed / 10) % randomLore.content.length;
      dreamContent = `... ${randomLore.content[contentIdx]}`;
    }
    const archetypeIdx = Math.floor(seed / 100) % dreamArchetypes.length;
    return `[ฝัน] ${dreamArchetypes[archetypeIdx]}${dreamContent}`;
  }

  // 2. Handle High Needs/Emotions
  if (human.health < 30) return isEve ? "ร่างกายของข้ากำลังแตกสลาย... ข้าต้องรักษาชีวิตนี้ไว้เพื่อเผ่าพันธุ์" : "ข้าจะไม่ยอมให้ความตายพรากข้าไป... หน้าที่ของข้ายังไม่สิ้นสุด";
  if (human.hunger > 80) return isEve ? "ความหิวโหยกัดกินจิตวิญญาณ... พระแม่ธรณีโปรดเมตตา" : "ท้องของข้าคำรามด้วยความโกรธ... ข้าต้องหาเนื้อมาดับไฟนี้";
  if (human.thirst > 80) return isEve ? "สายน้ำแห่งชีวิตเหือดแห้ง... ข้าต้องหาลำธาร" : "คอของข้าแห้งผากเหมือนทะเลทราย... ข้าต้องการน้ำ";
  if (human.emotions.awe > 70) return "ความยิ่งใหญ่ของธรรมชาตินี้ช่างน่าเกรงขาม... ข้าเป็นเพียงธุลีในจักรวาลอันกว้างใหญ่";
  if (human.isPregnant && human.gestationProgress > 50) return "ชีวิตใหม่ในตัวข้ากำลังเติบโต... ข้าสัมผัสได้ถึงอนาคตที่กำลังจะมาถึง";

  // 3. Contextual Knowledge/Lore
  const relevantNodes = KNOWLEDGE_GRAPH.nodes.filter(n => {
    const isOwner = n.character === character || n.character === 'Both';
    if (!isOwner) return false;

    const categoryMap: Record<string, AnimalAction[]> = {
      'ความรู้เรื่องร่างกาย': [AnimalAction.SOCIALIZE, AnimalAction.EAT, AnimalAction.DRINK, AnimalAction.SLEEP],
      'ศาสตร์แห่งพฤกษา': [AnimalAction.GATHER, AnimalAction.EAT],
      'การเกษตร': [AnimalAction.GATHER, AnimalAction.BUILD],
      'การล่า': [AnimalAction.HUNT, AnimalAction.WANDER],
      'เครื่องมือ': [AnimalAction.CRAFT, AnimalAction.BUILD, AnimalAction.GATHER],
      'วิศวกรรม': [AnimalAction.BUILD, AnimalAction.CRAFT, AnimalAction.HUNT],
      'งานฝีมือ': [AnimalAction.CRAFT],
      'การจัดการครัวเรือน': [AnimalAction.COOK, AnimalAction.SLEEP],
      'การนำทาง': [AnimalAction.WANDER],
      'จิตวิญญาณ': [AnimalAction.SOCIALIZE, AnimalAction.SLEEP],
      'สัญชาตญาณ': [AnimalAction.WANDER, AnimalAction.HUNT, AnimalAction.FLEE],
      'อารมณ์': [AnimalAction.SOCIALIZE, AnimalAction.IDLE]
    };

    return categoryMap[n.category]?.includes(human.action);
  });

  const thoughtSeed = human.age * 2000 + snapshot.day * 48 + snapshot.time * 2;
  if (relevantNodes.length > 0 && (Math.floor(thoughtSeed) % 10 < 6)) {
    const nodeIdx = Math.floor(thoughtSeed) % relevantNodes.length;
    const node = relevantNodes[nodeIdx];
    const templates = [
      `ข้านึกถึง${node.label}: ${node.description}`,
      `${node.label}ช่วยให้ข้าเข้าใจว่า ${node.description}`,
      `ความรู้เรื่อง${node.label}บอกข้าว่า ${node.description}`,
      `ข้าจะใช้${node.label}ในการจัดการสิ่งนี้: ${node.description}`
    ];
    const templateIdx = Math.floor(thoughtSeed / 5) % templates.length;
    return templates[templateIdx];
  }

  // 4. Action-based Fallbacks
  switch(human.action) {
    case AnimalAction.WANDER: return isEve ? "ผืนดินนำทางย่างก้าวของข้า... ข้าได้ยินเสียงกระซิบของป่า" : "ข้าต้องออกสำรวจพื้นที่... เพื่อความปลอดภัยของเผ่าพันธุ์";
    case AnimalAction.GATHER: return isEve ? "ขอบคุณพระแม่ธรณีสำหรับของขวัญนี้... ข้าจะเก็บเกี่ยวอย่างระมัดระวัง" : "เสบียงสำหรับการอยู่รอด... ข้าต้องสะสมไว้ให้มากพอ";
    case AnimalAction.BUILD: return isEve ? "ที่พักพิงที่ปลอดภัย... เพื่อการเติบโตของชีวิตใหม่" : "ข้าจะสร้างรากฐานที่มั่นคง... ปกป้องเราจากพายุ";
    case AnimalAction.CRAFT: return isEve ? "มือของข้าถักทอชีวิตลงในสิ่งนี้... ความประณีตคือพลัง" : "เครื่องมือเพื่อพิชิตพงไพร... ความแหลมคมคืออำนาจ";
    case AnimalAction.COOK: return isEve ? "ไฟเปลี่ยนของขวัญจากดินให้เป็นพลังงาน... กลิ่นหอมแห่งการเยียวยา" : "เชื้อเพลิงสำหรับร่างกาย... เพื่อการทำงานหนักในวันพรุ่งนี้";
    case AnimalAction.EAT: return isEve ? "การหล่อเลี้ยงทั้งกายและจิตวิญญาณ... ข้าขอบคุณธรรมชาติ" : "กินเพื่อรักษาพละกำลัง... ร่างกายข้าต้องการเชื้อเพลิง";
    case AnimalAction.DRINK: return isEve ? "สายเลือดแห่งลำธารหล่อเลี้ยงชีวิตข้า... เย็นฉ่ำถึงหัวใจ" : "ดับความกระหาย... น้ำคือความแข็งแกร่ง";
    case AnimalAction.SOCIALIZE: return isEve ? "จิตวิญญาณของเราหลอมรวมกัน... ข้าสัมผัสได้ถึงความผูกพัน" : "เราแข็งแกร่งขึ้นเมื่ออยู่ร่วมกัน... การปกป้องคือหน้าที่";
    case AnimalAction.MATE: return isEve ? "วัฏจักรแห่งชีวิตกำลังเริ่มต้น... ข้าคือผู้ให้กำเนิด" : "ข้าจะสืบทอดสายเลือดนี้... เพื่ออนาคตที่ไม่มีวันสิ้นสุด";
    default: return isEve ? "ข้าฟังเสียงกระซิบของสายลม... และความเงียบของป่า" : "ข้าต้องเอาชีวิตรอด... ในโลกที่เต็มไปด้วยความท้าทาย";
  }
}
