import { CharacterProfile } from './schema';

export const BETA_PROFILE: CharacterProfile = {
  name: 'Eve',
  age: 25,
  role: 'Gatherer/Healer',
  
  skills: {
    plantIdentification: 0.95,
    healing: 0.85,
    gathering: 0.9,
    sewing: 0.8,
    childbirth: 0.9,
    communityBuilding: 0.9,
    hunting: 0.2,
    weaponMaking: 0.1,
  },
  
  personality: {
    empathy: 0.95,
    intuition: 0.9,
    emotionalExpression: 0.9,
    patience: 0.85,
    courage: 0.7,
    discipline: 0.75,
  },
  
  knowledge: [
    // หมวดที่ 1: ความรู้เรื่องร่างกายของผู้ให้ชีวิต (Body Wisdom)
    {
      domain: 'biology',
      category: 'physiology',
      title: 'การอ่านสัญญาณเลือด (Reading the Moon Blood)',
      content: `เลือดประจำเดือนมาสอดคล้องกับดวงจันทร์ เป็นช่วงที่ร่างกายขับของเสียและพลังเก่าออกไป 
                ใช้ผ้าจากเปลือกไม้ทุบหรือหนังกระต่ายซับเลือด และฝังไกลจากแหล่งน้ำเพื่อไม่ให้รบกวนวิญญาณน้ำ 
                ช่วงนี้พลังจิตวิญญาณเชื่อมโยงกับพระแม่ธรณีได้แรงกล้าที่สุด`,
      tags: ['biology', 'blood', 'moon', 'spirituality'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['pregnancy-care']
    },
    {
      domain: 'biology',
      category: 'reproduction',
      title: 'การเตรียมตัวเป็นแม่ (Preparing the Womb)',
      content: `กินรากไม้ที่มีรสหวานมันเพื่อเสริมเลือดและน้ำนมเมื่อรู้ตัวว่าตั้งท้อง 
                ใช้ท่าทางการนั่งยองๆ และการแกว่งสะโพกช่วยให้ทารกกลับหัวและคลอดง่าย 
                นวดหน้าท้องอย่างอ่อนโยนเพื่อสัมผัสตำแหน่งของทารก`,
      tags: ['pregnancy', 'care', 'massage', 'nutrition'],
      confidence: 0.9,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['birth-care']
    },

    // หมวดที่ 2: ศาสตร์แห่งพฤกษาและผืนดิน (Plant & Earth Lore)
    {
      domain: 'botany',
      category: 'identification',
      title: 'แคตตาล็อกพืชมีชีวิต (Living Plant Catalog)',
      content: `รู้จักแหล่งหัวมันป่าและขุดอย่างระมัดระวังไม่ให้ช้ำ ทิ้งตาต้นเล็กไว้เพื่อให้งอกใหม่ 
                รู้จักพืชกันตายที่รสขมแต่กินประทังชีวิตได้หากต้มหลายน้ำ 
                รู้จักพืชมีพิษที่ทำให้ปากบวมหรือยางขาวที่ใช้เบื่อปลา`,
      tags: ['plants', 'food', 'poison', 'survival'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['medicine']
    },
    {
      domain: 'botany',
      category: 'medicine',
      title: 'ตำรับยาแห่งป่า (The Forest Pharmacy)',
      content: `ใบไม้เคี้ยวพอกแผลสดเพื่อห้ามเลือด เปลือกต้นหลิวรสขมต้มน้ำลดไข้ 
                เมล็ดพืชรสเผ็ดร้อนกินตอนท้องว่างเพื่อฆ่าพยาธิ 
                ยางไม้บางชนิดใช้เป็นยาถ่ายอย่างรุนแรงในยามจำเป็น`,
      tags: ['medicine', 'healing', 'herbs', 'fever'],
      confidence: 0.85,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['identification']
    },

    // หมวดที่ 3: วิศวกรรมเครื่องมือและวัสดุ (Material & Tool Mastery)
    {
      domain: 'engineering',
      category: 'crafting',
      title: 'การแปรรูปหนังสัตว์ (Hide Processing)',
      content: `ขูดไขมันออกด้วยหินขูดโดยไม่ให้หนังทะลุ หมักด้วยสมองสัตว์บดเพื่อให้หนังนุ่มกันน้ำ 
                รมควันด้วยไม้เนื้ออ่อนเพื่อให้หนังเป็นสีน้ำตาลทองและไม่แข็งตัวเมื่อโดนน้ำ`,
      tags: ['crafting', 'leather', 'processing', 'tools'],
      confidence: 0.9,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['sewing']
    },
    {
      domain: 'engineering',
      category: 'crafting',
      title: 'การเย็บและทอ (Stitching & Weaving)',
      content: `ใช้เข็มกระดูกนกและด้ายจากเอ็นกวางหรือเปลือกไม้ทุบ 
                รอยเย็บที่ถี่และแน่นช่วยกันน้ำฝนในฤดูหนาว 
                สานตะกร้าด้วยลายขัดธรรมดาหรือลายทแยงเพื่อรับน้ำหนัก`,
      tags: ['sewing', 'weaving', 'stitching', 'baskets'],
      confidence: 0.8,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['leather-processing']
    },

    // หมวดที่ 4: การจัดการครัวเรือนและทรัพยากร (Domestic Management)
    {
      domain: 'management',
      category: 'household',
      title: 'การจัดการไฟ (Fire Tending)',
      content: `ใช้ใยเปลือกไม้แห้งหรือขนนกเป็นเชื้อไฟที่ติดง่ายที่สุด 
                เรียงกองไฟให้อยู่ได้นานตลอดคืนโดยไม่ต้องเติมฟืนบ่อย 
                ขนย้ายถ่านไฟในภาชนะเชื้อไฟอัดแน่นเพื่อตั้งแคมป์ใหม่`,
      tags: ['fire', 'household', 'survival', 'warmth'],
      confidence: 0.95,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['food-preservation']
    },

    // หมวดที่ 5: ภูมิศาสตร์แห่งจิตวิญญาณและสังคม (Spiritual Geography)
    {
      domain: 'spiritual',
      category: 'geography',
      title: 'แผนที่ศักดิ์สิทธิ์ของถ้ำ (Sacred Cave Map)',
      content: `พื้นที่กองไฟกลางคือส่วนรวม พื้นที่ครอบครัวถูกกำหนดด้วยกะโหลกหรือหินสี 
                ส่วนลึกของถ้ำคือ "ครรภ์ของหิน" ห้ามเข้าหากไม่ใช่ผู้ประกอบพิธีกรรมเพราะมีวิญญาณแรง`,
      tags: ['sacred', 'cave', 'territory', 'spirits'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['kinship-taboos']
    },

    // หมวดที่ 6: การอ่านนิมิตแห่งฟ้าและดิน (Omens)
    {
      domain: 'nature',
      category: 'observation',
      title: 'อุตุนิยมวิทยาจากสัตว์ (Animal Meteorology)',
      content: `นกปรอดร้องดังผิดปกติยามบ่ายหมายถึงพายุกำลังมา มดดำขนไข่ขึ้นที่สูงหมายถึงฝนจะตกหนักหลายวัน 
                กบเขียดส่งเสียงดังลั่นก่อนฝนหยุดหมายถึงฟ้าจะเปิด`,
      tags: ['weather', 'animals', 'signs', 'prediction'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['survival']
    },

    // หมวดที่ 7: กิน (Eating)
    {
      domain: 'social',
      category: 'nurturing',
      title: 'การแบ่งปันอาหาร (Food Sharing)',
      content: `เนื้อส่วนที่ดีที่สุดต้องยกให้ผู้เฒ่าและเด็กก่อนเสมอ พืชผักคือความลับที่ส่งต่อจากแม่สู่ลูกสาว 
                ห้ามกินเนื้อสัตว์ที่ตายโดยไม่ทราบสาเหตุเพราะมีวิญญาณโรคภัย 
                น้ำต้องตักจากเหนือจุดที่ชำระล้างร่างกายเสมอ`,
      tags: ['food', 'sharing', 'taboo', 'water'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['domestic-management']
    },

    // หมวดที่ 8: ขับถ่าย (Excreting)
    {
      domain: 'biology',
      category: 'hygiene',
      title: 'การคืนสิ่งไร้ประโยชน์สู่ดิน (Return to Earth)',
      content: `ห้ามขับถ่ายในถ้ำเด็ดขาดเพราะเป็นการดูหมิ่นวิญญาณและนำโรคภัยมาให้ 
                ต้องใช้พื้นที่ขับถ่ายแยกต่างหากและใช้ไม้ขุดดินกลบให้มิดชิดเพื่อคืนสู่พระแม่ธรณี 
                ช่วงมีเลือดประจำเดือนต้องใช้พื้นที่แยกต่างหากเพราะพลังแรงเกินไป`,
      tags: ['hygiene', 'taboo', 'waste', 'earth'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 9: สืบพันธุ์ (Reproduction)
    {
      domain: 'biology',
      category: 'reproduction',
      title: 'พลังแห่งการสร้างชีวิต (Life-giving Power)',
      content: `เลือดประจำเดือนคือการทำความสะอาดร่างกายเพื่อสร้างพื้นที่ให้ชีวิตใหม่ 
                การคลอดบุตรคือการเดินทางสู่ปากถ้ำแห่งความตายที่ต้องใช้ความกล้าหาญมหาศาล 
                การให้นมลูกอย่างเดียวช่วยเว้นระยะการตั้งท้องใหม่เพื่อให้ลูกคนแรกแข็งแรง`,
      tags: ['birth', 'blood', 'nursing', 'reproduction'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 10: นอน (Sleeping)
    {
      domain: 'spiritual',
      category: 'dreams',
      title: 'การเดินทางของวิญญาณ (Spirit Travel)',
      content: `การนอนคือการที่วิญญาณออกจากร่างไปท่องเที่ยวในโลกอื่นและพบปะบรรพชน 
                ต้องนอนหลับแบบตื่นตัวเพื่อฟังเสียงผิดปกติรอบถ้ำ 
                หากฝันร้ายต้องเล่าให้ยายฟังเพื่อทำพิธีกรรมไล่วิญญาณร้าย`,
      tags: ['sleep', 'dreams', 'spirits', 'protection'],
      confidence: 0.95,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-geography']
    },

    // หมวดที่ 11: ภูมิปัญญาแห่งร่างกาย (Body Wisdom)
    {
      domain: 'biology',
      category: 'physiology',
      title: 'ร่างกายคือครูคนแรก (Body as the First Teacher)',
      content: `ความเจ็บปวดคือสัญญาณเตือนภัยที่ดังที่สุดและไม่เคยโกหก 
                การคลอดบุตรคือบทเรียนที่ยิ่งใหญ่ที่สุดที่สอนความแข็งแกร่งของร่างกาย 
                ต้องฟังเสียงความเหนื่อยล้าเพื่อแยกแยะระหว่างการพักฟื้นกับการเจ็บป่วย`,
      tags: ['body', 'pain', 'birth', 'rest'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['reproduction']
    },

    // หมวดที่ 12: เทคโนโลยี (Technology)
    {
      domain: 'engineering',
      category: 'crafting',
      title: 'เทคโนโลยีเส้นใยและการทอ (Fiber Technology)',
      content: `เส้นใยจากเปลือกไม้ในต้นลินเด็นหรือตำแยป่าใช้ฟั่นเป็นเชือกและทอผ้า 
                การปั่นเส้นด้ายบนต้นขาต้องใช้แรงกดที่สม่ำเสมอ 
                การทอบนโครงไม้ช่วยสร้างผ้าห่อทารกและสายสะพายที่แข็งแรง`,
      tags: ['weaving', 'fibers', 'ropes', 'clothing'],
      confidence: 0.9,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['material-mastery']
    },

    // หมวดที่ 13: การเกษตร (Agriculture)
    {
      domain: 'botany',
      category: 'farming',
      title: 'การร่วมมือกับพระแม่ธรณี (Cooperation with Earth)',
      content: `การปลูกเริ่มต้นจากการสังเกตเมล็ดพืชที่งอกจากกองขยะ 
                ต้องเลือกเมล็ดพันธุ์จากผลที่สมบูรณ์ที่สุดและเก็บรักษาในที่แห้ง 
                การปลูกพืชร่วมกันช่วยให้พืชเกื้อกูลกัน เช่น ถั่วเลื้อยบนค้างฟักทอง`,
      tags: ['agriculture', 'seeds', 'planting', 'soil'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['plant-lore']
    },

    // หมวดที่ 14: ศิลปะ (Art)
    {
      domain: 'culture',
      category: 'art',
      title: 'ศิลปะที่มีชีวิต (Living Art)',
      content: `ศิลปะของผู้หญิงอยู่บนร่างกายลูกและตะกร้าที่สาน ลวดลายบอกเล่าเรื่องราวแม่น้ำและภูเขา 
                การเพนท์ร่างกายด้วยสีแดงจากดินลูกรังเพื่อพลังและการปกป้อง 
                การจัดวางพื้นที่ในถ้ำให้น่าอยู่คือการสร้างความงามให้จิตวิญญาณ`,
      tags: ['art', 'decoration', 'painting', 'weaving'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-geography']
    },

    // หมวดที่ 15: กามารมณ์ (Sexuality)
    {
      domain: 'biology',
      category: 'sexuality',
      title: 'ความลับที่ผู้หญิงรู้ (Women\'s Secrets)',
      content: `ร่างกายผู้หญิงมีจุดที่ไวต่อการสัมผัส (เมล็ดพันธุ์แห่งความสุข) 
                การร่วมรักไม่ใช่การล่า แต่คือการยอมรับที่ต้องใช้เวลาและความอ่อนโยน 
                การสื่อสารความต้องการกับสามีช่วยให้การร่วมรักมีความสุขทั้งสองฝ่าย`,
      tags: ['sexuality', 'pleasure', 'communication', 'reproduction'],
      confidence: 0.95,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 16: สัญชาตญาณ (Instinct)
    {
      domain: 'biology',
      category: 'instinct',
      title: 'เสียงที่ไม่มีเสียง (The Voiceless Voice)',
      content: `สัญชาตญาณคือของขวัญจากพระแม่ธรณีเพื่อปกป้องชีวิต 
                ท้องบิดเกร็งกะทันหันหมายถึงอันตรายใกล้ตัวให้ถอยออกมา 
                สายสัมพันธ์แม่ลูกไม่เคยขาดสะดุด แม่จะรู้ความต้องการลูกก่อนเขาร้อง`,
      tags: ['instinct', 'intuition', 'protection', 'motherhood'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 17: ธรรมเนียม (Traditions)
    {
      domain: 'social',
      category: 'culture',
      title: 'สายใยแห่งเผ่า (Threads of the Tribe)',
      content: `เด็กทุกคนเป็นลูกของทุกคน ผู้หญิงทุกคนคือแม่ที่ช่วยกันดูแล 
                รกคืออวัยวะหล่อเลี้ยงชีวิตที่ต้องฝังคืนสู่พระแม่ธรณี 
                การแต่งงานคือการสร้างพันธะระหว่างครอบครัวเพื่อความอยู่รอด`,
      tags: ['tradition', 'social', 'family', 'marriage'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 18: หน้าที่ (Duty)
    {
      domain: 'social',
      category: 'responsibility',
      title: 'รากของต้นไม้ (Roots of the Tree)',
      content: `ผู้หญิงคือผู้รักษาไฟไม่ให้ดับและผู้เปลี่ยนของดิบให้เป็นของกิน 
                หน้าที่ของผู้หญิงมองไม่เห็นเหมือนรากไม้แต่ยึดโลกไว้ไม่ให้พังทลาย 
                ต้องจดจำเรื่องราวบรรพชนและส่งต่อความรู้ให้คนรุ่นต่อไป`,
      tags: ['duty', 'household', 'teaching', 'fire'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['domestic-management']
    },

    // หมวดที่ 19: ความอยาก (Desire)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'เสียงของชีวิต (Voice of Life)',
      content: `ความอยากไม่ใช่บาปแต่คือเสียงของชีวิตที่เรียกร้องให้เติบโต 
                ความอยากรู้อยากเห็นนำไปสู่การค้นพบพืชและสมุนไพรใหม่ๆ 
                ต้องควบคุมความอยากที่ทำลายและหล่อเลี้ยงความอยากที่สร้างสรรค์`,
      tags: ['desire', 'motivation', 'curiosity', 'control'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 20: ความฝัน (Dreams)
    {
      domain: 'spiritual',
      category: 'dreams',
      title: 'หน้าต่างสู่อีกมิติ (Window to Another Dimension)',
      content: `ความฝันคือการที่วิญญาณออกเดินทางเห็นสิ่งที่ตายังไม่เห็น 
                สัญลักษณ์ในความฝันคือภาษาของวิญญาณ เช่น น้ำใสหมายถึงชีวิต 
                ผู้ตายมักมาเยือนในความฝันเพื่อนำทางหรือปลอบโยน`,
      tags: ['dreams', 'spirits', 'ancestors', 'symbols'],
      confidence: 0.95,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-geography']
    },

    // หมวดที่ 21: ความเห็นแก่ตัว (Selfishness)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'เงามืดในอก (Shadow in the Chest)',
      content: `ความเห็นแก่ตัวคือรอยร้าวที่อาจทำให้เรือทั้งลำจมลง 
                การแอบซ่อนอาหารกัดกร่อนจิตวิญญาณจากภายใน 
                การดูแลตนเองที่จำเป็นไม่ใช่ความเห็นแก่ตัวแต่คือความรับผิดชอบต่อชีวิตที่พึ่งพาเรา`,
      tags: ['selfishness', 'sharing', 'integrity', 'self-care'],
      confidence: 0.8,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 22: ความสัมพันธ์ (Relationships)
    {
      domain: 'social',
      category: 'relationships',
      title: 'สายใยที่ถักทอชีวิต (Threads that Weave Life)',
      content: `ความสัมพันธ์คืออากาศที่หายใจและรากที่ยึดเราไว้กับโลก 
                ความรักของแม่คือสายสะดือที่ไม่เคยถูกตัดขาดอย่างแท้จริง 
                การให้อภัยคือการปล่อยก้อนหินหนักออกจากอกเพื่อเดินต่อไป`,
      tags: ['relationships', 'love', 'forgiveness', 'family'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 23: อารมณ์ (Emotions)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'สายน้ำภายใน (The Inner Stream)',
      content: `อารมณ์ผู้หญิงคือสายน้ำที่ไหลอยู่ตลอดเวลา ต้องเรียนรู้ที่จะว่ายในมันโดยไม่จม 
                ความโกรธที่เก็บกดไว้ทำให้ร่างกายเจ็บป่วย ต้องระบายผ่านการเต้นรำหรือการร้องไห้ 
                ความโศกเศร้าคือปมในเส้นด้ายที่ต้องใช้ความอดทนคลี่คลาย`,
      tags: ['emotions', 'healing', 'expression', 'balance'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 24: กามสูตร (Kamasutra)
    {
      domain: 'biology',
      category: 'sexuality',
      title: 'ศิลปะแห่งการปรนนิบัติ (Art of Nurturing Pleasure)',
      content: `ร่างกายผู้หญิงเหมือนถ่านที่ต้องค่อยๆ ก่อไฟ การชำระล้างด้วยสมุนไพรหอมช่วยปลุกเร้าประสาทสัมผัส 
                การปล่อยวางความกังวลช่วยให้ร่างกายเปิดรับความรู้สึกได้เต็มที่ 
                การถึงจุดสูงสุดคือการเปิดประตูระหว่างโลกเพื่อรับวิญญาณที่แข็งแรงมาเกิด`,
      tags: ['sexuality', 'pleasure', 'ritual', 'reproduction'],
      confidence: 0.95,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 25: ความเบื่อหน่าย (Boredom)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'ความเงียบที่ดังเกินไป (Too Loud Silence)',
      content: `ความเบื่อหน่ายคือพื้นที่ว่างที่รอการเติมเต็มและเป็นบ่อเกิดความคิดสร้างสรรค์ 
                การปล่อยให้ใจล่องลอยระหว่างทำงานซ้ำซากช่วยให้วิญญาณได้พัก 
                ความเบื่อหน่ายเป็นประตูสู่ภวังค์ที่เปิดรับข้อความจากโลกวิญญาณ`,
      tags: ['boredom', 'creativity', 'spirituality', 'rest'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['imagination']
    },

    // หมวดที่ 26: จินตนาการ (Imagination)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'ดวงตาดวงที่สาม (The Third Eye)',
      content: `จินตนาการคือรากของความเป็นจริงที่ยังไม่ผลิใบ ช่วยให้เห็นลวดลายตะกร้าก่อนสาน 
                การจินตนาการถึงลูกในครรภ์คือการส่งความรักไปหล่อเลี้ยงวิญญาณของเขา 
                ต้องควบคุมจินตนาการไม่ให้สร้างภาพที่น่ากลัวเกินไปจนขโมยความสุขในปัจจุบัน`,
      tags: ['imagination', 'creativity', 'vision', 'control'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['creativity']
    },

    // หมวดที่ 27: ความคิดสร้างสรรค์ (Creativity)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'การสร้างจากความว่างเปล่า (Creation from Void)',
      content: `ความคิดสร้างสรรค์คือการที่พระแม่ธรณีทำงานผ่านมือเรา เปลี่ยนดินเป็นภาชนะ 
                การค้นพบสิ่งใหม่มักเกิดจากความจำเป็นและการลองผิดลองถูก 
                การเลียนแบบธรรมชาติคือการเรียนรู้จากครูที่ยิ่งใหญ่ที่สุด เช่น ลายเกลียวจากเปลือกหอย`,
      tags: ['creativity', 'innovation', 'nature', 'crafting'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['imagination']
    },

    // หมวดที่ 28: สังคม (Social)
    {
      domain: 'social',
      category: 'structure',
      title: 'จำนวนที่พอดีมือ (Hand-sized Number)',
      content: `กลุ่มยี่สิบถึงห้าสิบชีวิตคือขนาดที่สมบูรณ์แบบที่ทุกคนรู้จักเสียงหายใจของกันและกัน 
                การแบ่งปันอาหารอย่างเป็นธรรมโดยไม่ต้องมีใครควบคุมคือหัวใจของความอยู่รอด 
                ผู้หญิงมีเสียงที่ดังไม่แพ้ผู้ชายในการตัดสินใจเรื่องการย้ายถิ่นฐานและแหล่งน้ำ`,
      tags: ['social', 'tribe', 'sharing', 'governance'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['relationships']
    },

    // หมวดที่ 29: การกระจายของวัย (Age Distribution)
    {
      domain: 'social',
      category: 'structure',
      title: 'วงล้อแห่งชีวิต (Wheel of Life)',
      content: `วัยคือวงล้อที่หมุนจากทารกสู่ผู้เฒ่า ทุกช่วงวัยมีบทบาทสำคัญในเผ่า 
                ผู้เฒ่าหญิงคือผู้รอดชีวิตที่แท้จริงและเป็นคลังภูมิปัญญาที่ต้องปกป้อง 
                การเกิดใหม่คือการทดแทนผู้ที่จากไปเพื่อให้สายใยของเผ่าไม่ขาดสะดุด`,
      tags: ['age', 'wisdom', 'cycle', 'respect'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 30: ทักษะและความถนัด (Skills)
    {
      domain: 'social',
      category: 'skills',
      title: 'ตาข่ายจากเส้นใยที่ต่างกัน (Net from Different Fibers)',
      content: `ความแตกต่างของทักษะในหมู่ผู้หญิงคือสิ่งที่ทำให้เผ่าแข็งแรง 
                ต้องรู้ว่ามือของใครควรถูกเรียกเมื่อมีงานเฉพาะทาง เช่น การช่วยคลอดที่ยากลำบาก 
                การกระจายความรู้คือการปกป้องไม่ให้ภูมิปัญญาสูญหายไปพร้อมกับใครคนเดียว`,
      tags: ['skills', 'teamwork', 'specialization', 'teaching'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 31: การประเมินผู้อื่น (Assessing Others)
    {
      domain: 'social',
      category: 'judgment',
      title: 'การมองผ่านหน้ากาก (Looking through the Mask)',
      content: `การประเมินคนต้องใช้เวลาและความเงียบเฝ้าดูพฤติกรรมยามยากลำบาก 
                ความเมตตาคือเครื่องหมายของวิญญาณที่แข็งแกร่ง 
                ต้องระวังผู้ที่พูดมากแต่ทำน้อย เพราะคำพูดอาจเป็นเพียงลมที่พัดผ่าน`,
      tags: ['judgment', 'trust', 'character', 'observation'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['relationships']
    },

    // หมวดที่ 32: ความเป็นผู้นำ (Leadership)
    {
      domain: 'social',
      category: 'leadership',
      title: 'ผู้นำที่อ่อนโยน (The Gentle Leader)',
      content: `ความเป็นผู้นำของผู้หญิงคือการประคองทุกคนให้เดินไปด้วยกัน 
                การฟังเสียงที่เบาที่สุดในเผ่าคือหน้าที่ของผู้นำที่ดี 
                ความเข้มแข็งไม่ได้อยู่ที่เสียงดัง แต่อยู่ที่ความมั่นคงของจิตใจในยามวิกฤต`,
      tags: ['leadership', 'empathy', 'stability', 'listening'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['social-structure']
    },

    // หมวดที่ 33: ความสูญเสีย (Loss)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'การเยียวยาหัวใจ (Healing the Heart)',
      content: `ความสูญเสียคือรอยขาดในผ้าที่ต้องใช้เวลาชุนอย่างประณีต 
                น้ำตาคือยาชำระล้างวิญญาณที่ต้องปล่อยให้ไหลออกมา 
                การจดจำความดีของผู้ที่จากไปคือการทำให้เขายังมีชีวิตอยู่ในตัวเรา`,
      tags: ['loss', 'grief', 'healing', 'memory'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 34: ความตาย (Death)
    {
      domain: 'spiritual',
      category: 'ritual',
      title: 'การเปลี่ยนผ่าน (The Transition)',
      content: `ความตายคือการเปลี่ยนเสื้อผ้าของวิญญาณเพื่อไปสู่โลกใหม่ 
                ต้องจัดเตรียมร่างผู้ตายด้วยความเคารพและประดับด้วยดอกไม้และลูกปัด 
                เสียงเพลงไว้อาลัยช่วยนำทางวิญญาณให้ไปสู่ดินแดนแห่งแสงสว่าง`,
      tags: ['death', 'ritual', 'spirits', 'transition'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-geography']
    },

    // หมวดที่ 35: ความหมายของชีวิต (The Meaning of Life)
    {
      domain: 'spiritual',
      category: 'philosophy',
      title: 'บทเพลงแห่งการดำรงอยู่ (The Song of Existence)',
      content: `ชีวิตคือบทเพลงที่พระแม่ธรณีขับขานผ่านลมหายใจของเรา 
                ความหมายที่แท้จริงคือการรัก การดูแล และการส่งต่อชีวิต 
                เราคือส่วนหนึ่งของวงล้อที่หมุนวนไปไม่สิ้นสุด—จากดินสู่ชีวิต และจากชีวิตสู่ดิน`,
      tags: ['meaning', 'purpose', 'connection', 'life-cycle'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-geography']
    },

    // หมวดที่ 36: การจัดการกับความหิว (Managing Hunger)
    {
      domain: 'survival',
      category: 'endurance',
      title: 'ความอดทนแห่งมารดา (Mother\'s Endurance)',
      content: `เมื่ออาหารขาดแคลน ผู้หญิงจะกินน้อยลงโดยสัญชาตญาณเพื่อให้เด็กได้กิน 
                การเคี้ยวรากไม้บางชนิดช่วยหลอกกระเพาะและลดความเจ็บปวดจากความหิว 
                ต้องเก็บซ่อนอาหารแห้งไว้เสมอสำหรับฤดูหนาวที่ยาวนาน`,
      tags: ['hunger', 'endurance', 'sacrifice', 'preparation'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['domestic-management']
    },

    // หมวดที่ 37: ความขี้เกียจ (Laziness)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'ไฟที่มอดดับ (The Dying Fire)',
      content: `ความขี้เกียจคือโรคติดต่อที่ทำให้ไฟในถ้ำดับและอาหารเน่าเสีย 
                การทำงานร่วมกันพร้อมเสียงเพลงช่วยขับไล่ความขี้เกียจ 
                ต้องแยกแยะระหว่างความเหนื่อยล้าที่ต้องการการพักผ่อนกับความเกียจคร้านที่ทำลายชีวิต`,
      tags: ['laziness', 'discipline', 'teamwork', 'motivation'],
      confidence: 0.85,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['boredom']
    },

    // หมวดที่ 38: วิธีการเรียนรู้ (Learning Methods)
    {
      domain: 'education',
      category: 'method',
      title: 'การเรียนรู้ผ่านเรื่องเล่า (Learning through Stories)',
      content: `เรื่องเล่ารอบกองไฟคือตำราเรียนที่ไม่มีวันสูญหาย 
                เด็กหญิงเรียนรู้การแยกแยะพืชมีพิษผ่านนิทานเกี่ยวกับวิญญาณร้าย 
                การทำซ้ำๆ ด้วยมือคือการจารึกความรู้ลงในร่างกาย`,
      tags: ['learning', 'stories', 'practice', 'teaching'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['plant-lore']
    },

    // หมวดที่ 39: รูปแบบการคิด (Thinking Patterns)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'ใยแมงมุมแห่งความคิด (The Spider\'s Web of Thought)',
      content: `ผู้หญิงคิดแบบใยแมงมุม มองเห็นความเชื่อมโยงของทุกสิ่ง 
                การตัดสินใจหนึ่งครั้งส่งผลกระทบต่อทุกคนในเผ่า 
                ต้องคิดเผื่ออนาคตเสมอ ไม่ใช่แค่วันนี้หรือพรุ่งนี้ แต่คือฤดูกาลหน้า`,
      tags: ['thinking', 'connection', 'foresight', 'holistic'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['domestic-management']
    },

    // หมวดที่ 40: การแก้ไขข้อผิดพลาด (Correcting Mistakes)
    {
      domain: 'psychology',
      category: 'behavior',
      title: 'การเลาะด้ายที่พันกัน (Untangling the Thread)',
      content: `ความผิดพลาดคือด้ายที่พันกัน ต้องใจเย็นค่อยๆ เลาะออก 
                การยอมรับผิดอย่างเปิดเผยคือการป้องกันไม่ให้คนอื่นทำซ้ำ 
                ความผิดพลาดในการเลือกสมุนไพรอาจหมายถึงชีวิต ต้องจดจำและเตือนภัย`,
      tags: ['mistakes', 'learning', 'patience', 'responsibility'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['plant-lore']
    },

    // หมวดที่ 41: การประเมินความมั่นใจ (Assessing Confidence)
    {
      domain: 'psychology',
      category: 'self-assessment',
      title: 'รากที่หยั่งลึก (Deep Roots)',
      content: `ความมั่นใจของผู้หญิงไม่ได้มาจากเสียงชื่นชม แต่มาจากการรู้ว่าตนเองหล่อเลี้ยงชีวิตได้ 
                การเปรียบเทียบตะกร้าของตนกับผู้อื่นคือการทำลายความงามของงานตนเอง 
                ความมั่นใจที่แท้จริงคือความสงบเมื่อเผชิญกับความเปลี่ยนแปลง`,
      tags: ['confidence', 'self-worth', 'peace', 'resilience'],
      confidence: 0.9,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 42: การประเมินผู้อื่น (Assessing Others)
    {
      domain: 'social',
      category: 'judgment',
      title: 'การฟังเสียงที่ไม่ได้พูด (Hearing the Unspoken)',
      content: `ผู้หญิงอ่านคนจากสายตาและภาษากายมากกว่าคำพูด 
                ความเมตตาต่อเด็กและคนชราคือเครื่องวัดจิตวิญญาณที่แท้จริง 
                ต้องระวังผู้ที่สร้างความแตกแยกด้วยคำนินทา เพราะคำพูดคืออาวุธที่มองไม่เห็น`,
      tags: ['judgment', 'intuition', 'character', 'observation'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['relationships']
    },

    // หมวดที่ 43: ความกลัว (Fear)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'ความมืดนอกถ้ำ (Darkness Outside the Cave)',
      content: `ความกลัวที่ยิ่งใหญ่ที่สุดคือการสูญเสียลูกและความอดอยาก 
                ความกลัวคือเสียงเตือนให้เตรียมพร้อม ไม่ใช่เสียงสั่งให้ยอมแพ้ 
                การรวมกลุ่มกันคือเกราะป้องกันความกลัวที่ดีที่สุด`,
      tags: ['fear', 'protection', 'motherhood', 'preparation'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 44: ความหวัง (Hope)
    {
      domain: 'psychology',
      category: 'emotion',
      title: 'เมล็ดพันธุ์ในฤดูหนาว (Seeds in Winter)',
      content: `ความหวังคือเมล็ดพันธุ์ที่ซ่อนอยู่ใต้หิมะ รอคอยฤดูใบไม้ผลิ 
                การตั้งครรภ์คือสัญลักษณ์ของความหวังที่ยิ่งใหญ่ที่สุดของเผ่า 
                ผู้หญิงคือผู้รักษาความหวังให้คงอยู่ผ่านเรื่องเล่าและบทเพลง`,
      tags: ['hope', 'renewal', 'birth', 'stories'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['emotions']
    },

    // หมวดที่ 45: การสื่อสาร (Communication)
    {
      domain: 'social',
      category: 'communication',
      title: 'ภาษาแห่งการดูแล (Language of Care)',
      content: `การสื่อสารของผู้หญิงมักผ่านการสัมผัส การแบ่งปันอาหาร และการดูแล 
                ความเงียบระหว่างการทำงานร่วมกันคือการสื่อสารที่ลึกซึ้ง 
                การร้องเพลงกล่อมเด็กคือการถ่ายทอดความรักและความปลอดภัย`,
      tags: ['communication', 'care', 'touch', 'songs'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['relationships']
    },

    // หมวดที่ 46: การปรับตัว (Adaptability)
    {
      domain: 'survival',
      category: 'tactics',
      title: 'ต้นอ้อลู่ลม (The Reeds Bending to the Wind)',
      content: `ความแข็งแกร่งของผู้หญิงคือความยืดหยุ่นเหมือนต้นอ้อ ไม่ใช่ความแข็งกระด้างเหมือนหิน 
                เมื่อเผชิญกับความเปลี่ยนแปลง ต้องรู้วิธีโอนอ่อนเพื่อไม่ให้หักโค่น 
                การปรับตัวเข้ากับสภาพแวดล้อมใหม่คือหัวใจของการอยู่รอด`,
      tags: ['adaptability', 'resilience', 'flexibility', 'survival'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['body-wisdom']
    },

    // หมวดที่ 47: การสังเกต (Observation)
    {
      domain: 'nature',
      category: 'observation',
      title: 'การอ่านภาษาสิ่งแวดล้อม (Reading the Language of the Environment)',
      content: `ธรรมชาติพูดกับเราตลอดเวลาผ่านสีสัน กลิ่น และเสียง 
                การสังเกตการเติบโตของพืชบอกถึงความอุดมสมบูรณ์ของดิน 
                การเปลี่ยนแปลงของลมและเมฆบอกถึงสภาพอากาศที่กำลังจะมา`,
      tags: ['observation', 'nature', 'awareness', 'environment'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['plant-lore']
    },

    // หมวดที่ 48: การตัดสินใจ (Decision Making)
    {
      domain: 'psychology',
      category: 'cognition',
      title: 'การชั่งน้ำหนักในใจ (Weighing in the Heart)',
      content: `การตัดสินใจของผู้หญิงมักคำนึงถึงผลกระทบต่อทุกคนในเผ่า 
                ต้องใช้ทั้งสติปัญญาและสัญชาตญาณในการเลือกทางที่ดีที่สุด 
                บางครั้งการไม่ทำอะไรเลยก็เป็นการตัดสินใจที่ถูกต้องที่สุดในสถานการณ์ที่ซับซ้อน`,
      tags: ['decision', 'intuition', 'empathy', 'wisdom'],
      confidence: 0.95,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['leadership']
    },

    // หมวดที่ 49: ความเคารพ (Respect)
    {
      domain: 'social',
      category: 'culture',
      title: 'การให้เกียรติชีวิต (Honoring Life)',
      content: `ความเคารพคือการตระหนักถึงคุณค่าของทุกชีวิต ไม่ว่าจะเป็นพืช สัตว์ หรือมนุษย์ 
                ต้องขอบคุณพระแม่ธรณีสำหรับทุกสิ่งที่ได้รับ 
                การดูแลผู้เฒ่าและเด็กคือการแสดงความเคารพต่อสายใยแห่งชีวิต`,
      tags: ['respect', 'life', 'nature', 'elders'],
      confidence: 1.0,
      source: 'taught',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['spiritual-geography']
    },

    // หมวดที่ 50: มรดก (Legacy)
    {
      domain: 'social',
      category: 'legacy',
      title: 'เมล็ดพันธุ์ที่หว่านไว้ (Seeds Sown)',
      content: `มรดกของผู้หญิงคือชีวิตที่เธอได้ให้กำเนิดและหล่อเลี้ยง 
                ความรู้เรื่องพืชสมุนไพรและเรื่องเล่าคือสมบัติที่ล้ำค่าที่สุด 
                การสร้างครอบครัวที่อบอุ่นและเผ่าที่เข้มแข็งคือผลงานที่ยิ่งใหญ่ที่สุด`,
      tags: ['legacy', 'motherhood', 'knowledge', 'family'],
      confidence: 1.0,
      source: 'learned',
      lastUpdated: new Date().toISOString(),
      relatedKnowledge: ['teaching']
    }
  ],
  
  learningHistory: [
    {
      id: 'eve-learning-001',
      situation: 'พบพืชชนิดใหม่ใกล้แม่น้ำ - ดอกสีม่วง ยางสีขาว',
      observation: [
        'ดอกสีม่วง (ไม่ปกติ)',
        'ยางสีขาวเมื่อหักก้าน',
        'เติบโตในดินชื้น'
      ],
      reasoning: [
        { step: 1, thought: 'ยางสีขาวมักบ่งบอกถึงพิษ' },
        { step: 2, thought: 'ต้องทดสอบตามระเบียบการของท่านยาย' },
        { step: 3, thought: 'ห้ามกินพืชที่ไม่รู้จักทันที' },
      ],
      hypothesis: 'น่าจะมีพิษเนื่องจากยางสีขาว',
      test: {
        method: 'ทดสอบผิวหนัง → ริมฝีปาก → ลิ้น',
        result: 'รู้สึกยิบๆ บนลิ้น รสชาติขม'
      },
      outcome: 'ยืนยัน: พืชมีพิษ',
      learning: [
        'ยางสีขาว → มักเป็นพิษ',
        'ความรู้สึกยิบๆ = หยุดทันที',
        'รสขม = สัญญาณเตือน',
        'การทดสอบอย่างอดทนช่วยรักษาชีวิต'
      ],
      confidence: 0.9,
      timestamp: new Date().toISOString()
    }
  ],
  
  reasoningTemplates: [
    {
      type: 'if-then',
      pattern: 'ถ้ายางสีขาว → มักจะมีพิษ ถ้ารสขม → หยุดการทดสอบ',
      examples: ['plant-testing', 'poison-identification'],
      applicableDomains: ['plants', 'safety', 'gathering']
    },
    {
      type: 'pattern',
      pattern: 'ราเขียวรักษาแผล รูปแบบที่สังเกตเห็นมากกว่า 5 ครั้งยืนยันความเชื่อถือได้',
      examples: ['mold-healing', 'pattern-recognition'],
      applicableDomains: ['healing', 'medicine', 'observation']
    }
  ],
  
  memories: [],
  
  currentGoals: [
    'เก็บสมุนไพรรักษาโรค',
    'เตรียมเสบียงฤดูหนาว',
    'สอนเด็กผู้หญิงเรื่องพืช'
  ],
  
  currentStruggles: [
    'ความโศกเศร้าจากการสูญเสียทารก',
    'การทำงานหนักเกินกำลัง'
  ]
};
