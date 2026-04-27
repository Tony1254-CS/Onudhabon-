// Hardcoded demo fallback. Used by /demo route and as last-resort cache when all providers fail.

export type DemoMindNode = { id: string; label: string; status: "gold" | "cold-blue" | "gap" };
export type DemoMindEdge = { source: string; target: string };

export type DemoTopic = {
  topic_bn: string;
  ai_explanation: string;
  socratic_response_1: string;
  socratic_response_2: string;
  gap_detected: string[];
  concepts_understood: string[];
  mastery_score: number;
  mind_map_nodes: DemoMindNode[];
  mind_map_edges: DemoMindEdge[];
  simulated_student: string;
};

export const DEMO_RESPONSES: Record<string, DemoTopic> = {
  electric_current_teach: {
    topic_bn: "তড়িৎ প্রবাহ",
    ai_explanation:
      "তড়িৎ প্রবাহ হলো পরিবাহীর মধ্য দিয়ে ইলেকট্রনের প্রবাহ। যেমন পানির পাইপে পানি প্রবাহিত হয়, ঠিক তেমনি তারের মধ্য দিয়ে ইলেকট্রন প্রবাহিত হয়। এই প্রবাহকেই আমরা তড়িৎ প্রবাহ বলি। ভোল্টেজ হলো চাপ, রেজিস্ট্যান্স হলো বাধা, এবং কারেন্ট হলো প্রবাহের পরিমাণ।",
    socratic_response_1:
      "চমৎকার! কিন্তু তুমি বললে ইলেকট্রন প্রবাহিত হয় — কিন্তু কেন প্রবাহিত হয়? কী কারণে ইলেকট্রন নড়ে?",
    socratic_response_2:
      "খুব ভালো! তাহলে ভোল্টেজ না থাকলে কী হবে? তড়িৎ প্রবাহিত হবে?",
    gap_detected: ["ভোল্টেজের ভূমিকা", "ওহমের সূত্র"],
    concepts_understood: ["ইলেকট্রন প্রবাহ", "পরিবাহী"],
    mastery_score: 0.72,
    mind_map_nodes: [
      { id: "1", label: "তড়িৎ প্রবাহ", status: "gold" },
      { id: "2", label: "ইলেকট্রন", status: "gold" },
      { id: "3", label: "ভোল্টেজ", status: "cold-blue" },
      { id: "4", label: "রেজিস্ট্যান্স", status: "gap" },
      { id: "5", label: "ওহমের সূত্র", status: "gap" },
    ],
    mind_map_edges: [
      { source: "1", target: "2" },
      { source: "1", target: "3" },
      { source: "3", target: "4" },
      { source: "4", target: "5" },
    ],
    simulated_student: "তড়িৎ প্রবাহ মানে ইলেকট্রনের প্রবাহ… তারের মধ্যে ইলেকট্রন এক প্রান্ত থেকে অন্য প্রান্তে যায়।",
  },
  light_reflection: {
    topic_bn: "আলোর প্রতিফলন",
    ai_explanation:
      "যখন আলো কোনো মসৃণ পৃষ্ঠে আঘাত করে এবং ফিরে আসে, তখন একে আলোর প্রতিফলন বলে। আয়নায় তোমার প্রতিবিম্ব এই কারণেই দেখো। প্রতিফলনের দুটি সূত্র আছে: আপতন কোণ ও প্রতিফলন কোণ সমান, এবং উভয় কোণ একই সমতলে অবস্থান করে।",
    socratic_response_1:
      "সুন্দর বললে! কিন্তু কেন মসৃণ পৃষ্ঠে স্পষ্ট প্রতিবিম্ব হয়, কিন্তু খসখসে দেয়ালে হয় না? ভেবে দেখো।",
    socratic_response_2:
      "চমৎকার যুক্তি! তাহলে আপতন কোণ ৪৫° হলে প্রতিফলন কোণ কত হবে?",
    gap_detected: ["বিচ্ছুরিত প্রতিফলন", "প্রতিফলনের দ্বিতীয় সূত্র"],
    concepts_understood: ["প্রতিফলন", "আপতন কোণ"],
    mastery_score: 0.68,
    mind_map_nodes: [
      { id: "1", label: "আলোর প্রতিফলন", status: "gold" },
      { id: "2", label: "আপতন কোণ", status: "gold" },
      { id: "3", label: "প্রতিফলন কোণ", status: "cold-blue" },
      { id: "4", label: "মসৃণ পৃষ্ঠ", status: "cold-blue" },
      { id: "5", label: "বিচ্ছুরিত প্রতিফলন", status: "gap" },
    ],
    mind_map_edges: [
      { source: "1", target: "2" },
      { source: "1", target: "3" },
      { source: "1", target: "4" },
      { source: "4", target: "5" },
    ],
    simulated_student: "আলো যখন আয়নায় পড়ে, ফিরে আসে। মসৃণ হলে স্পষ্ট প্রতিবিম্ব হয়।",
  },
  chemical_reaction: {
    topic_bn: "রাসায়নিক বিক্রিয়া",
    ai_explanation:
      "রাসায়নিক বিক্রিয়া হলো এমন একটি প্রক্রিয়া যেখানে এক বা একাধিক পদার্থ পরিবর্তিত হয়ে নতুন পদার্থে রূপান্তরিত হয়। যেমন: লোহায় মরিচা ধরা, কাঠ পোড়া, খাবার হজম। বিক্রিয়ায় বিক্রিয়ক (reactants) থেকে উৎপাদ (products) তৈরি হয়। শক্তি শোষিত বা নির্গত হতে পারে।",
    socratic_response_1:
      "ভালো! এখন বলো — যখন কাঠ পোড়ে, ভর কি হারিয়ে যায়? নাকি অন্য কোথাও যায়?",
    socratic_response_2:
      "চমৎকার! এটাকেই বলে ভরের নিত্যতা। তাহলে বিক্রিয়ায় শক্তি কোথা থেকে আসে?",
    gap_detected: ["ভরের নিত্যতা সূত্র", "বন্ধন শক্তি"],
    concepts_understood: ["বিক্রিয়ক", "উৎপাদ"],
    mastery_score: 0.65,
    mind_map_nodes: [
      { id: "1", label: "রাসায়নিক বিক্রিয়া", status: "gold" },
      { id: "2", label: "বিক্রিয়ক", status: "gold" },
      { id: "3", label: "উৎপাদ", status: "cold-blue" },
      { id: "4", label: "ভরের নিত্যতা", status: "gap" },
      { id: "5", label: "বন্ধন শক্তি", status: "gap" },
    ],
    mind_map_edges: [
      { source: "1", target: "2" },
      { source: "1", target: "3" },
      { source: "1", target: "4" },
      { source: "4", target: "5" },
    ],
    simulated_student: "কাঠ পুড়লে ছাই হয়। মানে নতুন পদার্থ তৈরি হলো — এটাই বিক্রিয়া।",
  },
};

export const DEMO_TOPICS = Object.values(DEMO_RESPONSES);
