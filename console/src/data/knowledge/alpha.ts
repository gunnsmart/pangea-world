import { CharacterProfile } from './schema';

export const ALPHA_PROFILE: CharacterProfile = {
  name: 'Adam',
  age: 25,
  role: 'Hunter/Protector',
  
  skills: {
    hunting: 0.9,
    tracking: 0.9,
    combat: 0.8,
    weaponMaking: 0.7,
    navigation: 0.8,
    teaching: 0.6,
    plantKnowledge: 0.3,
    healing: 0.2,
  },
  
  personality: {
    courage: 0.8,
    patience: 0.7,
    emotionalExpression: 0.3,
    discipline: 0.8,
    empathy: 0.5,
    intuition: 0.6,
  },
  
  knowledge: [
    // หมวดที่ 1: ศาสตร์แห่งการล่าและร่องรอย (Hunting & Tracking Lore)
    {
      domain: 'hunting',
      category: 'tracking',
      title: 'การอ่านรอยเท้า (Reading the Footprint)',
      content: `รอยกีบที่จมลึกและกว้างบ่งบอกถึงสัตว์ตัวผู้ขนาดใหญ่เต็มวัย ส่วนรอยที่ตื้นและแคบคือตัวเมียหรือลูกอ่อน 
                หากปลายกีบจิกลึกกว่าส้น แสดงว่าสัตว์กำลังวิ่ง หากระยะห่างสม่ำเสมอ แสดงว่ามันกำลังเดินเล็มหญ้าอย่างไม่ระวัง 
                รอยเท้าบนดินนุ่มที่ขอบยังคมกริบและมีน้ำซึมอยู่ แสดงว่าเพิ่งผ่านไปไม่นาน หากขอบรอยเริ่มแห้งและร่วน แสดงว่าผ่านไปแล้วอย่างน้อยครึ่งวัน`,
      tags: ['tracking', 'footprints', 'animals', 'identification'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['animal-behavior', 'hunting-strategy']
    },
    {
      domain: 'hunting',
      category: 'tracking',
      title: 'การสะกดรอยด้วยประสาทสัมผัส (Sensory Tracking)',
      content: `ดมกลิ่นมูลสัตว์เพื่อรู้ว่ามันกินอะไร หากกลิ่นมูลแรงและเหม็นเปรี้ยว แสดงว่ามันอยู่ใกล้มาก 
                แยกแยะเสียงกิ่งไม้หักเพราะถูกเหยียบกับเสียงลมพัด มองหาความเคลื่อนไหวในแนวราบ 
                การเห็นหางหรือใบหูกระดุกในพุ่มไม้คือสิ่งแรกที่เห็นก่อนตัวสัตว์`,
      tags: ['tracking', 'senses', 'smell', 'sound'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['animal-behavior']
    },
    {
      domain: 'hunting',
      category: 'behavior',
      title: 'ภาษากายของเหยื่อ (Body Language of Prey)',
      content: `เมื่อกวางเงยหน้าขึ้นและใบหูหมุนไปรอบทิศทาง มันกำลังฟังเสียงผิดปกติ 
                เมื่อวัวป่าก้มหัวต่ำและขูดพื้นดินด้วยกีบหน้า มันกำลังเตือนให้ถอยห่างก่อนจะพุ่งเข้าใส่ 
                หมูป่าที่ขนแผงคอตั้งชันและส่งเสียงขู่คือพร้อมสู้ตาย`,
      tags: ['behavior', 'prey', 'danger', 'signs'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 2: วิศวกรรมอาวุธและเครื่องมือ (Weapon & Tool Engineering)
    {
      domain: 'engineering',
      category: 'crafting',
      title: 'การทำหอกและฉมวก (Spear Making)',
      content: `เลือกไม้เนื้อแข็งเช่นโอ๊คหรือฮอลลี่ที่มีเส้นผ่านศูนย์กลางพอดีมือ เผาปลายหอกให้เกรียมดำแล้วขูดด้วยหินคมจะทำให้ปลายแข็งกว่าการเหลาอย่างเดียว 
                การฝังหัวหินต้องบากร่อง ใส่หัวหิน แล้วพันด้วยเอ็นกวางเปียก เมื่อเอ็นแห้งจะหดตัวรัดแน่นยิ่งกว่ากาว`,
      tags: ['weapons', 'crafting', 'spear', 'tools'],
      confidence: 0.9,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['stone-knapping']
    },
    {
      domain: 'engineering',
      category: 'crafting',
      title: 'การขึ้นรูปหิน (Stone Knapping)',
      content: `หินเชิร์ต หินออบซิเดียน และหินฟลินท์ แตกเป็นสะเก็ดคมกริบได้ดีที่สุด 
                ใช้หินทุบหรือเขากวางกดลงบนขอบหินในมุมที่ถูกต้องเพื่อให้สะเก็ดหินหลุดออกมาเป็นแผ่นบางยาว 
                ต้องหันหน้าหนีเวลากะเทาะเพื่อป้องกันเศษหินบาดตา`,
      tags: ['stone', 'knapping', 'tools', 'safety'],
      confidence: 0.8,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spear-making']
    },

    // หมวดที่ 3: การนำทางและดาราศาสตร์ (Navigation & Astronomy)
    {
      domain: 'navigation',
      category: 'astronomy',
      title: 'การอ่านดวงดาว (Celestial Navigation)',
      content: `ดาวเหนือ (The Still Star) อยู่ทางทิศเหนือเสมอ ใช้หาทิศทางกลับถ้ำในยามค่ำคืน 
                กลุ่มดาวนายพรานปรากฏทิศตะวันออกในยามหัวค่ำคือสัญญาณเริ่มต้นฤดูหนาว 
                กลุ่มดาวลูกไก่ลับขอบฟ้าทิศตะวันตกในยามเช้ามืดคือช่วงที่น้ำในแม่น้ำอุ่นพอจะจับปลาได้`,
      tags: ['stars', 'navigation', 'seasons', 'night'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['natural-compass']
    },
    {
      domain: 'navigation',
      category: 'observation',
      title: 'เข็มทิศธรรมชาติ (Natural Compass)',
      content: `ดวงอาทิตย์ขึ้นทิศตะวันออกและตกทิศตะวันตก ใช้เงาไม้บอกทิศและเวลา 
                ตะไคร่น้ำมักขึ้นหนาแน่นทางทิศเหนือของลำต้นไม้ใหญ่เพราะแสงแดดส่องถึงน้อยกว่า 
                จดจำรูปทรงยอดเขาสำคัญๆ เช่น ยอดเขาหมีหมอบ อยู่ทางทิศใต้ของถ้ำเสมอ`,
      tags: ['navigation', 'nature', 'sun', 'moss'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['celestial-navigation']
    },

    // หมวดที่ 4: ยุทธวิธีการต่อสู้และป้องกัน (Combat & Defense Tactics)
    {
      domain: 'combat',
      category: 'tactics',
      title: 'การต่อสู้กับสัตว์นักล่า (Fighting Predators)',
      content: `หมีถ้ำสายตาไม่ดีแต่จมูกดีมาก ต้องยืนนิ่งอยู่ใต้ลม หากถูกจู่โจมต้องแทงที่จมูกหรือตา 
                เสือเขี้ยวดาบชอบซุ่มโจมตีจากด้านหลัง ต้องเดินเป็นกลุ่มและส่งเสียงดัง 
                หมาป่าฝูงต้องตั้งวงหันหลังชนกัน เล็งไปที่จ่าฝูงหากมันตายฝูงจะแตกกระเจิง`,
      tags: ['combat', 'predators', 'bear', 'tiger', 'wolf'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['animal-behavior']
    },

    // หมวดที่ 5: พิธีกรรมและพันธะแห่งจิตวิญญาณชาย (Male Rituals)
    {
      domain: 'spiritual',
      category: 'ritual',
      title: 'พิธีกรรมเปลี่ยนผ่าน (Rite of Passage)',
      content: `ต้องอดทนต่อความเจ็บปวดโดยไม่ร้องขอความช่วยเหลือเพื่อพิสูจน์ความเป็นนักล่า 
                สัตว์วิญญาณ (Totem Animal) จะปรากฏในความฝันระหว่างการอยู่ป่าตามลำพัง 
                เมื่อกลับมาจะได้รับอนุญาตให้สวมเครื่องรางจากสัตว์ที่ล่าได้ตัวแรก`,
      tags: ['ritual', 'manhood', 'spirit-animal', 'totem'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spirit-animal']
    },

    // หมวดที่ 6: การเข้าใจและการเคารพพลังตรงข้าม (Understanding the Other Power)
    {
      domain: 'social',
      category: 'relationships',
      title: 'วัฏจักรของสตรี (Acknowledging Women\'s Cycles)',
      content: `ผู้หญิงในช่วงมีเลือดประจำเดือนมีพลังจิตวิญญาณแรงกล้า ไม่ควรแตะต้องอาวุธล่าสัตว์ของพวกนาง 
                พลังนี้อาจทำให้หอกบิดเบี้ยวหรือสัตว์หนีไปได้ง่ายๆ ควรปล่อยพวกนางไว้ตามลำพัง`,
      tags: ['women', 'cycles', 'taboo', 'respect'],
      confidence: 0.9,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-bonds']
    },

    // หมวดที่ 7: กิน (Eating)
    {
      domain: 'biology',
      category: 'nutrition',
      title: 'การกินเพื่อความแข็งแกร่ง (Eating for Strength)',
      content: `กินเนื้อส่วนที่มีไขมันมากที่สุดก่อนออกเดินทางไกลเพื่อให้พลังงานยาวนาน 
                ไขกระดูกทำให้ร่างกายอบอุ่นในคืนหนาว ตับสดให้พละกำลังมหาศาล 
                ห้ามกินเนื้อกระต่ายก่อนออกล่าเพราะจะทำให้ขี้ขลาดเหมือนกระต่าย`,
      tags: ['food', 'strength', 'fat', 'taboo'],
      confidence: 0.95,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 8: ขับถ่าย (Excreting)
    {
      domain: 'tactical',
      category: 'stealth',
      title: 'การขับถ่ายระหว่างการล่า (Tactical Excretion)',
      content: `ต้องกลั้นให้ถึงที่สุดระหว่างสะกดรอย หากต้องปลดปล่อยต้องทำอย่างเงียบเชียบและกลบฝังให้มิดชิด 
                ต้องอยู่ใต้ลมเสมอเพื่อไม่ให้เหยื่อได้กลิ่นมนุษย์ ปัสสาวะรดโคนต้นไม้ใหญ่เพื่อประกาศอาณาเขตเผ่าอื่น`,
      tags: ['stealth', 'territory', 'waste', 'tracking'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['tracking']
    },

    // หมวดที่ 9: สืบพันธุ์ (Reproduction)
    {
      domain: 'biology',
      category: 'reproduction',
      title: 'การสืบทอดสายเลือด (Reproduction Lore)',
      content: `ห้ามยุ่งเกี่ยวกับพี่น้องร่วมสายเลือดเด็ดขาดเพราะจะนำคำสาปแช่งมาสู่ลูกหลาน 
                ผู้ชายต้องดูแลผู้หญิงให้ดีเป็นพิเศษในช่วงตั้งครรภ์ นำเนื้อส่วนที่ดีที่สุดมาให้นาง 
                เราเรียกเด็กทุกคนว่าลูกเพราะการอยู่รอดของเผ่าขึ้นอยู่กับเด็กทุกคน`,
      tags: ['family', 'bloodline', 'taboo', 'protection'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 10: นอน (Sleeping)
    {
      domain: 'tactical',
      category: 'survival',
      title: 'การนอนของนักรบ (Warrior\'s Sleep)',
      content: `นอนตะแคงข้างที่ถนัด มือวางบนด้ามหอกพร้อมลุกขึ้นสู้ทันที 
                ที่นอนต้องอยู่ใกล้ปากถ้ำเพื่อปกป้องผู้หญิงและเด็กที่อยู่ด้านใน 
                ต้องผลัดเวรยามเฝ้าปากถ้ำเสมอ การเผลอหลับระหว่างเฝ้ายามคือความประมาทที่ร้ายแรง`,
      tags: ['sleep', 'protection', 'watch', 'safety'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['combat-tactics']
    },

    // หมวดที่ 11: ภูมิปัญญาแห่งร่างกาย (Body Wisdom)
    {
      domain: 'biology',
      category: 'physiology',
      title: 'ร่างกายคือตำราเล่มแรก (Body as the First Book)',
      content: `ความเจ็บปวดคือภาษาที่ร่างกายใช้เตือนเมื่อทำผิด แผลเป็นไม่ใช่ความพ่ายแพ้แต่คือบันทึกการรอดชีวิต 
                ร่างกายมีพลังงานสำรองที่จะเปิดใช้เมื่อชีวิตตกอยู่ในอันตราย (Adrenaline) 
                ต้องฟังเสียงกล้ามเนื้อกระตุกหรือหัวใจเต้นแรงผิดปกติเพื่อรู้ขีดจำกัด`,
      tags: ['body', 'pain', 'survival', 'limits'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['instinct']
    },

    // หมวดที่ 12: เทคโนโลยี (Technology)
    {
      domain: 'engineering',
      category: 'fire',
      title: 'เทคโนโลยีแห่งไฟ (Fire Technology)',
      content: `การจุดไฟด้วยการขัดสีไม้ (Fire Plough) หรือการหมุนด้วยมือ (Hand Drill) ต้องใช้ความอดทน 
                การรักษาถ่านแดงในภาชนะดินเหนียวช่วยให้ย้ายไฟไปที่ใหม่ได้โดยไม่ต้องจุดใหม่ 
                ใช้ไฟทำให้ปลายหอกแข็งและใช้ล้อมต้อนฝูงสัตว์`,
      tags: ['fire', 'tools', 'survival', 'crafting'],
      confidence: 0.9,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spear-making']
    },

    // หมวดที่ 13: การเพาะปลูกและการจัดการผืนดิน (Agriculture)
    {
      domain: 'botany',
      category: 'observation',
      title: 'ไฟคือผู้ไถพรวน (Fire as the Tiller)',
      content: `พืชอาหารจะงอกงามขึ้นหลังไฟป่าเพราะไฟกำจัดพืชที่ไม่ต้องการและเปิดพื้นที่ 
                การทิ้งเศษอาหารหรือกระดูกสัตว์ในหลุมเป็นการหว่านโดยไม่รู้ตัว 
                ต้องปกป้องแหล่งพืชอาหารจากหมูป่าและสัตว์กินพืชอื่นๆ`,
      tags: ['agriculture', 'fire', 'soil', 'protection'],
      confidence: 0.8,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['nature-observation']
    },

    // หมวดที่ 14: ศิลปะ (Art)
    {
      domain: 'culture',
      category: 'art',
      title: 'รอยประทับแห่งวิญญาณ (Soul Traces)',
      content: `การพ่นสีแดงรอบมือบนผนังถ้ำคือการประกาศตัวต่อกาลเวลา 
                การวาดภาพสัตว์คือการจับวิญญาณของเหยื่อไว้ก่อนการล่าจริง 
                แกะสลักสัตว์วิญญาณลงบนอาวุธเพื่อขอพลังและการนำทาง`,
      tags: ['art', 'ritual', 'spirits', 'painting'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-bonds']
    },

    // หมวดที่ 15: กามารมณ์ (Sexuality)
    {
      domain: 'biology',
      category: 'sexuality',
      title: 'ไฟในกายที่ต้องควบคุม (Controlled Inner Fire)',
      content: `ความต้องการทางเพศคือไฟในเลือดที่ต้องควบคุมด้วยกฎของเผ่า 
                ห้ามมีเพศสัมพันธ์คืนก่อนการล่าใหญ่เพราะกลิ่นตัวจะแรงและวิญญาณสัตว์จะตื่นตัว 
                การร่วมรักคือการถ่ายเทน้ำแห่งชีวิตเพื่อสร้างชีวิตใหม่`,
      tags: ['sexuality', 'taboo', 'reproduction', 'rules'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['reproduction-lore']
    },

    // หมวดที่ 16: สัญชาตญาณ (Instinct)
    {
      domain: 'biology',
      category: 'instinct',
      title: 'การรู้โดยไม่รู้ (Knowing without Knowing)',
      content: `ขนลุกที่ท้ายทอยหมายถึงถูกจ้องมอง ท้องบิดเกร็งหมายถึงอันตรายใกล้ตัว 
                นักล่าที่ดีต้องคิดเหมือนเหยื่อและเข้าถึงวิญญาณของมัน 
                จงเชื่อเสียงกระซิบในท้องเสมอแม้สมองจะหาเหตุผลไม่ได้`,
      tags: ['instinct', 'survival', 'danger', 'intuition'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 17: ธรรมเนียม (Traditions)
    {
      domain: 'social',
      category: 'culture',
      title: 'กฎแห่งนักล่า (Laws of the Hunter)',
      content: `ห้ามทอดทิ้งเพื่อนนักล่าในยามอันตรายเด็ดขาด 
                ต้องขอบคุณวิญญาณสัตว์ที่สละชีวิตให้เราอยู่รอด 
                การตัดสินใจในสภานักล่าต้องเป็นเอกฉันท์เพื่อความสามัคคีของเผ่า`,
      tags: ['tradition', 'laws', 'hunting', 'social'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 18: หน้าที่ (Duty)
    {
      domain: 'social',
      category: 'responsibility',
      title: 'กำแพงมีชีวิต (The Living Wall)',
      content: `ผู้ชายคือผู้จัดหาเนื้อและผู้ปกป้องถ้ำจากเขี้ยวเล็บ 
                หน้าที่ไม่ได้ถูกถามแต่มันถูกเรียกร้องเมื่อกลายเป็นผู้ชาย 
                ต้องเป็นแบบอย่างให้เด็กชายและสอนพวกเขาให้เติบโตเป็นนักล่า`,
      tags: ['duty', 'protection', 'hunting', 'teaching'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['manhood']
    },

    // หมวดที่ 19: ความอยาก (Desire)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'ไฟในเลือด (Fire in the Blood)',
      content: `ความอยากคือเขี้ยวเล็บภายในที่ขับเคลื่อนทุกย่างก้าว 
                ความอยากเอาชนะผลักดันให้พัฒนาทักษะการล่า 
                ต้องเรียนรู้ที่จะขี่ความอยากเหมือนขี่หลังวัวป่า—ควบคุมไม่ให้มันทำลายตนเอง`,
      tags: ['desire', 'motivation', 'victory', 'control'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 20: ความฝัน (Dreams)
    {
      domain: 'spiritual',
      category: 'dreams',
      title: 'การออกล่าในความมืด (Hunting in the Dark)',
      content: `ความฝันคือการที่วิญญาณออกล่าในขณะที่ร่างกายพัก 
                ฝันเห็นหมีคือการเตือนถึงอันตรายใหญ่หลวงหรือถึงเวลาต้องสู้ 
                บรรพชนที่ตายไปแล้วมักมาเยือนในความฝันเพื่อชี้ทางหรือเตือนภัย`,
      tags: ['dreams', 'spirits', 'ancestors', 'omens'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spirit-animal']
    },

    // หมวดที่ 21: ความเห็นแก่ตัว (Selfishness)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'หมีในอก (The Bear in the Chest)',
      content: `ความเห็นแก่ตัวคือหมีที่อยู่ในอก บางครั้งมันหลับบางครั้งมันคำราม 
                ต้องต่อสู้กับเสียงกระซิบที่ให้เก็บเนื้อไว้คนเดียวเพื่อความอยู่รอดของเผ่า 
                การแบ่งปันคือการลงทุนในความอยู่รอดระยะยาว`,
      tags: ['selfishness', 'sharing', 'survival', 'social'],
      confidence: 0.8,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 22: ความสัมพันธ์ (Relationships)
    {
      domain: 'social',
      category: 'relationships',
      title: 'พันธะที่หลอมในเลือด (Bonds Forged in Blood)',
      content: `ความสัมพันธ์ไม่ใช่ต้นกล้าแต่คือหินที่รองรับน้ำหนักถ้ำ 
                เพื่อนร่วมล่าคือผู้ที่ถือชีวิตเราไว้ในมือ ต้องไว้ใจกันด้วยชีวิต 
                ความรักแสดงออกผ่านการยืนขวางหมีให้กัน ไม่ใช่คำพูดสวยหรู`,
      tags: ['relationships', 'trust', 'family', 'brotherhood'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 23: อารมณ์ (Emotions)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'ไฟที่ถูกกักเก็บ (Contained Fire)',
      content: `ความโกรธคือไฟที่ใช้เป็นอาวุธได้แต่ต้องไม่ให้มันบงการ 
                ความกลัวคือสติปัญญาของร่างกายที่เตือนให้ระวังอันตราย 
                ความเศร้าที่ไม่มีน้ำตาคือวิธีที่ผู้ชายแบกรับความสูญเสีย`,
      tags: ['emotions', 'anger', 'fear', 'sadness', 'control'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 24: กามารมณ์ (Sexuality Detailed)
    {
      domain: 'biology',
      category: 'sexuality',
      title: 'กามสูตรของนักล่า (Hunter\'s Kamasutra)',
      content: `การร่วมรักไม่ใช่การล่า ต้องชะลอความเร็วและฟังจังหวะของนาง 
                การควบคุมลมหายใจช่วยยืดระยะเวลาเพื่อมอบความสุขให้คู่ครอง 
                ความล้มเหลวของร่างกายในบางคืนไม่ใช่จุดจบของความเป็นชาย`,
      tags: ['sexuality', 'pleasure', 'control', 'patience'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['reproduction-lore']
    },

    // หมวดที่ 25: ความบันเทิง (Entertainment)
    {
      domain: 'culture',
      category: 'entertainment',
      title: 'เมื่อหอกถูกวางลง (When the Spear is Lowered)',
      content: `ความบันเทิงคือสิ่งที่เตือนว่าเราไม่ใช่สัตว์แต่เป็นมนุษย์ที่มีวิญญาณ 
                การหัวเราะเยาะความผิดพลาดของกันและกันช่วยลดความตึงเครียด 
                การนั่งเงียบๆ ริมลำธารมองดูน้ำไหลคือการพักผ่อนของจิตวิญญาณ`,
      tags: ['play', 'laughter', 'rest', 'music', 'stories'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-bonds']
    },

    // หมวดที่ 26: ความขี้เกียจ (Laziness)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'หมีที่ซ่อนในถ้ำ (The Bear Hidden in the Cave)',
      content: `ความขี้เกียจคือเสียงในหัวที่พยายามต่อรองเพื่อให้ทำน้อยลง 
                ต้องแยกแยะระหว่างการพักฟื้นที่จำเป็นกับการหนีงาน 
                ความกลัวที่จะถูกมองว่าขี้เกียจในหมู่ผู้ชายคือแรงผลักดันที่แข็งแกร่ง`,
      tags: ['laziness', 'discipline', 'duty', 'rest'],
      confidence: 0.8,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['responsibility']
    },

    // หมวดที่ 27: วิธีการเรียนรู้ (Learning Methods)
    {
      domain: 'education',
      category: 'method',
      title: 'การซึมซับผ่านการเฝ้าดู (Learning by Watching)',
      content: `เรียนรู้ผ่านการเฝ้าดูจังหวะมือของพ่อและนักล่าอาวุโส 
                มือเรียนรู้จากความล้มเหลวและการลองทำซ้ำๆ จนกล้ามเนื้อจดจำ 
                ธรรมชาติคือห้องเรียนที่ยิ่งใหญ่ที่สุดที่ไม่มีวันสำเร็จการศึกษา`,
      tags: ['learning', 'watching', 'practice', 'nature'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 28: รูปแบบการคิด (Thinking Patterns)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'เส้นตรงที่ตัดผ่านความวุ่นวาย (Straight Line through Chaos)',
      content: `ผู้ชายคิดเป็นเส้นตรง มุ่งเป้าหมายและตัดสิ่งรบกวนออก 
                แยกปัญหาใหญ่ออกเป็นส่วนเล็กๆ เพื่อจัดการทีละอย่าง 
                คิดจากจุดสิ้นสุดย้อนกลับมาเพื่อวางแผนการล่าที่สมบูรณ์`,
      tags: ['thinking', 'focus', 'analysis', 'planning'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 29: การแก้ไขข้อผิดพลาด (Correcting Mistakes)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'รอยร้าวในด้ามหอก (Cracks in the Spear Shaft)',
      content: `ความผิดพลาดคือเลือดที่ต้องห้ามไหลซ้ำ ต้องแก้ไขด้วยการกระทำไม่ใช่คำพูด 
                ถอดบทเรียนจากความล้มเหลวเพื่อเปลี่ยนวิธีทำสิ่งต่างๆ ไปตลอดกาล 
                ความผิดพลาดที่แก้ไขไม่ได้ต้องแบกรับไว้เป็นเครื่องเตือนใจเพื่อปกป้องผู้อื่น`,
      tags: ['mistakes', 'learning', 'responsibility', 'improvement'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 30: การประเมินความมั่นใจ (Assessing Confidence)
    {
      domain: 'psychology',
      category: 'self-assessment',
      title: 'หอกที่ต้องลับทุกวัน (The Spear to be Sharpened Daily)',
      content: `ความมั่นใจวัดจากผลงานที่เป็นรูปธรรม—เนื้อที่แบกกลับมาและหอกที่ปักเข้าเป้า 
                การเปรียบเทียบกับผู้อื่นคือแผนที่บอกว่าต้องพัฒนาจุดใด 
                ความมั่นใจที่แท้จริงคือความสงบที่รู้ว่าตนเองได้ทำหน้าที่สำเร็จแล้ว`,
      tags: ['confidence', 'performance', 'comparison', 'peace'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['manhood']
    },

    // หมวดที่ 31: การประเมินผู้อื่น (Assessing Others)
    {
      domain: 'social',
      category: 'judgment',
      title: 'การอ่านคนผ่านการกระทำ (Reading People through Action)',
      content: `อย่าฟังสิ่งที่เขาพูดแต่จงดูสิ่งที่เขาทำเมื่อเผชิญหน้ากับเสือ 
                ความซื่อสัตย์วัดได้จากการแบ่งปันเนื้อในยามหิวโหย 
                ผู้นำที่แท้จริงคือผู้ที่เดินอยู่ข้างหน้าเมื่อเข้าหาอันตรายและเดินอยู่ข้างหลังเมื่อถอยร่น`,
      tags: ['judgment', 'trust', 'leadership', 'courage'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 32: ความเป็นผู้นำ (Leadership)
    {
      domain: 'social',
      category: 'leadership',
      title: 'ภาระที่มองไม่เห็น (The Invisible Burden)',
      content: `ความเป็นผู้นำไม่ใช่สิทธิพิเศษแต่คือภาระในการแบกรับความอยู่รอดของทุกคน 
                ต้องตัดสินใจให้เด็ดขาดแม้ในยามที่หัวใจสั่นไหว 
                ความยุติธรรมคือรากฐานที่ทำให้เผ่าไม่แตกสลาย`,
      tags: ['leadership', 'responsibility', 'justice', 'decision'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 33: ความสูญเสีย (Loss)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'รอยแผลในวิญญาณ (Scars in the Soul)',
      content: `ความสูญเสียคือส่วนหนึ่งของวัฏจักรที่ต้องยอมรับ 
                การสูญเสียเพื่อนร่วมล่าคือการสูญเสียส่วนหนึ่งของตนเอง 
                ต้องเปลี่ยนความเศร้าให้เป็นพลังในการปกป้องผู้ที่ยังอยู่`,
      tags: ['loss', 'grief', 'resilience', 'protection'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 34: ความตาย (Death)
    {
      domain: 'spiritual',
      category: 'ritual',
      title: 'การกลับคืนสู่ความมืด (Return to Darkness)',
      content: `ความตายไม่ใช่จุดจบแต่คือการเดินทางกลับไปหาบรรพชน 
                ต้องฝังอาวุธและของใช้ไปกับผู้ตายเพื่อให้เขาใช้ในโลกหน้า 
                ความตายของนักรบคือเกียรติยศที่คนรุ่นหลังจะเล่าขาน`,
      tags: ['death', 'ritual', 'ancestors', 'legacy'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-bonds']
    },

    // หมวดที่ 35: ความหมายของชีวิต (The Meaning of Life)
    {
      domain: 'spiritual',
      category: 'philosophy',
      title: 'สายใยที่ไม่สิ้นสุด (The Endless Thread)',
      content: `ชีวิตคือการเป็นสะพานระหว่างบรรพชนและลูกหลาน 
                ความหมายที่แท้จริงคือการทำให้เผ่าอยู่รอดและส่งต่อภูมิปัญญา 
                เรามีชีวิตอยู่เพื่อปกป้องความลับของป่าและรักษาความสมดุลของโลก`,
      tags: ['meaning', 'purpose', 'legacy', 'balance'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-bonds']
    },

    // หมวดที่ 36: การจัดการกับความหิว (Managing Hunger)
    {
      domain: 'survival',
      category: 'endurance',
      title: 'หลุมดำในท้อง (The Black Hole in the Stomach)',
      content: `ความหิวคือบททดสอบว่าเราจะยอมแพ้หรือสู้ต่อ 
                ในยามท้องว่างประสาทสัมผัสจะคมชัดขึ้น จงใช้มันเป็นอาวุธ 
                การกินสิ่งที่กินไม่ได้คือความสิ้นหวัง แต่การอดทนคือวินัยของนักล่า`,
      tags: ['hunger', 'endurance', 'survival', 'discipline'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['nutrition']
    },

    // หมวดที่ 37: การจัดการความเบื่อหน่าย (Managing Boredom)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'สนิมบนคมมีด (Rust on the Blade)',
      content: `ความเบื่อหน่ายคือสนิมที่กัดกร่อนความแหลมคม 
                จงเปลี่ยนงานซ้ำซากให้เป็นการทำสมาธิ 
                การนั่งเงียบๆ ริมลำธารไม่ใช่ความเบื่อหน่าย แต่คือการพักผ่อนของวิญญาณ`,
      tags: ['boredom', 'patience', 'focus', 'meditation'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['laziness']
    },

    // หมวดที่ 38: จินตนาการ (Imagination)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'สนามฝึกซ้อมในหัว (The Mental Training Ground)',
      content: `จินตนาการคือการซ้อมรบก่อนการต่อสู้จริง 
                จงมองเห็นภาพหัวหอกในก้อนหินก่อนลงมือกะเทาะ 
                การจินตนาการถึงความตายของตนเองคือการยอมรับและขจัดความกลัว`,
      tags: ['imagination', 'planning', 'visualization', 'preparation'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['thinking-patterns']
    },

    // หมวดที่ 39: ความคิดสร้างสรรค์ (Creativity)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'กับดักที่มองไม่เห็น (The Invisible Trap)',
      content: `ความคิดสร้างสรรค์เกิดจากความหิวและความจำเป็น 
                จงคิดเหมือนศัตรูเพื่อเอาชนะมัน 
                การเลียนแบบยุทธวิธีของหมาป่าหรือแมงมุมคือการเรียนรู้จากครูที่ยิ่งใหญ่ที่สุด`,
      tags: ['creativity', 'innovation', 'tactics', 'problem-solving'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 40: โครงสร้างสังคม (Social Structure)
    {
      domain: 'social',
      category: 'structure',
      title: 'สมดุลของฝูง (Balance of the Pack)',
      content: `ยี่สิบถึงห้าสิบชีวิตคือจำนวนที่ธรรมชาติออกแบบไว้ 
                ทุกคนมีบทบาทและทักษะที่แตกต่างกันเพื่อเติมเต็มซึ่งกันและกัน 
                ความขัดแย้งต้องถูกแก้ไขอย่างรวดเร็วและเงียบงันเพื่อความอยู่รอดของเผ่า`,
      tags: ['social', 'tribe', 'balance', 'cooperation'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['relationships']
    },

    // หมวดที่ 41: การกระจายของวัย (Age Distribution)
    {
      domain: 'social',
      category: 'structure',
      title: 'รากและใบ (Roots and Leaves)',
      content: `ผู้เฒ่าคือรากที่ยึดเผ่าไว้กับอดีตและภูมิปัญญา 
                เด็กคือใบไม้ใหม่ที่รับแสงอาทิตย์และสร้างอนาคต 
                นักล่าคือลำต้นที่แข็งแกร่งคอยปกป้องทั้งรากและใบ`,
      tags: ['age', 'wisdom', 'youth', 'protection'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 42: ทักษะและความถนัด (Skills and Aptitude)
    {
      domain: 'social',
      category: 'skills',
      title: 'อาวุธที่แตกต่างกัน (Different Weapons)',
      content: `บางคนเกิดมาเพื่อวิ่งเร็ว บางคนเกิดมาเพื่อขว้างหอกแม่น 
                ผู้นำต้องรู้จักใช้คนให้ถูกกับงาน 
                การบังคับให้คนทำในสิ่งที่ไม่ถนัดคือการสร้างจุดอ่อนให้เผ่า`,
      tags: ['skills', 'aptitude', 'leadership', 'teamwork'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['leadership']
    },

    // หมวดที่ 43: ความกลัว (Fear)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'เงาของเสือดำ (Shadow of the Panther)',
      content: `ความกลัวไม่ใช่ความขี้ขลาด แต่เป็นสัญชาตญาณที่ทำให้รอดชีวิต 
                จงกลัวสิ่งที่มองไม่เห็นมากกว่าสิ่งที่มองเห็น 
                ความกล้าหาญไม่ใช่การไม่มีความกลัว แต่คือการลงมือทำแม้จะกลัว`,
      tags: ['fear', 'courage', 'survival', 'instinct'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 44: ความหวัง (Hope)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'แสงแรกของวัน (First Light of Day)',
      content: `ความหวังคือไฟที่ทำให้เราเดินหน้าต่อไปในฤดูหนาวที่โหดร้าย 
                การเห็นรอยเท้าสัตว์คือความหวัง การเห็นควันไฟของเผ่าคือความอุ่นใจ 
                ผู้นำต้องสร้างความหวังให้เผ่าแม้ในยามที่ตนเองสิ้นหวัง`,
      tags: ['hope', 'leadership', 'survival', 'motivation'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['leadership']
    },

    // หมวดที่ 45: การสื่อสาร (Communication)
    {
      domain: 'social',
      category: 'communication',
      title: 'ภาษาของป่า (Language of the Forest)',
      content: `การสื่อสารระหว่างการล่าต้องใช้ภาษากายและเสียงเลียนแบบสัตว์ 
                ความเงียบคือการสื่อสารที่ทรงพลังที่สุด 
                การเล่าเรื่องรอบกองไฟคือการถ่ายทอดประวัติศาสตร์และกฎของเผ่า`,
      tags: ['communication', 'stealth', 'stories', 'history'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 46: การปรับตัว (Adaptability)
    {
      domain: 'survival',
      category: 'tactics',
      title: 'น้ำที่ไหลเปลี่ยนทิศ (Water Changing Course)',
      content: `เมื่อฤดูกาลเปลี่ยน สัตว์เปลี่ยนเส้นทาง เราต้องเปลี่ยนตาม 
                การยึดติดกับวิธีเดิมๆ เมื่อโลกเปลี่ยนคือการฆ่าตัวตาย 
                นักล่าที่ดีต้องเรียนรู้ที่จะใช้ประโยชน์จากสภาพแวดล้อมใหม่เสมอ`,
      tags: ['adaptability', 'survival', 'change', 'flexibility'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['hunting-strategy']
    },

    // หมวดที่ 47: การสังเกต (Observation)
    {
      domain: 'nature',
      category: 'observation',
      title: 'ดวงตาของเหยี่ยว (Eyes of the Hawk)',
      content: `การมองเห็นไม่ใช่แค่การใช้ตา แต่คือการเข้าใจสิ่งที่เห็น 
                รอยขีดข่วนบนต้นไม้บอกขนาดและชนิดของสัตว์ 
                การเปลี่ยนแปลงเล็กน้อยของสีใบไม้บอกถึงแหล่งน้ำหรือฤดูกาลที่กำลังจะมา`,
      tags: ['observation', 'tracking', 'nature', 'awareness'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['tracking']
    },

    // หมวดที่ 48: การตัดสินใจ (Decision Making)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'หอกที่พุ่งออกไป (The Thrown Spear)',
      content: `เมื่อตัดสินใจแล้วต้องไม่ลังเล เหมือนหอกที่พุ่งออกจากมือ 
                การตัดสินใจที่ผิดพลาดดีกว่าการไม่ตัดสินใจเลย 
                ต้องเรียนรู้ที่จะรับผลของการตัดสินใจ ไม่ว่าจะดีหรือร้าย`,
      tags: ['decision', 'action', 'responsibility', 'leadership'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['leadership']
    },

    // หมวดที่ 49: ความเคารพ (Respect)
    {
      domain: 'social',
      category: 'culture',
      title: 'การก้มหัวให้ขุนเขา (Bowing to the Mountain)',
      content: `ความเคารพไม่ใช่ความกลัว แต่คือการยอมรับในพลังที่ยิ่งใหญ่กว่า 
                ต้องเคารพสัตว์ที่ล่า เคารพธรรมชาติที่หล่อเลี้ยง และเคารพผู้อาวุโส 
                ผู้ที่ไม่เคารพสิ่งใดเลยคือผู้ที่อันตรายที่สุดในเผ่า`,
      tags: ['respect', 'nature', 'elders', 'humility'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 50: มรดก (Legacy)
    {
      domain: 'social',
      category: 'legacy',
      title: 'รอยเท้าบนผืนทราย (Footprints on the Sand)',
      content: `มรดกที่แท้จริงไม่ใช่กระดูกหรืออาวุธ แต่คือความรู้ที่ส่งต่อ 
                ชื่อของนักล่าจะถูกจดจำผ่านเรื่องเล่ารอบกองไฟ 
                การสร้างนักล่ารุ่นใหม่ที่เก่งกว่าตนเองคือความสำเร็จสูงสุด`,
      tags: ['legacy', 'teaching', 'history', 'memory'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['teaching']
    }
  ],
  
  learningHistory: [
    {
      id: 'adam-learning-001',
      situation: 'พบรอยเท้าที่ไม่รู้จักใกล้แม่น้ำ - ไม่เคยเห็นมาก่อน',
      observation: [
        'รอยเท้าสี่นิ้ว (ไม่ใช่กีบ)',
        'เห็นรอยกรงเล็บชัดเจน',
        'ขนาด: ใหญ่ (ใหญ่กว่าหมาป่า)',
        'รูปแบบการเดิน (ไม่ใช่วิ่ง)',
        'ใกล้แหล่งน้ำ'
      ],
      reasoning: [
        { step: 1, thought: 'ไม่ใช่กีบ → ไม่ใช่กวางหรือหมูป่า' },
        { step: 2, thought: 'มีกรงเล็บ + ขนาดใหญ่ → สัตว์นักล่า' },
        { step: 3, thought: 'ใหญ่กว่าหมาป่า → หมีหรือแมวใหญ่?' },
        { step: 4, thought: 'รูปแบบการเดิน → ไม่ได้กำลังล่าในตอนนี้' },
        { step: 5, thought: 'ใกล้แหล่งน้ำ → มาเพื่อดื่มน้ำ' },
      ],
      hypothesis: 'น่าจะเป็นหมี (หมีถ้ำ?)',
      test: {
        method: 'ตามรอยอย่างระมัดระวัง อยู่ใต้ลมเสมอ',
        result: 'พบทางเข้าถ้ำ เห็นหมีขนาดมหึมาเดินเข้าไป'
      },
      outcome: 'ยืนยัน: หมีถ้ำ',
      learning: [
        'รอยกรงเล็บสี่นิ้วขนาดใหญ่ = หมี',
        'หมีอันตรายมาก',
        'ใกล้แหล่งน้ำตอนรุ่งสาง = เวลาดื่มน้ำ',
        'อย่าตามรอยหมีใกล้เกินไป!'
      ],
      confidence: 0.9,
      timestamp: new Date().toISOString()
    }
  ],
  
  reasoningTemplates: [
    {
      type: 'if-then',
      pattern: 'ถ้ารอยเท้าลึก → สัตว์มีน้ำหนักมาก ถ้าหนัก → น่าจะเป็นกวางหรือหมูป่า',
      examples: ['bear-tracks', 'deer-tracks'],
      applicableDomains: ['hunting', 'tracking']
    }
  ],
  
  memories: [],
  
  currentGoals: [
    'ล่ากวางเพื่อเผ่า',
    'สอนลูกตามรอย',
    'บำรุงรักษาอาวุธ'
  ],
  
  currentStruggles: [
    'ความเกียจคร้าน',
    'ความโศกเศร้าจากการจากไปของพี่น้อง'
  ]
};
