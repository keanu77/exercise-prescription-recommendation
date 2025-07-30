"""
Age-Specific Exercise Recommendations
Based on WHO 2020 Guidelines and evidence-based research
"""

from dataclasses import dataclass
from typing import List, Dict
import json

@dataclass
class ExerciseActivity:
    name: str
    type: str
    intensity: str
    duration: str
    frequency: str
    benefits: List[str]
    considerations: List[str]

class AgeSpecificRecommendations:
    
    def __init__(self):
        self.recommendations = self._create_age_specific_recommendations()
    
    def _create_age_specific_recommendations(self) -> Dict:
        return {
            "children_adolescents": {
                "age_range": "5-17 years",
                "key_guidelines": {
                    "total_activity": "Average 60 minutes/day moderate-to-vigorous intensity",
                    "aerobic": "Most of the 60+ minutes should be aerobic",
                    "muscle_strengthening": "At least 3 days/week",
                    "bone_strengthening": "At least 3 days/week"
                },
                "recommended_activities": [
                    ExerciseActivity(
                        name="Active play and games",
                        type="aerobic",
                        intensity="moderate-vigorous",
                        duration="15-30 minutes",
                        frequency="daily",
                        benefits=["Cardiovascular health", "Motor skill development", "Social interaction"],
                        considerations=["Age-appropriate", "Fun and engaging", "Variety important"]
                    ),
                    ExerciseActivity(
                        name="Sports participation",
                        type="aerobic + skill",
                        intensity="moderate-vigorous",
                        duration="45-60 minutes",
                        frequency="3-5 times/week",
                        benefits=["Cardiovascular fitness", "Teamwork", "Competitive skills"],
                        considerations=["Proper supervision", "Age-appropriate rules", "Injury prevention"]
                    ),
                    ExerciseActivity(
                        name="Playground activities",
                        type="muscle + bone strengthening",
                        intensity="moderate-vigorous",
                        duration="20-30 minutes",
                        frequency="3+ times/week",
                        benefits=["Bone density", "Muscle strength", "Coordination"],
                        considerations=["Safe equipment", "Adult supervision", "Progressive challenge"]
                    ),
                    ExerciseActivity(
                        name="Dancing",
                        type="aerobic + bone strengthening",
                        intensity="moderate",
                        duration="30-45 minutes",
                        frequency="2-3 times/week",
                        benefits=["Cardiovascular health", "Bone health", "Rhythm and coordination"],
                        considerations=["Age-appropriate music", "Non-competitive environment"]
                    )
                ],
                "development_focus": [
                    "Fundamental movement skills",
                    "Physical literacy",
                    "Enjoyment of physical activity",
                    "Habit formation"
                ]
            },
            
            "adults": {
                "age_range": "18-64 years",
                "key_guidelines": {
                    "aerobic_moderate": "150-300 minutes/week",
                    "aerobic_vigorous": "75-150 minutes/week",
                    "muscle_strengthening": "2+ days/week, major muscle groups",
                    "additional_benefits": "More than 300 min moderate OR 150 min vigorous"
                },
                "recommended_activities": [
                    ExerciseActivity(
                        name="Brisk walking",
                        type="aerobic",
                        intensity="moderate",
                        duration="30 minutes",
                        frequency="5 days/week",
                        benefits=["Cardiovascular health", "Weight management", "Mental health"],
                        considerations=["Comfortable shoes", "Gradual progression", "Weather appropriate"]
                    ),
                    ExerciseActivity(
                        name="Resistance training",
                        type="muscle strengthening",
                        intensity="moderate-vigorous",
                        duration="45-60 minutes",
                        frequency="2-3 times/week",
                        benefits=["Muscle mass", "Bone density", "Metabolic health"],
                        considerations=["Proper form", "Progressive overload", "Rest between sessions"]
                    ),
                    ExerciseActivity(
                        name="Swimming/Water aerobics",
                        type="aerobic",
                        intensity="moderate",
                        duration="30-45 minutes",
                        frequency="3-4 times/week",
                        benefits=["Full body workout", "Joint-friendly", "Cardiovascular fitness"],
                        considerations=["Swimming ability", "Pool access", "Water safety"]
                    ),
                    ExerciseActivity(
                        name="Cycling",
                        type="aerobic",
                        intensity="moderate-vigorous",
                        duration="45-60 minutes",
                        frequency="3-4 times/week",
                        benefits=["Lower body strength", "Cardiovascular health", "Low impact"],
                        considerations=["Helmet safety", "Traffic awareness", "Bike maintenance"]
                    )
                ],
                "lifestyle_integration": [
                    "Use stairs instead of elevators",
                    "Walk or bike for short trips",
                    "Active lunch breaks",
                    "Standing desk options",
                    "Weekend active recreation"
                ]
            },
            
            "older_adults": {
                "age_range": "65+ years",
                "key_guidelines": {
                    "aerobic": "Same as adults (150-300 min moderate OR 75-150 min vigorous)",
                    "muscle_strengthening": "2+ days/week, major muscle groups",
                    "balance_functional": "3+ days/week multicomponent activities",
                    "fall_prevention": "Emphasis on balance and strength training"
                },
                "recommended_activities": [
                    ExerciseActivity(
                        name="Walking programs",
                        type="aerobic",
                        intensity="moderate",
                        duration="20-30 minutes",
                        frequency="daily",
                        benefits=["Cardiovascular health", "Bone health", "Independence"],
                        considerations=["Safe walking routes", "Appropriate footwear", "Weather conditions"]
                    ),
                    ExerciseActivity(
                        name="Tai Chi",
                        type="balance + flexibility",
                        intensity="light-moderate",
                        duration="30-45 minutes",
                        frequency="2-3 times/week",
                        benefits=["Balance", "Fall prevention", "Mental wellbeing", "Flexibility"],
                        considerations=["Qualified instructor", "Slow progression", "Group setting beneficial"]
                    ),
                    ExerciseActivity(
                        name="Chair exercises",
                        type="muscle strengthening",
                        intensity="light-moderate",
                        duration="20-30 minutes",
                        frequency="2-3 times/week",
                        benefits=["Muscle strength", "Functional capacity", "Safety"],
                        considerations=["Stable chair", "Proper form", "Individual adaptation"]
                    ),
                    ExerciseActivity(
                        name="Water aerobics",
                        type="aerobic + resistance",
                        intensity="moderate",
                        duration="45-60 minutes",
                        frequency="2-3 times/week",
                        benefits=["Joint mobility", "Muscle strength", "Social interaction"],
                        considerations=["Pool temperature", "Entry/exit safety", "Instructor experience"]
                    ),
                    ExerciseActivity(
                        name="Balance training",
                        type="balance + functional",
                        intensity="light-moderate",
                        duration="15-20 minutes",
                        frequency="3+ times/week",
                        benefits=["Fall prevention", "Confidence", "Functional mobility"],
                        considerations=["Safety support available", "Progressive difficulty", "Individual assessment"]
                    )
                ],
                "functional_focus": [
                    "Activities of daily living",
                    "Fall prevention strategies",
                    "Maintaining independence",
                    "Social engagement through activity",
                    "Cognitive benefits"
                ]
            }
        }
    
    def get_recommendations(self, age_group: str) -> Dict:
        """Get specific recommendations for age group"""
        return self.recommendations.get(age_group, {})
    
    def create_weekly_schedule(self, age: int, preferences: List[str] = None) -> Dict:
        """Create a sample weekly exercise schedule"""
        
        if age <= 17:
            group = "children_adolescents"
        elif age <= 64:
            group = "adults"
        else:
            group = "older_adults"
        
        recommendations = self.get_recommendations(group)
        
        if group == "children_adolescents":
            schedule = {
                "Monday": "Active play (30 min) + Sports practice (30 min)",
                "Tuesday": "Playground activities (30 min) + Free play (30 min)",
                "Wednesday": "Dancing or movement (45 min) + Active games (15 min)",
                "Thursday": "Sports or structured activity (45 min) + Walking (15 min)",
                "Friday": "Active play (30 min) + Family activity (30 min)",
                "Saturday": "Longer sports activity (60-90 min)",
                "Sunday": "Family outdoor activity (60 min)"
            }
        elif group == "adults":
            schedule = {
                "Monday": "Resistance training (45 min)",
                "Tuesday": "Brisk walking (30 min)",
                "Wednesday": "Resistance training (45 min) + Stretching (15 min)",
                "Thursday": "Cycling or swimming (45 min)",
                "Friday": "Brisk walking (30 min) + Flexibility (15 min)",
                "Saturday": "Longer aerobic activity (60 min)",
                "Sunday": "Active recreation or rest"
            }
        else:  # older_adults
            schedule = {
                "Monday": "Walking (25 min) + Balance exercises (15 min)",
                "Tuesday": "Chair exercises (30 min)",
                "Wednesday": "Tai Chi or gentle movement (30 min)",
                "Thursday": "Walking (25 min) + Strength exercises (20 min)",
                "Friday": "Water aerobics (45 min)",
                "Saturday": "Social activity with movement (30-45 min)",
                "Sunday": "Gentle stretching and relaxation (20 min)"
            }
        
        return {
            "age_group": recommendations.get("age_range", ""),
            "weekly_schedule": schedule,
            "total_weekly_volume": self._calculate_weekly_volume(group),
            "progression_notes": self._get_progression_notes(group)
        }
    
    def _calculate_weekly_volume(self, group: str) -> str:
        """Calculate expected weekly exercise volume"""
        if group == "children_adolescents":
            return "420+ minutes moderate-to-vigorous activity"
        elif group == "adults":
            return "150-300 minutes moderate aerobic + 2 strength sessions"
        else:
            return "150-300 minutes aerobic + 2-3 strength + 3+ balance sessions"
    
    def _get_progression_notes(self, group: str) -> List[str]:
        """Get progression guidelines for age group"""
        if group == "children_adolescents":
            return [
                "Focus on skill development and enjoyment",
                "Gradually increase activity complexity",
                "Encourage variety to prevent boredom",
                "Monitor for signs of overuse or burnout"
            ]
        elif group == "adults":
            return [
                "Start conservatively and progress gradually",
                "Increase duration before intensity",
                "Add 10% volume increase per week maximum",
                "Listen to body and allow adequate recovery"
            ]
        else:
            return [
                "Progress very gradually over weeks/months",
                "Prioritize safety and fall prevention",
                "Focus on functional improvements",
                "Regular assessment of capabilities and limitations"
            ]

def main():
    """Demonstrate age-specific recommendations"""
    system = AgeSpecificRecommendations()
    
    ages = [12, 35, 72]
    for age in ages:
        print(f"\n{'='*50}")
        print(f"EXERCISE SCHEDULE FOR {age}-YEAR-OLD")
        print(f"{'='*50}")
        
        schedule = system.create_weekly_schedule(age)
        print(f"Age Group: {schedule['age_group']}")
        print(f"Weekly Volume: {schedule['total_weekly_volume']}")
        
        print("\nWeekly Schedule:")
        for day, activity in schedule['weekly_schedule'].items():
            print(f"  {day}: {activity}")
        
        print("\nProgression Notes:")
        for note in schedule['progression_notes']:
            print(f"  • {note}")

if __name__ == "__main__":
    main()