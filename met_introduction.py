"""
MET (代謝當量) 完整介紹與活動資料庫
Metabolic Equivalent of Task - Comprehensive Introduction and Activity Database
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum
import json

class ActivityCategory(Enum):
    HOUSEHOLD = "household"  # 家務活動
    TRANSPORTATION = "transportation"  # 交通相關
    SPORTS = "sports"  # 運動競技
    RECREATION = "recreation"  # 休閒娛樂
    OCCUPATIONAL = "occupational"  # 職業活動
    CONDITIONING = "conditioning"  # 體能訓練

@dataclass
class METActivity:
    """MET活動詳細資訊"""
    name: str  # 活動名稱
    category: ActivityCategory  # 活動類別
    met_value: float  # MET值
    intensity: str  # 強度等級
    description: str  # 活動描述
    benefits: List[str]  # 健康效益
    considerations: List[str]  # 注意事項
    variations: Dict[str, float]  # 變化形式及其MET值

class METEducationSystem:
    """MET教育系統 - 提供完整的MET知識與活動資料"""
    
    def __init__(self):
        self.activities_database = self._initialize_comprehensive_database()
        self.met_education = self._initialize_met_education()
    
    def _initialize_met_education(self) -> Dict:
        """初始化MET教育內容"""
        return {
            "基本概念": {
                "定義": (
                    "MET (Metabolic Equivalent of Task) 代謝當量，是測量身體活動能量消耗的標準化單位。"
                    "1 MET 定義為一個人在安靜坐著時的代謝率，約等於每公斤體重每分鐘消耗3.5毫升氧氣 (3.5 ml O2/kg/min)。"
                ),
                "歷史背景": (
                    "MET概念由美國運動醫學會(ACSM)在1960年代提出，目的是提供一個標準化的方式來比較不同活動的強度。"
                    "現在廣泛用於運動處方、健康指導和研究領域。"
                ),
                "計算原理": (
                    "MET值 = 活動時代謝率 ÷ 安靜代謝率\n"
                    "例如：跑步時代謝率為28 ml O2/kg/min，則MET = 28 ÷ 3.5 = 8 METs"
                )
            },
            "強度分類": {
                "輕度活動 (Light)": {
                    "範圍": "1.6 - 2.9 METs",
                    "特徵": "呼吸和心率輕微增加，可以輕鬆唱歌",
                    "感受": "感覺輕鬆，幾乎沒有疲勞感",
                    "例子": "緩慢走路、輕度家務、辦公室工作"
                },
                "中度活動 (Moderate)": {
                    "範圍": "3.0 - 5.9 METs",
                    "特徵": "呼吸和心率明顯增加，可以說話但無法唱歌",
                    "感受": "有點累但舒適，輕微出汗",
                    "例子": "快走、騎自行車、游泳、舞蹈"
                },
                "高強度活動 (Vigorous)": {
                    "範圍": "≥ 6.0 METs",
                    "特徵": "呼吸急促，心率大幅增加，只能說幾個字",
                    "感受": "明顯疲勞，大量出汗",
                    "例子": "跑步、競技運動、高強度訓練"
                }
            },
            "實際應用": {
                "熱量計算": {
                    "公式": "消耗熱量(大卡) = MET值 × 體重(公斤) × 運動時間(小時)",
                    "範例": "70公斤的人快走(3.5 METs)30分鐘 = 3.5 × 70 × 0.5 = 122.5大卡"
                },
                "運動處方": {
                    "WHO建議": "成人每週至少500 MET-分鐘的中高強度活動",
                    "計算方式": "MET值 × 運動時間(分鐘) = MET-分鐘",
                    "達標例子": "快走30分鐘 × 5天 = 3.5 × 150 = 525 MET-分鐘/週"
                },
                "健康效益": {
                    "心血管": "中度活動(3-6 METs)改善心肺功能",
                    "代謝": "高強度活動(>6 METs)提升代謝率",
                    "體重控制": "根據MET值精確計算熱量消耗"
                }
            },
            "使用注意事項": {
                "個體差異": "年齡、性別、體能狀況會影響實際能量消耗",
                "環境因素": "溫度、濕度、海拔高度會影響MET值",
                "測量限制": "MET值為平均值，個人差異可達±20%",
                "安全考量": "初學者應從低MET活動開始，循序漸進"
            }
        }
    
    def _initialize_comprehensive_database(self) -> Dict[ActivityCategory, List[METActivity]]:
        """建立全面的MET活動資料庫"""
        return {
            ActivityCategory.HOUSEHOLD: [
                METActivity(
                    "輕度家務", ActivityCategory.HOUSEHOLD, 2.5, "輕度",
                    "一般室內清潔和整理工作",
                    ["增加日常活動量", "改善功能性體能", "減少久坐時間"],
                    ["注意正確姿勢", "避免過度彎腰", "適時休息"],
                    {"洗碗": 2.3, "摺衣服": 2.0, "整理床鋪": 2.8, "輕度烹飪": 2.5}
                ),
                METActivity(
                    "中度家務", ActivityCategory.HOUSEHOLD, 3.5, "中度",
                    "需要較多體力的家務工作",
                    ["全身肌力訓練", "心肺功能改善", "實用性體能"],
                    ["使用適當工具", "分段進行", "保護腰部"],
                    {"吸塵": 3.3, "拖地": 3.5, "搬運物品": 4.0, "園藝工作": 4.0}
                ),
                METActivity(
                    "重度家務", ActivityCategory.HOUSEHOLD, 5.0, "中高度",
                    "需要大量體力的家務活動",
                    ["肌力大幅提升", "心肺耐力訓練", "功能性動作"],
                    ["充分熱身", "正確搬運技巧", "避免過度負荷"],
                    {"搬家": 6.0, "粉刷房屋": 4.5, "修繕工作": 5.5, "重型清潔": 4.8}
                )
            ],
            
            ActivityCategory.TRANSPORTATION: [
                METActivity(
                    "步行", ActivityCategory.TRANSPORTATION, 3.0, "輕中度",
                    "以步行作為交通方式",
                    ["改善心血管健康", "增強下肢肌力", "環保便利"],
                    ["選擇安全路線", "穿著合適鞋子", "注意交通安全"],
                    {"慢走(2.5km/h)": 2.3, "一般步行(4km/h)": 3.0, "快走(5.5km/h)": 4.3, "競走": 6.5}
                ),
                METActivity(
                    "騎自行車", ActivityCategory.TRANSPORTATION, 6.0, "中高度",
                    "騎自行車通勤或休閒",
                    ["心肺耐力提升", "下肢肌力強化", "關節友善運動"],
                    ["配戴安全帽", "檢查車況", "遵守交通規則"],
                    {"休閒騎車": 4.0, "通勤騎車": 6.0, "山地騎車": 8.5, "競速騎車": 12.0}
                ),
                METActivity(
                    "爬樓梯", ActivityCategory.TRANSPORTATION, 8.0, "高強度",
                    "使用樓梯代替電梯",
                    ["下肢爆發力", "心肺功能強化", "日常可行性高"],
                    ["扶住扶手", "控制速度", "注意膝關節"],
                    {"慢速爬樓": 4.0, "一般速度": 8.0, "快速爬樓": 15.0}
                )
            ],
            
            ActivityCategory.SPORTS: [
                METActivity(
                    "籃球", ActivityCategory.SPORTS, 8.0, "高強度",
                    "全場籃球比賽或練習",
                    ["全身協調性", "心肺耐力", "團隊合作", "反應速度"],
                    ["充分熱身", "保護關節", "適當休息", "注意碰撞"],
                    {"投籃練習": 4.5, "半場籃球": 6.0, "全場比賽": 8.0, "激烈對抗": 10.0}
                ),
                METActivity(
                    "游泳", ActivityCategory.SPORTS, 8.0, "中高強度",
                    "各種泳式的游泳活動",
                    ["全身肌力", "心肺功能", "關節友善", "身體柔軟度"],
                    ["注意水溫", "循序漸進", "學習正確技巧", "安全第一"],
                    {"漂浮踢水": 2.5, "慢速蛙式": 4.5, "自由式": 8.0, "蝶式": 13.5}
                ),
                METActivity(
                    "跑步", ActivityCategory.SPORTS, 9.0, "高強度",
                    "各種速度的跑步運動",
                    ["心肺耐力", "下肢肌力", "骨密度", "精神健康"],
                    ["適當鞋具", "漸進增量", "注意路面", "預防運動傷害"],
                    {"慢跑(6km/h)": 6.0, "中速跑(8km/h)": 8.3, "快跑(10km/h)": 9.8, "衝刺": 15.0}
                ),
                METActivity(
                    "網球", ActivityCategory.SPORTS, 7.0, "中高強度",
                    "網球比賽和練習",
                    ["手眼協調", "反應時間", "心肺功能", "全身肌力"],
                    ["正確握拍", "場地安全", "適當裝備", "預防網球肘"],
                    {"雙打": 5.0, "單打": 7.0, "競技比賽": 8.0}
                )
            ],
            
            ActivityCategory.RECREATION: [
                METActivity(
                    "舞蹈", ActivityCategory.RECREATION, 4.8, "中度",
                    "各種形式的舞蹈活動",
                    ["心肺功能", "協調性", "柔軟度", "情緒健康"],
                    ["適當服裝", "安全場地", "循序漸進", "注意平衡"],
                    {"社交舞": 3.0, "有氧舞蹈": 6.0, "芭蕾": 5.0, "街舞": 7.0}
                ),
                METActivity(
                    "太極拳", ActivityCategory.RECREATION, 3.0, "輕中度",
                    "傳統中國武術養生運動",
                    ["平衡能力", "柔軟度", "精神放鬆", "關節活動度"],
                    ["學習正確動作", "專注呼吸", "穩定場地", "避免強迫動作"],
                    {"24式太極": 3.0, "42式太極": 3.5, "太極劍": 4.0}
                ),
                METActivity(
                    "瑜珈", ActivityCategory.RECREATION, 2.5, "輕度",
                    "身心靈平衡的伸展運動",
                    ["柔軟度", "核心肌力", "壓力舒緩", "身體覺察"],
                    ["適當墊子", "不強迫動作", "配合呼吸", "避免比較"],
                    {"哈達瑜珈": 2.5, "流動瑜珈": 3.5, "熱瑜珈": 5.0, "力量瑜珈": 4.0}
                )
            ],
            
            ActivityCategory.CONDITIONING: [
                METActivity(
                    "重量訓練", ActivityCategory.CONDITIONING, 6.0, "中高強度",
                    "使用器械或自重的肌力訓練",
                    ["肌肉量增加", "骨密度提升", "代謝率改善", "功能性體能"],
                    ["正確技巧", "適當重量", "充分休息", "漸進負荷"],
                    {"輕重量": 3.0, "中重量": 6.0, "大重量": 8.0, "CrossFit": 12.0}
                ),
                METActivity(
                    "有氧運動", ActivityCategory.CONDITIONING, 7.0, "中高強度",
                    "持續性的心肺訓練",
                    ["心肺耐力", "脂肪燃燒", "血液循環", "耐力提升"],
                    ["適當強度", "充分水分", "監測心率", "循序漸進"],
                    {"低強度": 3.5, "中強度": 7.0, "高強度": 11.0, "間歇訓練": 12.5}
                ),
                METActivity(
                    "伸展運動", ActivityCategory.CONDITIONING, 2.3, "輕度",
                    "靜態和動態伸展活動",
                    ["柔軟度改善", "肌肉放鬆", "關節活動度", "運動恢復"],
                    ["溫和進行", "避免彈震", "持續呼吸", "不過度伸展"],
                    {"靜態伸展": 2.3, "動態伸展": 3.8, "PNF伸展": 4.0}
                )
            ],
            
            ActivityCategory.OCCUPATIONAL: [
                METActivity(
                    "辦公室工作", ActivityCategory.OCCUPATIONAL, 1.8, "極輕度",
                    "坐姿辦公和電腦工作",
                    ["維持基本代謝", "精神工作"],
                    ["定時起身", "正確坐姿", "眼部休息", "活動筋骨"],
                    {"打字": 1.8, "會議": 1.8, "站立辦公": 2.3}
                ),
                METActivity(
                    "體力勞動", ActivityCategory.OCCUPATIONAL, 5.5, "中高度",
                    "需要體力的職業工作",
                    ["職業體能", "實用肌力", "心肺耐力"],
                    ["職業安全", "適當工具", "正確動作", "定期休息"],
                    {"建築工作": 5.5, "搬運工作": 7.0, "農業工作": 4.5, "清潔工作": 3.5}
                )
            ]
        }
    
    def get_met_introduction(self) -> Dict:
        """獲取MET完整介紹"""
        return self.met_education
    
    def get_activities_by_category(self, category: ActivityCategory) -> List[METActivity]:
        """依類別獲取活動列表"""
        return self.activities_database.get(category, [])
    
    def get_activities_by_met_range(self, min_met: float, max_met: float) -> List[METActivity]:
        """依MET範圍搜尋活動"""
        matching_activities = []
        for category_activities in self.activities_database.values():
            for activity in category_activities:
                if min_met <= activity.met_value <= max_met:
                    matching_activities.append(activity)
        return sorted(matching_activities, key=lambda x: x.met_value)
    
    def search_activities(self, keyword: str) -> List[METActivity]:
        """關鍵字搜尋活動"""
        matching_activities = []
        keyword_lower = keyword.lower()
        
        for category_activities in self.activities_database.values():
            for activity in category_activities:
                if (keyword_lower in activity.name.lower() or 
                    keyword_lower in activity.description.lower()):
                    matching_activities.append(activity)
        
        return matching_activities
    
    def calculate_weekly_met_minutes(self, activities: List[Dict]) -> Dict:
        """計算每週MET-分鐘
        activities格式: [{"activity": "快走", "duration_minutes": 30, "frequency_per_week": 5}]
        """
        total_met_minutes = 0
        breakdown = []
        
        for activity_data in activities:
            # 搜尋活動的MET值
            found_activities = self.search_activities(activity_data["activity"])
            if found_activities:
                met_value = found_activities[0].met_value
                weekly_minutes = activity_data["duration_minutes"] * activity_data["frequency_per_week"]
                met_minutes = met_value * weekly_minutes
                total_met_minutes += met_minutes
                
                breakdown.append({
                    "activity": activity_data["activity"],
                    "met_value": met_value,
                    "weekly_minutes": weekly_minutes,
                    "met_minutes": met_minutes
                })
        
        return {
            "total_met_minutes": total_met_minutes,
            "who_recommendation_status": "符合" if total_met_minutes >= 500 else "未達標",
            "breakdown": breakdown
        }
    
    def get_activity_recommendations(self, target_met_minutes: int = 500) -> Dict:
        """根據目標MET-分鐘提供活動建議"""
        recommendations = {
            "target": f"{target_met_minutes} MET-分鐘/週",
            "strategies": []
        }
        
        # 策略1: 中度活動為主
        moderate_met = 4.0  # 平均中度活動MET值
        minutes_needed = target_met_minutes / moderate_met
        recommendations["strategies"].append({
            "strategy": "中度活動為主",
            "description": f"每週進行{minutes_needed:.0f}分鐘中度活動(如快走、騎車)",
            "example": f"每天快走{minutes_needed/7:.0f}分鐘，或每週5天各{minutes_needed/5:.0f}分鐘"
        })
        
        # 策略2: 高強度活動
        vigorous_met = 8.0  # 平均高強度活動MET值
        minutes_needed = target_met_minutes / vigorous_met
        recommendations["strategies"].append({
            "strategy": "高強度活動",
            "description": f"每週進行{minutes_needed:.0f}分鐘高強度活動(如跑步、游泳)",
            "example": f"每週3次，每次{minutes_needed/3:.0f}分鐘高強度運動"
        })
        
        # 策略3: 混合活動
        recommendations["strategies"].append({
            "strategy": "混合活動",
            "description": "結合中度和高強度活動",
            "example": "每週3次中度活動(30分鐘) + 2次高強度活動(20分鐘)"
        })
        
        return recommendations

def main():
    """展示MET教育系統功能"""
    system = METEducationSystem()
    
    print("="*80)
    print("MET (代謝當量) 完整教育系統")
    print("="*80)
    
    # 1. MET基本介紹
    education = system.get_met_introduction()
    print("\n【MET 基本概念】")
    print(f"定義: {education['基本概念']['定義']}")
    print(f"\n計算原理: {education['基本概念']['計算原理']}")
    
    # 2. 強度分類
    print("\n【強度分類】")
    for intensity, details in education['強度分類'].items():
        print(f"\n{intensity}:")
        print(f"  範圍: {details['範圍']}")
        print(f"  特徵: {details['特徵']}")
        print(f"  例子: {details['例子']}")
    
    # 3. 各類別活動展示
    print("\n【各類別活動 MET 值】")
    categories = [
        (ActivityCategory.SPORTS, "運動競技"),
        (ActivityCategory.RECREATION, "休閒娛樂"),
        (ActivityCategory.HOUSEHOLD, "家務活動")
    ]
    
    for category, name in categories:
        activities = system.get_activities_by_category(category)
        print(f"\n{name}類:")
        for activity in activities[:2]:  # 只顯示前2個
            print(f"  {activity.name}: {activity.met_value} METs - {activity.description}")
            print(f"    變化形式: {activity.variations}")
    
    # 4. MET範圍搜尋
    print(f"\n【中度活動範例 (3.0-5.9 METs)】")
    moderate_activities = system.get_activities_by_met_range(3.0, 5.9)
    for activity in moderate_activities[:5]:
        print(f"  {activity.name}: {activity.met_value} METs ({activity.category.value})")
    
    # 5. 每週MET-分鐘計算
    print(f"\n【每週 MET-分鐘計算範例】")
    weekly_activities = [
        {"activity": "快走", "duration_minutes": 30, "frequency_per_week": 5},
        {"activity": "游泳", "duration_minutes": 45, "frequency_per_week": 2}
    ]
    
    result = system.calculate_weekly_met_minutes(weekly_activities)
    print(f"總計: {result['total_met_minutes']:.0f} MET-分鐘/週 ({result['who_recommendation_status']})")
    for item in result['breakdown']:
        print(f"  {item['activity']}: {item['met_value']} METs × {item['weekly_minutes']}分鐘 = {item['met_minutes']:.0f} MET-分鐘")
    
    # 6. 活動建議
    print(f"\n【達到WHO建議的活動策略】")
    recommendations = system.get_activity_recommendations(500)
    for strategy in recommendations['strategies']:
        print(f"\n策略: {strategy['strategy']}")
        print(f"  說明: {strategy['description']}")
        print(f"  例子: {strategy['example']}")

if __name__ == "__main__":
    main()