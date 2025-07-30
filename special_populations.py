"""
Special Population Exercise Guidelines
Based on WHO 2020 Guidelines and clinical evidence
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

class SpecialPopulation(Enum):
    PREGNANCY = "pregnancy"
    POSTPARTUM = "postpartum"
    CHRONIC_DISEASE = "chronic_disease"
    DISABILITY = "disability"
    SEDENTARY = "sedentary"

class ChronicCondition(Enum):
    DIABETES = "diabetes"
    HYPERTENSION = "hypertension"
    HEART_DISEASE = "heart_disease"
    ARTHRITIS = "arthritis"
    COPD = "copd"
    OBESITY = "obesity"
    OSTEOPOROSIS = "osteoporosis"

@dataclass
class SpecialPopulationGuideline:
    population: str
    general_recommendations: str
    specific_activities: List[str]
    contraindications: List[str]
    precautions: List[str]
    medical_clearance: bool
    progression_notes: str

class SpecialPopulationExercise:
    
    def __init__(self):
        self.guidelines = self._create_special_population_guidelines()
        self.chronic_condition_specifics = self._create_chronic_condition_guidelines()
    
    def _create_special_population_guidelines(self) -> Dict[SpecialPopulation, SpecialPopulationGuideline]:
        return {
            SpecialPopulation.PREGNANCY: SpecialPopulationGuideline(
                population="Pregnant Women",
                general_recommendations=(
                    "At least 150 minutes of moderate-intensity aerobic activity per week. "
                    "Include aerobic and muscle-strengthening activities. "
                    "Can continue pre-pregnancy activity levels if medically cleared."
                ),
                specific_activities=[
                    "Walking (30 min, 5 days/week)",
                    "Swimming and water aerobics",
                    "Stationary cycling",
                    "Modified strength training",
                    "Prenatal yoga",
                    "Low-impact aerobics"
                ],
                contraindications=[
                    "Contact sports",
                    "Activities with fall risk",
                    "Scuba diving",
                    "Hot yoga/saunas",
                    "Supine exercises after first trimester",
                    "High-altitude activities (>2500m)"
                ],
                precautions=[
                    "Monitor heart rate and exertion",
                    "Stay hydrated and avoid overheating",
                    "Modify intensity as pregnancy progresses",
                    "Stop if experiencing dizziness, chest pain, or contractions",
                    "Avoid Valsalva maneuver"
                ],
                medical_clearance=True,
                progression_notes="Decrease intensity and duration as pregnancy progresses. Focus on maintaining fitness rather than improving."
            ),
            
            SpecialPopulation.POSTPARTUM: SpecialPopulationGuideline(
                population="Postpartum Women",
                general_recommendations=(
                    "Gradually return to pre-pregnancy activity levels. "
                    "Start with low-intensity activities and progress slowly. "
                    "Focus on core and pelvic floor rehabilitation."
                ),
                specific_activities=[
                    "Walking (start 10-15 min, progress gradually)",
                    "Pelvic floor exercises",
                    "Core rehabilitation exercises",
                    "Gentle yoga or stretching",
                    "Swimming (after 6-8 weeks)",
                    "Gradual return to strength training"
                ],
                contraindications=[
                    "High-impact activities until cleared",
                    "Heavy lifting initially",
                    "Intense abdominal exercises with diastasis recti"
                ],
                precautions=[
                    "Medical clearance before resuming exercise",
                    "Consider breastfeeding and nutrition needs",
                    "Monitor for fatigue and allow adequate recovery",
                    "Address any pelvic floor dysfunction"
                ],
                medical_clearance=True,
                progression_notes="Very gradual progression over 12-16 weeks. Listen to body and adjust for sleep deprivation and recovery."
            ),
            
            SpecialPopulation.DISABILITY: SpecialPopulationGuideline(
                population="People with Disabilities",
                general_recommendations=(
                    "Follow general population guidelines when possible. "
                    "Adapt activities to individual capabilities and limitations. "
                    "Benefits generally outweigh risks when properly prescribed."
                ),
                specific_activities=[
                    "Wheelchair sports and activities",
                    "Adaptive swimming",
                    "Seated exercises",
                    "Resistance training with modifications",
                    "Balance training (as appropriate)",
                    "Recreational activities adapted to ability"
                ],
                contraindications=[
                    "Activities beyond individual capabilities",
                    "Exercises that worsen existing conditions",
                    "Unsafe environmental conditions"
                ],
                precautions=[
                    "Individual assessment essential",
                    "Consider cognitive and physical limitations",
                    "Ensure proper equipment and safety measures",
                    "Regular monitoring and adaptation"
                ],
                medical_clearance=True,
                progression_notes="Highly individualized progression based on specific disability and capabilities. Focus on functional improvements."
            ),
            
            SpecialPopulation.SEDENTARY: SpecialPopulationGuideline(
                population="Sedentary Individuals",
                general_recommendations=(
                    "Start with small amounts and gradually increase. "
                    "Some physical activity is better than none. "
                    "Focus on building habits and enjoyment."
                ),
                specific_activities=[
                    "Walking (start 5-10 min, 2-3 times/day)",
                    "Gentle stretching",
                    "Chair exercises",
                    "Household activities",
                    "Gardening",
                    "Dancing to music"
                ],
                contraindications=[
                    "Starting too intensely",
                    "Ignoring pain or discomfort",
                    "All-or-nothing approach"
                ],
                precautions=[
                    "Very gradual progression",
                    "Monitor for unusual fatigue or pain",
                    "Start with activities of daily living",
                    "Build confidence before intensity"
                ],
                medical_clearance=False,
                progression_notes="Increase duration before intensity. Add 2-5 minutes per week. Celebrate small victories."
            )
        }
    
    def _create_chronic_condition_guidelines(self) -> Dict[ChronicCondition, Dict]:
        return {
            ChronicCondition.DIABETES: {
                "exercise_benefits": [
                    "Improved glucose control",
                    "Enhanced insulin sensitivity",
                    "Reduced cardiovascular risk",
                    "Weight management"
                ],
                "recommendations": {
                    "aerobic": "150+ min/week moderate intensity",
                    "resistance": "2-3 sessions/week",
                    "flexibility": "Daily stretching"
                },
                "precautions": [
                    "Monitor blood glucose before/after exercise",
                    "Carry quick-acting carbohydrates",
                    "Check feet daily for injuries",
                    "Stay hydrated"
                ],
                "contraindications": [
                    "Severe hypoglycemia history",
                    "Uncontrolled blood pressure",
                    "Active diabetic retinopathy",
                    "Recent diabetic ketoacidosis"
                ]
            },
            
            ChronicCondition.HYPERTENSION: {
                "exercise_benefits": [
                    "Reduced blood pressure",
                    "Improved cardiovascular health",
                    "Enhanced medication effectiveness",
                    "Stress reduction"
                ],
                "recommendations": {
                    "aerobic": "150+ min/week moderate intensity",
                    "resistance": "2-3 sessions/week, moderate intensity",
                    "avoid": "Isometric exercises, breath holding"
                },
                "precautions": [
                    "Monitor blood pressure response",
                    "Avoid sudden position changes",
                    "Gradual warm-up and cool-down",
                    "Medication timing considerations"
                ],
                "contraindications": [
                    "Uncontrolled hypertension (>180/110)",
                    "Recent heart attack or stroke",
                    "Unstable angina"
                ]
            },
            
            ChronicCondition.HEART_DISEASE: {
                "exercise_benefits": [
                    "Improved cardiovascular function",
                    "Reduced symptoms",
                    "Enhanced quality of life",
                    "Reduced mortality risk"
                ],
                "recommendations": {
                    "supervised": "Initial cardiac rehabilitation program",
                    "aerobic": "30-60 min, 3-5 days/week",
                    "intensity": "40-80% heart rate reserve"
                },
                "precautions": [
                    "Medical supervision initially",
                    "Heart rate monitoring",
                    "Symptom awareness (chest pain, dyspnea)",
                    "Medication effects on heart rate"
                ],
                "contraindications": [
                    "Unstable angina",
                    "Uncompensated heart failure",
                    "Severe aortic stenosis",
                    "Acute myocarditis"
                ]
            },
            
            ChronicCondition.ARTHRITIS: {
                "exercise_benefits": [
                    "Reduced joint pain and stiffness",
                    "Improved function and mobility",
                    "Stronger muscles around joints",
                    "Better balance and coordination"
                ],
                "recommendations": {
                    "low_impact": "Swimming, cycling, walking",
                    "strength": "2-3 times/week",
                    "flexibility": "Daily range of motion",
                    "duration": "Start with 10-15 min sessions"
                },
                "precautions": [
                    "Avoid high-impact activities during flares",
                    "Modify exercises based on affected joints",
                    "Use proper joint protection techniques",
                    "Balance activity with rest"
                ],
                "contraindications": [
                    "Acute joint inflammation",
                    "Severe joint damage",
                    "Recent joint surgery"
                ]
            }
        }
    
    def get_population_guidelines(self, population: SpecialPopulation) -> SpecialPopulationGuideline:
        """Get guidelines for specific special population"""
        return self.guidelines[population]
    
    def get_chronic_condition_info(self, condition: ChronicCondition) -> Dict:
        """Get information for specific chronic condition"""
        return self.chronic_condition_specifics[condition]
    
    def create_adapted_prescription(self, 
                                  population: SpecialPopulation,
                                  age: int,
                                  specific_condition: Optional[ChronicCondition] = None,
                                  current_activity_level: str = "sedentary") -> Dict:
        """Create adapted exercise prescription for special population"""
        
        base_guidelines = self.get_population_guidelines(population)
        
        prescription = {
            "population": base_guidelines.population,
            "medical_clearance_required": base_guidelines.medical_clearance,
            "general_recommendations": base_guidelines.general_recommendations,
            "recommended_activities": base_guidelines.specific_activities,
            "contraindications": base_guidelines.contraindications,
            "precautions": base_guidelines.precautions,
            "progression": base_guidelines.progression_notes
        }
        
        if specific_condition:
            condition_info = self.get_chronic_condition_info(specific_condition)
            prescription["chronic_condition"] = {
                "condition": specific_condition.value,
                "benefits": condition_info["exercise_benefits"],
                "specific_recommendations": condition_info["recommendations"],
                "additional_precautions": condition_info["precautions"],
                "additional_contraindications": condition_info["contraindications"]
            }
        
        # Adapt based on current activity level
        if current_activity_level == "sedentary":
            prescription["starter_program"] = self._create_starter_program(population)
        
        return prescription
    
    def _create_starter_program(self, population: SpecialPopulation) -> Dict:
        """Create beginner program for special populations"""
        
        base_program = {
            "week_1_2": "10-15 minutes light activity, 3 days/week",
            "week_3_4": "15-20 minutes light activity, 4 days/week",
            "week_5_8": "20-30 minutes moderate activity, 4-5 days/week",
            "progression_rule": "Increase duration by 2-5 minutes per week"
        }
        
        if population == SpecialPopulation.PREGNANCY:
            base_program["modifications"] = [
                "Monitor exertion level (able to hold conversation)",
                "Avoid supine positions after 1st trimester",
                "Adjust as pregnancy progresses"
            ]
        elif population == SpecialPopulation.DISABILITY:
            base_program["modifications"] = [
                "Adapt all activities to individual capabilities",
                "Focus on functional movements",
                "Use assistive devices as needed"
            ]
        
        return base_program

def main():
    """Demonstrate special population guidelines"""
    system = SpecialPopulationExercise()
    
    # Example prescriptions
    examples = [
        {
            "population": SpecialPopulation.PREGNANCY,
            "age": 28,
            "specific_condition": None,
            "current_activity_level": "active"
        },
        {
            "population": SpecialPopulation.CHRONIC_DISEASE,
            "age": 55,
            "specific_condition": ChronicCondition.DIABETES,
            "current_activity_level": "sedentary"
        }
    ]
    
    for example in examples:
        print(f"\n{'='*60}")
        print(f"EXERCISE PRESCRIPTION")
        print(f"{'='*60}")
        
        prescription = system.create_adapted_prescription(**example)
        print(f"Population: {prescription['population']}")
        print(f"Medical Clearance Required: {prescription['medical_clearance_required']}")
        
        print(f"\nRecommended Activities:")
        for activity in prescription['recommended_activities'][:3]:
            print(f"  • {activity}")
        
        print(f"\nKey Precautions:")
        for precaution in prescription['precautions'][:3]:
            print(f"  • {precaution}")
        
        if 'chronic_condition' in prescription:
            cc = prescription['chronic_condition']
            print(f"\nChronic Condition: {cc['condition'].title()}")
            print(f"Exercise Benefits:")
            for benefit in cc['benefits'][:2]:
                print(f"  • {benefit}")

if __name__ == "__main__":
    main()