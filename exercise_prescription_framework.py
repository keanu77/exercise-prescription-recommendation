"""
Exercise Prescription Framework with MET Integration
Based on WHO 2020 Physical Activity and Sedentary Behavior Guidelines
Reference: PMC7719906
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum

class AgeGroup(Enum):
    CHILDREN_ADOLESCENTS = "5-17 years"
    ADULTS = "18-64 years"
    OLDER_ADULTS = "65+ years"

class ActivityIntensity(Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    VIGOROUS = "vigorous"

class ActivityType(Enum):
    AEROBIC = "aerobic"
    MUSCLE_STRENGTHENING = "muscle_strengthening"
    BONE_STRENGTHENING = "bone_strengthening"
    BALANCE = "balance"
    FLEXIBILITY = "flexibility"

@dataclass
class METActivityData:
    """MET (Metabolic Equivalent of Task) data for activities"""
    activity: str
    met_value: float
    intensity_category: ActivityIntensity
    examples: List[str]

@dataclass
class ExercisePrescription:
    """FITT-VP Principle Framework with MET Integration"""
    frequency: str  # How often
    intensity: ActivityIntensity  # How hard
    time: str  # How long
    type: List[ActivityType]  # What kind
    volume: str  # Total amount
    progression: str  # How to advance
    met_guidelines: Dict[str, str]  # MET-based intensity guidelines

class ExercisePrescriptionSystem:
    
    def __init__(self):
        self.prescriptions = self._initialize_prescriptions()
        self.met_database = self._initialize_met_database()
    
    def _initialize_met_database(self) -> Dict[ActivityIntensity, List[METActivityData]]:
        """Initialize MET database for different activity intensities
        
        MET Definition:
        - 1 MET = Energy expenditure at rest (約3.5 ml O2/kg/min)
        - Light intensity: 1.6-2.9 METs
        - Moderate intensity: 3.0-5.9 METs  
        - Vigorous intensity: ≥6.0 METs
        """
        return {
            ActivityIntensity.LIGHT: [
                METActivityData("緩慢走路", 2.0, ActivityIntensity.LIGHT, 
                              ["漫步", "輕鬆散步", "購物走路"]),
                METActivityData("輕度家務", 2.5, ActivityIntensity.LIGHT,
                              ["洗碗", "整理房間", "烹飪"]),
                METActivityData("伸展運動", 2.3, ActivityIntensity.LIGHT,
                              ["瑜伽伸展", "太極", "簡單拉筋"]),
                METActivityData("辦公室工作", 1.8, ActivityIntensity.LIGHT,
                              ["打字", "閱讀", "會議"])
            ],
            ActivityIntensity.MODERATE: [
                METActivityData("快走", 3.5, ActivityIntensity.MODERATE,
                              ["健走", "快速步行", "爬樓梯"]),
                METActivityData("騎自行車(休閒)", 4.0, ActivityIntensity.MODERATE,
                              ["平地騎車", "休閒單車", "通勤騎車"]),
                METActivityData("游泳(輕鬆)", 4.5, ActivityIntensity.MODERATE,
                              ["蛙式慢游", "水中走路", "水中有氧"]),
                METActivityData("舞蹈", 4.8, ActivityIntensity.MODERATE,
                              ["社交舞", "有氧舞蹈", "廣場舞"]),
                METActivityData("網球(雙打)", 5.0, ActivityIntensity.MODERATE,
                              ["雙打網球", "羽毛球雙打", "桌球"])
            ],
            ActivityIntensity.VIGOROUS: [
                METActivityData("跑步", 8.0, ActivityIntensity.VIGOROUS,
                              ["慢跑", "中速跑步", "間歇跑"]),
                METActivityData("騎自行車(快速)", 8.5, ActivityIntensity.VIGOROUS,
                              ["競速騎車", "山地車", "高強度騎車"]),
                METActivityData("游泳(快速)", 10.0, ActivityIntensity.VIGOROUS,
                              ["自由式", "蝶式", "競技游泳"]),
                METActivityData("籃球", 6.5, ActivityIntensity.VIGOROUS,
                              ["全場籃球", "激烈對戰", "比賽"]),
                METActivityData("重量訓練", 6.0, ActivityIntensity.VIGOROUS,
                              ["高強度重訓", "CrossFit", "功能性訓練"])
            ]
        }
    
    def get_met_activities_by_intensity(self, intensity: ActivityIntensity) -> List[METActivityData]:
        """根據強度等級獲取MET活動清單"""
        return self.met_database.get(intensity, [])
    
    def calculate_calorie_expenditure(self, body_weight_kg: float, met_value: float, 
                                    duration_minutes: int) -> float:
        """計算卡路里消耗量
        
        公式: 卡路里 = MET × 體重(kg) × 時間(小時)
        """
        hours = duration_minutes / 60
        return met_value * body_weight_kg * hours
    
    def get_met_guidelines_explanation(self) -> Dict[str, str]:
        """提供MET指導原則的詳細說明"""
        return {
            "定義": (
                "MET (Metabolic Equivalent of Task) 代表代謝當量，"
                "是衡量身體活動強度的標準單位。1 MET = 安靜時的能量消耗 "
                "(約每公斤體重每分鐘消耗3.5毫升氧氣)"
            ),
            "強度分級": {
                "輕度活動": "1.6-2.9 METs - 可以唱歌的程度",
                "中度活動": "3.0-5.9 METs - 可以說話但無法唱歌",
                "高強度活動": "≥6.0 METs - 只能說少數字詞"
            },
            "實用應用": (
                "利用MET值可以：1) 比較不同活動的強度 "
                "2) 計算卡路里消耗 3) 制定個人化運動處方 "
                "4) 監測運動進展"
            ),
            "處方指導": {
                "成人建議": "每週累積500-1000 MET-分鐘的中高強度活動",
                "計算方式": "MET值 × 運動時間(分鐘) = MET-分鐘",
                "實例": "快走(3.5 METs) × 30分鐘 = 105 MET-分鐘"
            }
        }
    
    def _initialize_prescriptions(self) -> Dict[AgeGroup, ExercisePrescription]:
        return {
            AgeGroup.CHILDREN_ADOLESCENTS: ExercisePrescription(
                frequency="Daily",
                intensity=ActivityIntensity.MODERATE,
                time="Average 60 minutes/day",
                type=[ActivityType.AEROBIC, ActivityType.MUSCLE_STRENGTHENING, 
                     ActivityType.BONE_STRENGTHENING],
                volume="420 minutes/week moderate-to-vigorous intensity",
                progression="Muscle/bone strengthening ≥3 days/week",
                met_guidelines={
                    "推薦MET範圍": "3.0-8.0 METs (依活動類型)",
                    "每日目標": "累積180-420 MET-分鐘",
                    "活動建議": "多樣化運動，包含遊戲和結構化活動"
                }
            ),
            
            AgeGroup.ADULTS: ExercisePrescription(
                frequency="5+ days/week aerobic, 2+ days/week strength",
                intensity=ActivityIntensity.MODERATE,
                time="150-300 min moderate OR 75-150 min vigorous/week",
                type=[ActivityType.AEROBIC, ActivityType.MUSCLE_STRENGTHENING],
                volume="150-300 minutes moderate intensity weekly",
                progression="Can increase to >300 min moderate OR >150 min vigorous for additional benefits",
                met_guidelines={
                    "最低建議": "500 MET-分鐘/週 (中高強度活動)",
                    "額外益處": "1000 MET-分鐘/週",
                    "中度活動": "3.0-5.9 METs，如快走、騎車、游泳",
                    "高強度活動": "≥6.0 METs，如跑步、競技運動"
                }
            ),
            
            AgeGroup.OLDER_ADULTS: ExercisePrescription(
                frequency="Same as adults + 3+ days/week multicomponent",
                intensity=ActivityIntensity.MODERATE,
                time="150-300 min moderate OR 75-150 min vigorous/week",
                type=[ActivityType.AEROBIC, ActivityType.MUSCLE_STRENGTHENING, 
                     ActivityType.BALANCE],
                volume="150-300 minutes moderate intensity weekly",
                progression="Emphasize balance and strength training to prevent falls",
                met_guidelines={
                    "建議範圍": "500-1000 MET-分鐘/週",
                    "優先活動": "2.0-5.0 METs，重視安全性",
                    "平衡訓練": "配合功能性活動，預防跌倒",
                    "漸進原則": "從低強度開始，緩慢增加"
                }
            )
        }
    
    def get_prescription(self, age_group: AgeGroup) -> ExercisePrescription:
        """Get exercise prescription for specific age group"""
        return self.prescriptions[age_group]
    
    def get_special_population_guidelines(self) -> Dict[str, str]:
        """Special population exercise guidelines"""
        return {
            "Pregnant/Postpartum Women": (
                "≥150 minutes moderate-intensity aerobic activity/week. "
                "Include aerobic and muscle-strengthening activities. "
                "Can continue pre-pregnancy levels if medically cleared."
            ),
            "Chronic Conditions/Disability": (
                "Follow general population guidelines when possible. "
                "Consult healthcare professionals for appropriate modifications. "
                "Benefits generally outweigh risks when tailored to capabilities."
            ),
            "Sedentary Individuals": (
                "Start with small amounts and gradually increase. "
                "Some physical activity is better than none. "
                "Begin with 10-15 minutes and progress weekly."
            )
        }
    
    def create_individualized_prescription(self, 
                                        age: int, 
                                        body_weight_kg: float,
                                        health_status: str = "healthy",
                                        fitness_level: str = "beginner") -> Dict:
        """Create personalized exercise prescription with MET integration"""
        
        if age <= 17:
            age_group = AgeGroup.CHILDREN_ADOLESCENTS
        elif age <= 64:
            age_group = AgeGroup.ADULTS
        else:
            age_group = AgeGroup.OLDER_ADULTS
        
        base_prescription = self.get_prescription(age_group)
        met_explanation = self.get_met_guidelines_explanation()
        
        # Get MET activities for appropriate intensity
        intensity_activities = self.get_met_activities_by_intensity(base_prescription.intensity)
        
        # Calculate sample calorie expenditures
        sample_calories = {}
        for activity in intensity_activities[:3]:  # Show top 3 activities
            calories_30min = self.calculate_calorie_expenditure(
                body_weight_kg, activity.met_value, 30
            )
            sample_calories[activity.activity] = {
                "met_value": activity.met_value,
                "calories_30min": round(calories_30min, 1),
                "examples": activity.examples
            }
        
        prescription = {
            "age_group": age_group.value,
            "base_prescription": {
                "frequency": base_prescription.frequency,
                "intensity": base_prescription.intensity.value,
                "time": base_prescription.time,
                "type": [t.value for t in base_prescription.type],
                "volume": base_prescription.volume,
                "progression": base_prescription.progression,
                "met_guidelines": base_prescription.met_guidelines
            },
            "met_詳細說明": met_explanation,
            "推薦活動與MET值": sample_calories,
            "modifications": self._get_modifications(health_status, fitness_level),
            "safety_considerations": self._get_safety_considerations(age_group, health_status)
        }
        
        return prescription
    
    def _get_modifications(self, health_status: str, fitness_level: str) -> List[str]:
        """Get prescription modifications based on individual factors"""
        modifications = []
        
        if fitness_level == "beginner":
            modifications.append("Start with lower end of time recommendations")
            modifications.append("Progress gradually over 4-6 weeks")
            modifications.append("Focus on enjoyable activities to build habit")
        
        if health_status != "healthy":
            modifications.append("Consult healthcare provider before starting")
            modifications.append("Consider supervised exercise initially")
            modifications.append("Monitor symptoms during activity")
        
        return modifications
    
    def _get_safety_considerations(self, age_group: AgeGroup, health_status: str) -> List[str]:
        """Get safety considerations for prescription"""
        safety = ["Warm up before and cool down after exercise"]
        
        if age_group == AgeGroup.OLDER_ADULTS:
            safety.extend([
                "Include fall prevention exercises",
                "Start slowly and progress gradually",
                "Consider balance training priority"
            ])
        
        if health_status != "healthy":
            safety.extend([
                "Medical clearance recommended",
                "Monitor for adverse symptoms",
                "Have emergency plan in place"
            ])
        
        return safety

def main():
    """Example usage of exercise prescription system with MET integration"""
    system = ExercisePrescriptionSystem()
    
    # Example prescriptions with body weight
    examples = [
        {"age": 25, "body_weight_kg": 70.0, "health_status": "healthy", "fitness_level": "beginner"},
        {"age": 70, "body_weight_kg": 65.0, "health_status": "hypertension", "fitness_level": "intermediate"},
        {"age": 12, "body_weight_kg": 45.0, "health_status": "healthy", "fitness_level": "active"}
    ]
    
    for example in examples:
        prescription = system.create_individualized_prescription(**example)
        print(f"\n{'='*60}")
        print(f"運動處方 - {example['age']}歲，體重{example['body_weight_kg']}公斤")
        print(f"{'='*60}")
        
        print(f"年齡組別: {prescription['age_group']}")
        
        # Basic prescription
        bp = prescription['base_prescription']
        print(f"\n基本處方:")
        print(f"  頻率: {bp['frequency']}")
        print(f"  強度: {bp['intensity']}")
        print(f"  時間: {bp['time']}")
        print(f"  類型: {', '.join(bp['type'])}")
        
        # MET guidelines
        print(f"\nMET指導原則:")
        for key, value in bp['met_guidelines'].items():
            print(f"  {key}: {value}")
        
        # Recommended activities with calorie calculation
        print(f"\n推薦活動與熱量消耗 (30分鐘):")
        for activity, data in prescription['推薦活動與MET值'].items():
            print(f"  {activity}: {data['met_value']} METs → {data['calories_30min']} 卡路里")
            print(f"    具體例子: {', '.join(data['examples'])}")
        
        print(f"\n調整建議:")
        for mod in prescription['modifications']:
            print(f"  • {mod}")
    
    # Show MET explanation
    print(f"\n{'='*60}")
    print("MET 詳細說明")
    print(f"{'='*60}")
    met_info = system.get_met_guidelines_explanation()
    print(f"定義: {met_info['定義']}")
    print(f"\n強度分級:")
    for level, desc in met_info['強度分級'].items():
        print(f"  {level}: {desc}")
    print(f"\n實用應用: {met_info['實用應用']}")
    print(f"\n處方指導:")
    for key, value in met_info['處方指導'].items():
        print(f"  {key}: {value}")

if __name__ == "__main__":
    main()